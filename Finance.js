const GOALS={house:{label:'House',inflation:6},gold:{label:'Gold / Jewellery',inflation:6},wedding:{label:'Wedding',inflation:7},education:{label:'Education',inflation:8},car:{label:'Vehicle',inflation:5},retirement:{label:'Retirement',inflation:6},medical:{label:'Medical Reserve',inflation:6},other:{label:'Other',inflation:6}};
const SCHEMES=[
 {name:'PMAY / PMAY-U',goal:'house',description:'Potential housing support; eligibility and current rules must be checked on the official government portal.'},
 {name:'Sukanya Samriddhi Yojana',goal:'education',description:'Savings scheme for eligible girl children; verify current rules, rates and eligibility.'},
 {name:'Education-loan interest support',goal:'education',description:'Potential government education-loan support varies by scheme and eligibility; verify current official guidance.'},
 {name:'NPS',goal:'retirement',description:'Retirement savings option; returns are market-linked and rules/tax treatment can change.'}
];
function num(x,d=0){const n=Number(x);return Number.isFinite(n)?n:d;}
function emi(P,annualRate,months){P=num(P);annualRate=num(annualRate);months=Math.max(1,Math.floor(num(months)));if(annualRate===0)return P/months;const r=annualRate/1200;return P*r*Math.pow(1+r,months)/(Math.pow(1+r,months)-1);}
function fvMonthly(current,monthly,annual,months){const r=num(annual)/1200;if(months<=0)return num(current);if(r===0)return num(current)+num(monthly)*months;return num(current)*Math.pow(1+r,months)+num(monthly)*(Math.pow(1+r,months)-1)/r;}
function futureCost(amount,years,inflation){return num(amount)*Math.pow(1+num(inflation)/100,Math.max(0,years));}
function monthlySavingsForGoal(target,current,months,annualReturn=8){target=num(target);current=num(current);months=Math.max(1,Math.floor(months));const r=num(annualReturn)/1200;const remaining=Math.max(0,target-current*Math.pow(1+r,months));if(r===0)return remaining/months;return remaining*r/(Math.pow(1+r,months)-1);}
function analyze(h,family,loans,insurance,investments,goals){
 const familyIncome=family.reduce((s,x)=>s+num(x.monthly_income),0); const income=num(h.monthly_income)+num(h.monthly_other_income)+familyIncome;
 const loanEmi=loans.reduce((s,x)=>s+num(x.emi),0);
 const insuranceMonthly=insurance.reduce((s,x)=>s+num(x.premium)*(x.frequency==='yearly'?1/12:x.frequency==='quarterly'?1/3:1),0);
 const educationMonthly=family.reduce((s,x)=>s+num(x.monthly_fee)+num(x.annual_fee)/12,0);
 const committed=num(h.essential_expenses)+loanEmi+insuranceMonthly+educationMonthly;
 const surplus=income-committed;
 const debtRatio=income>0?loanEmi/income:0;
 const emergencyTarget=num(h.essential_expenses)*Math.max(3,num(h.desired_emergency_months,6));
 const emergencyGap=Math.max(0,emergencyTarget-num(h.current_savings));
 const investmentValue=investments.reduce((s,x)=>s+num(x.current_value),0);
 const monthlyInvestments=investments.reduce((s,x)=>s+num(x.monthly_contribution),0);
 const maxExtraEmi=Math.max(0,surplus-Math.max(0,emergencyGap/12));
 const year=new Date().getFullYear();
 const goalRows=goals.map(g=>{const years=Math.max(0,num(g.target_year)-year);const inflation=g.inflation_rate||GOALS[g.type]?.inflation||6;const inflated=futureCost(g.amount,years,inflation);const gap=Math.max(0,inflated-num(g.current_amount));const monthly=monthlySavingsForGoal(inflated,num(g.current_amount),Math.max(1,years*12),8);return {...g,years,inflated_target:inflated,gap,monthly_required:monthly,affordable:monthly<=Math.max(0,surplus),status:monthly<=Math.max(0,surplus)?'ON TRACK':'GAP'};});
 let decision='SAVE / INVEST'; if(emergencyGap>0&&surplus<=0)decision='WAIT / REDUCE EXPENSES'; else if(emergencyGap>0&&num(h.current_savings)<emergencyTarget)decision='BUILD EMERGENCY FUND FIRST'; else if(surplus<=0)decision='WAIT / REDUCE EXPENSES'; else if(goalRows.some(g=>g.monthly_required>surplus))decision='SAVE FIRST; BORROW ONLY FOR THE REMAINING GAP';
 const highInterest=loans.filter(l=>num(l.annual_rate)>=12).sort((a,b)=>num(b.annual_rate)-num(a.annual_rate));
 const alerts=[]; if(debtRatio>0.4)alerts.push('Loan EMI burden is high relative to household income.'); if(emergencyGap>0)alerts.push(`Emergency-fund gap is ₹${Math.round(emergencyGap).toLocaleString('en-IN')}.`); if(surplus<0)alerts.push('Monthly committed expenses exceed recorded income.'); if(highInterest.length)alerts.push('One or more loans have a high indicative interest rate; compare actual lender terms.');
 const roadmap=Array.from({length:7},(_,i)=>({year:year+i,focus:i===0?'Stabilise cash flow and emergency fund':i===1?'Reduce expensive debt and automate savings':i<=3?'Fund priority goals and review protection':i<=5?'Increase long-term investing with goal checks':'Review retirement and long-term milestones'}));
 const schemes=goalRows.flatMap(g=>SCHEMES.filter(s=>s.goal===g.type).map(s=>({...s,goal:g.label}))); return {summary:{income,loan_emi:loanEmi,insurance_monthly:insuranceMonthly,education_monthly:educationMonthly,committed,surplus,debt_ratio:debtRatio,emergency_target:emergencyTarget,emergency_gap:emergencyGap,current_savings:num(h.current_savings),investment_value:investmentValue,monthly_investments:monthlyInvestments,max_extra_emi:maxExtraEmi},decision,goals:goalRows,alerts,high_interest_loans:highInterest.map(x=>({name:x.name,rate:x.annual_rate,emi:x.emi})),schemes,roadmap};
}
function financialHealth(s,g){let score=100;if(s.income<=0)score-=30;if(s.debt_ratio>0.4)score-=25;else if(s.debt_ratio>0.3)score-=12;if(s.emergency_target>0){const er=s.current_savings/s.emergency_target;if(er<0.25)score-=20;else if(er<0.5)score-=10;}if(s.surplus<0)score-=25;else if(s.surplus<s.income*0.1)score-=10;const off=g.filter(x=>x.status==='GAP').length;score-=Math.min(15,off*5);return Math.max(0,Math.min(100,Math.round(score)));}
function safeSnapshot(a){return {summary:a.summary,decision:a.decision,goals:a.goals.map(g=>({label:g.label,target_year:g.target_year,inflated_target:g.inflated_target,gap:g.gap,monthly_required:g.monthly_required,status:g.status})),alerts:a.alerts,high_interest_loans:a.high_interest_loans,schemes:a.schemes,health:financialHealth(a.summary,a.goals)};}
module.exports={GOALS,SCHEMES,emi,fvMonthly,futureCost,monthlySavingsForGoal,analyze,financialHealth,safeSnapshot};
