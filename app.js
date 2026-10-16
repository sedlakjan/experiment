(() => {
  'use strict';
  const M = InvestmentMath;
  const $ = id => document.getElementById(id);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const fmt = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const money = value => fmt.format(value) + ' $';
  const percentage = value => (value > 1e-9 ? '+' : '') + pct.format(Math.abs(value) < 1e-9 ? 0 : value) + ' %';
  const tone = value => value < 100 - 1e-9 ? 'negative' : 'positive';
  let state;
  let drawFrame = 0;
  let revealTimer = 0;
  let lastHapticAt = -Infinity;
  let resizeFrame = 0;
  let narrowChart = innerWidth < 600;

  function hapticTick(weight) {
    if (typeof navigator.vibrate !== 'function' || reducedMotion.matches) return;
    const now = performance.now();
    if (now - lastHapticAt < 50) return;
    lastHapticAt = now;
    try { navigator.vibrate(weight === 0 || weight === .5 || weight === 1 ? 14 : 7); } catch { /* Optional device feedback. */ }
  }
  function showExperience() {
    if (matchMedia('(max-width:780px), (max-width:1024px) and (max-height:500px)').matches) document.querySelector('.experience').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  }

  function random() {
    if (globalThis.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    return Math.random();
  }
  function announce(text) { $('announcement').textContent = text; }
  function stopAnimations() { cancelAnimationFrame(drawFrame); clearInterval(revealTimer); }
  function reset(weight = .5) {
    stopAnimations();
    state = { weight, draws: 5, horizon: 1, phase: 'sampling', years: [], tenCount: 0, busy: false, revealed: {}, revealYears: [], compare: false };
    $('allocation-slider').value = Math.round(weight * 100);
    updateAllocation();
    render();
    announce('Nová séria. Najprv vyskúšajte jednoročný horizont.');
  }
  function currentCount() { return state.horizon === 1 ? state.years.length : state.tenCount; }
  function visibleYears() { return state.years.slice(0, currentCount()); }
  function updateAllocation() {
    const risk = Math.round(state.weight * 100);
    $('safe-amount').innerHTML = `${100 - risk} <small>$</small>`;
    $('risky-amount').innerHTML = `${risk} <small>$</small>`;
    $('safe-percent').textContent = `${100 - risk} % bezpečne`;
    $('risky-percent').textContent = `${risk} % v akciách`;
    $('allocation-slider').style.setProperty('--fill', risk + '%');
    $('allocation-slider').setAttribute('aria-valuetext', `${risk} percent akcie, ${100 - risk} percent bezpečný fond`);
  }
  function setAllocation(weight) {
    if (weight === state.weight) return;
    hapticTick(weight);
    reset(weight);
    announce(`Rozdelenie zmenené na ${Math.round(weight * 100)} percent akcií. Predchádzajúce výsledky sú vymazané. Nová séria začína jednoročným horizontom.`);
  }
  function updateJourney() {
    const stages = [$('step-one'), $('step-ten'), $('step-compare')];
    const active = state.compare ? 2 : state.horizon === 1 ? 0 : 1;
    stages.forEach((button, i) => {
      const unlocked = i === 0 || (i === 1 ? !!state.revealed[1] : !!state.revealed[10]);
      button.disabled = !unlocked || state.phase === 'revealing' || state.busy;
      button.classList.toggle('active', i === active);
      button.classList.toggle('done', i < active);
      if (i === active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.querySelector('.step-state').textContent = i < active ? '✓' : i === active ? '→' : '⌑';
    });
  }
  function historyHTML() {
    const years = visibleYears();
    const cells = Array.from({ length: state.draws }, (_, i) => {
      if (i >= years.length) return `<div class="history-item empty" aria-label="Pokus ${i + 1}, zatiaľ nevyžrebovaný">${String(i + 1).padStart(2, '0')}</div>`;
      const year = years[i], value = M.terminal(year, state.horizon, state.weight);
      return `<div class="history-item"><span class="attempt-label">POKUS ${String(i + 1).padStart(2, '0')}</span><strong>${money(value)}</strong><small class="${tone(value)}"><span class="dot"></span>${percentage(value - 100)}</small><small>${state.horizon === 1 ? year : `${year} – ${year + 9}`}</small></div>`;
    }).join('');
    return `<div class="history-heading"><h3>Vaše pokusy</h3><span>Každý je nová investícia 100 $</span></div><div class="history-grid" style="grid-template-columns:repeat(${state.draws},minmax(0,1fr))">${cells}</div><p class="sampling-note">${state.horizon === 1 ? 'Náhodné historické začiatky bez opakovania v sérii.' : 'Tie isté počiatočné roky ako pri jednoročnom horizonte.'}</p>`;
  }
  function samplingHTML() {
    const count = currentCount(), years = visibleYears(), year = years.at(-1);
    const value = year ? M.terminal(year,state.horizon,state.weight) : 100;
    return `<div class="sample-result"><div><span class="value-label">${year ? state.horizon === 1 ? `Pokus ${count} · historický rok ${year}` : `Pokus ${count} · ${year} – ${year+9}` : 'Váš počiatočný vklad'}</span><div class="sample-value"><span id="animated-value">${fmt.format(value)}</span><span class="sample-currency">$</span><span class="return-badge ${year ? tone(value) : ''}">${year ? percentage(value-100)+' celkovo' : 'Jedna investícia, veľa možností'}</span></div></div><span class="sample-counter">${count} / ${state.draws}<small>vlastných pokusov</small></span></div><div class="frequency-wrap">${chartHTML(state.horizon,state.weight,years)}</div><div class="draw-actions"><button id="primary-action" class="primary-button" ${state.busy ? 'disabled' : ''}>${count === state.draws ? 'Spustiť simuláciu' : 'Ukázať možný výsledok investície'}</button><span class="key-hint"><kbd>medzerník</kbd></span><span class="sampling-hint">${count === state.draws ? 'Doplniť celé rozdelenie' : 'Každý klik pribudne do grafu'}</span></div>${historyHTML()}`;
  }


  function chartHTML(horizon, weight, shownYears = M.START_YEARS, small = false) {
    const all = M.scenarios(horizon, weight).map(s => s.value);
    const values = shownYears.map(year => M.terminal(year, horizon, weight));
    const stats = M.stats(horizon, weight), complete = shownYears.length === 51;
    const fixed = stats.max - stats.min < 1e-8;
    const narrow = innerWidth < 600 || small;
    const width = narrow ? 360 : 760, height = narrow ? 350 : 365;
    const left = narrow ? 12 : 38, axis = width - (narrow ? 96 : 122), top = 34, bottom = height - 54;
    const max = Math.ceil(Math.max(stats.max, 100) * 1.12 / 20) * 20;
    const y = value => bottom - value / max * (bottom - top);
    const bins = M.histogram(values, 0, max, 34), fullBins = M.histogram(all, 0, max, 34);
    const sd = Math.sqrt(all.reduce((sum, value) => sum + (value - stats.mean) ** 2, 0) / 50);
    const sorted = [...all].sort((a, b) => a - b);
    const bandwidth = Math.max(max * .012, .9 * Math.min(sd, (M.quantile(sorted, .75) - M.quantile(sorted, .25)) / 1.34) * 51 ** (-.2));
    const densityCount = (sample, value) => M.density(sample, value, bandwidth) * sample.length * max / 34;
    const peak = fixed ? 51 : Math.max(...fullBins.map(b => b.count), ...Array.from({ length: 151 }, (_, i) => densityCount(all, max * i / 150)));
    const frequencyMax = Math.max(4, Math.ceil(peak * 1.18));
    const x = count => axis - count / frequencyMax * (axis - left);
    let svg = `<svg class="frequency-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Frekvenčné rozdelenie konečnej hodnoty po ${horizon} ${horizon === 1 ? 'roku' : 'rokoch'}. Zobrazených ${values.length} období. Hodnota na zvislej osi vpravo, frekvencia vodorovne doľava."><title>Frekvencie historických výsledkov investície 100 USD</title><defs><linearGradient id="freq-${horizon}"><stop stop-color="#7b79ff"/><stop offset="1" stop-color="#4479ff"/></linearGradient></defs>`;
    if (complete) svg += `<rect x="${left}" y="${y(stats.p975)}" width="${axis - left}" height="${Math.max(1,y(stats.p025)-y(stats.p975))}" fill="#7b79ff" opacity=".04"/><rect x="${left}" y="${y(stats.p85)}" width="${axis - left}" height="${Math.max(1,y(stats.p15)-y(stats.p85))}" fill="#7b79ff" opacity=".075"/>`;
    for (let i = 0; i <= 4; i++) {
      const frequency = Math.round(frequencyMax * i / 4);
      svg += `<line x1="${x(frequency)}" x2="${x(frequency)}" y1="${top}" y2="${bottom}" stroke="#e1e7f2"/><text x="${x(frequency)}" y="${bottom + 19}" text-anchor="middle" fill="#8c9bb1" font-size="10">${frequency}</text>`;
    }
    for (let i = 0; i <= 6; i++) {
      const value = max * i / 6;
      svg += `<line x1="${left}" x2="${axis}" y1="${y(value)}" y2="${y(value)}" stroke="#e1e7f2"/><text x="${axis + 10}" y="${y(value) + 4}" fill="#8293ab" font-size="11">${compact.format(value)} $</text>`;
    }
    svg += `<text x="${axis}" y="16" text-anchor="end" fill="#8293ab" font-size="10">Konečná hodnota investície</text>`;
    if (fixed && values.length) svg += `<rect x="${x(values.length)}" y="${y(stats.mean) - 3}" width="${axis - x(values.length)}" height="6" rx="2" fill="url(#freq-${horizon})"><title>${values.length} období, každé ${money(stats.mean)}</title></rect>`;
    else {
      bins.forEach(bin => {
        if (bin.count) svg += `<rect x="${x(bin.count)}" y="${y(bin.high) + .7}" width="${axis - x(bin.count)}" height="${Math.max(1, y(bin.low)-y(bin.high)-1.4)}" rx="1" fill="url(#freq-${horizon})" opacity="${complete ? .5 : .9}"><title>${money(bin.low)} až ${money(bin.high)}: ${bin.count} období</title></rect>`;
      });
      if (complete) {
        const path = Array.from({ length: 201 }, (_, i) => { const value = max * i / 200; return `${i ? 'L' : 'M'}${x(densityCount(values, value)).toFixed(2)},${y(value).toFixed(2)}`; }).join(' ');
        svg += `<path d="${path}" fill="none" stroke="#7371ef" stroke-width="2.5"/>`;
      }
    }
    svg += `<line x1="${left}" x2="${axis}" y1="${y(100)}" y2="${y(100)}" stroke="#8c9bb1" stroke-dasharray="5 5"/><path d="M${axis+4} ${y(100)} l8 -4 v8 Z" fill="#092b50"/><rect x="${axis+17}" y="${y(100)-10}" width="78" height="20" rx="4" fill="#eef2fa" stroke="#dbe3f0"/><text x="${axis+56}" y="${y(100)+3.5}" text-anchor="middle" fill="#092b50" font-size="10" font-weight="600">Vklad 100 $</text>`;
    if (complete) {
      (fixed ? [] : [[stats.p15,'P15'],[stats.p85,'P85']]).forEach(([value,label]) => {
        svg += `<line x1="${left}" x2="${axis}" y1="${y(value)}" y2="${y(value)}" stroke="#7b79ff" stroke-dasharray="2 5" opacity=".6"/><text x="${left+4}" y="${y(value)-4}" fill="#8b86b9" font-size="9">${label} · ${money(value)}</text>`;
      });
      svg += `<line x1="${left}" x2="${axis}" y1="${y(stats.mean)}" y2="${y(stats.mean)}" stroke="#092b50" stroke-width="1.3"/><rect x="${left}" y="${y(stats.mean)-11}" width="148" height="22" rx="4" fill="#092b50"/><text x="${left+8}" y="${y(stats.mean)+3.5}" fill="white" font-size="10">Priemer · ${money(stats.mean)}</text>`;
      const slots = [];
      state.years.forEach((year,i) => {
        const value = M.terminal(year,horizon,weight), yv = y(value), offset = slots.filter(v => Math.abs(v-yv)<17).length;
        slots.push(yv);
        svg += `<circle cx="${axis-11-offset*18}" cy="${yv}" r="7.5" fill="#092b50" stroke="white" stroke-width="1.5"/><text x="${axis-11-offset*18}" y="${yv+2.8}" text-anchor="middle" fill="white" font-size="8">${i+1}</text><title>Pokus ${i+1}, ${year}: ${money(value)}</title>`;
      });
    }
    svg += `<line x1="${axis}" x2="${axis}" y1="${top}" y2="${bottom}" stroke="#a8b6c9"/><line x1="${left}" x2="${axis}" y1="${bottom}" y2="${bottom}" stroke="#cfd8e6"/><text x="${(left+axis)/2}" y="${height-8}" text-anchor="middle" fill="#8293ab" font-size="11">← Frekvencia · počet období</text>`;
    if (!values.length) svg += `<text x="${(left+axis)/2}" y="${top+75}" text-anchor="middle" fill="#a4afc3" font-size="12">Každý pokus pridá jeden výsledok do grafu.</text>`;
    return svg + '</svg>';
  }

  function historyTable(horizon, weight, all = false) {
    const years = all ? M.START_YEARS : state.years;
    const rows = years.map(year => {
      const a = M.terminal(year, 1, weight), b = M.terminal(year, 10, weight);
      const sample = state.years.indexOf(year);
      return `<tr><td>${year}${sample >= 0 ? ` · pokus ${sample + 1}` : ''}</td><td class="${tone(a)}">${money(a)}</td>${horizon === 10 ? `<td class="${tone(b)}">${money(b)}</td>` : ''}</tr>`;
    }).join('');
    return `<details class="full-history"><summary>${all ? 'Pozrieť všetkých 51 historických období' : `Pozrieť ${state.draws} vyžrebovaných výsledkov`}</summary><div class="table-scroll"><table><caption class="sr-only">Konečné hodnoty vybraného portfólia v USD</caption><thead><tr><th scope="col">Počiatočný rok</th><th scope="col">Po 1 roku</th>${horizon === 10 ? '<th scope="col">Po 10 rokoch</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }
  function revealHTML() {
    const h = state.horizon, done = state.phase === 'revealed', s = M.stats(h,state.weight);
    return `<div class="reveal-head"><p>${done ? '<strong>Celé historické rozdelenie.</strong><br>Dĺžka pruhu ukazuje frekvenciu daného výsledku.' : '<strong>Pribúdajú ďalšie výsledky…</strong><br>Postupne skladáme historické rozdelenie.'}</p><span class="reveal-counter" id="reveal-counter">${done ? 51 : state.revealYears.length} / 51 období</span></div><div class="frequency-wrap"><div id="chart-host">${chartHTML(h,state.weight,done ? M.START_YEARS : state.revealYears)}</div></div>${done ? `<div class="chart-legend"><span><span class="legend-dot"></span>Historické výsledky</span><span><span class="legend-line"></span>Vyhladená frekvencia</span><span>● 1–${state.draws} vaše pokusy</span><span><span class="legend-band"></span>Stredných 70 %</span></div><div class="chart-summary"><div class="stat"><span>Priemerná konečná hodnota</span><strong>${money(s.mean)}</strong><small>${percentage(s.mean-100)} celkovo</small></div><div class="stat"><span>Medián · 50. percentil</span><strong>${money(s.median)}</strong><small>prostredný výsledok</small></div><div class="stat"><span>Historické rozpätie</span><strong class="range-value">${compact.format(s.min)} – ${compact.format(s.max)} $</strong><small>najnižší a najvyšší výsledok</small></div></div><div class="percentile-ranges"><div class="percentile-range"><span>Stredných 70 % · P15 – P85</span><strong>${money(s.p15)} – ${money(s.p85)}</strong></div><div class="percentile-range"><span>Stredných 95 % · P2,5 – P97,5</span><strong>${money(s.p025)} – ${money(s.p975)}</strong></div></div><div class="reveal-actions"><button id="primary-action" class="primary-button">${h===1 ? 'Pokračovať na 10 rokov' : 'Porovnať oba horizonty'} <span class="arrow" aria-hidden="true">→</span></button><button class="minor-button" id="show-history">Vaše pokusy ↓</button></div>${historyTable(h,state.weight)}` : `<div class="simulation-controls"><span class="spinner" aria-hidden="true"></span><span>Pridávame skutočné historické výsledky.</span><button id="skip-reveal" class="minor-button">Zobraziť hneď →</button></div>`}`;
  }

  function comparisonHTML() {
    const w = state.weight;
    const cards = [1,10].map(h => {
      const s = M.stats(h,w);
      return `<article class="compare-card"><p class="eyebrow">PO ${h===1 ? '1 ROKU' : '10 ROKOCH'}</p><div class="compare-value">${money(s.mean)}</div><div class="compare-caption">priemerná konečná hodnota zo 100 $</div>${chartHTML(h,w,M.START_YEARS,true)}<div class="compare-details"><div><span>Medián</span><strong>${money(s.median)}</strong></div><div><span>Stredných 70 %</span><strong>${compact.format(s.p15)} – ${compact.format(s.p85)} $</strong></div><div><span>Stredných 95 %</span><strong>${compact.format(s.p025)} – ${compact.format(s.p975)} $</strong></div><div><span>Celkový priemerný výnos</span><strong>${percentage(s.mean-100)}</strong></div></div></article>`;
    }).join('');
    return `<div id="compare-cards" class="compare-grid">${cards}</div><p class="chart-tip">Čísla v grafoch označujú rovnaké vyžrebované začiatky. Každý horizont má vlastnú mierku hodnoty aj frekvencie.</p>${historyTable(10,w)}${historyTable(10,w,true)}<div class="reveal-actions"><button id="primary-action" class="primary-button">Nová séria <span class="arrow" aria-hidden="true">↻</span></button><span class="completed-badge">✓ Oba horizonty dokončené</span></div>`;
  }

  function render() {
    updateJourney();
    const full = state.compare || state.phase === 'revealed' || state.phase === 'revealing';
    $('experience-kicker').textContent = full ? '03 / FREKVENCIE A ROZDELENIE' : '02 / VAŠE VÝSLEDKY';
    $('experience-title').textContent = state.compare ? 'Čo zmenilo desať rokov?' : full ? 'Od pokusov k celému obrazu.' : state.horizon===1 ? 'Čo sa stane po jednom roku?' : 'A čo po desiatich rokoch?';
    $('horizon-pill').innerHTML = `<span class="tiny-dot"></span> ${state.compare ? '1 rok vs. 10 rokov' : `${state.horizon}-ročný horizont`}`;
    $('experience-content').innerHTML = state.compare ? comparisonHTML() : state.phase==='sampling' ? samplingHTML() : revealHTML();
    $('experience-content').className = state.compare ? 'view-compare' : 'view-' + state.phase;
    $('learning-text').textContent = state.compare ? 'Historické rozdelenie ukazuje minulosť. Budúce výsledky môžu byť iné.' : state.horizon===10 ? 'Rovnaké portfólio. Rovnaké začiatky. Desať rokov namiesto jedného.' : 'Každý pokus pribudne do grafu. Frekvencie postupne ukážu celý obraz.';
    bindContent();
  }

  function bindContent() {
    $('primary-action')?.addEventListener('click', primaryAction);
    $('skip-reveal')?.addEventListener('click', finishReveal);
    $('show-history')?.addEventListener('click', () => {
      const details = document.querySelector('.full-history'); details.open = !details.open;
      if (details.open) details.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
    });
  }
  function draw() {
    if (state.busy || currentCount() >= state.draws) return;
    const oldYears = visibleYears(), previous = oldYears.length ? M.terminal(oldYears[oldYears.length - 1], state.horizon, state.weight) : 100;
    if (state.horizon === 1) {
      const remaining = M.START_YEARS.filter(year => !state.years.includes(year));
      state.years.push(remaining[Math.floor(random() * remaining.length)]);
    } else state.tenCount++;
    state.busy = true;
    updateAllocation();
    render();
    if (currentCount() === 1) showExperience();
    const year = visibleYears().at(-1), value = M.terminal(year, state.horizon, state.weight);
    const start = performance.now(), duration = reducedMotion.matches ? 0 : 650;
    function frame(now) {
      const t = duration ? Math.min((now - start) / duration, 1) : 1;
      const node = $('animated-value');
      if (node) node.textContent = fmt.format(previous + (value - previous) * (1 - (1 - t) ** 3));
      if (t < 1) drawFrame = requestAnimationFrame(frame);
      else {
        state.busy = false;
        const button = $('primary-action'); if (button) button.disabled = false;
        updateJourney();
        announce(`Pokus ${currentCount()} z ${state.draws}, začiatok ${year}. Po ${state.horizon === 1 ? 'jednom roku' : 'desiatich rokoch'} ${money(value)}, celkový výnos ${percentage(value - 100)}.`);
      }
    }
    drawFrame = requestAnimationFrame(frame);
  }
  function startReveal() {
    state.phase = 'revealing';
    state.revealYears = [...state.years];
    const order = M.shuffle(M.START_YEARS.filter(year => !state.years.includes(year)), random);
    let revealIndex = 0;
    render();
    if (reducedMotion.matches) { finishReveal(); return; }
    revealTimer = setInterval(() => {
      state.revealYears.push(order[revealIndex++]);
      if (revealIndex === order.length) { finishReveal(); return; }
      $('chart-host').innerHTML = chartHTML(state.horizon, state.weight, state.revealYears);
      $('reveal-counter').textContent = `${state.revealYears.length} / 51 období`;
    }, 55);
    announce('Zostavujeme rozdelenie všetkých 51 historických období.');
  }
  function finishReveal() {
    if (state.phase !== 'revealing') return;
    clearInterval(revealTimer);
    state.phase = 'revealed'; state.revealed[state.horizon] = true;
    render();
    const s = M.stats(state.horizon, state.weight);
    announce(`Rozdelenie je hotové. Priemerná konečná hodnota ${money(s.mean)}. Percentily sú vyznačené v grafe.`);
  }
  function primaryAction() {
    if (state.busy) return;
    if (state.compare) {
      reset(state.weight);
    } else if (state.phase === 'sampling') {
      if (currentCount() < state.draws) draw();
      else startReveal();
    }
    else if (state.phase === 'revealed') {
      if (state.horizon === 1) { state.horizon = 10; state.phase = state.revealed[10] ? 'revealed' : 'sampling'; render(); showExperience(); announce('Desaťročný horizont. Použijeme tie isté počiatočné roky.'); }
      else { state.compare = true; render(); showExperience(); announce('Porovnanie jednoročného a desaťročného horizontu.'); }
    }
  }
  $('allocation-slider').addEventListener('input', event => setAllocation(+event.target.value / 100));
  $('step-one').addEventListener('click', () => { if (!state.revealed[1] || state.horizon === 1 && !state.compare) return; state.compare = false; state.horizon = 1; state.phase = 'revealed'; render(); });
  $('step-ten').addEventListener('click', () => { if (!state.revealed[1]) return; state.compare = false; state.horizon = 10; state.phase = state.revealed[10] ? 'revealed' : 'sampling'; render(); });
  $('step-compare').addEventListener('click', () => { if (!state.revealed[10]) return; state.compare = true; render(); });
  const dialog = $('method-dialog');
  $('method-button').addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  const fundInfo = $('risky-fund-dialog');
  $('risky-info-button').addEventListener('click', () => fundInfo.showModal());
  fundInfo.querySelector('.dialog-close').addEventListener('click', () => fundInfo.close());
  fundInfo.addEventListener('click', event => { if (event.target === fundInfo) { const r = fundInfo.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) fundInfo.close(); } });
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else announce('Tento prehliadač nepodporuje celú obrazovku. Použite režim celej obrazovky prehliadača.');
    } catch { announce('Celú obrazovku sa nepodarilo zapnúť. Použite režim celej obrazovky prehliadača.'); }
  }
  $('fullscreen-button').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => $('fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? 'Ukončiť celú obrazovku (F)' : 'Celá obrazovka (F)'));
  document.addEventListener('keydown', event => {
    if (dialog.open || fundInfo.open || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;
    if (event.code === 'Space') {
      // Native buttons already implement Space; do not trigger an unrelated action.
      if (target instanceof HTMLElement && target.closest('button, a, summary')) return;
      event.preventDefault(); primaryAction();
    } else if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
    else if (event.key.toLowerCase() === 'r') { event.preventDefault(); reset(); }
  });
  addEventListener('resize', () => {
    const nextNarrow = innerWidth < 600;
    if (nextNarrow === narrowChart) return;
    narrowChart = nextNarrow;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { if (state) render(); });
  });
  reset();
})();
