const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const M = require('../engine.js');
const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const expected = v => new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const failures = [], network = [];
const simulationMean = async (page, horizon, weight) => {
  const records = await page.locator('.full-history').last().locator('tbody tr td:first-child').allTextContents();
  assert.equal(records.length, 50);
  return M.statsForYears(horizon, weight, records.map(record => Number(record.slice(0, 4)))).mean;
};

(async () => {
  fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    const page = await context.newPage();
    page.on('pageerror', e => failures.push(e.stack));
    await page.goto(url);
    await page.locator('.frequency-chart').waitFor();
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(await overflow(), false);
    assert.equal(await page.locator('input[type=number]').count(), 0);
    assert.equal(await page.locator('.presets, [data-weight]').count(), 0);
    assert.equal(await page.locator('.chart-summary').count(), 0);
    assert.equal(await page.locator('#step-ten').isDisabled(), true);
    assert.equal(await page.locator('#step-compare').isDisabled(), true);
    await page.screenshot({ path: path.join(root, 'tmp/desktop-start.png'), fullPage: true });
    for (let i = 0; i < 5; i++) {
      await page.locator('#primary-action').click();
      await page.waitForFunction(() => !document.querySelector('#primary-action').disabled);
      assert.equal(await page.locator('.history-item:not(.empty)').count(), i + 1);
      assert.equal(await page.locator('.chart-summary').count(), 0);
    }
    const years = await page.locator('.history-item small:last-child').allTextContents();
    assert.equal(years.length, 5);
    assert.equal(await page.locator('#allocation-slider').isDisabled(), false);
    assert.equal(await page.locator('#reset-button, .session-options, #allocation-note').count(), 0);
    await page.screenshot({ path: path.join(root, 'tmp/desktop-samples.png'), fullPage: true });
    await page.locator('#primary-action').click();
    await page.locator('#skip-reveal').waitFor();
    await page.locator('.chart-summary').waitFor({ timeout: 8000 });
    const oneYearMean = await simulationMean(page, 1, .5);
    assert.ok((await page.locator('.stat strong').first().textContent()).includes(expected(oneYearMean)));
    assert.equal(await page.locator('#reveal-counter').textContent(), '50 / 50 pokusov');
    assert.equal(await page.locator('svg').evaluateAll(svgs => svgs.some(s => /NaN|Infinity/.test(s.innerHTML))), false);
    await page.locator('#primary-action').click();
    await page.locator('#allocation-slider').fill('75');
    assert.match(await page.locator('#allocation-round').textContent(), /10 rokov/);
    await page.locator('#primary-action').click();
    await page.waitForFunction(() => !document.querySelector('#primary-action').disabled);
    await page.locator('#primary-action').click();
    await page.waitForFunction(() => !document.querySelector('#primary-action').disabled);
    const partialDecades = await page.locator('.history-item small:last-child').allTextContents();
    await page.locator('#step-one').click();
    assert.equal(await page.locator('#allocation-slider').inputValue(), '50');
    assert.ok((await page.locator('.stat strong').first().textContent()).includes(expected(oneYearMean)));
    await page.locator('#step-ten').click();
    assert.equal(await page.locator('#allocation-slider').inputValue(), '75');
    assert.equal(await page.locator('.history-item:not(.empty)').count(), 2);
    assert.deepEqual(await page.locator('.history-item small:last-child').allTextContents(), partialDecades);
    for (let i = 2; i < 5; i++) {
      await page.locator('#primary-action').click();
      await page.waitForFunction(() => !document.querySelector('#primary-action').disabled);
    }
    const decades = await page.locator('.history-item small:last-child').allTextContents();
    assert.equal(decades.length, 5);
    assert.ok(decades.every(t => M.START_YEARS.includes(Number(t.slice(0, 4)))));
    await page.locator('#primary-action').click();
    await page.locator('#skip-reveal').click();
    const tenYearMean = await simulationMean(page, 10, .75);
    assert.ok((await page.locator('.stat strong').first().textContent()).includes(expected(tenYearMean)));
    await page.screenshot({ path: path.join(root, 'tmp/desktop-distribution.png'), fullPage: true });
    await page.locator('#primary-action').click();
    assert.equal(await page.locator('.compare-card').count(), 2);
    assert.ok((await page.locator('.compare-value').nth(0).textContent()).includes(expected(oneYearMean)));
    assert.ok((await page.locator('.compare-value').nth(1).textContent()).includes(expected(tenYearMean)));
    await page.locator('#risky-info-button').click();
    assert.equal(await page.locator('#risky-fund-dialog').isVisible(), true);
    assert.match(await page.locator('#risky-fund-dialog p').textContent(), /11,03 %.*16,82 %/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#risky-fund-dialog').isVisible(), false);
    await page.locator('#method-button').click();
    assert.equal(await page.locator('#method-dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#method-dialog').isVisible(), false);
    await page.locator('#fullscreen-button').click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 2), false, 'Fullscreen should fit on a 16:9 slide');
    await page.screenshot({ path: path.join(root, 'tmp/desktop-fullscreen.png'), fullPage: true });
    await page.locator('#fullscreen-button').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.locator('#allocation-slider').fill('100');
    assert.equal(await page.locator('.compare-card, .chart-summary').count(), 0);
    assert.equal(await page.locator('.history-item.empty').count(), 5);
    assert.equal(await page.locator('#allocation-slider').inputValue(), '100');
    assert.equal(await page.locator('#step-ten').isDisabled(), false);
    assert.equal(await page.locator('#step-compare').isDisabled(), true);
    await page.locator('#step-one').click();
    assert.equal(await page.locator('#allocation-slider').inputValue(), '50');
    assert.ok((await page.locator('.stat strong').first().textContent()).includes(expected(oneYearMean)));
    await page.locator('#step-ten').click();
    assert.equal(await page.locator('#allocation-slider').inputValue(), '100');
    // Allocation changes must cancel an in-flight outcome animation.
    await page.locator('#primary-action').click();
    await page.locator('#allocation-slider').fill('25');
    assert.equal(await page.locator('.history-item.empty').count(), 5);
    assert.equal(await page.locator('#primary-action').isDisabled(), false);
    assert.equal(await page.locator('#allocation-slider').inputValue(), '25');
    await page.locator('#primary-action').click();
    await page.waitForFunction(() => !document.querySelector('#primary-action').disabled);
    await page.locator('#allocation-slider').fill('50');
    assert.equal(await page.locator('.history-item.empty').count(), 5);
    await page.keyboard.press('r');
    assert.equal(await page.locator('.history-item.empty').count(), 5);
    assert.equal(await page.locator('#step-ten').isDisabled(), true);

    const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await phone.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    const mobile = await phone.newPage();
    mobile.on('pageerror', e => failures.push(e.stack));
    await mobile.goto(url);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobile.screenshot({ path: path.join(root, 'tmp/mobile-start.png'), fullPage: true });
    await mobile.locator('#allocation-slider').fill('0');
    for (let horizon = 1; horizon <= 10; horizon += 9) {
      await mobile.locator('#allocation-slider').fill('0');
      for (let i = 0; i < 5; i++) { await mobile.locator('#primary-action').click(); await mobile.waitForFunction(() => !document.querySelector('#primary-action').disabled); }
      await mobile.locator('#primary-action').click();
      await mobile.locator('.chart-summary').waitFor();
      assert.ok((await mobile.locator('.stat strong').first().textContent()).includes(expected(M.terminal(1966, horizon, 0))));
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await mobile.locator('svg').evaluateAll(svgs => svgs.some(s => /NaN|Infinity/.test(s.innerHTML))), false);
      if (horizon === 1) await mobile.locator('#primary-action').click();
    }
    await mobile.screenshot({ path: path.join(root, 'tmp/mobile-distribution.png'), fullPage: true });
    await mobile.locator('#primary-action').click();
    await mobile.locator('#allocation-slider').fill('100');
    assert.equal(await mobile.locator('.history-item.empty').count(), 5);
    assert.equal(await mobile.locator('#step-ten').isDisabled(), false);
    assert.equal(await mobile.locator('#step-compare').isDisabled(), true);
    await mobile.locator('#step-one').click();
    assert.equal(await mobile.locator('#allocation-slider').inputValue(), '0');
    assert.ok((await mobile.locator('.stat strong').first().textContent()).includes(expected(M.stats(1, 0).mean)));
    await mobile.locator('#step-ten').click();
    assert.equal(await mobile.locator('#allocation-slider').inputValue(), '100');
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobile.screenshot({ path: path.join(root, 'tmp/mobile-compare.png'), fullPage: true });
    for (const width of [320, 375, 390, 430]) {
      await mobile.setViewportSize({ width, height: 812 });
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(await mobile.locator('#allocation-slider').evaluate(e => e.getBoundingClientRect().height >= 44));
      assert.ok(await mobile.locator('#primary-action').evaluate(e => { const r=e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(network, []);
    console.log('PASS: offline desktop/mobile, 50 draws with replacement including five manual draws, independent horizons, preserved results, sample means and percentiles, safe fund, animation cancellation, fullscreen, keyboard, no network, no JS errors, no horizontal overflow.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
