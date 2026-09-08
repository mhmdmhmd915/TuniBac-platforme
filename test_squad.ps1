$ErrorActionPreference = "Stop"
$tokenA = Get-Content ".\sci_a_token.txt"
$tokenB = Get-Content ".\sci_b_token.txt"
$tokenM = Get-Content ".\math_token.txt"
$hA = @{ Authorization = "Bearer "+$tokenA }
$hB = @{ Authorization = "Bearer "+$tokenB }
$hM = @{ Authorization = "Bearer "+$tokenM }
$base = "http://localhost:5000/api"
$PASS=0; $FAIL=0
function T($name,$ok) { if ($ok) { Write-Host "[PASS] $name" -ForegroundColor Green; $global:PASS++ } else { Write-Host "[FAIL] $name" -ForegroundColor Red; $global:FAIL++ } }
function body($o) { return $o | ConvertTo-Json -Depth 5 }

# T1 SCI_A create squad
Write-Host "=== T1 SCI_A create squad SCI Warriors ===" -ForegroundColor Cyan
try {
  $r1 = Invoke-RestMethod -Uri "$base/study-squads" -Method Post -Headers $hA -Body (body @{ name="SCI Warriors" }) -ContentType "application/json" -UseBasicParsing
  $squadId = $r1.squad.id
  $code = $r1.squad.invitationCode
  T "create squad (200, has id)" (($squadId -ne $null) -and ($code -ne $null))
  Set-Content -Path ".\squad.txt" -Value $squadId
  Set-Content -Path ".\squad_code.txt" -Value $code
} catch { T "create squad" $false; Write-Host $_.Exception.Message; exit 1 }

# T2 SCI_A list squads
Write-Host "=== T2 SCI_A list mine ===" -ForegroundColor Cyan
$r1b = Invoke-RestMethod -Uri "$base/study-squads/mine" -Headers $hA -UseBasicParsing
$listSquads = $r1b.squads
T "my squads has SCI Warriors" (($listSquads.Count -ge 1) -and ($listSquads[0].name -eq "SCI Warriors") -and ($listSquads[0].myRole -eq "OWNER"))

# T3 SCI_B list invitations empty
Write-Host "=== T3 SCI_B list invitations (empty initially) ===" -ForegroundColor Cyan
$rInvit0 = Invoke-RestMethod -Uri "$base/study-squads/invitations" -Headers $hB -UseBasicParsing
T "SCI_B initial invitations empty" ($rInvit0.invitations.Count -eq 0)

# T4 SCI_A invite SCI_B by phone 99000002 (no +216)
Write-Host "=== T4 SCI_A invite SCI_B phone 99000002 ===" -ForegroundColor Cyan
try {
  $rInv = Invoke-RestMethod -Uri "$base/study-squads/$squadId/invite" -Method Post -Headers $hA -Body (body @{ phone="99000002" }) -ContentType "application/json" -UseBasicParsing
  T "invite SCI_B ok" ($rInv.ok -eq $true)
} catch { T "invite SCI_B ok" $false; Write-Host $_.Exception.Message }

# T4b SCI_A invite SCI_B again (dup pending) -> should fail 400
Write-Host "=== T4b SCI_A dup invite SCI_B -> 400 ===" -ForegroundColor Cyan
$dupOk=$false
try {
  Invoke-RestMethod -Uri "$base/study-squads/$squadId/invite" -Method Post -Headers $hA -Body (body @{ phone="99000002" }) -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 400) { $dupOk=$true }
}
T "duplicate invite returns 400" $dupOk

# T4c SCI_A invite self -> should fail
Write-Host "=== T4c SCI_A invite self (99000001) -> 400 ===" -ForegroundColor Cyan
$selfOk=$false
try {
  Invoke-RestMethod -Uri "$base/study-squads/$squadId/invite" -Method Post -Headers $hA -Body (body @{ phone="99000001" }) -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 400) { $selfOk=$true }
}
T "self invite returns 400" $selfOk

# T4d SCI_A invite unknown phone -> User not found 404
Write-Host "=== T4d SCI_A invite bad phone 70000000 -> 404 User not found ===" -ForegroundColor Cyan
$nfOk=$false
try {
  Invoke-RestMethod -Uri "$base/study-squads/$squadId/invite" -Method Post -Headers $hA -Body (body @{ phone="70000000" }) -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 404) { $nfOk=$true }
}
T "unknown phone invite -> 404" $nfOk

# T4e SCI_A invite MATH student (different BacSection) -> fail 400
Write-Host "=== T4e SCI_A invite MATH student 99000003 -> 400 different Bac ===" -ForegroundColor Cyan
$diffBacOk=$false
try {
  Invoke-RestMethod -Uri "$base/study-squads/$squadId/invite" -Method Post -Headers $hA -Body (body @{ phone="99000003" }) -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 400) { $diffBacOk=$true }
}
T "invite different BacSection -> 400" $diffBacOk

