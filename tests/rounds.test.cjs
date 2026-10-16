const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('../engine.js');

// Exercise the actual application event handlers without opening a browser.
function application(randomValue = Math.random) {
  const elements = new Map(), frames = new Map(), timers = new Map();
  let nextId = 0;
  class Element {
    constructor(id) {
      this.id = id; this.listeners = {}; this.attributes = {}; this.disabled = false;
      this.style = { setProperty() {} }; this.classList = { toggle() {} };
      this._html = ''; this.value = '50';
    }
    set innerHTML(html) {
      this._html = html;
      if (this.id !== 'experience-content') return;
      for (const id of ['primary-action', 'skip-reveal', 'show-history', 'animated-value', 'chart-host', 'reveal-counter']) elements.delete(id);
      for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
        const child = new Element(match[1]);
        child.disabled = /\sdisabled(?:\s|>)/.test(match[0]);
        elements.set(child.id, child);
      }
    }
    get innerHTML() { return this._html; }
    addEventListener(event, fn) { this.listeners[event] = fn; }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    querySelector() { return this.child ||= new Element('child'); }
    scrollIntoView() {}
  }
  const template = fs.readFileSync(require.resolve('../src/index.template.html'), 'utf8');
  for (const [, id] of template.matchAll(/\bid="([^"]+)"/g)) elements.set(id, new Element(id));
  const document = {
    getElementById: id => elements.get(id) || null,
    querySelector: () => new Element('query'),
    documentElement: new Element('html'),
    addEventListener() {}
  };
  const context = vm.createContext({ InvestmentMath: M, document, HTMLElement: Element,
    navigator: {}, Intl, innerWidth: 375, matchMedia: () => ({ matches: false }),
    crypto: { getRandomValues(array) { array[0] = Math.floor(randomValue() * 4294967296); return array; } },
    performance: { now: () => 0 }, addEventListener() {},
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setInterval(fn) { const id = ++nextId; timers.set(id, fn); return id; },
    clearInterval: id => timers.delete(id)
  });
  vm.runInContext(fs.readFileSync(require.resolve('../app.js'), 'utf8'), context);
  const get = id => elements.get(id);
  const click = id => { assert.ok(get(id), id + ' exists'); assert.equal(get(id).disabled, false, id + ' enabled'); get(id).listeners.click(); };
  const flushFrames = () => { for (const [id, fn] of frames) { frames.delete(id); fn(1000); } };
  const allocation = value => get('allocation-slider').listeners.input({ target: { value: String(value) } });
  const draw = () => { click('primary-action'); flushFrames(); };
  const finishRound = (remaining = 5) => { for (let i = 0; i < remaining; i++) draw(); click('primary-action'); click('skip-reveal'); };
  return { get, click, allocation, draw, finishRound, flushFrames, frames, timers,
    // The fake parent does not serialize child property mutations after animation.
    html: () => get('experience-content').innerHTML.replace(' disabled>', ' >') };
}
const money = value => new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' €';
function simulationStats(html, horizon, weight) {
  const comparisons = [...html.matchAll(/<tr><td>\d+<\/td><td>(\d{4})<\/td><td[^>]*>[^<]+<\/td><td>(\d{4}) – \d{4}<\/td><td[^>]*>[^<]+/g)];
  const years = comparisons.length >= 50
    ? comparisons.slice(-50).map(row => +row[horizon === 1 ? 1 : 2])
    : [...html.matchAll(/<tr><td>(\d{4})(?: – \d{4})? · pokus \d+/g)].slice(-50).map(row => +row[1]);
  assert.equal(years.length, 50);
  return M.statsForYears(horizon, weight, years);
}

