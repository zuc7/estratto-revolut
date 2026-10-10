const crypto = require('crypto');
const B = 'https://api.enablebanking.com';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');

// JWT RS256 firmato con la chiave privata dell'app (mai nel browser)
function jwt() {
  const iat = Math.floor(Date.now() / 1000);
  const body = b64({typ: 'JWT', alg: 'RS256', kid: process.env.EB_APP_ID}) + '.' +
               b64({iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat, exp: iat + 3600});
  const key = process.env.EB_PRIVATE_KEY.replace(/\\n/g, '\n');
  return body + '.' + crypto.createSign('RSA-SHA256').update(body).sign(key, 'base64url');
}

async function eb(path, opt = {}) {
  const r = await fetch(B + path, {...opt, headers: {Authorization: 'Bearer ' + jwt(), 'Content-Type': 'application/json'}});
  const t = await r.text();
  if (!r.ok) throw new Error(`Enable Banking ${r.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
}

// Accesso solo al proprietario: confronto a tempo costante a lunghezza fissa tramite SHA-256
function authed(req) {
  const want = process.env.ACCESS_TOKEN;
  if (!want) return false;
  const got = (req.headers.authorization || '').replace(/^Bearer /, '') || req.query.token || '';
  if (!got) return false;
  const hGot = crypto.createHash('sha256').update(got).digest();
  const hWant = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(hGot, hWant);
}

module.exports = {eb, authed};