# T5 SCI_B list invitations now
Write-Host "=== T5 SCI_B list invitations now has 1 PENDING ===" -ForegroundColor Cyan
$rInvit1 = Invoke-RestMethod -Uri "$base/study-squads/invitations" -Headers $hB -UseBasicParsing
$invitId = $rInvit1.invitations[0].id
T "SCI_B invitations count=1 status=PENDING" (($rInvit1.invitations.Count -eq 1) -and ($rInvit1.invitations[0].status -eq "PENDING"))
Set-Content -Path ".\invit_id.txt" -Value $invitId

# T6 SCI_MATH (MALEK) tries get squad detail directly -> 403
Write-Host "=== T6 MATH student GET squad id directly -> 403 BacSection mismatch ===" -ForegroundColor Cyan
$mathAccess=$false
try {
  Invoke-RestMethod -Uri "$base/study-squads/$squadId" -Headers $hM -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 403) { $mathAccess=$true }
}
T "MATH GET squad -> 403" $mathAccess

# T7 SCI_B accept invitation
Write-Host "=== T7 SCI_B accept invitation ===" -ForegroundColor Cyan
try {
  $rAcc = Invoke-RestMethod -Uri "$base/study-squads/invitations/$invitId/accept" -Method Post -Headers $hB -ContentType "application/json" -UseBasicParsing
  T "SCI_B accept ok" ($rAcc.ok -eq $true)
} catch { T "SCI_B accept ok" $false; Write-Host $_.Exception.Message }

# T8 SCI_B list squads now contains SCI Warriors
Write-Host "=== T8 SCI_B list squads now has 1 SCI Warriors role MEMBER ===" -ForegroundColor Cyan
$rBList = Invoke-RestMethod -Uri "$base/study-squads/mine" -Headers $hB -UseBasicParsing
T "SCI_B joined squad" (($rBList.squads.Count -ge 1) -and ($rBList.squads[0].name -eq "SCI Warriors") -and ($rBList.squads[0].myRole -eq "MEMBER"))

# T9 SCI_A get squad detail -> members 2, invitations 0 pending
Write-Host "=== T9 SCI_A squad detail members=2 ===" -ForegroundColor Cyan
$rDet = Invoke-RestMethod -Uri "$base/study-squads/$squadId" -Headers $hA -UseBasicParsing
T "squad detail members=2" ($rDet.squad.members.Count -eq 2)

# T10 SCI_A chat message, SCI_B list chat
Write-Host "=== T10 Squad chat A->B ===" -ForegroundColor Cyan
try {
  $rCh1 = Invoke-RestMethod -Uri "$base/study-squads/$squadId/chat" -Method Post -Headers $hA -Body (body @{ content="Hello SCI B from A!" }) -ContentType "application/json" -UseBasicParsing
  Start-Sleep -Milliseconds 200
  $rCh2 = Invoke-RestMethod -Uri "$base/study-squads/$squadId/chat?limit=10" -Headers $hB -UseBasicParsing
  $last = $rCh2.messages[-1]
  T "chat message visible by B" (($rCh1.ok -eq $true) -and ($last.content -eq "Hello SCI B from A!"))
} catch { T "chat message visible by B" $false; Write-Host $_.Exception.Message }

# T11 SCI_A creates private Live Study session with squadId
Write-Host "=== T11 SCI_A Start Study -> create LiveStudy with studySquadId ===" -ForegroundColor Cyan
$rSes = Invoke-RestMethod -Uri "$base/live-study/sessions" -Method Post -Headers $hA -Body (body @{ title="Private SCI Session"; subjectId="Math"; topic="Algebra"; studySquadId=$squadId }) -ContentType "application/json" -UseBasicParsing
$sessionId = $rSes.session.id
$attached = $rSes.session.studySquadId
T "session created with studySquadId = squadId" ($attached -eq $squadId)
Set-Content -Path ".\session_id.txt" -Value $sessionId

# T12 Public list MUST NOT include this squad session
Write-Host "=== T12 Public /live-study/sessions EXCLUDE squad session ===" -ForegroundColor Cyan
$rPub = Invoke-RestMethod -Uri "$base/live-study/sessions" -Headers $hA -UseBasicParsing
$ids = @()
foreach ($s in $rPub.sessions) { $ids += $s.id }
T "public list NOT contains squad sessionId" ($ids -notcontains $sessionId)

