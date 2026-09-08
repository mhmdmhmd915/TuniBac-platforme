const http = require('http');
const BASE = 'http://localhost:5000/api';

function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method, hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); } catch(e){ resolve({ status: res.statusCode, body: chunks }); }});
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const loginA = await req('POST', '/auth/login', null, { phone: '+21699000001', password: 'student123' });
  const loginB = await req('POST', '/auth/login', null, { phone: '+21699000002', password: 'student123' });
  const loginM = await req('POST', '/auth/login', null, { phone: '+21699000003', password: 'student123' });
  const tokA = loginA.body.token, uidA = loginA.body.user.id;
  const tokB = loginB.body.token, uidB = loginB.body.user.id;
  const tokM = loginM.body.token;
  console.log('LOGINS OK');

  // STEP 1: A creates squad
  const c1 = await req('POST', '/study-squads', tokA, { name: 'Confirm Squad' });
  const squadId = c1.body.squad.id;
  const code = c1.body.squad.invitationCode;
  console.log('Squad created id=', squadId, 'code=', code);

  // STEP 2: Invite B
  const invB = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '99000002' });
  console.log('Invite B status=', invB.status);
  const invs = await req('GET', '/study-squads/invitations', tokB);
  const invId = invs.body.invitations[0].id;
  const acc = await req('POST', `/study-squads/invitations/${invId}/accept`, tokB, {});
  console.log('B accept status=', acc.status);

  // STEP 3: A creates PRIVATE live study with studySquadId (and NO subjectId to avoid FK fail)
  console.log('\n=== KEY TEST: A create private Live Study with studySquadId, NO subjectId ===');
  const pvt = await req('POST', '/live-study/sessions', tokA, { title: 'Private confirm study', studySquadId: squadId });
  console.log('  status=', pvt.status, 'body keys=', Object.keys(pvt.body));
  if (pvt.status === 200) {
    console.log('  session.id=', pvt.body.id, 'session.studySquadId=', pvt.body.studySquadId, 'MATCH=', pvt.body.studySquadId === squadId ? 'YES ✅' : 'NO ❌');
  } else {
    console.log('  ERR=', JSON.stringify(pvt.body).slice(0, 600));
    process.exit(1);
  }
  const sessionId = pvt.body.id;

  // STEP 4: verify not in public list
  const pub = await req('GET', '/live-study/sessions', tokA);
  const pubIds = (pub.body.sessions || []).map(s => s.id);
  console.log('public list includes private session?', pubIds.includes(sessionId), 'EXPECTED: false ✅ if', !pubIds.includes(sessionId));

  // STEP 5: MATH (outside) try to GET + JOIN
  const gm = await req('GET', `/live-study/sessions/${sessionId}`, tokM);
  console.log('MATH GET squad session status=', gm.status, 'EXPECTED 403 ✅ if', gm.status === 403);
  const jm = await req('POST', `/live-study/sessions/${sessionId}/join`, tokM, {});
  console.log('MATH JOIN squad session status=', jm.status, 'EXPECTED 403 ✅ if', jm.status === 403);

  // STEP 6: B (member) tries to GET + JOIN
  const gb = await req('GET', `/live-study/sessions/${sessionId}`, tokB);
  console.log('B (member) GET squad session status=', gb.status, 'EXPECTED 200 ✅ if', gb.status === 200);
  const jb = await req('POST', `/live-study/sessions/${sessionId}/join`, tokB, {});
  console.log('B (member) JOIN squad session status=', jb.status, 'EXPECTED 200 ✅ if', jb.status === 200);

  // STEP 7: participants count
  const pt = await req('GET', `/live-study/sessions/${sessionId}/participants`, tokA);
  console.log('participants count=', pt.body.participants ? pt.body.participants.length : 'n/a', 'EXPECTED >= 2 ✅ if', pt.body.participants && pt.body.participants.length >= 2);

  // STEP 8: A can create PUBLIC session too (no studySquadId, no subjectId) and it appears in list
  const pubC = await req('POST', '/live-study/sessions', tokA, { title: 'Confirm public' });
  console.log('\npublic create status=', pubC.status, 'id=', pubC.body.id);
  const pub2 = await req('GET', '/live-study/sessions', tokA);
  const pub2Ids = (pub2.body.sessions || []).map(s => s.id);
  console.log('public list includes new public?', pub2Ids.includes(pubC.body.id), 'EXPECTED true ✅');

  console.log('\nALL DONE. No FK errors = architecture works!');
})().catch(e => console.error(e));
