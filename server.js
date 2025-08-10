// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

// DB in /tmp for Render Hobby
const dbDir = '/tmp/sqlite';
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'patients.sqlite');

let db;
async function initDb() {
  db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT,
      email TEXT,
      dob TEXT,
      patientId TEXT,
      symptoms TEXT,
      medicalHistory TEXT,
      notes TEXT,
      documentsUrls TEXT,
      physicianName TEXT,
      physicianEmail TEXT,
      consultationDate TEXT,
      recommendations TEXT,
      createdAt TEXT
    )
  `);
}

function adminOnly(req, res, next) {
  const pass = req.headers['x-admin-password'];
  if (pass && pass === ADMIN_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/intake', async (req, res) => {
  try {
    const {
      fullName = '', email = '', dob = '', patientId = '',
      symptoms = '', medicalHistory = '', notes = '',
      documentsUrls = ''
    } = req.body || {};
    const createdAt = new Date().toISOString();
    await db.run(
      `INSERT INTO patients
       (fullName,email,dob,patientId,symptoms,medicalHistory,notes,documentsUrls,
        physicianName,physicianEmail,consultationDate,recommendations,createdAt)
       VALUES (?,?,?,?,?,?,?,?,NULL,NULL,NULL,NULL,?)`,
      [fullName,email,dob,patientId,symptoms,medicalHistory,notes,documentsUrls,createdAt]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/intake error', e);
    res.status(500).json({ success: false });
  }
});

app.get('/api/patients', adminOnly, async (req, res) => {
  try {
    const { search = '', sort = 'createdAt', dir = 'DESC' } = req.query;
    const safeSort = ['id','createdAt','fullName','patientId','dob','email'].includes(sort) ? sort : 'createdAt';
    const safeDir  = (dir || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const like = `%${search}%`;
    const rows = await db.all(
      `SELECT * FROM patients
       WHERE fullName LIKE ? OR email LIKE ? OR patientId LIKE ? OR symptoms LIKE ? OR medicalHistory LIKE ?
          OR notes LIKE ? OR documentsUrls LIKE ? OR physicianName LIKE ? OR physicianEmail LIKE ? OR recommendations LIKE ?
       ORDER BY ${safeSort} ${safeDir}`,
      [like,like,like,like,like,like,like,like,like,like]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/patients error', e);
    res.status(500).json({ success: false });
  }
});

app.put('/api/patients/:id/consultation', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { physicianName = '', physicianEmail = '', consultationDate = '', recommendations = '' } = req.body || {};
    const r = await db.run(
      `UPDATE patients SET physicianName=?, physicianEmail=?, consultationDate=?, recommendations=? WHERE id=?`,
      [physicianName, physicianEmail, consultationDate, recommendations, id]
    );
    if (r.changes === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /api/patients/:id/consultation error', e);
    res.status(500).json({ success: false });
  }
});

app.delete('/api/patients/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await db.run(`DELETE FROM patients WHERE id=?`, [id]);
    if (r.changes === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/patients/:id error', e);
    res.status(500).json({ success: false });
  }
});

app.get('/api/patients/:id/report', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.get(`SELECT * FROM patients WHERE id=?`, [id]);
    if (!row) return res.status(404).send('Not found');

    const logoPath = path.join(__dirname, 'assets', 'logo.svg');
    const svg = fs.existsSync(logoPath) ? fs.readFileSync(logoPath, 'utf8') : null;

    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, left: 50, right: 50, bottom: 50 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=patient_${id}_report.pdf`);
    doc.pipe(res);

    if (svg) SVGtoPDF(doc, svg, 50, 30, { width: 80, assumePt: true });
    doc.fontSize(18).text('WeTreat SRL', 140, 40);
    doc.moveTo(50, 90).lineTo(545, 90).stroke();

    const section = (t) => { doc.moveDown(1); doc.fontSize(13).text(t, { underline: true }); doc.moveDown(0.5); doc.fontSize(11); };
    const field = (k, v) => { doc.font('Helvetica-Bold').text(k + ': ', { continued: true }); doc.font('Helvetica').text(v || '—'); };

    section("Patient’s Demographics");
    field("Full Name", row.fullName);
    field("Email", row.email);
    field("Date of Birth", row.dob);
    field("Patient ID", row.patientId);
    field("Created At", new Date(row.createdAt).toLocaleString());

    section("Medical History");
    field("Symptoms", row.symptoms);
    field("Medical History", row.medicalHistory);
    field("Notes", row.notes);
    doc.font('Helvetica-Bold').text("Medical Documents and Imaging URLs:");
    const urls = (row.documentsUrls || '').split(',').map(s=>s.trim()).filter(Boolean);
    if (urls.length) { doc.font('Helvetica'); urls.forEach(u=>doc.text('• ' + u)); } else { doc.font('Helvetica').text('—'); }

    section("Consultation");
    field("Physician’s Name", row.physicianName);
    field("Physician’s Email", row.physicianEmail);
    field("Consultation Date", row.consultationDate);
    field("Recommendations", row.recommendations);

    doc.moveDown(2);
    doc.text('Physician Signature: ________________________________');

    doc.end();
  } catch (e) {
    console.error('GET /api/patients/:id/report error', e);
    res.status(500).send('Failed to generate report');
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, dbPath }));

app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html')));

initDb().then(() => app.listen(PORT, () => console.log(`✅ Server on ${PORT}; DB at ${dbPath}`))).catch(err => { console.error('DB init failed:', err); process.exit(1); });
