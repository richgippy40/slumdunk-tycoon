// Run: NODE_USE_ENV_PROXY=1 node scripts/render-preview.mjs [--dry]   (needs a Render API key)
// Create (or reuse) a FREE Render Static Site for the dev branch only. Never touches other services.
// The network proxy injects the Render API key; this script sends no credential itself.
const API = 'https://api.render.com/v1';
const NAME = 'slumdunk-tycoon-preview';
const REPO = 'https://github.com/richgippy40/slumdunk-tycoon';
const BRANCH = 'claude/cool-goldberg-mtoac8';
const DRY = process.argv.includes('--dry');

async function call(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer proxy-injected' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const owners = await call('GET', '/owners?limit=20');
console.log('owners:', owners.map((o) => `${o.owner.id} ${o.owner.name} (${o.owner.type})`).join(', '));
const services = (await call('GET', '/services?limit=100')).map((x) => x.service);
for (const s of services) console.log(`service: ${s.name} | ${s.type} | ${s.branch} | ${s.serviceDetails?.url}`);

let svc = services.find((s) => s.name === NAME);
if (svc && svc.branch !== BRANCH) throw new Error(`${NAME} exists on branch ${svc.branch}; refusing to change it`);
if (!svc) {
  const prod = services.find((s) => s.repo?.includes('slumdunk-tycoon'));
  const ownerId = prod?.ownerId || owners[0].owner.id;
  const body = {
    type: 'static_site', name: NAME, ownerId, repo: REPO, branch: BRANCH, autoDeploy: 'yes',
    serviceDetails: { buildCommand: 'echo ok', publishPath: '.', pullRequestPreviewsEnabled: 'no' },
  };
  console.log('create:', JSON.stringify(body));
  if (DRY) process.exit(0);
  svc = (await call('POST', '/services', body)).service;
}
console.log('preview service:', svc.id, svc.serviceDetails?.url);
// Preview only: no caching, so each redeploy shows up on the phone immediately.
try {
  await call('PUT', `/services/${svc.id}/headers`, [{ path: '/*', name: 'Cache-Control', value: 'no-cache' }]);
} catch (e) { console.log('headers (optional) not set:', e.message); }

for (let i = 0; i < 60; i++) {
  const d = (await call('GET', `/services/${svc.id}/deploys?limit=1`))[0]?.deploy;
  console.log('deploy:', d?.status, d?.commit?.id?.slice(0, 7));
  if (d?.status === 'live') break;
  if (/failed|canceled/.test(d?.status || '')) throw new Error('deploy ' + d.status);
  await new Promise((r) => setTimeout(r, 10000));
}
console.log('URL', svc.serviceDetails?.url);
