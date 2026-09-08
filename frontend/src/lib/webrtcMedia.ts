import { Socket } from 'socket.io-client'
import { attachSignalingListeners, getSocket, sendSignaling } from './socketClient'

export type PeerConnectionMap = Record<string, RTCPeerConnection>
export type RemoteStreamMap = Record<string, MediaStream>

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

export type MediaManagerEvents = {
  streamsChanged: (streams: RemoteStreamMap) => void
}

export interface LocalStreamRef {
  current: MediaStream | null
}

export class WebRtcMediaManager {
  private userId: string
  private sessionId: string
  private socket: Socket
  private pcMap: PeerConnectionMap = {}
  private remoteStreams: RemoteStreamMap = {}
  private pendingCandidates: Record<string, RTCIceCandidateInit[]> = {}
  private unsubSignaling?: () => void
  private onStreamsChanged?: (s: RemoteStreamMap) => void
  private localStreamRef: LocalStreamRef
  private knownPeers = new Set<string>()

  constructor(
    userId: string,
    sessionId: string,
    localStreamRef: LocalStreamRef
  ) {
    this.userId = userId
    this.sessionId = sessionId
    this.localStreamRef = localStreamRef
    this.socket = getSocket()
  }

  setOnStreamsChanged(cb?: (s: RemoteStreamMap) => void) {
    this.onStreamsChanged = cb
  }

  private notifyStreams() {
    this.onStreamsChanged?.({ ...this.remoteStreams })
  }

  private getLocalTracks(): MediaStreamTrack[] {
    return this.localStreamRef?.current ? [...this.localStreamRef.current.getTracks()] : []
  }

  private addLocalTracksToPeer(pc: RTCPeerConnection) {
    const localStream = this.localStreamRef.current
    if (!localStream) return
    const senders = pc.getSenders()
    for (const track of localStream.getTracks()) {
      const exists = senders.some((s) => s.track && s.track.id === track.id)
      if (!exists) {
        try {
          pc.addTrack(track, localStream)
        } catch {
          /* ignore invalid state addTrack on closed etc */
        }
      }
    }
  }

