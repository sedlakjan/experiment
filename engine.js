/* Historical calculations shared by the offline app and the verification suite. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InvestmentMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ANNUAL_RETURNS = [-0.0997, 0.238, 0.1081, -0.0824, 0.0356, 0.1422, 0.1876, -0.1431, -0.259, 0.37, 0.2383, -0.0698, 0.0651, 0.1852, 0.3174, -0.047, 0.2042, 0.2234, 0.0615, 0.3124, 0.1849, 0.0581, 0.1654, 0.3148, -0.0306, 0.3023, 0.0749, 0.0997, 0.0133, 0.372, 0.2268, 0.331, 0.2834, 0.2089, -0.0903, -0.1185, -0.2197, 0.2836, 0.1074, 0.0483, 0.1561, 0.0548, -0.3655, 0.2594, 0.1482, 0.021, 0.1589, 0.3215, 0.1352, 0.0138, 0.1177, 0.2161, -0.0423, 0.3121, 0.1802, 0.2847, -0.1804, 0.2606, 0.2488, 0.1778];
  const INITIAL = 100;
  // Explicit user setting; the supplied JSON's 3.35% reference is not used.
  const SAFE_RATE = 0.033;
  const FIRST_YEAR = 1966;
  const START_YEARS = Object.freeze(Array.from({ length: 51 }, (_, i) => FIRST_YEAR + i));

  function stockFactor(startYear, horizon) {
    const offset = startYear - FIRST_YEAR;
    if (!Number.isInteger(offset) || !Number.isInteger(horizon) || horizon < 1 || offset < 0 || offset + horizon > ANNUAL_RETURNS.length) throw new RangeError('Neplatné historické obdobie.');
    return ANNUAL_RETURNS.slice(offset, offset + horizon).reduce((factor, rate) => factor * (1 + rate), 1);
  }
  function terminal(startYear, horizon, weight) {
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new RangeError('Podiel akcií musí byť medzi 0 a 1.');
    return INITIAL * ((1 - weight) * (1 + SAFE_RATE) ** horizon + weight * stockFactor(startYear, horizon));
  }
  function scenarios(horizon, weight) {
    return START_YEARS.map(year => ({ year, endYear: year + horizon - 1, value: terminal(year, horizon, weight) }));
  }
  // Hyndman–Fan type 7: linear interpolation at position (n - 1) * p.
  function quantile(sorted, p) {
    if (!sorted.length || p < 0 || p > 1) throw new RangeError('Neplatný percentil.');
    const position = (sorted.length - 1) * p;
    const i = Math.floor(position);
    return sorted[i] + (sorted[Math.min(i + 1, sorted.length - 1)] - sorted[i]) * (position - i);
  }
  function stats(horizon, weight) {
    const observations = scenarios(horizon, weight);
    const sorted = observations.map(s => s.value).sort((a, b) => a - b);
    return {
      count: sorted.length,
      mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
      median: quantile(sorted, .5),
      p025: quantile(sorted, .025), p15: quantile(sorted, .15),
      p85: quantile(sorted, .85), p975: quantile(sorted, .975),
      min: sorted[0], max: sorted[sorted.length - 1],
      losses: sorted.filter(value => value < INITIAL - 1e-9).length
    };
  }
  function shuffle(items, random = Math.random) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  function histogram(values, min, max, count = 14) {
    const bins = Array.from({ length: count }, (_, i) => ({ low: min + i * (max - min) / count, high: min + (i + 1) * (max - min) / count, count: 0 }));
    for (const value of values) {
      const index = Math.max(0, Math.min(count - 1, Math.floor((value - min) / (max - min) * count)));
      bins[index].count++;
    }
    return bins;
  }
  function density(values, x, bandwidth) {
    return values.reduce((sum, value) => sum + Math.exp(-.5 * ((x - value) / bandwidth) ** 2), 0) / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
  }
  return Object.freeze({ INITIAL, SAFE_RATE, FIRST_YEAR, START_YEARS, ANNUAL_RETURNS: Object.freeze(ANNUAL_RETURNS), stockFactor, terminal, scenarios, stats, quantile, shuffle, histogram, density });
});
