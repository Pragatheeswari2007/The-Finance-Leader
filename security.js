const crypto=require('crypto');
const raw=process.env.AADHAAR_ENCRYPTION_KEY||'';
if(raw.length < 32) throw new Error('AADHAAR_ENCRYPTION_KEY must be set in backend/.env and be at least 32 characters long.');
const KEY=crypto.createHash('sha256').update(raw).digest();
function encrypt(text){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',KEY,iv);let e=c.update(String(text),'utf8','base64');e+=c.final('base64');return `${iv.toString('base64')}.${c.getAuthTag().toString('base64')}.${e}`;}
function decrypt(payload){const [ivB,tagB,data]=String(payload).split('.');const d=crypto.createDecipheriv('aes-256-gcm',KEY,Buffer.from(ivB,'base64'));d.setAuthTag(Buffer.from(tagB,'base64'));let x=d.update(data,'base64','utf8');return x+d.final('utf8');}
module.exports={encrypt,decrypt};
