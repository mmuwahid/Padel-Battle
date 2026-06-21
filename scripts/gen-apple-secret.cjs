const fs = require('fs');
const crypto = require('crypto');

const TEAM_ID    = '9M6M6A8B6V';
const KEY_ID     = 'NTSQJCBXXH';
const SERVICES_ID= 'com.mohammedmuwahid.padelhub.signin';
const P8_PATH    = 'C:/Users/User/Downloads/AuthKey_NTSQJCBXXH.p8';

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

const now = Math.floor(Date.now()/1000);
const exp = now + 15552000; // 180 days (Apple max is ~6 months)

const header  = { alg:'ES256', kid:KEY_ID };
const payload = { iss:TEAM_ID, iat:now, exp, aud:'https://appleid.apple.com', sub:SERVICES_ID };

const signingInput = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload));
const key = crypto.createPrivateKey(fs.readFileSync(P8_PATH));
const sig = crypto.sign('sha256', Buffer.from(signingInput), { key, dsaEncoding:'ieee-p1363' });
const jwt = signingInput + '.' + b64url(sig);

console.log('---APPLE_CLIENT_SECRET_JWT_BEGIN---');
console.log(jwt);
console.log('---APPLE_CLIENT_SECRET_JWT_END---');
console.log('Expires:', new Date(exp*1000).toISOString().slice(0,10), '(regenerate before then)');
