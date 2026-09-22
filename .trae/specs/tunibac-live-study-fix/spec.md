# TUNIBAC — LIVE STUDY / LIVE SQUAD Realtime Fixes + QA + Deploy

## 1. Problem Statement

TuniBac has three critical, user-blocking bugs in its Live Study (étude en ligne) and Live Squad (groupe d'étude) features that have been confirmed via static code inspection:

1. **BUG A — WebRTC Media Not Received Remote**: When a user toggles their microphone or camera ON inside a Live Study room, the UI shows the device as enabled (local preview works, button state green), but remote participants DO NOT hear/see the media at all. This is a real realtime/SDP negotiation problem, not a UI state issue.
2. **BUG B — Chat Input Invisible During Typing**: When typing a message in the Live Study chat input (textarea inside StudyRoom.tsx and related chat inputs in SessionsList/Detail pages), typed characters do not render visually in the input field during keystrokes. Messages actually DO send when user presses Enter (content is captured in React state), but the visual display of characters during typing is broken. Fix must address the React-state root cause — CSS-only fixes are not acceptable.
3. **BUG C — OTHER (Non-BAC) Study Squad Completely Broken**: Students with `educationTrack === 'OTHER'` (bacSection=null) cannot use Study Squad at all. Every squad endpoint 403s, they cannot create/join squads, cannot see squad chat, cannot start/join private squad sessions. BAC students continue to work correctly. BUG C must re-use the existing squad architecture (no rebuild) and make the full lifecycle work for OTHER with EXACT same feature parity as BAC squads.

### Constraints on BAC ↔ OTHER Isolation

After BUG C is fixed, strict cross-track isolation MUST remain enforced:
- A BAC student can NEVER join an OTHER-created squad or session
- An OTHER student can NEVER join a BAC-created squad or session
- Database queries continue to filter by `bacSection` (which is null for OTHER, thus naturally isolating them from BAC records that have a non-null bacSection)
- No cross-track invitations allowed

This is a security/data-leakage requirement, not a UX preference. Isolation MUST hold as an invariant after fix.

## 2. Users & Scope

| User type | Description |
|---|---|
| BAC STUDENT | Student with `role='STUDENT'` AND `educationTrack='BAC'` (or default unset) AND non-null `bacSection` (e.g. `MATH`, `SCIENCE_EXP`, etc.) |
| OTHER STUDENT | Student with `role='STUDENT'` AND `educationTrack='OTHER'` AND `bacSection=null` |
| ADMIN / TEACHER | Out of scope — these roles do not participate in squads as members and this spec does not change admin functionality |

Affected surfaces:
- `backend/config/socketServer.js` (BUG A signaling, BUG C room membership)
- `backend/routes/studySquad.js` (BUG C middleware blocker)
- `backend/controllers/studySquadController.js` (BUG C — verify OTHER compatibility)
- `backend/controllers/liveStudyController.js` (BUG C — verify OTHER session parity)
- `backend/middleware/authMiddleware.js` (BUG C — bacOnlyMiddleware scope assessment)
- `frontend/src/pages/live-study/StudyRoom.tsx` (BUG A media manager integration, BUG B chat input)
- `frontend/src/pages/live-study/SessionsList.tsx` (BUG B squad chat input, BUG C OTHER UI parity)
- `frontend/src/pages/study-squads/Detail.tsx` (BUG B squad chat input)
- `frontend/src/lib/webrtcMedia.ts` (BUG A — WebRTC renegotiation)
- `frontend/src/lib/socketClient.ts` (BUG A — signaling review)

## 3. Functional Requirements (per bug)

### BUG A — WebRTC Media (Mic + Cam remote bidirectional)

FR-A-1: After a local participant clicks "Turn mic on" inside any Live Study (public or squad-private session), the `RTCPeerConnection` MUST successfully perform SDP renegotiation (createOffer → setLocalDescription → signaling → setRemoteDescription on remote → createAnswer → signaling → setRemoteDescription on local) so that the **remote peer's `ontrack` handler fires for the audio track**.

FR-A-2: After a local participant clicks "Turn camera on", the same SDP renegotiation MUST happen for the video track so that **remote `ontrack` fires for video track** and the remote `<video>` element receives a stream with non-zero `getVideoTracks().length`.

FR-A-3: Signaling events (`webrtc:offer`, `webrtc:answer`, `webrtc:ice`, `webrtc:bye`) MUST be routed to the **intended recipient socket only** (target = `ev.to`), NOT broadcast to all sockets in the `session:<id>` room. This eliminates signaling echo, unnecessary filtering on frontend, and the race condition where peer B receives offer intended for peer C.

FR-A-4: OTHER students (bacSection=null) MUST be able to join `squad:<id>` socket rooms on initial socket connection (currently socketServer L178 only joins squads if `user.bacSection` is truthy, excluding OTHER entirely from squad realtime events).

FR-A-5: Initial peer-joined offer creation MUST use the standard WebRTC API (`pc.setLocalDescription(await pc.createOffer())`) rather than the non-standard `(pc as any).onnegotiationneeded?.()` direct call, which does not reliably trigger the offer/answer exchange in all browsers.

FR-A-6: After toggling mic or cam OFF, the removed tracks MUST also trigger renegotiation so the remote side stops receiving media (and remote UI shows the mic/cam indicator go out) — this validates that renegotiation works for both add and remove operations.

### BUG B — Chat Input Visual Rendering During Typing

FR-B-1: In `StudyRoom.tsx` chat `<textarea>` (L1306), every character typed via the keyboard MUST be rendered visually inside the textarea within 1 frame of the keystroke. The character count span (L1322 `{messageInput.length}/1000`) MUST update synchronously to match.

FR-B-2: In `SessionsList.tsx` squad chat `<input>` (L1237), every character typed MUST render immediately during typing, and the input field MUST NOT lose focus or reset during a continuous 10-second typing session.

FR-B-3: In `Detail.tsx` squad chat `<input>` (L587), every character typed MUST render immediately during typing with identical behavior to the SessionsList input.

FR-B-4: After fixing BUG B, sending a chat message via Enter key MUST still: (a) prevent default form submission, (b) send content via the relevant API, (c) clear the input on successful send, (d) NOT clear the input if send fails (keep typed characters so user can retry).

FR-B-5: The React-state root cause MUST be addressed — removing the 1s `tick` interval is not required, but any fix must ensure that the 1s tick re-render does not cause the input DOM element to be replaced (i.e., no unstable `key=` props on ancestors of the input subtree, no conditional remounting of the input wrapping form during normal typing, no `AnimatePresence` exit+re-entry of the form subtree during regular state updates).

FR-B-6: Incoming realtime chat messages from the `live-study:presence` / `live-study:chat` socket events, or the 30s heartbeat, MUST NOT cause the textarea/input to lose focus or reset its pending typed-but-not-yet-sent content.

### BUG C — OTHER Track Live Squad Full Parity

FR-C-1: All REST endpoints under `/study-squads/*` MUST respond correctly (not 403) for OTHER authenticated students. The global `bacOnlyMiddleware` currently blocking ALL squad routes MUST be removed OR refined to: (i) not block squad-access endpoints that OTHER legitimately needs (list/create/join/invite/chat/goal/etc.), (ii) continue to block anything that genuinely requires BAC status (if any such squad endpoint exists — inspect and verify).

FR-C-2: OTHER student MUST be able to listMySquads (see squads they are members of), createSquad (new OTHER squad with `bacSection=null` stored), getSquadDetail, renameSquad (if owner), disbandSquad (if owner), leaveSquad, removeMember (if owner), sendChatMessage, listChatHistory, upsertGoal, cancelInvitation (if owner), acceptInvitation, declineInvitation, joinByCode, inviteByPhone — ALL with exactly same workflow and behavior as a BAC student performs these same operations.

FR-C-3: Isolation invariant after BUG C fix:
- When OTHER student calls `createSquad`, DB record `StudySquad.bacSection` MUST be stored as `null` (not empty string, not undefined) — this ensures BAC students with a non-null bacSection filter cannot see OTHER squads.
- When BAC student calls `listMySquads`, controller uses `where: { squad: { bacSection: req.user.bacSection } }` (non-null) so OTHER squads (bacSection=null) are excluded naturally.
- When OTHER student calls `listMySquads`, same query becomes `bacSection: null` so BAC squads are excluded naturally.
- Invite target checks (`inviteByPhone`, `acceptInvitation`, `joinByCode`) use `bacSection !==` equality check; `null !== 'MATH'` is true (blocks), `null !== null` is false (allows) — this maintains cross-track prohibition.

FR-C-4: OTHER student MUST be able to create/start a **private squad Live Study session** (i.e., session with `studySquadId` set) via Start Private Study button in SessionsList tab + Detail page. Session access guards on both the REST `joinSession` endpoint AND socket `session:join-room` handler use `bacSection !== user.bacSection` equality (null===null for OTHER OK), so OTHER must pass through without being blocked.

FR-C-5: OTHER student squad room socket membership: on socket `io.on('connection')`, OTHER STUDENTS with `bacSection=null` MUST still join `squad:<id>` rooms of their squads so they receive realtime events (chat:new, squad:update, squad:member:update). The current guard `if (user.role === 'STUDENT' && user.bacSection)` is too strict.

FR-C-6: BAC student regression: after BUG C fix is applied, a BAC student CANNOT: (a) see OTHER squads appear in their listMySquads response, (b) successfully accept an invitation sent by an OTHER student to a BAC student (must be rejected), (c) successfully joinByCode an OTHER squad's code (must be rejected). In all 3 cases the response MUST be 403 or an appropriate 4xx error with an isolation message, not 200.

## 4. Non-Functional Requirements

NFR-1 **(rule)**: No purple (#800080 / violet / purple family) used as ANY main brand color in any new UI code. Existing palette (navy `#0B5ED7`, amber accents, charcoal slate backgrounds) MUST be preserved. No new color tokens outside the existing palette may be introduced without prior explicit approval.

NFR-2 **(rule)**: Tunisian Derja (Arabic script) MUST remain reserved strictly for motivational sentences / greetings / micro-copy inside the UI. All official labels, technical actions, feature names remain in French or English (Planner, Session, Invitation, Join, etc.). Any new copy added follows this convention. RTL layout issues must not regress (no line-height < 1.6 for Arabic copy, no broken mixed FR/AR inline segments).

NFR-3 **(rule)**: Any Prisma schema change (adding/removing/altering model, field, relation, enum) OR any database DDL (CREATE TABLE/ALTER/DROP/TRUNCATE) is a HARD STOP. STOP execution and request explicit user natural-language written approval BEFORE proceeding. This spec MUST NOT require any schema change — implementation MUST use the existing schema as-is. If an implementation approach is blocked by schema limitation, STOP, explain, and await approval.

NFR-4 **(rule — local-first dev)**: Every bug fix MUST be verified in a LOCAL environment first. All QA in §7 runs against the locally-running `backend/` (Express on PORT default) + `frontend/` (Vite dev server). NO git activity, NO deploy, NO production service connection is discussed until ALL §7 local QA TRs pass with rule=PASS and rubrics ≥ threshold.

NFR-5 **(rule — no destructive git force)**: After local QA passes, git commit → normal `git push` (never `--force`). Deployment is Render normal git-push-triggered auto-deploy (existing configuration — documented, no credentials required, no direct Render API calls needed in implementation).

NFR-6 **(rubric — code quality, 0–2, threshold ≥ 1.5)**:
- Score 0: messy console.log debugging, duplicated code, no error handling, 500s on edge cases.
- Score 1: works for happy path, some missing try/catch, occasional 400 on edge, readable but not DRY.
- Score 2: every Promise has try/catch or `.catch`, every socket ack has timeout, code follows existing file patterns (import order, variable naming matches adjacent code, consistent error shape `{ok:false, message}`), no leftover debug logs (except pre-existing ones), zero new ESLint/TS warnings introduced.

NFR-7 **(rubric — animation polish, 0–2, threshold ≥ 1)**:
- Score 0: new features have no entrance animations, jump into page abruptly, existing Framer Motion layout breaks.
- Score 1: new features reuse existing `motion.*` patterns from adjacent components (variants match `containerVariants` / `itemVariants` where applicable), no jank, no animation frame loss during typing (BUG B area).
- Score 2: all transitions smooth < 16ms jank on main thread, animations respect `prefers-reduced-motion` via system default, no layout shift on chat message insert (BUG B area).

NFR-8 **(rubric — responsive UI, 0–2, threshold ≥ 1)**:
- Score 0: at ≥1 breakpoint (<640px, 640–1024px, >1024px) layout overflows, chat input off-screen, buttons unclickable.
- Score 1: layout usable across all 3 breakpoints; minor wrapping but nothing off-screen / unclickable.
- Score 2: pixel-perfect match of existing responsive behavior (grid collapses same way as Public tab when switching to Squad tab for OTHER, chat input sticks to bottom on small screens same way as StudyRoom.tsx behavior).

NFR-9 **(rule)**: Zero TypeScript `error TS*` output after `npx tsc --noEmit` in `frontend/` directory. Zero ESLint error-level output (warnings OK only if they existed before this change). Backend: NO new `SyntaxError` or `ReferenceError` on `node backend/server.js` startup.

## 5. Assumptions

A1: Existing frontend `.env` has `BACKEND_URL` correctly configured to local dev backend. Backend `.env` has `DATABASE_URL`, `JWT_SECRET`, and PORT set. We will NOT create/modify env values as part of this project; if missing, user must provide.

A2: BAC ↔ OTHER isolation is primarily maintained via `bacSection` field propagation (bacSection = user's bacSection value, or null for OTHER). No schema change, no new middleware — the existing where-clause filters are sufficient. The only code changes are to REMOVE the overly-restrictive upstream middleware that blocks ALL routes for OTHER, and to ensure socket squad-room join accepts bacSection=null.

A3: The user-provided test accounts (1 BAC, 1 OTHER) exist in the current DB (or can be created by user via signup before QA). The implementation does NOT create seed data.

A4: Local testing uses `localhost` same-browser with 2 tabs (incognito + normal) for the 2-user WebRTC test. STUN config currently uses 5 Google `stun:*` servers in `RTC_CONFIG` which works on localhost without TURN. If a local test fails because of NAT (unlikely on loopback), the test step is marked locally-blocked and we document — no TURN integration required by this spec.

A5: The user's spec document (the 712-line input at `c:\Users\MOUHAMED\AppData\...`) was the authoritative requirements input; this spec.md is derived from it, and preserves all its wording with respect to the 3 bugs, isolation, local-first, QA, and deploy sections.

## 6. Open Questions (Resolved via Static Analysis, No User Input Required)

Q1: Can OTHER students create public (non-squad) sessions? — Code inspection confirmed: `liveStudyController.createSession` L95-191 explicitly handles OTHER: `isOther = req.user.educationTrack === 'OTHER'`, stores `bacSection = req.user.bacSection || null`. OTHER public sessions ARE supported, and are isolated (null bacSection). This spec does NOT change this behavior; it only fixes the Squad side. **Answer: Yes, and unchanged by this project.**

Q2: Do socket server guards on `session:join-room`, `chat:send`, `media:update`, `webrtc:hello` actually allow OTHER (null===null)? — Code inspection confirmed: they all use `session.bacSection !== user.bacSection` comparison, which `null !== null` = false → guard passes. **Answer: Yes, these guards work, no change needed in those locations.**

Q3: Does the studySquadController actually enforce cross-track isolation at the DB filter level without middleware? — Code inspection confirmed: `listMySquads` L45, `createSquad` L125, `inviteByPhone` target check L302, `acceptInvitation` L381, `joinByCode` L429 all pass bacSection through equality filter (null for OTHER, specific value for BAC), which naturally separates the populations. **Answer: Yes. The ONLY reason OTHER fails is the route-level middleware.**

## 7. Acceptance Criteria (Rule / Rubric)

All Acceptance Criteria (ACs) are typed `rule` (binary) or `rubric` (0–2 numeric score). Final sign-off requires:
- Every `rule` AC = PASS
- Every `rubric` AC ≥ its threshold

### BUG A Acceptance Criteria

**AC-A-1 (rule — PASS/FAIL)**: Local 2-browser-tab test with user A (BAC) + user B (BAC) in same public session: (1) A clicks mic ON, (2) within 2s B hears A's microphone signal (B's `<audio>`/`<video>` srcObject has audio track with `track.enabled=true` AND B's speaker indicator shows mic active via remote UI — the green mic badge lights up on B's participant list for A). Verified by observing track addition on B's side via browser MediaDevices panel.

**AC-A-2 (rule — PASS/FAIL)**: After A then clicks camera ON in the same 2-user session, B's remote `<video>` element for A MUST display A's camera video feed within 2s (video `readyState >= 2 HAVE_CURRENT_DATA` and `<video>` element has non-empty visual frame — visually confirmed by screenshot or eye during test).

**AC-A-3 (rule — PASS/FAIL)**: Initial peer join offer is created via `createOffer()` standard call. Verified by adding a single `console.trace` line in webrtcMedia during dev (removed before commit) showing `createOffer` appears in the call stack when a new peer joins; OR by verifying in socket.io logs that a `webrtc:offer` with valid SDP is emitted within 1s of the `peer-joined` / `webrtc:hello` socket round-trip.

**AC-A-4 (rule — PASS/FAIL)**: Signaling routing test: open 3 tabs (A, B, C all BAC). A toggles cam while in session. Socket.io debug logs on backend MUST show the `webrtc:offer` was sent to exactly 1 recipient socket (B or C, not both + not A). Verified by console logging in socket.emit target resolution during dev test (log removed before commit).

**AC-A-5 (rubric — 0–2, threshold ≥ 1)**: Cleanup of tracks on mic/cam OFF + session leave: (0) tracks keep transmitting after user clicks Turn mic off or leaves; (1) tracks stop but RTCPeerConnection state gets stuck in "checking" or renegotiation takes >5s; (2) tracks stop, renegotiation completes <1s, peer connection remains in "stable" state for further toggles, and remote indicator badges turn off in sync.

### BUG B Acceptance Criteria

**AC-B-1 (rule — PASS/FAIL)**: Continuous 30s "mashed keyboard" typing test in StudyRoom.tsx chat textarea. EVERY single keystroke (letters, numbers, space, Enter-before-send, backspace, shift+letter caps, emoji) renders inside the textarea immediately. Character counter updates to match on every stroke. At 10s mark mid-sentence, the 1s tick fires 10 times, the heartbeat/presence socket events fire — textarea does not lose typed characters, caret position does not jump to start/end unexpectedly.

**AC-B-2 (rule — PASS/FAIL)**: Same typing test in SessionsList.tsx squad tab → squad detail chat input for an OTHER student. At the end of typing, user presses Enter → message actually arrives in remote OTHER user's chat pane (verifies B + C can pass together).

**AC-B-3 (rule — PASS/FAIL)**: Send failure handling: disable network (offline) mid-typing, press Enter. Input content MUST remain in the field (NOT cleared to ""). Re-enable network, press Enter again → message succeeds and then input clears.

**AC-B-4 (rubric — 0–2, threshold ≥ 1)**: No regressions on form submit behavior after fix: (0) pressing Enter inside textarea submits HTML form default action (page reload / querystring append); (1) Enter sends message as expected but shift+Enter does not insert newline; (2) Enter sends, shift+Enter inserts newline and does not send, exactly as specified in onKeyDown handler. Input placeholder text matches existing.

### BUG C Acceptance Criteria

**AC-C-1 (rule — PASS/FAIL)**: OTHER student can create a squad from SessionsList.tsx → Squad tab → Create a Squad form. HTTP 200/201 returned, squad appears in the "My Squads" list of the creator with bacSection=null (verified via Network tab / response JSON).

**AC-C-2 (rule — PASS/FAIL)**: OTHER owner invites OTHER target by phone → invitation list updates, target OTHER student can accept invitation → appears in My Squads for both. Membership DB row exists for both with `StudySquad.bacSection = null`.

**AC-C-3 (rule — PASS/FAIL)**: OTHER owner clicks Start Private Study in squad detail → a session is created with `studySquadId=<squad.id>` AND `bacSection=null` → both OTHER students navigate/join successfully, participants list shows both, chat message typed on one side arrives at the other in <1s.

**AC-C-4 (rule — PASS/FAIL)**: BAC student regression isolation test 1: BAC student tries to `joinByCode` the OTHER squad's invitation code → gets 4xx with message about track/squad mismatch (NOT 200).

**AC-C-5 (rule — PASS/FAIL)**: BAC student regression isolation test 2: OTHER owner sends invitation to a BAC phone number → `inviteByPhone` returns 4xx with mismatch message. If invitation somehow arrives (e.g., phone matching user found), the BAC student's accept call returns 4xx. Either way — BAC student is NOT added to OTHER squad membership.

**AC-C-6 (rule — PASS/FAIL)**: OTHER student socket squad room membership: OTHER user logs in → socket connection → inspects socket.rooms on server (via debug log / dev console) — `squad:<squadId>` appears in socket.rooms for every OTHER squad that user is a member of. When OTHER A sends chat message, OTHER B's socket receives the event and updates UI (confirms the room join works end-to-end for realtime).

**AC-C-7 (rubric — 0–2, threshold ≥ 1.5)**: OTHER full feature parity UX vs BAC: (0) OTHER sees broken nav, 404s on squad detail route, empty states that look crashy; (1) OTHER has same functionality but some labels/svgs/placeholder copy differ from BAC; (2) OTHER's Squad tab UI is indistinguishable from BAC's UI — same buttons, same colors, same empty-state copy, same flow for create/invite/join/start/leave/disband.

## 8. Non-Goals (Out of Scope)

NG-1: Do NOT rebuild the WebRTC architecture from scratch (e.g. replacing it with Pion, LiveKit, Jitsi). Reuse existing `WebRtcMediaManager` class and socket-based signaling.

NG-2: Do NOT add new Prisma models/tables/enums (HARD STOP per NFR-3).

NG-3: Do NOT change the authentication flow or JWT structure.

NG-4: Do NOT implement TURN server; STUN-only is acceptable per A4.

NG-5: Do NOT create a full end-to-end automated test suite; local manual QA per §7 is sufficient.

NG-6: Do NOT add mobile app / PWA support or change the responsive system beyond NFR-8.

NG-7: Do NOT add admin features or change admin panel behavior for squads.

NG-8: Do NOT write the final deployment report (§22 of user's original spec) as a standalone document until requested after deploy completes. The final report text is provided to user inline in the final assistant response after deploy smoke tests pass.
