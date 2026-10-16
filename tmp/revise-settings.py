from pathlib import Path

p = Path('src/index.template.html')
text = p.read_text(encoding='utf-8')
old = '<strong>Akciový fond</strong><small>S&P 500 vrátane dividend</small>'
new = '<strong>Akciový fond <button id="risky-info-button" class="fund-info-button" type="button" aria-label="Informácie o akciovom fonde" aria-haspopup="dialog">i</button></strong><small>S&P 500 vrátane dividend</small>'
assert old in text
text = text.replace(old, new)
text = '\n'.join(line for line in text.splitlines() if not any(marker in line for marker in ('<div class="session-options">', '<p class="lock-note"', '<button class="reset-button"')))
text = text.replace('Zvoľte 3 alebo 5 pokusov.', 'Na každom horizonte absolvujete 5 pokusov. Rozdelenie fondov môžete meniť kedykoľvek; každá zmena vymaže celú sériu a vráti vás na jednoročný horizont.')
text = text.replace('<div class="sr-only" role="status"', '<dialog id="risky-fund-dialog" class="fund-info-dialog" aria-label="Informácie o akciovom fonde"><button class="dialog-close icon-button" aria-label="Zavrieť">×</button><p>Priemerný ročný výnos je približne <strong>11,03 %</strong> so smerodajnou odchýlkou <strong>16,82 %</strong> pri jednoročnom horizonte.</p></dialog>\n  <div class="sr-only" role="status"')
p.write_text(text + '\n', encoding='utf-8')
