// app.js
// All data lives in the backend/database. This file only fetches from
// the API and renders it — no financial calculations happen here.

const API = '/api';

function fmtINR(n) {
  n = Math.round(n);
  return '₹' + n.toLocaleString('en-IN');
}

// ---------------- Tabs ----------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'timeline') renderRuler();
    if (btn.dataset.tab === 'recs') renderRecs();
  });
});

// ---------------- Profile ----------------
const essentialSlider = document.getElementById('essential');
const essentialVal = document.getElementById('essential-val');
essentialSlider.addEventListener('input', () => {
  essentialVal.textContent = essentialSlider.value + '%';
});

async function loadProfile() {
  const res = await fetch(`${API}/profile`);
  const p = await res.json();
  document.getElementById('salary').value = p.salary;
  document.getElementById('emi').value = p.emi;
  document.getElementById('insurance').value = p.insurance;
  document.getElementById('savings').value = p.savings;
  essentialSlider.value = p.essential_pct;
  essentialVal.textContent = p.essential_pct + '%';
}

document.getElementById('save-profile').addEventListener('click', async () => {
  const body = {
    salary: Number(document.getElementById('salary').value) || 0,
    emi: Number(document.getElementById('emi').value) || 0,
    insurance: Number(document.getElementById('insurance').value) || 0,
    savings: Number(document.getElementById('savings').value) || 0,
    essential_pct: Number(essentialSlider.value),
  };
  await fetch(`${API}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const note = document.getElementById('save-note');
  note.textContent = 'Saved.';
  setTimeout(() => (note.textContent = ''), 2000);
});

// ---------------- Goals ----------------
document.getElementById('add-goal').addEventListener('click', async () => {
  const type = document.getElementById('goal-type').value;
  const amount = Number(document.getElementById('goal-amount').value);
  const target_year = Number(document.getElementById('goal-year').value);

  const res = await fetch(`${API}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, amount, target_year }),
  });

  if (!res.ok) {
    const err = await res.json();
    alert(err.error || 'Could not add this goal.');
    return;
  }
  await renderGoals();
});

async function renderGoals() {
  const res = await fetch(`${API}/goals`);
  const goals = await res.json();
  const list = document.getElementById('goal-list');

  if (goals.length === 0) {
    list.innerHTML = '<div class="empty-state">No goals yet — add your first one above.</div>';
    return;
  }

  const currentYear = new Date().getFullYear();
  list.innerHTML = goals
    .map(
      (g) => `
      <div class="goal-row">
        <div>
          <div class="goal-name">${g.label}</div>
          <div class="goal-meta">Target year ${g.target_year} · ${g.target_year - currentYear} yrs away</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div class="goal-amount">${fmtINR(g.amount)}</div>
          <button class="btn small danger" data-del="${g.id}">Remove</button>
        </div>
      </div>
    `
    )
    .join('');

  list.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await fetch(`${API}/goals/${btn.dataset.del}`, { method: 'DELETE' });
      await renderGoals();
    });
  });
}

