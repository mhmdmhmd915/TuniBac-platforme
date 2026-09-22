# TUNIBAC — LIVE STUDY / LIVE SQUAD FIXES
## Implementation Tasks (Ordered by Dependency)

Spec reference: `spec.md` in the same folder. All ACs from spec.md §7 are mapped below to atomic, dependency-ordered tasks.

**Execution order**: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → (QA batch). No task runs before its `depends_on = [].

---

### T1 — BUG C.1: Remove/refine `bacOnlyMiddleware` on squad routes

**Status**: pending
**Priority**: high
**Depends on**: []
**Files**: `backend/routes/studySquad.js`, possibly `backend/middleware/authMiddleware.js` (read-only, write only if middleware is refined inline)
**Description**:
- Read `backend/routes/studySquad.js` line 24 where `router.use(authMiddleware, bacOnlyMiddleware)` is applied globally to ALL squad routes.
- Strategy A (preferred, unless audit finds a BAC-only squad endpoint): REMOVE `bacOnlyMiddleware` from the global `router.use(...)` chain. Keep only `router.use(authMiddleware)`. This is sufficient because the studySquadController.js DB where clauses (`listMySquads L45, `createSquad L125, `inviteByPhone L302, `acceptInvitation L381, `joinByCode L429 etc. ALREADY enforce bacSection equality via where-clause filters, so OTHER users naturally see only OTHER squads and BAC see only BAC.
- Strategy B (only if audit finds a BAC-only squad endpoint): keep bacOnlyMiddleware, but MOVE it from global router.use to INDIVIDUAL router.xxx(...) on endpoints that genuinely require BAC. If no such endpoint exists, use Strategy A.
- Audit: before committing, scan studySquad.js endpoint list — for each endpoint, confirm OTHER legitimately needs access:
  1. GET /my-squads (listMySquads) — OTHER needs YES
  2. GET /my-invitations (listMyInvitations) — OTHER needs YES
  3. POST / (createSquad) — OTHER needs YES
  4. GET /:squadId (getSquadDetail) — OTHER needs YES
  5. POST /invite (inviteByPhone) — OTHER needs YES
  6. POST /:invitationId/accept (acceptInvitation) — OTHER needs YES
  7. POST /:invitationId/decline (declineInvitation) — OTHER needs YES
  8. POST /join-by-code (joinByCode) — OTHER needs YES
  9. PATCH /:squadId/rename (renameSquad) — OTHER needs YES (owner)
  10. DELETE /:squadId (disbandSquad) — OTHER needs YES (owner)
  11. POST /:squadId/leave (leaveSquad) — OTHER needs YES
  12. DELETE /:squadId/members/:userId (removeMember) — OTHER needs YES (owner)
  13. GET /:squadId/chat (listChat) — OTHER needs YES
  14. POST /:squadId/chat (sendChatMessage) — OTHER needs YES
  15. GET /:squadId/stats (getStats) — OTHER needs YES
  16. GET /:squadId/goals (listGoals) — OTHER needs YES
  17. PUT /:squadId/goals (upsertGoal) — OTHER needs YES
  18. DELETE /:squadId/invitations/:invId (cancelInvitation) — OTHER needs YES (owner)
  Conclusion: all 18 endpoints are symmetric for BAC/OTHER. → Apply Strategy A.

