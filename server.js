// server.js
// Express app: serves the frontend as static files and exposes a small
// REST API backed by SQLite for profile data, goals, and computed analysis.

const path = require('path');
const express = require('express');
const db = require('./db');
const { GOAL_LABELS, computeAnalysis } = require('./finance');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---------- helpers ----------
function getProfile() {
  return db.prepare('SELECT * FROM profile WHERE id = 1').get();
}
function getGoals() {
  return db.prepare('SELECT * FROM goals ORDER BY target_year ASC').all();
}

// ---------- profile ----------
app.get('/api/profile', (req, res) => {
  res.json(getProfile());
});

app.put('/api/profile', (req, res) => {
  const { salary, emi, insurance, savings, essential_pct } = req.body;
  db.prepare(
    `UPDATE profile SET salary = ?, emi = ?, insurance = ?, savings = ?, essential_pct = ? WHERE id = 1`
  ).run(
    Number(salary) || 0,
    Number(emi) || 0,
    Number(insurance) || 0,
    Number(savings) || 0,
    Number(essential_pct) || 0
  );
  res.json(getProfile());
});

// ---------- goals ----------
app.get('/api/goals', (req, res) => {
  res.json(getGoals());
});

app.post('/api/goals', (req, res) => {
  const { type, amount, target_year } = req.body;
  if (!type || !GOAL_LABELS[type]) {
    return res.status(400).json({ error: 'Unknown goal type.' });
  }
  const amt = Number(amount);
  const year = Number(target_year);
  if (!(amt > 0) || !(year > new Date().getFullYear())) {
    return res.status(400).json({ error: 'Amount must be positive and year must be in the future.' });
  }
  const label = GOAL_LABELS[type];
  const info = db
    .prepare('INSERT INTO goals (type, label, amount, target_year) VALUES (?, ?, ?, ?)')
    .run(type, label, amt, year);
  const created = db.prepare('SELECT * FROM goals WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.delete('/api/goals/:id', (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---------- analysis ----------
app.get('/api/analysis', (req, res) => {
  const profile = getProfile();
  const goals = getGoals();
  const analysis = computeAnalysis(profile, goals);
  res.json(analysis);
});

app.listen(PORT, () => {
  console.log(`The Finance Leader is running at http://localhost:${PORT}`);
});
