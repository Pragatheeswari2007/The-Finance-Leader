const Database=require('better-sqlite3');
const path=require('path');
const db=new Database(path.join(__dirname,'finance.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 email TEXT NOT NULL UNIQUE,
 phone TEXT NOT NULL UNIQUE,
 aadhaar_cipher TEXT NOT NULL,
 aadhaar_last4 TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS household(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL UNIQUE,
 monthly_income REAL NOT NULL DEFAULT 0,
 monthly_other_income REAL NOT NULL DEFAULT 0,
 current_savings REAL NOT NULL DEFAULT 0,
 essential_expenses REAL NOT NULL DEFAULT 0,
 desired_emergency_months INTEGER NOT NULL DEFAULT 6,
 risk_profile TEXT NOT NULL DEFAULT 'moderate',
 state TEXT NOT NULL DEFAULT '',
 first_home_buyer INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS family_members(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,name TEXT NOT NULL,relation TEXT NOT NULL,age INTEGER NOT NULL,
 occupation TEXT DEFAULT '',monthly_income REAL NOT NULL DEFAULT 0,education_level TEXT DEFAULT '',monthly_fee REAL NOT NULL DEFAULT 0,
 annual_fee REAL NOT NULL DEFAULT 0,fee_due_month INTEGER NOT NULL DEFAULT 6,dependent INTEGER NOT NULL DEFAULT 1,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS loans(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL,outstanding REAL NOT NULL DEFAULT 0,
 annual_rate REAL NOT NULL DEFAULT 0,emi REAL NOT NULL DEFAULT 0,remaining_months INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS goals(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,type TEXT NOT NULL,label TEXT NOT NULL,amount REAL NOT NULL,
 target_year INTEGER NOT NULL,priority INTEGER NOT NULL DEFAULT 3,current_amount REAL NOT NULL DEFAULT 0,inflation_rate REAL NOT NULL DEFAULT 6,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS investments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,provider TEXT NOT NULL,type TEXT NOT NULL,current_value REAL NOT NULL DEFAULT 0,
 monthly_contribution REAL NOT NULL DEFAULT 0,annual_return_assumption REAL NOT NULL DEFAULT 8,goal_id INTEGER,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS insurance(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,provider TEXT NOT NULL,type TEXT NOT NULL,premium REAL NOT NULL DEFAULT 0,
 frequency TEXT NOT NULL DEFAULT 'monthly',renewal_date TEXT DEFAULT '',sum_assured REAL NOT NULL DEFAULT 0,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS chat_messages(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// Lightweight schema check so an old database fails clearly instead of crashing later.
const required={users:['email','phone','aadhaar_cipher','aadhaar_last4','password_hash'],household:['user_id'],family_members:['user_id'],loans:['user_id'],goals:['user_id'],investments:['user_id','goal_id'],insurance:['user_id'],chat_messages:['user_id']};
for(const [table,cols] of Object.entries(required)){
  const actual=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name));
  const missing=cols.filter(c=>!actual.has(c));
  if(missing.length) throw new Error(`Database schema mismatch in ${table}: missing ${missing.join(', ')}. Back up finance.db and use a fresh database or migration.`);
}
module.exports=db;
