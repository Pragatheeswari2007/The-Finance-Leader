// Reliable Windows startup for The Finance Leader.
// Creates local development secrets once if they do not already exist.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const major = Number(process.versions.node.split('.')[0]);
if (major < 22 || major >= 25) {
  console.error(`The Finance Leader 3.1.1 requires Node.js 22.x–24.x. Detected ${process.version}.`);
  process.exit(1);
}

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const jwt = crypto.randomBytes(48).toString('base64url');
  const aadhaar = crypto.randomBytes(48).toString('base64url');
  const env = [
    `PORT=3000`,
    `JWT_SECRET=${jwt}`,
    `AADHAAR_ENCRYPTION_KEY=${aadhaar}`,
    `OPENAI_MODEL=gpt-5-mini`,
    `# Add OPENAI_API_KEY=... to enable the real LLM assistant`,
    ''
  ].join('\n');
  fs.writeFileSync(envPath, env, { encoding: 'utf8', mode: 0o600 });
  console.log('✓ Created backend/.env with local secrets.');
}

require('dotenv').config({ path: envPath });

try {
  const app = require('./server');
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => {
    console.log('✓ Database connected');
    console.log('✓ Backend API ready');
    console.log('✓ Frontend loaded');
    console.log(`✓ The Finance Leader running at http://localhost:${port}`);
    console.log(`✓ Health check: http://localhost:${port}/api/health`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✗ Port ${port} is already in use.`);
      console.error(`  Close the other Node process or run: $env:PORT=3001; npm start`);
    } else {
      console.error('✗ Server error:', err);
    }
    process.exit(1);
  });
} catch (err) {
  console.error('\n✗ The Finance Leader could not start.');
  console.error(err.stack || err.message || err);
  process.exit(1);
}
