// finance.js
// Pure business logic: required monthly savings, goal-collision detection,
// loan guidance, and government scheme matching. Kept separate from the
// Express routes so it can be tested or reused independently.

const ANNUAL_RETURN = 0.08; // assumed long-term SIP growth rate, for illustration

const GOAL_LABELS = {
  house: 'House purchase',
  gold: 'Gold / jewellery',
  wedding: 'Wedding',
  education: 'Higher education',
  car: 'Car purchase',
  retirement: 'Retirement corpus',
  other: 'Other goal',
};

const LOAN_ADVICE = {
  house: { name: 'Home Loan', rate: '8.5% – 9.5% p.a.', tenure: '15–20 yrs', note: 'Longest tenure keeps the EMI lowest; prepay when bonuses land to cut total interest.' },
  gold: { name: 'Gold Loan', rate: '9% – 12% p.a.', tenure: '1–3 yrs', note: 'Fast disbursal against jewellery, but consider Sovereign Gold Bonds instead of buying physical gold outright — no making charges and a small annual interest.' },
  wedding: { name: 'Personal / Wedding Loan', rate: '11% – 16% p.a.', tenure: '3–5 yrs', note: 'The highest-cost borrowing option here — lean on SIP savings first, and use the loan only to cover the final gap.' },
  education: { name: 'Education Loan', rate: '8% – 11% p.a.', tenure: '5–10 yrs', note: 'Interest is often tax-deductible under Section 80E; disburses in stages against fee receipts.' },
  car: { name: 'Auto Loan', rate: '9% – 11% p.a.', tenure: '3–7 yrs', note: 'Keep the tenure short — cars depreciate faster than the loan clears.' },
  retirement: { name: 'No loan applicable', rate: '—', tenure: '—', note: 'A retirement corpus is built, not borrowed — prioritise SIPs and NPS contributions instead.' },
  other: { name: 'Personal Loan', rate: '11% – 18% p.a.', tenure: '1–5 yrs', note: 'General-purpose borrowing is usually the most expensive option — treat it as a last resort.' },
};

const SCHEME_ADVICE = {
  house: { name: 'PMAY — Pradhan Mantri Awas Yojana', desc: 'An interest subsidy for eligible first-time home buyers under the credit-linked subsidy component.', eligibility: 'Income-category eligibility (EWS / LIG / MIG) — confirm on the official PMAY portal.' },
  gold: { name: 'Sovereign Gold Bonds (RBI)', desc: 'Government-backed bonds that track the gold price and pay roughly 2.5% annual interest — an alternative to physical gold for the same goal.', eligibility: 'Open to resident individuals; purchased through banks, post offices, or stock exchanges during issue windows.' },
  wedding: { name: 'Sukanya Samriddhi Yojana', desc: "A high-interest government savings scheme for a girl child's future — education or marriage — with tax benefits.", eligibility: 'Available only while the daughter is under 10 years old when the account is opened.' },
  education: { name: 'Central Sector Interest Subsidy Scheme', desc: 'A full interest subsidy on education loans during the moratorium period for students from economically weaker sections.', eligibility: 'Income-based eligibility; apply through the Vidya Lakshmi portal.' },
  car: null,
  retirement: { name: 'National Pension System (NPS)', desc: 'A government-regulated retirement scheme with an additional ₹50,000 tax deduction under Section 80CCD(1B).', eligibility: 'Open to all Indian citizens aged 18–70.' },
  other: null,
};

function requiredSIP(futureValue, months) {
  if (months <= 0) return futureValue;
  const i = ANNUAL_RETURN / 12;
  const factor = ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
  return futureValue / factor;
}

function disposableIncome(profile) {
  const essentialAmount = profile.salary * (profile.essential_pct / 100);
  return profile.salary - profile.emi - profile.insurance - essentialAmount;
}

function computeAnalysis(profile, goals, currentYear = new Date().getFullYear()) {
  const disposable = disposableIncome(profile);

  const enriched = goals.map((g) => {
    const months = (g.target_year - currentYear) * 12;
    const monthly = requiredSIP(g.amount, months);
    return { ...g, monthly };
  });

  const totalRequired = enriched.reduce((sum, g) => sum + g.monthly, 0);
  const conflict = goals.length > 0 && totalRequired > disposable * 0.9;

  let startYear = currentYear;
  let endYear = currentYear + 1;
  if (goals.length > 0) {
    endYear = Math.max(...goals.map((g) => g.target_year)) + 1;
  }
  const span = Math.max(endYear - startYear, 1);

  const ruler = enriched.map((g) => ({
    id: g.id,
    type: g.type,
    label: g.label,
    amount: g.amount,
    year: g.target_year,
    monthly: g.monthly,
    pct: ((g.target_year - startYear) / span) * 100,
    conflict,
  }));

  const recommendations = enriched.map((g) => ({
    id: g.id,
    type: g.type,
    label: g.label,
    amount: g.amount,
    year: g.target_year,
    monthly: g.monthly,
    loan: LOAN_ADVICE[g.type] || LOAN_ADVICE.other,
    scheme: SCHEME_ADVICE[g.type] || null,
  }));

  return {
    disposable,
    totalRequired,
    conflict,
    startYear,
    endYear,
    ruler,
    recommendations,
  };
}

module.exports = {
  GOAL_LABELS,
  ANNUAL_RETURN,
  requiredSIP,
  disposableIncome,
  computeAnalysis,
};
