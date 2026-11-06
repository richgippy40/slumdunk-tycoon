// Loads Playwright from playwright-core (npm i --no-save playwright-core) or a preinstalled
// `playwright`, and launches Chromium. Override the binary with CHROMIUM_PATH.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw = null;
for (const name of ['playwright-core', 'playwright']) {
  try { pw = require(name); break; } catch { /* try next */ }
}
if (!pw) throw new Error('Playwright not found: run `npm i --no-save playwright-core`');

export const chromium = pw.chromium;
export function launch() {
  const executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(executablePath ? { executablePath, args: ['--no-sandbox'] } : {});
}
