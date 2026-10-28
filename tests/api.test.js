const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carepoint-test-'));
process.env.DB_PATH = path.join(tmp, 'db.json');
process.env.JWT_SECRET = 'test-only-secret';
const { app } = require('../server');
let server, base, token, patientId, appointmentId;

before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
});
async function request(route, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth && token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

test('health endpoint is public', async () => {
  const r = await request('/api/health', { auth: false });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'ok');
});
test('protected endpoint rejects missing token', async () => {
  const r = await request('/api/dashboard', { auth: false });
  assert.equal(r.status, 401);
});
test('demo admin can log in and receive a token', async () => {
  const r = await request('/api/auth/login', { method: 'POST', auth: false, body: { username: 'admin', password: 'Admin@123' } });
  assert.equal(r.status, 200); assert.ok(r.data.token); assert.equal(r.data.user.username, 'admin'); token = r.data.token;
});
test('invalid login is rejected', async () => {
  const r = await request('/api/auth/login', { method: 'POST', auth: false, body: { username: 'admin', password: 'wrong-password' } });
  assert.equal(r.status, 401);
});
test('patient creation validates age and saves valid patient', async () => {
  const bad = await request('/api/patients', { method: 'POST', body: { name: 'Test Patient', age: 999, phone: '123', department: 'Cardiology' } });
  assert.equal(bad.status, 400);
  const good = await request('/api/patients', { method: 'POST', body: { name: 'Test Patient', age: 35, phone: '9876543210', department: 'Cardiology', gender: 'Other' } });
  assert.equal(good.status, 201); assert.equal(good.data.name, 'Test Patient'); assert.ok(good.data.id); patientId = good.data.id;
});
test('patient list search and dashboard totals work', async () => {
  const list = await request('/api/patients?q=Test%20Patient');
  assert.equal(list.status, 200); assert.equal(list.data.length, 1); assert.equal(list.data[0].id, patientId);
  const dash = await request('/api/dashboard');
  assert.equal(dash.data.totalPatients, 1);
});
test('appointment creation and cancellation work', async () => {
  const created = await request('/api/appointments', { method: 'POST', body: { patientName: 'Test Patient', doctor: 'Dr. Priya Sharma', department: 'Cardiology', date: '2026-12-01', time: '10:30' } });
  assert.equal(created.status, 201); appointmentId = created.data.id;
  const list = await request('/api/appointments'); assert.equal(list.data.length, 1);
  const deleted = await request(`/api/appointments/${appointmentId}`, { method: 'DELETE' }); assert.equal(deleted.status, 200);
  const afterDelete = await request('/api/appointments'); assert.equal(afterDelete.data.length, 0);
});
test('patient delete works and missing record returns 404', async () => {
  const deleted = await request(`/api/patients/${patientId}`, { method: 'DELETE' }); assert.equal(deleted.status, 200);
  const missing = await request(`/api/patients/${patientId}`); assert.equal(missing.status, 404);
});
