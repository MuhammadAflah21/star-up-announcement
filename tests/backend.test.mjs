// Isolated HTTP mocks; no real Supabase/network credentials are used.
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/cek-nim.mjs';
import { checkRateLimit } from '../lib/rate-limit.mjs';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
let calls, mode, now, windows, contact, division;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  calls = []; mode = 'normal'; now = 0; windows = new Map(); contact = null; division = 'PDD';
  process.env.SUPABASE_URL = 'https://supabase.invalid';
  process.env.SUPABASE_SECRET_KEY = 'test-only-secret';
  process.env.RATE_LIMIT_SECRET = 'test-only-rate-secret-32-characters-long';
  process.env.ANNOUNCEMENT_OPEN = 'true';
  process.env.VERCEL_ENV = 'development';
  delete process.env.VERCEL;
  for (const key of ['CP_1_DIVISIONS','CP_2_DIVISIONS','CP_1_WHATSAPP','CP_2_WHATSAPP']) delete process.env[key];
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    assert.equal(url.host, 'supabase.invalid');
    const body = options?.body ? JSON.parse(options.body) : null;
    calls.push({ path: url.pathname, body, query: url.searchParams });
    if (url.pathname.endsWith('/rpc/consume_announcement_rate_limit')) {
      if (mode === 'rpc-error') return json({ message: 'test RPC failure' }, 400);
      if (mode === 'rpc-malformed') return json([{ allowed: false, retry_after_seconds: null }]);
      const key = body.p_key_hash;
      let bucket = windows.get(key);
      if (!bucket || now >= bucket.expiry) { bucket = { count: 0, expiry: now + 600 }; windows.set(key, bucket); }
      bucket.count++;
      return json([{ allowed: bucket.count <= 5, retry_after_seconds: bucket.expiry - now }]);
    }
    if (url.pathname.endsWith('/peserta')) {
      if (mode === 'connection-error') throw new Error('test database connection failure');
      if (mode === 'query-error') return json({ message: 'test query error' }, 400);
      const nim = url.searchParams.get('nim').replace('eq.', '');
      if (nim === 'TEST00003') return json([]);
      return json([{ nim, nama: mode === 'bad-name' ? '' : 'Peserta Uji', status: mode === 'bad-status' ? 'unknown' : nim === 'TEST00002' ? 'not-accepted' : 'accepted', divisi: mode === 'bad-division' ? null : division }]);
    }
    if (url.pathname.endsWith('/koordinator')) {
      if (mode === 'contact-error') return json({ message: 'test contact query failure' }, 400);
      return json(contact ? [contact] : []);
    }
    throw new Error('Unexpected mock endpoint');
  };
});
after(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
async function request(nim = 'TEST00001', overrides = {}) {
  const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: { nim }, socket: { remoteAddress: '127.0.0.1' }, ...overrides };
  const res = { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res); return res;
}
for (const [nim, status] of [['TEST00001','accepted'],['TEST00002','not-accepted'],['TEST00003','not-found']]) {
  test(`API ${nim} → ${status}`, async () => {
    const r = await request(nim); assert.equal(r.code,200); assert.equal(r.body.status,status);
    assert.equal(calls[0].path,'/rest/v1/rpc/consume_announcement_rate_limit');
    assert.equal(calls.filter(c=>c.path.includes('/rpc/')).length,1);
    assert.equal(r.headers['Cache-Control'],'no-store');
    if(status!=='accepted') assert.equal(r.body.coordinator,undefined);
  });
}
test('uppercase and leading zero remain strings', async () => {
  assert.equal((await request('test00001')).body.nim,'TEST00001');
  assert.equal((await request('0TEST0001')).body.nim,'0TEST0001');
});
for(const nim of ['', 'TEST0001','TEST000001','TEST0000!', ' TEST0001','ABCDEFGHI','123456789',123456789,'TEſT00001']) {
  test(`reject invalid NIM ${JSON.stringify(nim)}`, async()=>{ assert.equal((await request(nim)).code,400); assert.equal(calls.length,0); });
}
test('wrong method', async()=>{const r=await request(undefined,{method:'GET'});assert.equal(r.code,405);assert.equal(r.headers.Allow,'POST');assert.equal(calls.length,0);});
test('wrong content type',async()=>{assert.equal((await request(undefined,{headers:{'content-type':'text/plain'}})).code,415);});
test('missing environment and closed announcement fail safely',async()=>{
  process.env.ANNOUNCEMENT_OPEN='false';assert.equal((await request()).code,503);
  process.env.ANNOUNCEMENT_OPEN='true';delete process.env.SUPABASE_SECRET_KEY;assert.equal((await request()).code,503);assert.equal(calls.length,0);
});
test('5 allowed, sixth 429; mocked window expiry restores access',async()=>{
  for(let i=0;i<5;i++)assert.equal((await request()).code,200);
  now=121;const r=await request();assert.equal(r.code,429);assert.equal(r.body.status,'rate-limited');assert.equal(r.headers['Retry-After'],'479');
  assert.equal(calls.filter(c=>c.path.endsWith('/peserta')).length,5);
  now=600;assert.equal((await request()).code,200);
});
test('concurrent handler calls respect mocked atomic RPC result',async()=>{
  const rs=await Promise.all(Array.from({length:6},()=>request()));assert.deepEqual(rs.map(r=>r.code).sort(),[200,200,200,200,200,429]);
});
test('only HMAC hash sent, local spoofed forwarded header ignored',async()=>{
  await request(undefined,{headers:{'content-type':'application/json','x-real-ip':'203.0.113.2'}}); const a=calls[0].body;
  await request();const b=calls.findLast(c=>c.path.includes('/rpc/')).body;
  assert.match(a.p_key_hash,/^[a-f0-9]{64}$/);assert.deepEqual(a,b);assert.deepEqual(Object.keys(a),['p_key_hash']);
});
test('Vercel proxy header selected over socket',async()=>{
  process.env.VERCEL_ENV='production';
  assert.equal((await request(undefined,{headers:{'content-type':'application/json','x-vercel-forwarded-for':'203.0.113.1'}})).code,200);
  assert.equal((await request()).code,503);
});
for(const m of ['rpc-error','rpc-malformed']) test(`${m} fails closed without participant query`,async()=>{mode=m;assert.equal((await request()).code,503);assert.equal(calls.length,1);});
test('missing rate secret fails closed',async()=>{delete process.env.RATE_LIMIT_SECRET;assert.equal((await request()).code,503);assert.equal(calls.length,0);});
test('RPC exception fails closed',async()=>{assert.equal((await checkRateLimit({socket:{remoteAddress:'::1'}},{rpc:async()=>{throw Error('test')}})).status,'unavailable');});
for(const m of ['query-error','connection-error','contact-error','bad-name','bad-status','bad-division']) test(`${m} is error, never not-found`,async()=>{mode=m;const r=await request();assert.equal(r.code,500);assert.equal(r.body.status,'error');});
test('database coordinator is selected by participant division; updates are read again',async()=>{
  assert.equal((await request()).body.coordinator,null);
  contact = { nama: 'CP Uji', whatsapp: '628000000001' };
  assert.equal((await request()).body.coordinator.whatsapp,contact.whatsapp);
  contact.whatsapp = '628000000002';
  const r = await request();
  assert.deepEqual(r.body.coordinator, { name: contact.nama, whatsapp: contact.whatsapp });
  assert.deepEqual(r.body.contactPerson, r.body.coordinator);
  assert.equal(calls.filter(c=>c.path.endsWith('/koordinator')).length,3);
  assert.equal(calls.findLast(c=>c.path.endsWith('/koordinator')).query.get('divisi'),'eq.PDD');
});
test('database fixture preserves 11 divisions assigned to two CP (5/6)',async()=>{
  for (let i=1;i<=11;i++) {
    now += 600;
    division = `DIVISI_UJI_${i}`;
    contact = { nama: i<=5 ? 'CP Uji 1' : 'CP Uji 2', whatsapp: i<=5 ? '628000000001' : '628000000002' };
    const r = await request();
    assert.equal(r.code,200);
    assert.equal(r.body.division,division);
    assert.equal(r.body.coordinator.whatsapp,contact.whatsapp);
    assert.equal(calls.findLast(c=>c.path.endsWith('/koordinator')).query.get('divisi'),`eq.${division}`);
  }
});
