'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'carepoint-demo-secret-change-before-deployment';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.json');
const TOKEN_TTL = '8h';

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

function initialDb() {
  return {
    users: [{ id: 'admin-1', username: 'admin', passwordHash: bcrypt.hashSync('Admin@123', 10), role: 'admin' }],
    patients: [],
    appointments: []
  };
}
function ensureDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(initialDb(), null, 2));
}
function readDb() {
  ensureDb();
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (!db || !Array.isArray(db.users) || !Array.isArray(db.patients) || !Array.isArray(db.appointments)) throw new Error('Invalid database shape');
    return db;
  } catch (err) {
    const error = new Error('Could not read data/db.json. Check that it contains valid JSON.');
    error.status = 500;
    throw error;
  }
}
function writeDb(db) {
  ensureDb();
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_PATH);
}
function safeUser(user) { return { id: user.id, username: user.username, role: user.role }; }
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(match[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
function cleanString(value) { return typeof value === 'string' ? value.trim() : ''; }
function id() { return require('node:crypto').randomUUID(); }
function handleError(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err.message);
  return res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'CarePoint API' }));
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = cleanString(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const user = readDb().users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid username or password' });
    const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
    return res.json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: { id: req.user.sub, username: req.user.username, role: req.user.role } }));
app.get('/api/dashboard', auth, (req, res, next) => {
  try {
    const db = readDb();
    const today = new Date().toISOString().slice(0, 10);
    res.json({ totalPatients: db.patients.length, totalAppointments: db.appointments.length, todayAppointments: db.appointments.filter(a => a.date === today && a.status !== 'Cancelled').length });
  } catch (err) { next(err); }
});
app.get('/api/patients', auth, (req, res, next) => {
  try {
    const q = cleanString(String(req.query.q || '')).toLowerCase();
    const patients = readDb().patients.filter(p => !q || [p.name, p.patientId, p.department, p.phone, p.status].some(v => String(v || '').toLowerCase().includes(q)));
    res.json(patients);
  } catch (err) { next(err); }
});
app.post('/api/patients', auth, (req, res, next) => {
  try {
    const body = req.body || {};
    const name = cleanString(body.name), phone = cleanString(body.phone), department = cleanString(body.department);
    const age = Number(body.age);
    if (!name || !phone || !department || body.age === undefined || body.age === '' || !Number.isInteger(age) || age < 0 || age > 120) return res.status(400).json({ error: 'Name, phone, department and a valid age (0–120) are required' });
    if (name.length > 100 || phone.length > 30 || department.length > 80) return res.status(400).json({ error: 'One or more fields exceed the allowed length' });
    const db = readDb();
    const patient = { id: id(), patientId: `CP-${String(Date.now()).slice(-8)}`, name, age, phone, gender: cleanString(body.gender) || 'Not specified', department, status: 'Active', createdAt: new Date().toISOString() };
    db.patients.unshift(patient); writeDb(db);
    return res.status(201).json(patient);
  } catch (err) { next(err); }
});
app.get('/api/patients/:id', auth, (req, res, next) => {
  try {
    const patient = readDb().patients.find(p => p.id === req.params.id);
    return patient ? res.json(patient) : res.status(404).json({ error: 'Patient not found' });
  } catch (err) { next(err); }
});
app.put('/api/patients/:id', auth, (req, res, next) => {
  try {
    const db = readDb(); const patient = db.patients.find(p => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const body = req.body || {};
    const name = body.name === undefined ? patient.name : cleanString(body.name);
    const phone = body.phone === undefined ? patient.phone : cleanString(body.phone);
    const department = body.department === undefined ? patient.department : cleanString(body.department);
    const age = body.age === undefined ? patient.age : Number(body.age);
    if (!name || !phone || !department || !Number.isInteger(age) || age < 0 || age > 120) return res.status(400).json({ error: 'Name, phone, department and a valid age (0–120) are required' });
    Object.assign(patient, { name, phone, department, age });
    if (body.gender !== undefined) patient.gender = cleanString(body.gender);
    if (body.status !== undefined) patient.status = cleanString(body.status) || 'Active';
    writeDb(db); return res.json(patient);
  } catch (err) { next(err); }
});
app.delete('/api/patients/:id', auth, (req, res, next) => {
  try {
    const db = readDb(); const before = db.patients.length;
    db.patients = db.patients.filter(p => p.id !== req.params.id);
    if (db.patients.length === before) return res.status(404).json({ error: 'Patient not found' });
    writeDb(db);
    db.appointments = db.appointments.filter(a => a.patientId !== req.params.id);
    writeDb(db);
    return res.json({ message: 'Patient deleted' });
  } catch (err) { next(err); }
});
app.get('/api/appointments', auth, (req, res, next) => {
  try { res.json(readDb().appointments.filter(a => a.status !== 'Cancelled')); }
  catch (err) { next(err); }
});
app.post('/api/appointments', auth, (req, res, next) => {
  try {
    const body = req.body || {};
    const patientName = cleanString(body.patientName), doctor = cleanString(body.doctor), department = cleanString(body.department), date = cleanString(body.date), time = cleanString(body.time);
    if (!patientName || !doctor || !department || !date || !time) return res.status(400).json({ error: 'Patient, doctor, department, date and time are required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) return res.status(400).json({ error: 'Enter a valid appointment date' });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ error: 'Enter a valid appointment time' });
    const db = readDb();
    const linkedPatient = db.patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
    const appointment = { id: id(), patientId: linkedPatient?.id || null, patientName, doctor, department, date, time, status: 'Scheduled', createdAt: new Date().toISOString() };
    db.appointments.unshift(appointment); writeDb(db);
    return res.status(201).json(appointment);
  } catch (err) { next(err); }
});
app.patch('/api/appointments/:id', auth, (req, res, next) => {
  try {
    const db = readDb(); const appointment = db.appointments.find(a => a.id === req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (req.body?.status !== undefined) appointment.status = cleanString(req.body.status);
    writeDb(db); return res.json(appointment);
  } catch (err) { next(err); }
});
app.delete('/api/appointments/:id', auth, (req, res, next) => {
  try {
    const db = readDb(); const before = db.appointments.length;
    db.appointments = db.appointments.filter(a => a.id !== req.params.id);
    if (db.appointments.length === before) return res.status(404).json({ error: 'Appointment not found' });
    writeDb(db); return res.json({ message: 'Appointment cancelled' });
  } catch (err) { next(err); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
app.use(express.static(__dirname));
app.use(handleError);


module.exports = app;
