from pathlib import Path
p=Path('README.md');t=p.read_text(encoding='utf-8')
t=t.replace('posuvníkom alebo predvoľbami','posuvníkom')
t=t.replace('`styles.css`, `brand.css`, `engine.js`', '`styles.css`, `brand.css`, `mobile.css`, `engine.js`')
marker='## Výpočty'
note='''## Mobilné ovládanie

Aplikácia je prispôsobená prednostne telefónom. Rozdelenie fondov sa mení iba posuvníkom v krokoch po 5 percentuálnych bodoch, s dotykovou plochou vysokou 46 px. Hlavné tlačidlo zostáva pri spodnom okraji obrazovky vrátane priestoru pre systémové gesto. Navigácia horizontov zostáva pri rolovaní hore. Po prvom pokuse a pri prechode na ďalší horizont sa pohľad presunie na graf. Väčšie popisy grafu, história v dvoch stĺpcoch a prehľadné bloky percentilov sú určené na čítanie bez približovania.

Posuvník používa krátke haptické impulzy cez `navigator.vibrate()`, jemne silnejšie na pozíciách 0 %, 50 % a 100 %. Fungujú iba na zariadeniach a v prehliadačoch s podporou [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate); dostupnosť môže obmedziť systémové nastavenie či používateľská aktivácia. Nepodporované zariadenia majú plne funkčné ovládanie s vizuálnou odozvou. Pri zapnutom obmedzení animácií sa vibrácie neposielajú. Fyzickú vibráciu treba overiť na cieľovom telefóne; pri vývoji boli overené rozloženie a funkcie pri šírkach 320, 375, 390 a 430 px.

'''
t=t.replace(marker,note+marker)
p.write_text(t,encoding='utf-8')