  private createPeerConnection(remoteUserId: string, polite: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    let makingOffer = false
    let ignoreOffer = false
    let isSettingRemoteAnswerPending = false

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendSignaling('webrtc:ice', {
          sessionId: this.sessionId,
          to: remoteUserId,
          candidate: ev.candidate,
        })
      }
    }

    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams || []
      if (!remoteStream) return
      if (!this.remoteStreams[remoteUserId] || this.remoteStreams[remoteUserId].id !== remoteStream.id) {
        this.remoteStreams[remoteUserId] = remoteStream
        this.notifyStreams()
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true
        await pc.setLocalDescription()
        sendSignaling('webrtc:offer', {
          sessionId: this.sessionId,
          to: remoteUserId,
          sdp: pc.localDescription,
        })
      } catch (e) {
        console.warn('[webrtc] negotiation failed', e)
      } finally {
        makingOffer = false
      }
    }

    pc.onsignalingstatechange = () => {
      isSettingRemoteAnswerPending = pc.signalingState === 'have-local-offer'
    }

    ;(pc as any).__tunibac_polite = polite
    ;(pc as any).__tunibac_makingOfferRef = () => makingOffer
    ;(pc as any).__tunibac_setMakingOffer = (v: boolean) => {
      makingOffer = v
    }
    ;(pc as any).__tunibac_ignoreOfferRef = () => ignoreOffer
    ;(pc as any).__tunibac_setIgnoreOffer = (v: boolean) => {
      ignoreOffer = v
    }
    ;(pc as any).__tunibac_isSettingRemoteAnswerPending = () => isSettingRemoteAnswerPending

    this.addLocalTracksToPeer(pc)

    return pc
  }

  private async setRemoteDescription(pc: RTCPeerConnection, desc: RTCSessionDescriptionInit) {
    await pc.setRemoteDescription(desc)
  }

  private flushPendingCandidates(peerId: string, pc: RTCPeerConnection) {
    const list = this.pendingCandidates[peerId] || []
    delete this.pendingCandidates[peerId]
    for (const cand of list) {
      try {
        void pc.addIceCandidate(cand)
      } catch {
        /* ignore */
      }
    }
  }

  private ensurePeer(remoteUserId: string, polite: boolean): RTCPeerConnection {
    let pc = this.pcMap[remoteUserId]
    if (!pc) {
      pc = this.createPeerConnection(remoteUserId, polite)
      this.pcMap[remoteUserId] = pc
    }
    return pc
  }

  start() {
    this.unsubSignaling = attachSignalingListeners(this.userId, this.sessionId, {
      onOffer: async (ev) => {
        const peerId = ev.from
        const pc = this.ensurePeer(peerId, true)
        const polite = (pc as any).__tunibac_polite === true
        const makingOffer = (pc as any).__tunibac_makingOfferRef?.() ?? false
        const isSettingRemoteAnswerPending =
          (pc as any).__tunibac_isSettingRemoteAnswerPending?.() ?? false
        const offerCollision =
          (makingOffer || pc.signalingState !== 'stable') && !isSettingRemoteAnswerPending
        const ignoreOffer = !polite && offerCollision
        if (ignoreOffer) {
          return
        }
        try {
          await this.setRemoteDescription(pc, ev.sdp)
          this.flushPendingCandidates(peerId, pc)
          await pc.setLocalDescription()
          sendSignaling('webrtc:answer', {
            sessionId: this.sessionId,
            to: peerId,
            sdp: pc.localDescription,
          })
        } catch (e) {
          console.warn('[webrtc] offer handle failed', e)
        }
      },
      onAnswer: async (ev) => {
        const peerId = ev.from
        const pc = this.pcMap[peerId]
        if (!pc) return
        try {
          const stableReady =
            pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-offer'
          if (stableReady || pc.remoteDescription == null) {
            await this.setRemoteDescription(pc, ev.sdp)
            this.flushPendingCandidates(peerId, pc)
          }
        } catch (e) {
          console.warn('[webrtc] answer handle failed', e)
        }
      },
      onIce: (ev) => {
        const peerId = ev.from
        const pc = this.pcMap[peerId]
        if (!pc) {
          this.pendingCandidates[peerId] = this.pendingCandidates[peerId] || []
          this.pendingCandidates[peerId].push(ev.candidate)
          return
        }
        try {
          void pc.addIceCandidate(ev.candidate)
        } catch {
          /* ignore */
        }
      },
      onBye: (ev) => {
        const peerId = ev.from
        if (peerId === this.userId) return
        if (ev.to !== '*' && ev.to !== this.userId) return
        this.closePeer(peerId)
      },
      onPeerLeft: (ev) => {
        if (ev.userId === this.userId) return
        this.closePeer(ev.userId)
      },
    })

    const peerJoinedEv = `webrtc:peer-joined:${this.sessionId}`
    const peerJoinedHandler = (ev: any) => {
      const who = ev?.userId
      if (!who || who === this.userId) return
      // polite=false — existing peers (we) create offer first
      const pc = this.ensurePeer(who, false)
      this.knownPeers.add(who)
      // kick a negotiation
      if (pc.signalingState === 'stable') {
        ;(pc as any).onnegotiationneeded?.()
      }
    }
    this.socket.on(peerJoinedEv, peerJoinedHandler)

    const priorUnsub = this.unsubSignaling
    this.unsubSignaling = () => {
      priorUnsub?.()
      this.socket.off(peerJoinedEv, peerJoinedHandler)
    }

    // Announce we joined so existing peers create offers to us.
    sendSignaling('webrtc:hello', { sessionId: this.sessionId })
  }

  async addOrReplaceLocalTracks() {
    const peers = Object.values(this.pcMap)
    for (const pc of peers) {
      if (pc.signalingState === 'closed') continue
      // Rebuild senders — remove any without tracks in current localStream
      const wantedTracks = this.getLocalTracks()
      const wantedIds = new Set(wantedTracks.map((t) => t.id))
      for (const sender of pc.getSenders()) {
        if (sender.track && !wantedIds.has(sender.track.id)) {
          try {
            pc.removeTrack(sender)
          } catch {
            /* ignore */
          }
        }
      }
      this.addLocalTracksToPeer(pc)
    }
  }

  private closePeer(peerId: string) {
    const pc = this.pcMap[peerId]
    if (pc) {
      try {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onnegotiationneeded = null
        pc.close()
      } catch {
        /* ignore */
      }
      delete this.pcMap[peerId]
    }
    if (this.remoteStreams[peerId]) {
      try {
        for (const t of this.remoteStreams[peerId].getTracks()) t.stop()
      } catch {
        /* ignore */
      }
      delete this.remoteStreams[peerId]
      this.notifyStreams()
    }
    delete this.pendingCandidates[peerId]
    this.knownPeers.delete(peerId)
  }

  closePeerAndSignal(peerId: string) {
    sendSignaling('webrtc:bye', { sessionId: this.sessionId, to: peerId })
    this.closePeer(peerId)
  }

  closeAll() {
    for (const peerId of Object.keys(this.pcMap)) {
      try {
        sendSignaling('webrtc:bye', { sessionId: this.sessionId, to: peerId })
      } catch {
        /* ignore */
      }
    }
    for (const peerId of Object.keys(this.pcMap)) this.closePeer(peerId)
    this.unsubSignaling?.()
    this.unsubSignaling = undefined
    this.pendingCandidates = {}
  }
}

export const buildCombinedLocalStream = (
  audio: MediaStream | null,
  video: MediaStream | null
): MediaStream | null => {
  if (!audio && !video) return null
  const combined = new MediaStream()
  for (const s of [audio, video]) {
    if (s) {
      for (const t of s.getTracks()) combined.addTrack(t)
    }
  }
  return combined
}