test('different allocations preserve completed first round and partially sampled second round', () => {
  const app = application();
  app.finishRound();
  const firstRound = app.html();
  app.click('primary-action');
  app.allocation(75);
  assert.equal(app.get('allocation-round').textContent, 'Nastavenie na 10 rokov');
  assert.match(app.html(), /0 \/ 5/);
  app.draw(); app.draw();
  const partialTen = app.html();
  app.click('step-one');
  assert.equal(app.get('allocation-slider').value, 50);
  assert.equal(app.html(), firstRound);
  app.click('step-ten');
  assert.equal(app.get('allocation-slider').value, 75);
  assert.equal(app.html(), partialTen);
  app.finishRound(3);
  app.click('primary-action');
  assert.match(app.html(), /50 % bezpečný fond · 50 % akcie/);
  assert.match(app.html(), /25 % bezpečný fond · 75 % akcie/);
  assert.ok(app.html().includes(money(simulationStats(app.html(), 1, .5).mean)));
  assert.ok(app.html().includes(money(simulationStats(app.html(), 10, .75).mean)));
  const row = app.html().match(/<tr><td>1<\/td><td>(\d+)<\/td><td[^>]*>([^<]+)<\/td><td>(\d+) – \d+<\/td><td[^>]*>([^<]+)/);
  assert.ok(row);
  assert.equal(row[2], money(M.terminal(+row[1], 1, .5)));
  assert.equal(row[4], money(M.terminal(+row[3], 10, .75)));
});

test('editing either round preserves the other, keeps ten years accessible and invalidates comparison', () => {
  const app = application();
  app.finishRound(); app.click('primary-action'); app.allocation(75); app.finishRound();
  app.click('primary-action');
  app.allocation(80);
  assert.match(app.html(), /0 \/ 5/);
  assert.equal(app.get('step-compare').disabled, true);
  app.click('step-one');
  assert.ok(app.html().includes(money(simulationStats(app.html(), 1, .5).mean)));
  app.click('step-ten'); app.finishRound();
  const completedTen = app.html();
  app.click('step-one'); app.allocation(25);
  assert.match(app.html(), /0 \/ 5/);
  assert.equal(app.get('step-ten').disabled, false);
  assert.equal(app.get('step-compare').disabled, true);
  app.click('step-ten');
  assert.equal(app.get('allocation-slider').value, 80);
  // Editing year one only changes the next-action label in the saved ten-year view.
  assert.ok(app.html().includes(money(simulationStats(app.html(), 10, .8).mean)));
  assert.equal((app.html().match(/<svg class="frequency-chart"[^]*?<\/svg>/) || [])[0], (completedTen.match(/<svg class="frequency-chart"[^]*?<\/svg>/) || [])[0]);
  app.click('primary-action');
  assert.equal(app.get('allocation-slider').value, 25);
  app.draw(); const partialOne = app.html();
  app.click('step-ten'); app.click('step-one');
  assert.equal(app.html(), partialOne);
  app.allocation(25);
  assert.equal(app.html(), partialOne, 'same allocation does not clear results');
  app.finishRound(4); app.click('step-compare');
  assert.ok(app.html().includes(money(simulationStats(app.html(), 1, .25).mean)));
  assert.ok(app.html().includes(money(simulationStats(app.html(), 10, .8).mean)));
  app.click('primary-action');
  assert.match(app.html(), /0 \/ 5/);
  assert.equal(app.get('allocation-slider').value, 25);
  assert.equal(app.get('step-ten').disabled, true);
  app.finishRound(); app.click('primary-action');
  assert.equal(app.get('allocation-slider').value, 80, 'new series preserves both independent settings');
});

test('changing ten-year allocation cancels outcome and reveal animations without resetting year one', () => {
  const app = application();
  app.finishRound(); const first = app.html(); app.click('primary-action');
  app.click('primary-action');
  assert.equal(app.frames.size, 1);
  app.allocation(100);
  assert.equal(app.frames.size, 0);
  assert.equal(app.get('primary-action').disabled, false);
  app.click('step-one'); assert.equal(app.html(), first); app.click('step-ten');
  for (let i = 0; i < 5; i++) app.draw();
  app.click('primary-action'); assert.equal(app.timers.size, 1);
  app.allocation(0); assert.equal(app.timers.size, 0);
  assert.match(app.html(), /0 \/ 5/);
  app.click('step-one'); assert.equal(app.html(), first);
});