**Local Test Requirements (TR-T1)**:
- **TR-T1-1 (rule)**: Start backend, login with OTHER student, `GET /api/study-squads/my-squads` with valid OTHER JWT → response is 200 (not 403), body is array (possibly empty if no squads yet).
- **TR-T1-2 (rule)**: Same OTHER JWT hits `POST /api/study-squads` with `{ name: 'TestOTHER' }` → 201 or 200 with `bacSection` in created squad is null (network tab confirms).
- **TR-T1-3 (rule)**: BAC student JWT still works unchanged: `GET /my-squads` for BAC returns 200 with BAC-only squad list — no regression.
- **TR-T1-4 (rubric 0–2 threshold ≥ 2)**: Isolation check (both requests in a single test session: BAC student POST /join-by-code using OTHER squad code → 403 or 4xx. Isolation maintained.

---

### T2 — BUG C.2: Fix OTHER student squad room socket join on socket connection

**Status**: pending
**Priority**: high
**Depends on**: [T1]
**Files**: `backend/config/socketServer.js` around L165–L200
**Description**:
- Locate socket server `io.on('connection')` block around L165–L200 where, specifically the condition:
  ```
  if (user.role === 'STUDENT' && user.bacSection) {
    // joins section room + all squad rooms
  }
  ```
  That `&& user.bacSection` excludes OTHER (bacSection=null). OTHER students from joining their squad rooms.
- Change condition to allow ALL STUDENTS join their SQUAD rooms regardless of bacSection. Keep the SECTION room join ONLY when bacSection is truthy (since OTHER students don't have a section room).
- Specifically:
  - Section room join (`io.join(`section:${user.bacSection}`) stays inside `if (user.bacSection)` — that's fine.
  - But `Squad.findAll(...)` membership query + `io.join(`squad:${sq.id}` MUST be in a block that runs for ANY `user.role === 'STUDENT'` (unconditionally on bacSection). OTHER with bacSection=null squad exists, this query returns OTHER squads, so they join correctly).
- Also ensure the second part (per-squad member room `member:${sq.id}:${user.id}`) also joins for OTHER same way regardless of bacSection truthiness.

**Local Test Requirements (TR-T2)**:
- **TR-T2-1 (rule)**: Start backend, attach a console.trace on squad:update socket.io adapter.get(`squad:` events
- **TR-T2-2 (rule)**: After T1+T2, OTHER student logs in, opens 2 browser tabs (OTHER A, OTHER B). OTHER A sends squad chat message. OTHER B's UI shows new message in <1s. Confirms socket squad room join + message routing works for OTHER.
- **TR-T2-3 (rule — regression)**: BAC student continues to receive squad chat realtime — no regression from refactoring of conditional.

---

### T3 — BUG A.1: Fix WebRTC signaling routing (targeted emit to recipient only)

**Status**: pending
**Priority**: high
**Depends on**: []
**Files**: `backend/config/socketServer.js` sections:
  - webrtc:offer handler around L648–L673
  - webrtc:answer handler around L676–L701
  - webrtc:ice handler around L704–L730
  - webrtc:bye handler around L732–L758
**Description**:
- Current buggy pattern for offer/answer/ice/bye: `io.to(session:${sessionId}).emit(...)` → sends signaling event to EVERY socket in the session room (including sender).
- Fix pattern: the signaling payload has `to` field (the recipient userId). We need to send ONLY to that specific user.
- Implementation options (pick best given that `io.to(user:${userId})` if each user socket joins a per-user room on connection. Verify socket auth already joins such a room (find existing pattern by searching socketServer for per-user room join on connection.
  - If pattern `user:${user.id}` room join already exists on connection: use `io.to(`user:${ev.to}`).emit(...) for all 4 events.
  - If per-user room doesn't exist, create it (single addition in auth success path around connection handler), OR find recipient socket.id from `io.sockets.sockets` Map by iterating connected sockets and checking `socket.data.user.id === ev.to`. Choose whichever is cleaner code-consistent. Keep the SDP sessionId session guard checks (bacSection check L630 webrtc:hello already — keep those unchanged.
- DO NOT modify frontend socketClient.ts signaling filters — they already filter by `ev.to === userId`, which remains as defense-in-depth — it's fine to keep.
- Do not touch sessionId validation or section id or anything outside the 4 emit lines.

**Local Test Requirements (TR-T3)**:
- **TR-T3-1 (rule)**: 3-browser 2nd browser open socket io.on('webrtc:offer socket.io on all peers in room count (A, B, C). A toggles cam → count of `webrtc:offer events received by B (on B: 1 (just for B, intended for them). C receives 0 offers. Confirmed via a temporary console.log in socket.on('webrtc:offer on frontend (log removed before commit.
- **TR-T3-2 (rule)**: Socket log removed before committing.
- **TR-T3-3 (rubric 0–2, threshold ≥ 1)**: 2-party session still works: offer/answer roundtrip completes after fix — no regressions on 2-party (1 A↔B basic flow.

---

### T4 — BUG A.2: Fix webrtcMedia.ts: Trigger renegotiation in addOrReplaceLocalTracks and fix peer-joined offer

**Status**: pending
**Priority**: high
**Depends on**: [T3]
**Files**: `frontend/src/lib/webrtcMedia.ts`:
  - `start()` method — L231–L242 (peer-joined handler offer creation.
  - `addOrReplaceLocalTracks()` method — L255–L273.
  - `createPeerConnection()` if needed (verify `onnegotiationneeded` wiring.
**Description**:

BUG A.4 (from root cause): `addOrReplaceLocalTracks L255–L273 does NOT trigger any SDP renegotiation. Tracks are added to/removed from peer connections via sender.replaceTrack / addTrack/removeTrack, but no createOffer→setLocalDescription→socket signal follows. So remote never learns the SDP change and media not received despite track added locally.

Fix plan:
1. In `addOrReplaceLocalTracks()`: AFTER the loop over `this.peerConnections Map that adds/removes/replaces tracks, for EACH `pc` in `this.peerConnections.values()`:
   - Check if `pc.signalingState === 'stable'` (only polite peer creates offer in stable).
   - If stable and pc.localDescription exists (the pc is past initial offer/answer and the tracks were added after the tracks added/removed → trigger renegotiation by:
     ```
     await pc.setLocalDescription(await pc.createOffer());
     const sdp = pc.localDescription;
     // then sendSignaling('webrtc:offer via socket emit(`from this local → emit `webrtc:offer { from: this.myId, to: peerUserId, sessionId: this.sessionId, sdp })
     ```
   - To get `peerUserId` → you need to also store the peer userId alongside each RTCPeerConnection in the Map. Update the data structure from `peerConnections: Map<string, RTCPeerConnection>` where key is peerId → we already have this keyed by peerId → `this.peerConnections.forEach((pc, peerId) => { await renegotiate(pc, peerId) }).
2. In `start()` method peer-joined handler L231:
   - OLD: `(pc as any).onnegotiationneeded?.()`
   - NEW: after `addLocalTracksToPeer(pc)` succeeds → same `await pc.setLocalDescription(await pc.createOffer())` → send offer via socket emit offer with `to: peerId` (the one from the event payload).
3. Important: `onnegotiationneeded` is a browser event that fires automatically when tracks are added to RTCPeerConnection — `createPeerConnection already sets it up L76-135 create offer. It already sets `.onnegotiationneeded = async () => { createOffer(); setLocalDescription; emit offer }`. That's the design! Wait — actually webrtcMedia createPeerConnection already sets `onnegotiationneeded` that does the full createOffer + emit. So IF we trigger that event AFTER track add in addOrReplaceLocalTracks — we can either:
   Option a) Call the existing onnegotiationneeded function (recommended, cleaner.
   Option b) Call createOffer directly.
   Whichever, actually triggers renegotiation is what we need. Verify: after addOrReplace tracks → SDP renegotiation starts within 500ms. Add a `pc.dispatchEvent(new Event('negotiationneeded'` (standard compliant way) OR keep existing onnegotiationneeded handler.
4. Verify also L231 peer joined: add local tracks → then actually trigger offer (not onneg call directly createOffer+setLocalDescription).

**Local Test Requirements (TR-T4)**:
- **TR-T4-1 (rule)**: 2 tabs (BAC A + BAC B). A clicks Mic ON. Chrome://webrtc-internals on B side shows `track IDs match. RTCPeerConnection onontrack fires audio track confirmed visually via console.
- **TR-T4-2 (rule)**: A then clicks Camera ON → B ontrack fires video → `<video>` renders frame.
- **TR-T4-3 (rule)**: A then toggles Mic OFF → B audio track removed / muted indicator turns off.
- **TR-T4-4 (rubric 0–2 threshold ≥ 1)**: Repeated toggles (3+ rounds ON→OFF→ON mic): each round SDP renegotiation completes in <1s, no "negotiationneeded" race, pc.signalingState never stuck in "have-local-offer" stuck.

---

### T5 — BUG B.1: Fix StudyRoom.tsx chat input rendering — identify & fix

**Status**: pending
**Priority**: high
**Depends on**: []
**Files**: `frontend/src/pages/live-study/StudyRoom.tsx`
**Description**:

BUG B root cause hypothesis (from code inspection): multiple factors conspiring to cause controlled input update not reflecting visually:
1. `tick` state updates every 1 second → entire component subtree re-rendered EVERY SECOND.
2. Chat messages L1252 have `key={m.id || m.createdAt + Math.random()}` → Math.random() means every render creates NEW keys for messages without stable IDs → React will cause reconciliation will remove+reinsert all those message nodes → heavy DOM churn EVERY second → can cause textarea during 1s tick that the textarea visual caret during typing gets batched React update.

But textarea itself is not keyed. However frequent re-renders around messages list + messages reordering. The caret position during typing controlled textarea update although controlled textarea visually during typing.

Actually more likely the tick causes React reconciliation that there's nothing obviously re-renders cause massive.

Fix checklist (implement both:

1. **CRITICAL**: Replace messages.map key — remove `Math.random()`. Use `key={m.id || m.createdAt ||`unique enough for dedup already guarantees unique enough`.
2. **Defensive**: Extract chat <form> (L1300–L1300–L1338 — wrap the form+textarea inside a `React.memo`-wrapped child component OR verify the existing code adds a `useCallback` for onChange handler and verify there's no unnecessary re-render caused handler identity change identity. Also wrapChatPanel that the `<form>` stable key.
3. **Fix for 1s tick NOT propagates**: Extract the session timer display its own component OR ensure the component re-renders doesn't trigger the containing parent heavy parent re-renders don't cause form children textarea textarea is OK anyway since it's controlled correctly. The real fix #1 Math.random key removal is critical.
4. Add check `sendMessage` wrapped `useCallback` so identity stable identity doesn't trigger children identity change onChange handlers.

Actually, #1 is the most likely culprit since messages remounting messages.list churn remounting each second due to Math.random() keys every second -> every 1s tick the messages list.map remounts -> chat list container causing textarea next DOM siblings remounting every second. We'll implement fix #1 as the primary fix, then wrap sendMessage onChange via useCallback + React.memo a ChatPanel component secondary stability.

Don't remove tick interval entirely — user wants session timer display working.

**Local Test Requirements (TR-T5)**:
- **TR-T5-1 (rule)**: Typing 60 wpm continuous 30s — EVERY character renders. Character counter matches typed textarea visual rendered. Sending works after.
- **TR-T5-2 (rule)**: No visual Caret position Caret doesn't jump back to correct visual jump.
- **TR-T5-3 (rubric 0–2 threshold ≥ 2)**: Enter sends Enter handler works, new message shows up both local + remote receives.

---

### T6 — BUG B.2: Fix remaining chat inputs (SessionsList.tsx + Detail.tsx)

**Status**: pending
**Priority**: high
**Depends on**: [T5]
**Files**:
  - `frontend/src/pages/live-study/SessionsList.tsx` — around L1236 (squad chat input)
  - `frontend/src/pages/study-squads/Detail.tsx` around L587 (squad chat input)
**Description**:
Apply same pattern as T5 to these remaining chats remove chat messages list rendering if it also uses `+ Math.random()` key pattern. Grep for `Math.random()` in both files:
- If found in messages key prop → replace with stable id/createdAt key.
- wrap chatInput onChange handlers `useCallback identity stable identity.
- SessionsList.tsx L794 the duration span uses `key={s.id}-${tick}` key change every sec → only that's only for individual <span> re-render each second → only causing remount entire squad chat. That span only the form ancestor of chat input. Still minor perf optimization not a controlled input rendering key check the key not the squad chat.
- Defensive check tab the duration span key only uses `key=s.id}-${tick}` → move into its `key tick` into formatTimer instead of on outer children. Fine.

**Local Test Requirements (TR-T6)**:
- **TR-T6-1 (rule)**: SessionsList squad detail → OTHER user in squad chat → typing immediate render.
- **TR-T6-2 (rule)**: Detail.tsx standalone → squad page → same input types correctly.
- **TR-T6-3 (rule)**: Focus loss not happening.

---

### T7 — Isolation verification: BAC regression + OTHER regression checks

**Status**: pending
**Priority**: high
**Depends on**: [T1, T2, T3, T4, T5, T6]
**Files**: Code review pass (not write no T1-T6 already)
**Description**: Manual review every bacSection filter:

MANUAL tests:
1. BAC + OTHER squad lists isolation
2. BAC join OTHER squad code 4xx
3. OTHER invite BAC phone → 4xx
4. OTHER session created bacSection = null
5. BAC can join OTHER private session via id via share link → 4xx

**Local Test Requirements (TR-T7)**:
- **TR-T7-1 (rule — BAC→OTHER isolation)**: BAC student get MySquads → returns empty OTHER squad appears.
- **TR-T7-2 (rule — OTHER→BAC isolation)**: OTHER student get /my-squads → NO BAC squads in list.
- **TR-T7-3 (rule — join-by-code cross denied)**: BAC joinByCode OTHER squad → 4xx.
- **TR-T7-4 (rule — invite cross denied)**: OTHER invite BAC phone → 4xx.
- **TR-T7-5 (rule — cross session access denied)**: BAC navigates /live-study/:id of OTHER session bacSection=null → 4xx or redirect not in session.
- **TR-T7-6 (rubric — rubric 0-2 threshold ≥ 2)**: Isolation holds clean error message  clear not partial access leaked chat message leaked anywhere BAC squad.

---

### T8 — Frontend TypeScript Build + Lint + Backend Smoke

**Status**: pending
**Priority**: high
**Depends on**: [T1–T7]
**Files**: All changed files (10).
**Description**:
```
cd frontend && npx tsc --noEmit → NO TS errors.
cd frontend && npx eslint src → error ESLint errors. (warnings allow only pre-existing)
cd backend && node backend/server.js → startup clean no ReferenceError SyntaxError.
```

**Local Test Requirements (TR-T8)**:
- **TR-T8-1 (rule)**: `npx tsc --noEmit frontend → exit 0.
- **TR-T8-2 (rule)**: Backend `node backend/server.js → listens on configured port.
- **TR-T8-3 (rubric 0–2 threshold ≥ 1)**: No new lint errors introduced. Zero browser console errors at run.

---

### T9 — Local end-to-end manual QA full scenario run

**Status**: pending
**Priority**: high
**Depends on**: [T8]
**Files**: N/A (manual run on local)
**Description**: End full scenarios run QA:
1. 2 BAC users → public live study: A+B:
    - Create + join → chat (T4+ (A turn mic ON → B hears (visually green badge lights.
    - A camera ON → B video frame.
    - Chat BUG: B chat messages appear during typing (send arrive remote end (Chat input correctly
2. 2 OTHER students → squad → create squad invite → accept → private study → squad chat realtime → mic/cam bidirectional (fix A3)
3. BAC/OTHER isolation (T7)

**Local Test Requirements (TR-T9)**:
- **TR-T9-1 (rule — BUG A, B ACs)**: Full scenario 1 passes ALL AC-A-1 through AC-A-5 + AC-B-1 + AC-B-3 + AC-B-4.
- **TR-T9-2 (rule — BUG C ACs full + B)**: Scenario 2 passes all AC-C-1 through C-7.
- **TR-T9-3 (rule — isolation)**: Scenario 3 passes T7 all isolation TRs.
- **TR-T9-4 (rubric 0–2 threshold ≥ 1.5)**: Overall subjective stability: zero 404s / no visual broken minor corner >1 breakages.

---

### T10 — Independent review + review.md

**Status**: pending
**Priority**: high
**Depends on**: [T9]
**Files**: `.trae/specs/tunibac-live-study-fix/review.md
**Description**: (after implementer self-review)**:
Write review.md:
- Summary all implemented
- Bugs root cause + patches mapping
- Test results (each TR rule PASS/FAIL
- Rubric scores
- Risks remaining open follow-ups.

**Local Test Requirements**: N/A (rule  review pass (documentary)

---

### T11 (Optional — Deploy (Git push → Render deploy → Production smoke tests

**Status**: pending
**Priority**: high
**Depends on**: [T10]
**Files**: Git commit + deploy
**Description**:
```
git add -A
git commit -m "fix: A WebRTC renegotiation (BUG A), chat input rendering (BUG B), OTHER squad enablement (BUG C)"
git push
Render auto deploys → → wait Render → production smoke tests list + Final Report §22 verbal response.
```

Requires explicit confirmation. No before running. STOP before commit if user wants to hold off.

**Production Smoke Test Requirements (TR-T11)**:
- **TR-T11-1 (rule — deploy URL. On deployed site, OTHER user creates OTHER works.
- **TR-T11-2 (rule — BUG A production)**: 2 real devices/cam audio works  (production deployed URL
- **TR-T11-3 (rule — isolation holds production:**: isolation.
