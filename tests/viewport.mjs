// Run with playwright-core installed: node tests/viewport.mjs [baseURL]
// Synthetic visualViewport/safe-area regression; not a real iOS browser test.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const failures = [];
let checks = 0;
try {
  for (const [width, height] of [[844, 390], [852, 393], [932, 430], [1280, 720]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const viewport = new EventTarget();
      // The viewport meta tag is parsed after init scripts; read the initial
      // dimensions lazily rather than capturing the pre-meta 980px viewport.
      for (const [key, fallback] of [['width', 'innerWidth'], ['height', 'innerHeight']]) {
        let value;
        Object.defineProperty(viewport, key, { get: () => value ?? window[fallback], set: n => { value = n; } });
      }
      Object.assign(viewport, { offsetLeft: 0, offsetTop: 0 });
      Object.defineProperty(window, 'visualViewport', { value: viewport });
    });
    await page.goto(process.argv[2] || 'http://127.0.0.1:8000/');
    await page.tap('#startBtn');
    // Do not invoke the optional fullscreen button; toolbars must be supported.
    for (const scenario of [
      { name: 'normal', width, height, offsetLeft: 0, offsetTop: 0 },
      { name: 'toolbars', width, height: height - 100, offsetLeft: 0, offsetTop: 48 },
      { name: 'safe-area', width: width - 20, height: height - 80, offsetLeft: 10, offsetTop: 36, safe: [0, 44, 21, 44] },
      { name: 'viewport-scroll', width, height: height - 100, offsetLeft: 0, offsetTop: 64, event: 'scroll' },
      { name: 'restored', width, height, offsetLeft: 0, offsetTop: 0 },
    ]) {
      const measurements = await page.evaluate(async (s) => {
        const safe = s.safe || [0, 0, 0, 0];
        // Override only the env() probe to emulate notch and home indicator insets.
        let style = document.getElementById('test-safe-area');
        if (!style) { style = document.createElement('style'); style.id = 'test-safe-area'; document.head.append(style); }
        style.textContent = `#viewport-safe-area { padding: ${safe.map(n => n + 'px').join(' ')} !important; }`;
        Object.assign(visualViewport, { width: s.width, height: s.height, offsetLeft: s.offsetLeft, offsetTop: s.offsetTop });
        visualViewport.dispatchEvent(new Event(s.event || 'resize'));
        await new Promise(requestAnimationFrame);
        // Sales grow during play; checking only the initial ₩0 misses HUD overflow.
        document.querySelector('#sales').textContent = '₩999,999';
        const bounds = { left: s.offsetLeft + safe[3], top: s.offsetTop + safe[0], right: s.offsetLeft + s.width - safe[1], bottom: s.offsetTop + s.height - safe[2] };
        const outside = ['#stage', '.hud', '#sales', '#target', '#time', '#customers', '.grill-panel', '#grill', '#grill2', '.assembly-panel', '.tray-panel', '#pauseBtn', '#soundBtn', ...[...document.querySelectorAll('.tile')].map((_, i) => `.tile:nth-child(${i + 1})`)].filter(sel => {
          const r = document.querySelector(sel).getBoundingClientRect();
          return r.left < bounds.left - 1 || r.top < bounds.top - 1 || r.right > bounds.right + 1 || r.bottom > bounds.bottom + 1;
        });
        return { outside, bounds, stage: document.querySelector('#stage').getBoundingClientRect().toJSON(), scroll: document.scrollingElement.scrollWidth > innerWidth + 1 || document.scrollingElement.scrollHeight > innerHeight + 1 };
      }, scenario);
      checks++;
      if (measurements.outside.length || measurements.scroll) failures.push({ size: [width, height], scenario: scenario.name, ...measurements });
      // Native touch hit testing must still reach the transformed ingredient.
      await page.tap('.tile[data-key=bottom]');
      assert.equal(await page.locator('.layer').count(), 1);
      await page.tap('.tile.undo');
      assert.equal(await page.locator('.layer').count(), 0);
    }
    await page.setViewportSize({ width: height, height: width });
    await page.evaluate(() => { Object.assign(visualViewport, { width: innerWidth, height: innerHeight }); window.dispatchEvent(new Event('orientationchange')); });
    await page.waitForFunction(() => document.body.classList.contains('portrait'));
    await context.close();
  }
  console.log(JSON.stringify({ checks, failures }, null, 2));
  assert.equal(failures.length, 0, 'All game regions must fit inside the visible safe rectangle');
} finally {
  await browser.close();
}
