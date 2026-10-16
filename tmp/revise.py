from pathlib import Path

p = Path('app.js')
text = p.read_text(encoding='utf-8')
def function(name, following, body):
    global text
    start = text.index('  function ' + name + '(')
    end = text.index('  function ' + following + '(', start)
    text = text[:start] + body + '\n' + text[end:]

function('chartHTML', 'historyTable', r'''  function chartHTML(horizon, weight, shownYears = M.START_YEARS, small = false) {
    const all = M.scenarios(horizon, weight).map(s => s.value);
    const values = shownYears.map(year => M.terminal(year, horizon, weight));
    const stats = M.stats(horizon, weight), complete = shownYears.length === 51;
    const fixed = stats.max - stats.min < 1e-8;
    const width = 760, height = 365, left = 38, axis = 638, top = 34, bottom = 311;
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
      [[stats.p15,'P15'],[stats.p85,'P85']].forEach(([value,label]) => {
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
''')

function('samplingHTML','guessHTML',r'''  function samplingHTML() {
    const count = currentCount(), years = visibleYears(), year = years.at(-1);
    const value = year ? M.terminal(year,state.horizon,state.weight) : 100;
    return `<div class="sample-result"><div><span class="value-label">${year ? state.horizon === 1 ? `Pokus ${count} · historický rok ${year}` : `Pokus ${count} · ${year} – ${year+9}` : 'Váš počiatočný vklad'}</span><div class="sample-value"><span id="animated-value">${fmt.format(value)}</span><span class="sample-currency">$</span><span class="return-badge ${year ? tone(value) : ''}">${year ? percentage(value-100)+' celkovo' : 'Jedna investícia, veľa možností'}</span></div></div><span class="sample-counter">${count} / ${state.draws}<small>vlastných pokusov</small></span></div><div class="frequency-wrap">${chartHTML(state.horizon,state.weight,years)}</div><div class="draw-actions"><button id="primary-action" class="primary-button" ${state.busy ? 'disabled' : ''}>${count === state.draws ? 'Spustiť simuláciu' : count ? 'Ďalší výsledok' : 'Ukázať možný výsledok'} <span class="arrow" aria-hidden="true">${count === state.draws ? '→' : '↗'}</span></button><span class="key-hint"><kbd>medzerník</kbd></span><span class="sampling-hint">${count === state.draws ? 'Doplniť celé rozdelenie' : 'Každý klik pribudne do grafu'}</span></div>${historyHTML()}`;
  }
''')
function('guessHTML','chartHTML','')

