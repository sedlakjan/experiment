const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../engine.js');
const source = require('../data/experience_sampling_1_10_data.json');
const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);

test('all 60 embedded total returns exactly match the supplied data', () => {
  assert.equal(M.ANNUAL_RETURNS.length, 60);
  source.annual_returns.forEach((record, i) => {
    assert.equal(record.year, 1966 + i);
    assert.equal(M.ANNUAL_RETURNS[i], record.sp500_total_return);
  });
});
test('all 102 paired stock outcomes match the supplied precomputed values', () => {
  assert.equal(M.START_YEARS.length, 51);
  assert.equal(M.START_YEARS[0], 1966);
  assert.equal(M.START_YEARS.at(-1), 2016);
  source.paired_scenarios_1_vs_10.forEach(record => {
    near(M.terminal(record.start_year, 1, 1), record.one_year.terminal_100);
    near(M.terminal(record.start_year, 10, 1), record.ten_year.terminal_100);
  });
});
test('the paired sample has exactly 11 one-year and 2 ten-year losses', () => {
  assert.equal(M.stats(1, 1).losses, 11);
  assert.equal(M.stats(10, 1).losses, 2);
  assert.deepEqual(M.scenarios(10, 1).filter(s => s.value < 100).map(s => s.year), [1999, 2000]);
  // Using all 60 one-year returns would give the wrong comparison population.
  assert.equal(M.ANNUAL_RETURNS.filter(r => r < 0).length, 13);
});
test('safe fund is fixed at the requested 3.3%, with annual compounding', () => {
  M.START_YEARS.forEach(year => {
    near(M.terminal(year, 1, 0), 103.3);
    near(M.terminal(year, 10, 0), 138.35766219152757);
  });
  assert.equal(M.stats(10, 0).losses, 0);
  near(M.stats(10, 0).p025, M.stats(10, 0).p975);
});
test('portfolio is an initial allocation held without annual rebalancing', () => {
  const stock = source.paired_scenarios_1_vs_10.find(s => s.start_year === 2000).ten_year.terminal_100;
  near(M.terminal(2000, 10, .5), .5 * stock + .5 * 100 * 1.033 ** 10);
  const sumOfAnnualReturns = source.annual_returns.filter(r => r.year >= 2000 && r.year <= 2009).reduce((sum, r) => sum + r.sp500_total_return, 0);
  assert.ok(Math.abs(M.stockFactor(2000, 10) - (1 + sumOfAnnualReturns)) > .01);
});
test('historical expected terminal value is the arithmetic mean of all terminal values', () => {
  near(M.stats(1, 1).mean, 111.0290196078431);
  near(M.stats(10, 1).mean, 303.5128744989343);
  near(M.stats(10, .5).mean, .5 * M.stats(10, 1).mean + .5 * M.terminal(1966, 10, 0));
});
test('risk-fund information matches the paired one-year sample and sample standard deviation', () => {
  const returns = M.START_YEARS.map(year => M.stockFactor(year, 1) - 1);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const sampleSD = Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1));
  assert.equal((mean * 100).toFixed(2), '11.03');
  assert.equal((sampleSD * 100).toFixed(2), '16.82');
});
test('percentile interpolation and histogram handle boundaries and the fixed fund', () => {
  near(M.quantile([0, 10, 20, 30], .25), 7.5);
  near(M.quantile([0, 10, 20, 30], 0), 0);
  near(M.quantile([0, 10, 20, 30], 1), 30);
  near(M.stats(1, 1).p15, 92.39);
  for (const h of [1, 10]) for (const w of [0, .05, .5, 1]) {
    const values = M.scenarios(h, w).map(s => s.value), s = M.stats(h, w);
    assert.equal(M.histogram(values, s.min - 1, s.max + 1).reduce((n, b) => n + b.count, 0), 51);
    assert.ok(s.p025 <= s.p15 && s.p15 <= s.median && s.median <= s.p85 && s.p85 <= s.p975);
  }
  const edgeBins = M.histogram([0, 10], 0, 10, 2);
  assert.equal(edgeBins[0].count, 1);
  assert.equal(edgeBins[1].count, 1);
});
test('sampling never duplicates a starting year and does not mutate the population', () => {
  const shuffled = M.shuffle(M.START_YEARS, () => .42);
  assert.equal(new Set(shuffled).size, 51);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), [...M.START_YEARS]);
  assert.equal(M.START_YEARS[0], 1966);
});
test('incomplete horizons and invalid allocation values fail explicitly', () => {
  assert.throws(() => M.stockFactor(2017, 10), RangeError);
  assert.throws(() => M.stockFactor(1965, 1), RangeError);
  assert.throws(() => M.terminal(1966, 1, 1.01), RangeError);
});
