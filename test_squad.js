const fs = require('fs');
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
function T(name, ok) {
  if (ok) { PASS++; console.log('\x1b[32m[PASS]\x1b[0m', name); }
  else { FAIL++; console.log('\x1b[31m[FAIL]\x1b[0m', name); }
}

(async function main() {
  try {
    const loginA = await req('POST', '/auth/login', null, { phone: '+21699000001', password: 'student123' });
    const loginB = await req('POST', '/auth/login', null, { phone: '+21699000002', password: 'student123' });
    const loginM = await req('POST', '/auth/login', null, { phone: '+21699000003', password: 'student123' });
    const tokA = loginA.body.token; const uidA = loginA.body.user.id;
    const tokB = loginB.body.token; const uidB = loginB.body.user.id;
    const tokM = loginM.body.token; const uidM = loginM.body.user.id;
    console.log('logins ok=', !!(tokA && tokB && tokM), 'A=', loginA.body.user.firstName, loginA.body.user.bacSection, 'B=', loginB.body.user.firstName, loginB.body.user.bacSection, 'M=', loginM.body.user.firstName, loginM.body.user.bacSection);

    // T1 create squad SCI_A
    console.log('\n=== T1 create squad ===');
    const c1 = await req('POST', '/study-squads', tokA, { name: 'SCI Warriors' });
    const squadId = c1.body && c1.body.squad && c1.body.squad.id;
    const code = c1.body && c1.body.squad && c1.body.squad.invitationCode;
    T('create squad 200 id/code', c1.status === 200 && !!squadId && !!code);
    console.log('  squadId=', squadId, 'code=', code);

    // T1b get squad detail verify createdBy/A owns it
    console.log('\n=== T1b get squad detail ===');
    const gd = await req('GET', '/study-squads/' + squadId, tokA);
    T('squad detail 200 members=1 role=OWNER', gd.status === 200 && gd.body.squad.members.length === 1 && gd.body.squad.myRole === 'OWNER');

    // T2 list squads A
    const m1 = await req('GET', '/study-squads/mine', tokA);
    T('A mine includes SCI Warriors OWNER', m1.status === 200 && m1.body.squads.some(s => s.name === 'SCI Warriors' && s.myRole === 'OWNER'));

    // T3 B invitations initial empty
    const inv0 = await req('GET', '/study-squads/invitations', tokB);
    T('B invitations empty', inv0.status === 200 && Array.isArray(inv0.body.invitations) && inv0.body.invitations.length === 0);

    // T4 A invites B by phone 99000002 (no +216)
    const invB = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '99000002' });
    console.log('  invite B status', invB.status, JSON.stringify(invB.body));
    T('invite B (phone 99000002) 200', invB.status === 200);

    // T4b duplicate invite
    const invBdup = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '99000002' });
    T('duplicate invite -> 400', invBdup.status === 400);

    // T4c self invite
    const invSelf = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '99000001' });
    T('self invite -> 400', invSelf.status === 400);

    // T4d unknown phone
    const invNF = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '70000000' });
    T('unknown phone -> 404', invNF.status === 404);

    // T4e invite MATH (different Bac)
    const invMath = await req('POST', `/study-squads/${squadId}/invite`, tokA, { phone: '99000003' });
    console.log('  invite MATH status=', invMath.status, JSON.stringify(invMath.body));
    T('invite different BacSection -> 400', invMath.status === 400);

    // T5 B has 1 invitation PENDING
    const inv1 = await req('GET', '/study-squads/invitations', tokB);
    const invitId = inv1.body && inv1.body.invitations && inv1.body.invitations[0] && inv1.body.invitations[0].id;
    console.log('  B invitations=', inv1.status, 'count=', inv1.body && inv1.body.invitations && inv1.body.invitations.length);
    T('B has 1 PENDING invitation', inv1.status === 200 && inv1.body.invitations.length === 1);

    // T6 MATH (Malek) get squad -> 403
    const gM = await req('GET', '/study-squads/' + squadId, tokM);
    T('MATH GET squad -> 403', gM.status === 403);

    // T7 B accepts
    const acc = await req('POST', `/study-squads/invitations/${invitId}/accept`, tokB, {});
    console.log('  B accept status=', acc.status, JSON.stringify(acc.body));
    T('B accept ok', acc.status === 200);

    // T8 B now in squad
    const mb = await req('GET', '/study-squads/mine', tokB);
    T('B in squad as MEMBER', mb.status === 200 && mb.body.squads.some(s => s.id === squadId && s.myRole === 'MEMBER'));

    // T9 squad detail now members=2
    const gd2 = await req('GET', '/study-squads/' + squadId, tokA);
    T('members count=2 after B joined', gd2.status === 200 && gd2.body.squad.members.length === 2);

    // T10 chat A->B
    const ch1 = await req('POST', `/study-squads/${squadId}/chat`, tokA, { content: 'Hello SCI B from A!!' });
    console.log('  chat POST status=', ch1.status, JSON.stringify(ch1.body));
    await new Promise(r => setTimeout(r, 200));
    const ch2 = await req('GET', `/study-squads/${squadId}/chat?limit=10`, tokB);
    const lastMsg = ch2.body && Array.isArray(ch2.body.messages) && ch2.body.messages.length && ch2.body.messages[ch2.body.messages.length - 1];
    T('squad chat A->B msg received', ch1.status === 200 && lastMsg && lastMsg.content === 'Hello SCI B from A!!');

    // T10b MATH reads squad chat -> 403
    const chM = await req('GET', `/study-squads/${squadId}/chat`, tokM);
    T('MATH reads squad chat -> 403', chM.status === 403);

    // T17 MOVED HERE FIRST: public session create + appears in list (ISOLATE FK without studySquadId)
    // NOTE: subjectId omitted intentionally (nullable field); passing string "Math"/"Physics" would FK-violate Subject UUID column
    console.log('\n=== T17-FIRST: public standalone Live Study (no squad) ===');
    const pubC = await req('POST', '/live-study/sessions', tokA, { title: 'Public session test', topic: 'Optics' });
    console.log('  public create status=', pubC.status, 'body=', JSON.stringify(pubC.body).slice(0, 500));
    const pubId = pubC.body && pubC.body.id || (pubC.body && pubC.body.session && pubC.body.session.id);
    const pub2 = await req('GET', '/live-study/sessions', tokA);
    const pub2Ids = (pub2.body.sessions || []).map(s => s.id);
    T('public session appears in public list', pubC.status === 200 && !!pubId && pub2Ids.includes(pubId));

    // T11 create private LIVE study with squadId
    // NOTE: subjectId omitted intentionally (nullable field); passing string label would FK-violate Subject UUID column
    console.log('\n=== T11 create private Live Study ===');
    const pvt = await req('POST', '/live-study/sessions', tokA, { title: 'Private SCI study', topic: 'Algèbre', studySquadId: squadId });
    console.log('  status=', pvt.status, 'body=', JSON.stringify(pvt.body).slice(0, 800));
    const sessionId = pvt.body && pvt.body.id || (pvt.body.session && pvt.body.session.id);
    const attachedSquad = pvt.body && pvt.body.studySquadId || (pvt.body.session && pvt.body.session.studySquadId);
    T('create squad session 200 squadId attached', pvt.status === 200 && !!sessionId && attachedSquad === squadId);

    // T12 public list excludes squad session
    const pub = await req('GET', '/live-study/sessions', tokA);
    const pubIds = (pub.body.sessions || []).map(s => s.id);
    T('public list excludes squad session', pub.status === 200 && !pubIds.includes(sessionId));

    // T13 MATH POST /join squad session -> 403
    if (sessionId) {
      const jm = await req('POST', `/live-study/sessions/${sessionId}/join`, tokM, {});
      T('MATH join squad session -> 403', jm.status === 403);
    } else { T('MATH join squad session -> 403 (skipped: no session)', false); }

    // T14 MATH GET squad session -> 403
    if (sessionId) {
      const gm = await req('GET', `/live-study/sessions/${sessionId}`, tokM);
      T('MATH GET squad session -> 403', gm.status === 403);
    } else { T('MATH GET squad session -> 403 (skipped)', false); }

    // T15 B joins squad session
    if (sessionId) {
      const jb = await req('POST', `/live-study/sessions/${sessionId}/join`, tokB, {});
      console.log('  B join status=', jb.status, JSON.stringify(jb.body));
      T('B (member) joins squad session -> 200 ok', jb.status === 200);
    } else { T('B join squad session', false); }

    // T16 participants = 2
    if (sessionId) {
      await new Promise(r => setTimeout(r, 250));
      const pt = await req('GET', `/live-study/sessions/${sessionId}/participants`, tokA);
      console.log('  participants status=', pt.status, 'keys=', Object.keys(pt.body || {}), 'count=', pt.body && (pt.body.participants && pt.body.participants.length || (Array.isArray(pt.body) && pt.body.length)));
      const list = pt.body && pt.body.participants || (Array.isArray(pt.body) && pt.body) || [];
      T('participants A count=2', pt.status === 200 && list.length >= 2);
    } else { T('participants=2', false); }

    // T18 squad goal upsert B then A reads
    const gu = await req('POST', `/study-squads/${squadId}/goal`, tokB, { title: 'Complete Math chap 4', description: 'Finish algebra', targetDate: '2026-09-15T23:59:00Z', progress: 25, completed: false });
    console.log('  goal upsert B status', gu.status, JSON.stringify(gu.body).slice(0, 300));
    const gd3 = await req('GET', '/study-squads/' + squadId, tokA);
    const goal = gd3.body && gd3.body.squad.goal;
    T('goal upsert + A reads matches', gu.status === 200 && goal && goal.title === 'Complete Math chap 4' && goal.progress === 25 && goal.completed === false);

    // T19 rename squad (owner only) -> non owner fails
    const rnN = await req('PATCH', `/study-squads/${squadId}/rename`, tokB, { name: 'Hacked Name' });
    console.log('  member rename PATCH status=', rnN.status, JSON.stringify(rnN.body));
    T('member rename squad -> 403', rnN.status === 403);
    const rnO = await req('PATCH', `/study-squads/${squadId}/rename`, tokA, { name: 'SCI Warriors Renamed' });
    console.log('  owner rename PATCH status=', rnO.status, JSON.stringify(rnO.body));
    const gd4 = await req('GET', '/study-squads/' + squadId, tokB);
    T('owner rename squad -> 200 persisted', rnO.status === 200 && gd4.body.squad.name === 'SCI Warriors Renamed');

    // T20 MATH join squad by code -> 400/403
    const jcM = await req('POST', '/study-squads/join-by-code', tokM, { code });
    T('MATH join squad by code -> 400/403 Bac', jcM.status === 400 || jcM.status === 403);

  } catch (e) {
    console.error('TEST EXCEPTION:', e);
    FAIL++;
  }

  console.log('\n========================================');
  console.log('TOTAL PASS=', PASS, ' FAIL=', FAIL);
  process.exit(FAIL > 0 ? 1 : 0);
})();
