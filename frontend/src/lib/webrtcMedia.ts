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
          const transceiver = pc.addTrack(track, localStream)
          try {
            if ((transceiver as any)?.direction && (transceiver as any).direction !== 'sendrecv') {
              try { (transceiver as any).direction = 'sendrecv' } catch {}
            }
          } catch {}
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

    pc.oniceconnectionstatechange = () => {
      console.log('[webrtc] iceConnectionState', remoteUserId, pc.iceConnectionState, 'gatheringState', pc.iceGatheringState, 'signalingState', pc.signalingState)
    }
    pc.onicegatheringstatechange = () => {
      console.log('[webrtc] iceGatheringState', remoteUserId, pc.iceGatheringState)
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        console.log('[webrtc] ice candidate ->', remoteUserId, ev.candidate.candidate?.slice(0, 80))
        sendSignaling('webrtc:ice', {
          sessionId: this.sessionId,
          to: remoteUserId,
          candidate: ev.candidate,
        })
      } else {
        console.log('[webrtc] ice gathering END for', remoteUserId)
      }
    }

    pc.ontrack = (ev) => {
      console.log('[webrtc] ontrack', remoteUserId, 'track kind=', ev.track.kind, 'readyState=', ev.track.readyState, 'streams.length=', ev.streams?.length || 0, 'stream IDs=', (ev.streams || []).map((s) => s.id))
      let [remoteStream] = ev.streams || []
      if (!remoteStream && ev.track) {
        console.warn('[webrtc] ontrack streams empty, building merged per-peer MediaStream for track', ev.track.kind)
        if (!this.remoteStreams[remoteUserId]) {
          this.remoteStreams[remoteUserId] = new MediaStream()
        }
        remoteStream = this.remoteStreams[remoteUserId]
        try {
          if (remoteStream && !remoteStream.getTracks().some((t) => t.id === ev.track.id)) {
            remoteStream.addTrack(ev.track)
          }
        } catch (e) {
          console.warn('[webrtc] addTrack to merged stream failed', e)
        }
      }
      if (!remoteStream) {
        console.warn('[webrtc] ontrack no stream, track discarded')
        return
      }
      const prev = this.remoteStreams[remoteUserId]
      if (!prev || prev.id !== remoteStream.id) {
        this.remoteStreams[remoteUserId] = remoteStream
        this.notifyStreams()
        return
      }
      if (prev && !prev.getTracks().some((t) => t.id === ev.track.id)) {
        try {
          prev.addTrack(ev.track)
          this.notifyStreams()
        } catch (e) {
          console.warn('[webrtc] merge addTrack failed', e)
        }
      }
    }

    pc.onnegotiationneeded = async () => {
      if (makingOffer) {
        console.warn('[webrtc] onnegotiationneeded makingOffer=true guard -> skip (double fire prevented)', remoteUserId)
        return
      }
      makingOffer = true
      try {
        if (pc.signalingState !== 'stable') {
          console.warn('[webrtc] onnegotiationneeded signaling not stable, skip', remoteUserId, pc.signalingState)
          return
        }
        await pc.setLocalDescription()
        const desc = pc.localDescription
        console.log('[webrtc] LOCAL OFFER type=', desc?.type, 'sdp audio lines=', (desc?.sdp?.match(/^m=audio/gm) || []).length, 'video lines=', (desc?.sdp?.match(/^m=video/gm) || []).length, 'sdp sample=', desc?.sdp?.slice(0, 180))
        sendSignaling('webrtc:offer', {
          sessionId: this.sessionId,
          to: remoteUserId,
          sdp: desc,
        })
      } catch (e) {
        console.warn('[webrtc] negotiation failed', remoteUserId, e)
      } finally {
        makingOffer = false
      }
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
    ;(pc as any).__tunibac_setAnswerPending = (v: boolean) => {
      isSettingRemoteAnswerPending = v
    }

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
        console.log('[webrtc] INCOMING OFFER from', peerId, 'polite=', polite, 'makingOffer=', makingOffer, 'answerPending=', isSettingRemoteAnswerPending, 'collision=', offerCollision, 'ignore=', ignoreOffer, 'signalingState=', pc.signalingState)
        if (ignoreOffer) {
          return
        }
        try {
          await this.setRemoteDescription(pc, ev.sdp)
          this.flushPendingCandidates(peerId, pc)
          await pc.setLocalDescription()
          const desc = pc.localDescription
          console.log('[webrtc] OUT ANSWER to', peerId, 'type=', desc?.type, 'audio m-lines=', (desc?.sdp?.match(/^m=audio/gm) || []).length, 'video m-lines=', (desc?.sdp?.match(/^m=video/gm) || []).length)
          sendSignaling('webrtc:answer', {
            sessionId: this.sessionId,
            to: peerId,
            sdp: desc,
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
          const setAnswerPending = (pc as any).__tunibac_setAnswerPending
          if (typeof setAnswerPending === 'function') setAnswerPending(true)
          const validState =
            pc.signalingState === 'have-local-offer'
          console.log('[webrtc] INCOMING ANSWER from', peerId, 'signalingState=', pc.signalingState, 'validState=', validState)
          if (validState || pc.remoteDescription == null) {
            await this.setRemoteDescription(pc, ev.sdp)
            this.flushPendingCandidates(peerId, pc)
            console.log('[webrtc] ANSWER APPLIED remoteDescription.type=', pc.remoteDescription?.type, 'signalingState now=', pc.signalingState)
          } else {
            console.warn('[webrtc] ANSWER state invalid, skipped setRemoteDescription to avoid InvalidStateError', peerId, pc.signalingState)
          }
        } catch (e) {
          console.warn('[webrtc] answer handle failed', e)
        } finally {
          const setAnswerPending = (pc as any).__tunibac_setAnswerPending
          if (typeof setAnswerPending === 'function') setAnswerPending(false)
        }
      },
      onIce: (ev) => {
        const peerId = ev.from
        const pc = this.pcMap[peerId]
        if (!pc) {
          this.pendingCandidates[peerId] = this.pendingCandidates[peerId] || []
          this.pendingCandidates[peerId].push(ev.candidate)
          console.log('[webrtc] ICE queued (no PC yet)', peerId, 'queue len=', this.pendingCandidates[peerId].length)
          return
        }
        try {
          console.log('[webrtc] ICE applying', peerId, (ev.candidate?.candidate || 'end-of-candidates').slice(0, 80))
          void pc.addIceCandidate(ev.candidate)
        } catch (e) {
          console.warn('[webrtc] ice add candidate failed', peerId, e)
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
      if (this.knownPeers.has(who)) return
      this.ensurePeer(who, false)
      this.knownPeers.add(who)
      console.log('[webrtc] peer-joined ensurePeer created', who)
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
    const peerEntries = Object.entries(this.pcMap)
    console.log('[webrtc] addOrReplaceLocalTracks peers=', peerEntries.length, 'tracks now=', this.getLocalTracks().map((t) => t.kind).join(','))
    for (const [_peerId, pc] of peerEntries) {
      if (pc.signalingState === 'closed') continue
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
