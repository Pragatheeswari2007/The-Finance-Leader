// db.js
// Sets up the SQLite database file, creates tables on first run,
// and seeds a sample household profile + goals so the app is
// demonstrable immediately after install.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'finance.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    salary REAL NOT NULL DEFAULT 0,
    emi REAL NOT NULL DEFAULT 0,
    insurance REAL NOT NULL DEFAULT 0,
    savings REAL NOT NULL DEFAULT 0,
    essential_pct REAL NOT NULL DEFAULT 45
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    target_year INTEGER NOT NULL
  );
`);

const profileExists = db.prepare('SELECT id FROM profile WHERE id = 1').get();
if (!profileExists) {
  db.prepare(
    `INSERT INTO profile (id, salary, emi, insurance, savings, essential_pct)
     VALUES (1, ?, ?, ?, ?, ?)`
  ).run(80000, 15000, 3000, 200000, 45);
}

const goalCount = db.prepare('SELECT COUNT(*) AS c FROM goals').get().c;
if (goalCount === 0) {
  const currentYear = new Date().getFullYear();
  const insert = db.prepare(
    `INSERT INTO goals (type, label, amount, target_year) VALUES (?, ?, ?, ?)`
  );
  insert.run('house', 'House purchase', 4000000, currentYear + 6);
  insert.run('wedding', "Daughter's wedding", 1500000, currentYear + 5);
  insert.run('gold', 'Gold / jewellery', 300000, currentYear + 1);
}

module.exports = db;