// ---------------- Ruler (Timeline) ----------------
async function renderRuler() {
  const res = await fetch(`${API}/analysis`);
  const analysis = await res.json();
  const track = document.getElementById('ruler-track');
  track.innerHTML = '';

  if (analysis.ruler.length === 0) {
    track.innerHTML =
      '<div class="empty-state" style="position:absolute;top:40%;left:0;right:0;">Add goals to see them plotted on the Ruler.</div>';
  } else {
    const span = Math.max(analysis.endYear - analysis.startYear, 1);
    for (let y = analysis.startYear; y <= analysis.endYear; y++) {
      const pct = ((y - analysis.startYear) / span) * 100;
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = pct + '%';
      track.appendChild(tick);

      const tlabel = document.createElement('div');
      tlabel.className = 'ruler-tick-label';
      tlabel.style.left = pct + '%';
      tlabel.textContent = y;
      track.appendChild(tlabel);
    }

    analysis.ruler.forEach((g) => {
      const pin = document.createElement('div');
      pin.className = 'pin' + (g.conflict ? ' conflict' : '');
      pin.style.left = g.pct + '%';
      pin.innerHTML = `
        <div class="pin-flag">${g.label} · <span class="amt">${fmtINR(g.amount)}</span><br>~${fmtINR(g.monthly)}/mo</div>
        <div class="pin-stem" style="height:34px;"></div>
        <div class="pin-dot"></div>
      `;
      track.appendChild(pin);
    });
  }

  const statDisp = document.getElementById('stat-disposable');
  const statReq = document.getElementById('stat-required');
  statDisp.querySelector('.value').textContent = fmtINR(analysis.disposable);
  statReq.querySelector('.value').textContent = fmtINR(analysis.totalRequired);
  statDisp.className = 'stat ' + (analysis.disposable > 0 ? 'ok' : 'warn');
  statReq.className = 'stat ' + (!analysis.conflict ? 'ok' : 'warn');

  const alertBox = document.getElementById('conflict-alert');
  if (analysis.ruler.length === 0) {
    alertBox.innerHTML = '';
  } else if (analysis.conflict) {
    alertBox.innerHTML = `
      <div class="alert">
        <p><strong>Goal collision detected.</strong> Funding every goal on schedule needs ${fmtINR(
          analysis.totalRequired
        )}/month, but only ${fmtINR(Math.max(analysis.disposable, 0))} is disposable. Push the furthest goal out, or blend in a loan for the nearest big-ticket one.</p>
        <button class="btn gold small" id="optimize-btn">Optimize plan</button>
      </div>
    `;
    document.getElementById('optimize-btn').addEventListener('click', optimizePlan);
  } else {
    alertBox.innerHTML = `
      <div class="alert ok">
        <p><strong>Your goals fit your income.</strong> At an assumed 8% annual return, all goals are funded with room to spare. You could pull a goal earlier or add a new one.</p>
      </div>
    `;
  }
}

async function optimizePlan() {
  let guard = 0;
  while (guard < 8) {
    const res = await fetch(`${API}/analysis`);
    const analysis = await res.json();
    if (!analysis.conflict || analysis.ruler.length === 0) break;

    const furthest = analysis.ruler.reduce((a, b) => (a.year >= b.year ? a : b));
    await fetch(`${API}/goals/${furthest.id}`, { method: 'DELETE' });
    await fetch(`${API}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: furthest.type, amount: furthest.amount, target_year: furthest.year + 1 }),
    });
    guard++;
  }
  await renderGoals();
  await renderRuler();
}

// ---------------- Recommendations ----------------
async function renderRecs() {
  const res = await fetch(`${API}/analysis`);
  const analysis = await res.json();
  const list = document.getElementById('rec-list');

  if (analysis.recommendations.length === 0) {
    list.innerHTML = '<div class="empty-state">Add goals in step 02 to see tailored borrowing and scheme suggestions.</div>';
    return;
  }

  list.innerHTML = analysis.recommendations
    .map(
      (g) => `
      <div class="rec-card">
        <div class="rec-head">
          <h3>${g.label}</h3>
          <span class="yr">${fmtINR(g.amount)} by ${g.year}</span>
        </div>
        <div class="rec-cols">
          <div class="rec-box">
            <h4>Savings path</h4>
            <p>Start a monthly SIP of <strong>${fmtINR(g.monthly)}</strong> now (assumed 8% annual return) to reach this goal on schedule without borrowing.</p>
          </div>
          <div class="rec-box">
            <h4>If you fall short — borrowing option</h4>
            <p><strong>${g.loan.name}</strong> · sample rate ${g.loan.rate} · typical tenure ${g.loan.tenure}</p>
            <p>${g.loan.note}</p>
          </div>
        </div>
        ${
          g.scheme
            ? `<div class="rec-box" style="margin-top:14px;">
                <h4>Matching government scheme</h4>
                <p><strong>${g.scheme.name}</strong> — ${g.scheme.desc}</p>
                <span class="tag">${g.scheme.eligibility}</span>
              </div>`
            : ''
        }
      </div>
    `
    )
    .join('');
}

// ---------------- Init ----------------
loadProfile();
renderGoals();