function('revealHTML','comparisonHTML',r'''  function revealHTML() {
    const h = state.horizon, done = state.phase === 'revealed', s = M.stats(h,state.weight);
    return `<div class="reveal-head"><p>${done ? '<strong>Celé historické rozdelenie.</strong><br>Dĺžka pruhu ukazuje frekvenciu daného výsledku.' : '<strong>Pribúdajú ďalšie výsledky…</strong><br>Postupne skladáme historické rozdelenie.'}</p><span class="reveal-counter" id="reveal-counter">${done ? 51 : state.revealYears.length} / 51 období</span></div><div class="frequency-wrap"><div id="chart-host">${chartHTML(h,state.weight,done ? M.START_YEARS : state.revealYears)}</div></div>${done ? `<div class="chart-legend"><span><span class="legend-dot"></span>Historické výsledky</span><span><span class="legend-line"></span>Vyhladená frekvencia</span><span>● 1–${state.draws} vaše pokusy</span><span><span class="legend-band"></span>Stredných 70 %</span></div><div class="chart-summary"><div class="stat"><span>Priemerná konečná hodnota</span><strong>${money(s.mean)}</strong><small>${percentage(s.mean-100)} celkovo</small></div><div class="stat"><span>Medián · 50. percentil</span><strong>${money(s.median)}</strong><small>prostredný výsledok</small></div><div class="stat"><span>Historické rozpätie</span><strong class="range-value">${compact.format(s.min)} – ${compact.format(s.max)} $</strong><small>najnižší a najvyšší výsledok</small></div></div><div class="percentile-ranges"><div class="percentile-range"><span>Stredných 70 % · P15 – P85</span><strong>${money(s.p15)} – ${money(s.p85)}</strong></div><div class="percentile-range"><span>Stredných 95 % · P2,5 – P97,5</span><strong>${money(s.p025)} – ${money(s.p975)}</strong></div></div><div class="reveal-actions"><button id="primary-action" class="primary-button">${h===1 ? 'Pokračovať na 10 rokov' : 'Porovnať oba horizonty'} <span class="arrow" aria-hidden="true">→</span></button><button class="minor-button" id="show-history">Vaše pokusy ↓</button></div>${historyTable(h,state.weight)}` : `<div class="simulation-controls"><span class="spinner" aria-hidden="true"></span><span>Pridávame skutočné historické výsledky.</span><button id="skip-reveal" class="minor-button">Zobraziť hneď →</button></div>`}`;
  }
''')
function('comparisonHTML','render',r'''  function comparisonHTML() {
    const w = state.exploring ? state.exploreWeight : state.weight;
    const cards = [1,10].map(h => {
      const s = M.stats(h,w);
      return `<article class="compare-card"><p class="eyebrow">PO ${h===1 ? '1 ROKU' : '10 ROKOCH'}</p><div class="compare-value">${money(s.mean)}</div><div class="compare-caption">priemerná konečná hodnota zo 100 $</div>${chartHTML(h,w,M.START_YEARS,true)}<div class="compare-details"><div><span>Medián</span><strong>${money(s.median)}</strong></div><div><span>Stredných 70 %</span><strong>${compact.format(s.p15)} – ${compact.format(s.p85)} $</strong></div><div><span>Stredných 95 %</span><strong>${compact.format(s.p025)} – ${compact.format(s.p975)} $</strong></div><div><span>Celkový priemerný výnos</span><strong>${percentage(s.mean-100)}</strong></div></div></article>`;
    }).join('');
    return `${state.exploring ? `<div class="explore-controls"><label for="explore-slider">Rozdelenie: <strong id="explore-label">${Math.round(w*100)} % akcie · ${100-Math.round(w*100)} % bezpečný fond</strong></label><input id="explore-slider" type="range" min="0" max="100" step="5" value="${Math.round(w*100)}"><p>Posúvajte pomer fondov a sledujte zmenu frekvencií, priemeru a percentilov.</p></div>` : ''}<div id="compare-cards" class="compare-grid">${cards}</div><p class="chart-tip">Čísla v grafoch označujú rovnaké vyžrebované začiatky. Každý horizont má vlastnú mierku hodnoty aj frekvencie.</p>${historyTable(10,w)}${historyTable(10,w,true)}<div class="reveal-actions"><button id="primary-action" class="primary-button">${state.exploring ? 'Nový experiment' : 'Vyskúšať iné rozdelenie'} <span class="arrow" aria-hidden="true">${state.exploring ? '↻' : '↗'}</span></button><span class="completed-badge">✓ Oba horizonty dokončené</span></div>`;
  }
''')
function('render','bindContent',r'''  function render() {
    updateJourney();
    const full = state.compare || state.phase === 'revealed' || state.phase === 'revealing';
    $('experience-kicker').textContent = full ? '03 / FREKVENCIE A ROZDELENIE' : '02 / VAŠE VÝSLEDKY';
    $('experience-title').textContent = state.compare ? 'Čo zmenilo desať rokov?' : full ? 'Od pokusov k celému obrazu.' : state.horizon===1 ? 'Čo sa stane po jednom roku?' : 'A čo po desiatich rokoch?';
    $('horizon-pill').innerHTML = `<span class="tiny-dot"></span> ${state.compare ? '1 rok vs. 10 rokov' : `${state.horizon}-ročný horizont`}`;
    $('experience-content').innerHTML = state.compare ? comparisonHTML() : state.phase==='sampling' ? samplingHTML() : revealHTML();
    $('learning-text').textContent = state.compare ? 'Historické rozdelenie ukazuje minulosť. Budúce výsledky môžu byť iné.' : state.horizon===10 ? 'Rovnaké portfólio. Rovnaké začiatky. Desať rokov namiesto jedného.' : 'Každý pokus pribudne do grafu. Frekvencie postupne ukážu celý obraz.';
    bindContent();
  }
''')

# The flow now goes directly from manual draws to the animated distribution.
text = text.replace("busy: false, guesses: {},", "busy: false,")
text = text.replace("    $('guess-slider')?.addEventListener('input', event => { $('guess-number').value = event.target.value; $('guess-error').hidden = true; });\n", '')
text = text.replace("    $('guess-number')?.addEventListener('input', event => { if (event.target.value !== '') $('guess-slider').value = event.target.value; $('guess-error').hidden = true; });\n", '')
start = text.index("    const input = $('guess-number');", text.index('  function startReveal()'))
end = text.index("    state.phase = 'revealing';", start)
text = text[:start] + text[end:]
text = text.replace("    state.revealYears = [];\n    const order = M.shuffle(M.START_YEARS, random);", "    state.revealYears = [...state.years];\n    const order = M.shuffle(M.START_YEARS.filter(year => !state.years.includes(year)), random);\n    let revealIndex = 0;")
text = text.replace('state.revealYears.push(order[state.revealYears.length]);', 'state.revealYears.push(order[revealIndex++]);')
text = text.replace('state.revealYears.length === order.length', 'revealIndex === order.length')
old = "else { state.phase = 'guess'; render(); $('guess-number').focus({ preventScroll: true }); announce('Pred odhalením rozdelenia zadajte svoj odhad stratových období zo 100.'); }"
text = text.replace(old, 'else startReveal();')
text = text.replace("    } else if (state.phase === 'guess') startReveal();", '    }')
text = text.replace('Rozdelenie odhalené. ${s.losses} z 51 období sa skončilo stratou vášho portfólia. Priemerná konečná hodnota ${money(s.mean)}.', 'Rozdelenie je hotové. Priemerná konečná hodnota ${money(s.mean)}. Percentily sú vyznačené v grafe.')
p.write_text(text, encoding='utf-8')

p = Path('index.html')
html = p.read_text(encoding='utf-8')
html = html.replace('Porovnajte svoju intuíciu', 'Priemer a percentily')
start = html.index('<li><strong>Váš odhad.')
end = html.index('</li>', start) + len('</li>')
html = html[:start] + '<li><strong>Frekvenčný graf.</strong> Každý klik pridá výsledok do grafu. Po vlastných pokusoch spustite rýchle doplnenie celého rozdelenia s priemerom a percentilmi.</li>' + html[end:]
html = html.replace('Po troch kliknutiach', 'Po vlastných pokusoch')
p.write_text(html, encoding='utf-8')
