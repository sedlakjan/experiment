from pathlib import Path
p=Path('app.js');t=p.read_text(encoding='utf-8')
old="${count === state.draws ? 'Spustiť simuláciu' : count ? 'Ďalší výsledok' : 'Ukázať možný výsledok'} <span class=\"arrow\" aria-hidden=\"true\">${count === state.draws ? '→' : '↗'}</span>"
new="${count === state.draws ? 'Spustiť simuláciu' : 'Ukázať možný výsledok investície'}"
assert old in t
p.write_text(t.replace(old,new),encoding='utf-8')
p=Path('README.md');t=p.read_text(encoding='utf-8').replace('**Ukázať možný výsledok**','**Ukázať možný výsledok investície**');p.write_text(t,encoding='utf-8')
