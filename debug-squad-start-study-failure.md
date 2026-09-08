# Debug Session: squad-start-study-failure
Status: [OPEN]
Created: 2026-09-08
## Bug Description
Study Squad integrated into existing Live Study is architecturally correct. Squad create/invite/accept work. The START STUDY button fails when private session → EXISTING Live Study room opens but reports "Couldn't join the session — Server error / Session is closed". Need full A/B/C multi-user E2E verification.
## Hypotheses (Falsifiable)
1. H1 RACE-COND: React Strict Mode double-mount cleanup emits leave-room socket event BEFORE owner completes join → backend autoCloseIfEmpty kills the squad session (session becomes CLOSED pre-join despite age guard).
2. H2 PAYLOAD: liveStudyAPI.createSession({studySquadId}) frontend returns wrong shape. Response is {session:{id}} vs {id}. navigate() receives undefined → navigates to /live-study/undefined or stale closed session.
3. H3 AUTHZ: createSession/joinSession authz check (ensureActiveSquadMember/squad membership check missing or BacSection for a newly created owner.
4. H4 FRAGUARD: autoCloseIfEmpty 10s age guard check bypassed by ACTIVE squad sessions created by A as participant registered but frontend sends a participant registers AS owner registered as ACTIVE <10s.
5. H5 OWNERREG: creator not registered (createSession registers owner → transaction rolls back →  participant — similar to prior similar to earlier race.
## Evidence Collected
| Test Accounts
|Step|Date|Time|Pre-Fix|Post-Fix|
|----|----|----|-------|--------|
| | | | | |
## Files changed
## Verification
