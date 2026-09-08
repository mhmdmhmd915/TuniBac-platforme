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
  const tokA = loginA.body.token;
  console.log('Logged in A id=', loginA.body.user.id, 'bac=', loginA.body.user.bacSection);

  // First list existing subjects (to get real IDs)
  console.log('\n=== try list subjects endpoint if exists ===');
  const subj1 = await req('GET', '/subjects', tokA);
  console.log('  status=', subj1.status, 'body type=', typeof subj1.body, 'body keys=', Array.isArray(subj1.body)?'array':(typeof subj1.body==='object'?Object.keys(subj1.body):'other'));
  console.log('  sample=', JSON.stringify(subj1.body).slice(0, 500));

  // Test 1: NO subjectId at all
  console.log('\n=== TEST 1: create session WITHOUT subjectId ===');
  const r1 = await req('POST', '/live-study/sessions', tokA, { title: 'Test 1 - No subject' });
  console.log('  status=', r1.status, 'body=', JSON.stringify(r1.body).slice(0, 600));

  // Test 2: subjectId = null
  console.log('\n=== TEST 2: create session subjectId=null ===');
  const r2 = await req('POST', '/live-study/sessions', tokA, { title: 'Test 2 - null subject', subjectId: null });
  console.log('  status=', r2.status, 'body=', JSON.stringify(r2.body).slice(0, 600));

  // Test 3: subjectId = valid UUID format but non-existing
  console.log('\n=== TEST 3: create session subjectId=random UUID (non-existing) ===');
  const r3 = await req('POST', '/live-study/sessions', tokA, { title: 'Test 3 - fake UUID', subjectId: '11111111-1111-1111-1111-111111111111' });
  console.log('  status=', r3.status, 'body=', JSON.stringify(r3.body).slice(0, 600));

  // Test 4: subjectId = 'Math' (bad string)
  console.log('\n=== TEST 4: create session subjectId="Math" (the failing pattern) ===');
  const r4 = await req('POST', '/live-study/sessions', tokA, { title: 'Test 4 - Math string', subjectId: 'Math' });
  console.log('  status=', r4.status, 'body=', JSON.stringify(r4.body).slice(0, 600));
})().catch(e => console.error(e));