test('moving allocation away and back samples new years without reloading the application', () => {
  let calls = 0;
  const app = application(() => Math.floor(calls++ / 5) / 3);
  const drawFive = () => {
    for (let i = 0; i < 5; i++) app.draw();
    return [...app.html().matchAll(/<small>(\d{4})<\/small>/g)].map(match => +match[1]);
  };
  const first = drawFive();
  assert.equal(calls, 5);
  app.allocation(75);
  const second = drawFive();
  assert.equal(calls, 10);
  app.allocation(50);
  const third = drawFive();
  assert.equal(calls, 15, 'each click consumes fresh randomness, including after returning to 50%');
  assert.notDeepEqual(second, first);
  assert.notDeepEqual(third, first);
  for (const years of [first, second, third]) {
    assert.equal(years.length, 5);
    assert.ok(years.every(year => M.START_YEARS.includes(year)));
  }
});

test('50-draw simulations include manual draws, allow repeats and change their mean without affecting the other horizon', () => {
  let calls = 0;
  const app = application(() => { const value = calls < 50 ? 0 : calls < 100 ? .75 : .4; calls++; return value; });
  app.finishRound(); const first = app.html();
  assert.equal(calls, 50, 'five manual plus 45 automatic draws, including when skipping animation');
  const firstYear = first.match(/<tr><td>(\d{4}) · pokus 1/)[1];
  app.click('primary-action'); app.allocation(100); app.finishRound();
  const initialTen = app.html();
  const tenYear = initialTen.match(/<tr><td>(\d{4}) – \d{4} · pokus 1/)[1];
  assert.notEqual(tenYear, firstYear);
  const initialStats = simulationStats(initialTen, 10, 1);
  assert.equal(calls, 100);
  assert.ok(initialTen.includes(money(initialStats.mean)));
  assert.ok(initialTen.includes('Priemer vašej investície (50 pokusov)'));
  assert.notEqual(initialStats.mean, M.stats(10, 1).mean);
  assert.match(initialTen, /50 \/ 50 pokusov/);
  assert.equal(initialTen.includes('NaN'), false);
  app.allocation(75); app.allocation(100); app.finishRound();
  assert.equal(calls, 150, 'repeating the ten-year round consumes 50 fresh draws');
  const nextStats = simulationStats(app.html(), 10, 1);
  assert.notEqual(nextStats.mean, initialStats.mean);
  assert.ok(app.html().includes(money(nextStats.mean)));
  assert.notEqual(nextStats.p15, initialStats.p15);
  app.click('step-one');
  assert.equal(app.html(), first, 'resampling ten years keeps the exact first-year graph and observations');
});

test('finishing the animation and skipping it reveal the same preselected 50-draw sample', () => {
  const generator = () => { let i = 0; return () => ((i++ * 17) % 51 + .25) / 51; };
  const animated = application(generator()), skipped = application(generator());
  for (const app of [animated, skipped]) {
    for (let i = 0; i < 5; i++) app.draw();
    app.click('primary-action');
    assert.equal(app.html().includes('Priemer vašej investície (50 pokusov)'), false);
  }
  skipped.click('skip-reveal');
  let ticks = 0;
  while (animated.timers.size && ticks < 50) {
    [...animated.timers.values()][0](); ticks++;
  }
  assert.equal(ticks, 45);
  assert.equal(animated.timers.size, 0);
  assert.equal(animated.html(), skipped.html());
  const stats = simulationStats(animated.html(), 1, .5);
  assert.ok(animated.html().includes(money(stats.mean)));
  assert.ok(animated.html().includes(`P15 · ${money(stats.p15)}`));
  assert.ok(animated.html().includes(`P85 · ${money(stats.p85)}`));
  assert.equal(/NaN|Infinity/.test(animated.html()), false);
});