# T13 MALEK (MATH) join squad session directly via REST -> 403
Write-Host "=== T13 MATH student join squad session (REST POST /join) -> 403 ===" -ForegroundColor Cyan
$mathJoin=$false
try {
  Invoke-RestMethod -Uri "$base/live-study/sessions/$sessionId/join" -Method Post -Headers $hM -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and ($_.Exception.Response.StatusCode.value__ -eq 403 -or $_.Exception.Response.StatusCode.value__ -eq 401)) { $mathJoin=$true }
}
T "MATH student join squad session -> 403" $mathJoin

# T14 MALEK (MATH) get session by id REST -> 403
Write-Host "=== T14 MATH student GET squad sessionId detail -> 403 ===" -ForegroundColor Cyan
$mathGet=$false
try {
  Invoke-RestMethod -Uri "$base/live-study/sessions/$sessionId" -Headers $hM -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and ($_.Exception.Response.StatusCode.value__ -eq 403)) { $mathGet=$true }
}
T "MATH GET squad session -> 403" $mathGet

# T15 SCI_B join squad session (REST) -> 200 OK
Write-Host "=== T15 SCI_B member JOIN squad session -> 200 OK ===" -ForegroundColor Cyan
try {
  $rJoinB = Invoke-RestMethod -Uri "$base/live-study/sessions/$sessionId/join" -Method Post -Headers $hB -ContentType "application/json" -UseBasicParsing
  T "SCI_B joins squad session ok" ($rJoinB.ok -eq $true)
} catch { T "SCI_B joins squad session ok" $false; Write-Host $_.Exception.Message }

# T16 SCI_A list session participants -> 2 members (A+B, not MATH)
Write-Host "=== T16 Participants = 2 (A and B) ===" -ForegroundColor Cyan
$rPart = Invoke-RestMethod -Uri "$base/live-study/sessions/$sessionId/participants" -Headers $hA -UseBasicParsing
T "participant count = 2" ($rPart.participants.Count -eq 2)

# T17 SCI_A create public session (no studySquadId) -> appears in public list
Write-Host "=== T17 Public session appears in public list ===" -ForegroundColor Cyan
$rPubSes = Invoke-RestMethod -Uri "$base/live-study/sessions" -Method Post -Headers $hA -Body (body @{ title="Public session test"; subjectId="Physics"; topic="Optics" }) -ContentType "application/json" -UseBasicParsing
$publicId = $rPubSes.session.id
$rPub2 = Invoke-RestMethod -Uri "$base/live-study/sessions" -Headers $hA -UseBasicParsing
$ids2 = @()
foreach ($s in $rPub2.sessions) { $ids2 += $s.id }
T "public session appears in public list" ($ids2 -contains $publicId)

# T18 SCI_B sends squad goal upsert
Write-Host "=== T18 Squad Goal upsert SCI_B -> success ===" -ForegroundColor Cyan
try {
  $rGoal = Invoke-RestMethod -Uri "$base/study-squads/$squadId/goal" -Method Post -Headers $hB -Body (body @{ title="Complete Math chap 4"; description="We finish algebra"; targetDate="2026-09-15T23:59:00Z"; progress=25; completed=$false }) -ContentType "application/json" -UseBasicParsing
  T "goal upsert success" ($rGoal.goal.title -eq "Complete Math chap 4")
} catch { T "goal upsert success" $false; Write-Host $_.Exception.Message }

# T19 SCI_A reads goal, matches
Write-Host "=== T19 SCI_A reads goal matches ===" -ForegroundColor Cyan
$rDet2 = Invoke-RestMethod -Uri "$base/study-squads/$squadId" -Headers $hA -UseBasicParsing
T "goal progress 25 not completed" (($rDet2.squad.goal.progress -eq 25) -and ($rDet2.squad.goal.completed -eq $false))

# T20 MALEK join squad by code -> 400/403 BacSection wrong
Write-Host "=== T20 MATH student join squad by code -> 400/403 BacSection ===" -ForegroundColor Cyan
$sc = Get-Content ".\squad_code.txt"
$codeBad=$false
try {
  Invoke-RestMethod -Uri "$base/study-squads/join-by-code" -Method Post -Headers $hM -Body (body @{ code=$sc }) -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  if ($_.Exception.Response -and ($_.Exception.Response.StatusCode.value__ -eq 400 -or $_.Exception.Response.StatusCode.value__ -eq 403)) { $codeBad=$true }
}
T "MATH join code -> 400/403" $codeBad

Write-Host ""
Write-Host "================================================"
Write-Host "TOTAL: PASS=$PASS FAIL=$FAIL"
if ($FAIL -gt 0) { Write-Host "RESULT: FAILING" -ForegroundColor Red; exit 1 } else { Write-Host "RESULT: ALL TESTS PASSED" -ForegroundColor Green }
