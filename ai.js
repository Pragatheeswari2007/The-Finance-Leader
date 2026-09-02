const OpenAI=require('openai');
function client(){return process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;}
async function answer(message,context,history=[]){const c=client();if(!c)return {mode:'local',reply:'The AI assistant is not connected yet. Add OPENAI_API_KEY on the server to enable the real LLM. I can still show your automated financial analysis from the dashboard.'};
 const system=`You are The Finance Leader, a financial-planning assistant. Use the supplied calculation results as authoritative numeric outputs. Do not invent rates, returns, eligibility, balances or guarantees. Explain in simple language. Do not ask for or repeat full Aadhaar numbers, passwords, OTPs or other secrets. If the user asks for a specific financial product, say actual terms must be verified with the provider. This app is a planning tool, not a bank or a substitute for regulated professional advice. Context JSON:\n${JSON.stringify(context)}`;
 const messages=[{role:'system',content:system},...history.slice(-8).map(x=>({role:x.role,content:x.content})),{role:'user',content:message}];
 const r=await c.responses.create({model:process.env.OPENAI_MODEL||'gpt-5-mini',input:messages});
 return {mode:'llm',reply:r.output_text||'I could not generate a response right now.'};
}
module.exports={answer};
