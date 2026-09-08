// ============================================================
// FINAL SQUAD ACCEPTANCE TEST — uses actual seed accounts
// Squad Test A (99111111) / B (99222222) / C (99333333) MATHEMATIQUES
// Squad Test D (99444444) SCIENCES_EXPERIMENTALES (out-of-squad security)
// ============================================================
const http = require('http');
const BASE = 'http://localhost:5000/api';

function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => {
        let json = null;
        try { json = chunks ? JSON.parse(chunks) : null; } catch (e) { json = chunks; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let PASS = 0, FAIL = 0;
function T(name, ok, detail) {
  if (ok) { PASS++; console.log('\x1b[32m[PASS]\x1b[0m', name + (detail ? '  —  ' + detail : '')); }
  else { FAIL++; console.log('\x1b[31m[FAIL]\x1b[0m', name + (detail ? '  —  ' + detail : '')); }
}

(async function main() {
  console.log('\n========================================================');
  console.log(' FINAL SQUAD + PRIVATE LIVE STUDY ACCEPTANCE TEST ');
  console.log('========================================================\n');

  // ---- 1. LOGIN ALL 4 STUDENTS ----
  const [lA, lB, lC, lD] = await Promise.all([
    req('POST', '/auth/login', null, { phone: '+21699111111', password: 'student123' }),
    req('POST', '/auth/login', null, { phone: '+21699222222', password: 'student123' }),
    req('POST', '/auth/login', null, { phone: '+21699333333', password: 'student123' }),
    req('POST', '/auth/login', null, { phone: '+21699444444', password: 'student123' }),
  ]);
  const tokA = lA.body?.token; const uidA = lA.body?.user?.id; const secA = lA.body?.user?.bacSection;
  const tokB = lB.body?.token; const uidB = lB.body?.user?.id; const secB = lB.body?.user?.bacSection;
  const tokC = lC.body?.token; const uidC = lC.body?.user?.id; const secC = lC.body?.user?.bacSection;
  const tokD = lD.body?.token; const uidD = lD.body?.user?.id; const secD = lD.body?.user?.bacSection;
  T('Login A (99111111) STUDENT', !!tokA && lA.body.user.role === 'STUDENT', `section=${secA}`);
  T('Login B (99222222) STUDENT', !!tokB && lB.body.user.role === 'STUDENT', `section=${secB}`);
  T('Login C (99333333) STUDENT', !!tokC && lC.body.user.role === 'STUDENT', `section=${secC}`);
  T('Login D (99444444) STUDENT (SCI out-squad security)', !!tokD && lD.body.user.role === 'STUDENT', `section=${secD}`);
  T('A/B/C same BacSection MATHEMATIQUES', secA === 'MATHEMATIQUES' && secB === 'MATHEMATIQUES' && secC === 'MATHEMATIQUES');
  T('D different BacSection (SCIENCES_EXP)', secD !== secA);

  // ---- 2. A creates squad "Math Warriors" ----
  console.log('\n--- SQUAD CREATE ---');
  const cr = await req('POST', '/study-squads', tokA, { name: 'Math Warriors Acceptance' });
  T('A creates squad -> 200', cr.status === 200);
  const squadId = cr.body?.squad?.id;
  const squadCode = cr.body?.squad?.invitationCode;
  T('squad id + invitation code exist', !!squadId && !!squadCode, `id=${squadId?.slice(0,8)}... code=${squadCode}`);
  T('squad owner A + section MATHS', cr.body?.squad?.bacSection === 'MATHEMATIQUES' && cr.body?.squad?.status === 'ACTIVE');

  // ---- 3. A invites B + C by 8-digit phone ----
  console.log('\n--- INVITE B + C ---');
  const invB = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '99222222' });
  T('invite B (phone 99222222) -> 200', invB.status === 200);
  const invC = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '99333333' });
  T('invite C (phone 99333333) -> 200', invC.status === 200);

  // B & C see invitations
  const invListB = await req('GET', '/study-squads/invitations', tokB);
  const invListC = await req('GET', '/study-squads/invitations', tokC);
  const invitIdB = invListB.body?.invitations?.[0]?.id;
  const invitIdC = invListC.body?.invitations?.[0]?.id;
  T('B sees 1 PENDING invite', invListB.status === 200 && invListB.body.invitations.length >= 1);
  T('C sees 1 PENDING invite', invListC.status === 200 && invListC.body.invitations.length >= 1);

  // ---- 4. B and C ACCEPT ----
  console.log('\n--- ACCEPT B + C ---');
  const accB = await req('POST', `/study-squads/invitations/${invitIdB}/accept`, tokB, {});
  T('B accepts -> 200', accB.status === 200, JSON.stringify(accB.body).slice(0,120));
  const accC = await req('POST', `/study-squads/invitations/${invitIdC}/accept`, tokC, {});
  T('C accepts -> 200', accC.status === 200);

  // All 3 in squad now
  const sdA = await req('GET', `/study-squads/${squadId}`, tokA);
  const members = sdA.body?.squad?.members || [];
  const ids = members.map(m => m.userId);
  T('squad has 3 members (A+B+C)', sdA.status === 200 && members.length === 3, `members=${members.length} uids=${ids.map(i=>i?.slice(0,6)).join(',')}`);
  T('squad contains A uid', ids.includes(uidA));
  T('squad contains B uid', ids.includes(uidB));
  T('squad contains C uid', ids.includes(uidC));

  // B & C see squad in /mine
  const mineB = await req('GET', '/study-squads/mine', tokB);
  const mineC = await req('GET', '/study-squads/mine', tokC);
  T('B sees squad in /mine', mineB.status === 200 && mineB.body.squads.some(s => s.id === squadId));
  T('C sees squad in /mine', mineC.status === 200 && mineC.body.squads.some(s => s.id === squadId));

  // ---- 5. D SECURITY (out-of-squad, different section) ----
  console.log('\n--- D NON-MEMBER SECURITY (squad access) ---');
  const gsdD = await req('GET', `/study-squads/${squadId}`, tokD);
  T('D (SCI) GET squad -> 403', gsdD.status === 403, `actual=${gsdD.status}`);
  const mineD = await req('GET', '/study-squads/mine', tokD);
  T('D /mine does NOT contain Math Warriors Acceptance', mineD.status === 200 && !mineD.body.squads.some(s => s.id === squadId));
  const invsD = await req('GET', '/study-squads/invitations', tokD);
  T('D invitations empty', invsD.status === 200 && invsD.body.invitations.length === 0);

  // ---- 6. A STARTS PRIVATE LIVE STUDY (critical Start Study flow) ----
  console.log('\n--- PRIVATE LIVE STUDY SESSION CREATE ---');
  const sess = await req('POST', '/live-study/sessions', tokA, {
    title: 'Math Warriors Private Acceptance',
    studySquadId: squadId,
  });
  T('A creates private session -> 200', sess.status === 200, `status=${sess.status} err=${JSON.stringify(sess.body?.error||'').slice(0,120)}`);
  const sesId = sess.body?.id || sess.body?.session?.id;
  const statusSes = sess.body?.status || sess.body?.session?.status;
  const sesSquadFk = sess.body?.studySquadId || sess.body?.session?.studySquadId;
  T('session id present', !!sesId, `sesId=${sesId?.slice(0,12)}...`);
  T('session ACTIVE (LIVE/open lifecycle)', statusSes === 'ACTIVE', `actual=${statusSes}`);
  T('session studySquadId FK linked to squad', sesSquadFk === squadId, `fk=${sesSquadFk?.slice(0,8)} squad=${squadId?.slice(0,8)}`);

  // ---- 7. B + C JOIN same private session (backend authz verify membership) ----
  console.log('\n--- B + C JOIN PRIVATE SESSION ---');
  const joinB = await req('POST', `/live-study/sessions/${sesId}/join`, tokB, {});
  T('B joins private session -> 200', joinB.status === 200, JSON.stringify(joinB.body).slice(0,160));
  const joinC = await req('POST', `/live-study/sessions/${sesId}/join`, tokC, {});
  T('C joins private session -> 200', joinC.status === 200);

  // Verify participants now = 3 (A auto + B + C)
  const parts = await req('GET', `/live-study/sessions/${sesId}/participants`, tokA);
  T('participants API 200', parts.status === 200);
  const pcount = Array.isArray(parts.body?.participants) ? parts.body.participants.length : 0;
  T('participants count >=3 (A+B+C)', pcount >= 3, `count=${pcount}`);

  // ---- 8. D SECURITY CANNOT JOIN PRIVATE SESSION ----
  console.log('\n--- D SECURITY CANNOT JOIN PRIVATE (URL bypass attempt) ---');
  const joinD = await req('POST', `/live-study/sessions/${sesId}/join`, tokD, {});
  T('D (SCI out-squad) join -> 403/400', joinD.status === 403 || joinD.status === 400, `actual=${joinD.status}`);

  // D GET participants denied
  const partD = await req('GET', `/live-study/sessions/${sesId}/participants`, tokD);
  T('D GET participants -> 403/401', partD.status === 403 || partD.status === 401 || partD.status === 400, `actual=${partD.status}`);

  // ---- 9. PUBLIC LIST FILTERING: private session NOT in public list ----
  console.log('\n--- PUBLIC SESSIONS LIST FILTER ---');
  const pubList = await req('GET', '/live-study/sessions', tokB);
  T('public list 200', pubList.status === 200);
  const pubSessions = pubList.body?.sessions || pubList.body || [];
  const containsPriv = Array.isArray(pubSessions) ? pubSessions.some(s => s.id === sesId) : false;
  T('private session (studySquadId!=null) NOT in public /live-study/sessions list', !containsPriv, `listedPublicly=${containsPriv} totalPub=${pubSessions.length}`);

  // ---- 10. PUBLIC REGRESSION: B creates normal PUBLIC session, C joins ----
  console.log('\n--- PUBLIC REGRESSION: standalone public session works ---');
  const pub = await req('POST', '/live-study/sessions', tokB, { title: 'Public Regression Acceptance' });
  T('B creates PUBLIC session -> 200', pub.status === 200);
  const pubId = pub.body?.id || pub.body?.session?.id;
  const pubFk = pub.body?.studySquadId || pub.body?.session?.studySquadId;
  T('public session studySquadId FK = NULL', pubFk === null || pubFk === undefined, `fk=${pubFk}`);
  const joinPubC = await req('POST', `/live-study/sessions/${pubId}/join`, tokC, {});
  T('C joins B public session -> 200', joinPubC.status === 200);

  // ---- 11. FINISH / CLOSE OWNER (A closes private session) ----
  console.log('\n--- SESSION CLOSE: owner A finishes private session ---');
  const fin = await req('POST', `/live-study/sessions/${sesId}/finish`, tokA, {});
  T('A finish session -> 200', fin.status === 200, `status=${fin.status} body=${JSON.stringify(fin.body).slice(0,120)}`);

  // After close: B cannot join
  const joinBafter = await req('POST', `/live-study/sessions/${sesId}/join`, tokB, {});
  T('After close B re-join rejected', joinBafter.status !== 200, `actual=${joinBafter.status}`);

  // ---- Summary ----
  console.log('\n========================================================');
  console.log(' RESULTS: PASS = ' + PASS + ' / FAIL = ' + FAIL);
  console.log('========================================================\n');
  process.exit(FAIL === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
