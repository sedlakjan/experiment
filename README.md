# 5PEŇAZÍ — investičný experiment

## Spustenie

Otvorte **index.html** v prehliadači. Je to jeden samostatný súbor: obsahuje vzhľad, všetky dáta aj program. Funguje offline bez servera, inštalácie a pripojenia na internet. Môžete poslať iba tento súbor alebo ho umiestniť na statický hosting pre pohodlné otvorenie z mobilu cez URL.

## Používanie na prednáške

1. Rozdeľte jednorazový vklad **100 EUR** medzi bezpečný fond (pevne **3,3 % ročne**) a akciový fond (historický **S&P 500 vrátane dividend**).
2. Najprv prejdete horizont **1 rok** s **5 vlastnými pokusmi**.
3. Kliknite na **Ukázať možný výsledok investície**. Každý výsledok pribudne priamo do frekvenčného grafu: konečná hodnota je na zvislej osi vpravo, frekvencia rastie vodorovne doľava. História vlastných pokusov zostáva pod grafom.
4. Po vlastných pokusoch kliknite na **Spustiť simuláciu**. Ďalších **45 náhodných pokusov** doplní rozdelenie na **50 vrátane prvých piatich**. Žrebujeme z historických začiatkov s opakovaním: rovnaký začiatok sa môže objaviť viackrát. Priemer, percentily aj vyhladená krivka vychádzajú z týchto konkrétnych 50 výsledkov. Animáciu môžete dokončiť tlačidlom **Zobraziť hneď**; výsledky sú rovnaké ako pri dohraní animácie.
5. Pokračujte na **10 rokov** a zvoľte si vlastný pomer fondov nezávisle od prvého kola. Päť historických začiatkov vyžrebujeme nanovo pre tento horizont. Každý výsledok opäť predstavuje samostatnú investíciu 100 €, nie pokračovanie predchádzajúceho pokusu.
6. Na konci porovnajte oba horizonty s ich vlastným pomerom fondov. Rozdiel výsledkov preto závisí od času aj zloženia portfólia. Tlačidlo **Nová séria** zopakuje experiment so zachovaným nastavením každého horizontu.

**Aplikácia sa nepýta na odhad rizika a nevyhodnocuje odpovede.** Priemer ani percentily neukazuje pred dokončením simulácie. Po odhalení ide o hodnoty náhodnej vzorky 50 pokusov. Aj pri rovnakom pomere fondov a horizonte preto môžu priemer a percentily pri opakovaní vyjsť inak. Pri 100 % bezpečnom fonde je výsledok vždy rovnaký, lebo má pevný výnos.

**Ovládanie:** medzerník = ďalší hlavný krok; **F** = fullscreen; **R** = nová séria; **Esc** = zavrieť vysvetlenie/fullscreen. Vstupy a tlačidlá majú aj štandardné klávesové ovládanie. Na mobile môže podpora fullscreen závisieť od prehliadača. Rešpektuje sa systémové obmedzenie animácií.

Pomer fondov môžete meniť posuvníkom kedykoľvek, aj počas animácie alebo po dokončení. **Každý horizont má vlastný pomer a pokusy. Zmena pomeru zruší animáciu a vymaže iba aktuálne kolo; druhé kolo zostane zachované.** Prepnutie medzi horizontmi obnoví ich nastavenie aj rozpracované výsledky. Odomknuté 10-ročné kolo zostáva dostupné aj po úprave 1-ročného. Porovnanie sa sprístupní po dokončení oboch aktuálnych kôl. Zmenou pomeru sa vymažú aj vyžrebované roky aktuálneho kola. Ďalšie pokusy žrebujeme nanovo, aj keď sa vrátite na pôvodný pomer; obnovenie stránky nie je potrebné. Oba horizonty majú vlastné náhodné pokusy. Rovnaký rok sa môže objaviť aj viackrát v jednom kole, lebo každý pokus žrebujeme s opakovaním. Kliknutie na už zvolený pomer výsledky nevymaže. Kláves **R** obnoví oba horizonty na 50 : 50 a vymaže celú sériu. Údaje zo sedenia sa nikam neposielajú ani neukladajú.

Pri názve akciového fondu je tlačidlo **i**. Zobrazuje stručnú informáciu o priemernom ročnom výnose **11,03 %** a výberovej smerodajnej odchýlke **16,82 %** v spoločnej jednoročnej vzorke 1966–2016 (51 rokov, výpočet smerodajnej odchýlky s menovateľom n−1).

## Mobilné ovládanie

Aplikácia je prispôsobená prednostne telefónom. Rozdelenie fondov sa mení iba posuvníkom v krokoch po 5 percentuálnych bodoch, s dotykovou plochou vysokou 46 px. Hlavné tlačidlo zostáva pri spodnom okraji obrazovky vrátane priestoru pre systémové gesto. Navigácia horizontov zostáva pri rolovaní hore. Po prvom pokuse a pri prechode na ďalší horizont sa pohľad presunie na graf. Väčšie popisy grafu, história v dvoch stĺpcoch a prehľadné bloky percentilov sú určené na čítanie bez približovania.

Pruhy grafu plynulo menia dĺžku z aktuálnej zobrazenej polohy. Automatické dopĺňanie trvá približne 4 sekundy; na záver sa vykreslí krivka a postupne sa odhalia čiary priemeru, percentilov a značky prvých piatich pokusov. Lietajúce bodky boli odstránené. Pri 1-ročnom aj 10-ročnom horizonte je priemer nad grafom; medián, rozpätie a percentilové intervaly zostávajú pod ním. Zmena fondov alebo horizontu zruší rozpracované efekty. Pri systémovom obmedzení pohybu sa efekty preskočia.

Posuvník používa krátke haptické impulzy cez `navigator.vibrate()`, jemne silnejšie na pozíciách 0 %, 50 % a 100 %. Fungujú iba na zariadeniach a v prehliadačoch s podporou [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate); dostupnosť môže obmedziť systémové nastavenie či používateľská aktivácia. Nepodporované zariadenia majú plne funkčné ovládanie s vizuálnou odozvou. Pri zapnutom obmedzení animácií sa vibrácie neposielajú. Fyzickú vibráciu treba overiť na cieľovom telefóne; pri vývoji boli overené rozloženie a funkcie pri šírkach 320, 375, 390 a 430 px.

## Výpočty

Pre podiel akcií `w`, horizont `h` a počiatočný rok `s`:

```
Konečná hodnota = 100 × [(1 − w) × 1,033^h + w × ∏(1 + ročný výnos)]
                                                    roky s až s+h−1
```

Investícia sa rozdelí iba na začiatku. Obe časti rastú samostatne, bez rebalansovania a ďalších vkladov; na konci sa sčítajú. Výnos za 10 rokov je geometricky zložený súčin faktorov, nie súčet ročných percent.

- **Celkový percentuálny výnos:** `(konečná hodnota / 100 − 1) × 100`. Desaťročný údaj patrí celým 10 rokom, nie jednému roku.
- **Priemer simulácie:** aritmetický priemer konečných hodnôt 50 vyžrebovaných pokusov vrátane opakovaných výsledkov. Nepočítame ho ako umocnený priemerný ročný výnos. Nemeníme dáta, aby vyšiel vopred určený priemer.
- **Medián:** 50. percentil, prostredný výsledok.
- **Stredných 70 %:** P15–P85. **Stredných 95 %:** P2,5–P97,5. Percentily používajú lineárnu interpoláciu na pozícii `(n−1)×p` (Hyndman–Fan typ 7). Pri konečnej vzorke tieto intervaly nemusia obsahovať presne 70 % a 95 % pozorovaní. Nie sú intervalmi spoľahlivosti ani zárukou budúceho výsledku.
- **Frekvenčný graf:** každý pruh predstavuje počet pokusov v danom intervale. Animácia pridá 45 pokusov k prvým piatim. Súčet frekvencií je 50. Vyhladená krivka používa Gaussove jadrá (KDE) nad týmito 50 výsledkami, so šírkou jadra podľa vzorky a so škálou frekvencie ako pruhy. Hodnotová os používa rozsah historických možností, aby sa pri animácii nemenila. Pri zhodných výsledkoch je iba jeden pruh. Žiadne výnosy nevymýšľame; opakovaný pokus zodpovedá opätovne vyžrebovanému historickému obdobiu. Graf nemusí mať tvar normálneho rozdelenia.

## Dáta a kontrolné hodnoty

Vstup obsahuje **60 ročných výnosov 1966–2025**. Oba horizonty žrebujú z rovnakých **51 možných začiatkov 1966–2016**. Posledné desaťročné obdobie je 2016–2025. Pre každý horizont samostatne vyžrebujeme s opakovaním 50 pokusov. Pri 10 rokoch sa vždy použije skutočné súvislé desaťročné obdobie; ročné výnosy v ňom nemiešame. Po zmene pomeru začne nové žrebovanie aktuálneho kola.

Nasledujúce hodnoty opisujú **celú historickú populáciu 51 období**, slúžia iba na kontrolu dát. Náhodná simulácia 50 pokusov nemusí dosiahnuť tieto priemery ani percentily:

| Konečná hodnota zo 100 € | 1 rok | 10 rokov |
| --- | ---: | ---: |
| S&P 500: priemerná hodnota | 111,03 € | 303,51 € |
| S&P 500: medián | 113,52 € | 309,15 € |
| Bezpečný fond | 103,30 € | 138,36 € |

Samotný S&P 500 má v tejto párovej vzorke 11/51 stratových jednoročných a 2/51 stratových desaťročných období. Výpočty vychádzajú z dodaných ročných údajov zaokrúhlených na 0,01 percentuálneho bodu. Dodaný JSON uvádza referenčnú bezpečnú sadzbu 3,35 %; podľa zadania aplikácia používa **3,3 %**.

Zdroj dát: [Damodaran / NYU Stern — S&P 500 includes dividends](https://pages.stern.nyu.edu/adamodar/New_Home_Page/datafile/histretSP.html), január 2026. Pôvodný vstup je v `data/experience_sampling_1_10_data.json`.

Didaktická adaptácia [Haisley, Kaufmann & Weber (2010), How much risk can I handle?](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1616186). Pôvodná štúdia používala MSCI USA, päťročný horizont a iný postup vzorkovania (v kombinovanom risk tool experimente aspoň osem vzoriek). Táto aplikácia je upravená na 1/10 rokov a 5 vlastných pokusov.

**Historické obdobia sa prekrývajú a nie sú nezávislé. Výsledky modelu sú v EUR bez inflácie, poplatkov a daní. Percentuálne výnosy S&P 500 sú prevzaté z historických údajov v USD a aplikované na počiatočný vklad 100 EUR. Menové kurzy ani ich vplyv nemodelujeme; nejde o historický výnos investora po prepočte do EUR. Pôvodný vstupný JSON zostáva nezmenený so svojou pôvodnou menovou informáciou. Historická frekvencia nie je predpoveďou budúcnosti.** Bezpečný fond je didaktický model; skutočné dlhopisové fondy nemajú zaručený stály výnos.

## Úpravy projektu

`index.html` je hotová samostatná aplikácia. Editovateľné zdroje sú `src/index.template.html`, `styles.css`, `brand.css`, `mobile.css`, `engine.js` a `app.js`. Po zmene zdrojov obnovte výsledné HTML príkazom `node scripts/build.cjs`. Nie sú potrebné žiadne ďalšie balíky.

Vizuál vychádza z [manuálu 5PEŇAZÍ](https://5penazi.milk.sk/): nadpisy Animo Normal Regular vo verzálkach, text Azo Sans Regular/Bold, bubliny a paleta #4479FF, #7B79FF, #DED38F a #092B50. Priložené minilogo 5PEŇAZÍ / NBS je použité bez zmeny proporcií. Logo aj fonty sú uložené v `assets/` a pri zostavení sa vložia priamo do HTML, preto fungujú aj offline. V `assets/licenses/` je zachovaný webový licenčný dokument dodaný s písmom Animo.

Výpočty a správanie kôl overíte cez `node --test tests/math.test.cjs tests/rounds.test.cjs`. Testy porovnávajú všetkých 102 historických výsledkov s dodaným JSON-om, bezpečný fond, miešanie fondov, percentily a histogram. Kontrolujú aj 50 žrebovaní s opakovaním, zahrnutie prvých piatich, počítanie štatistík z konkrétnej simulácie, samostatné kolá, nové žrebovanie po zmene pomeru a zrušenie animácií. Node.js je potrebný iba na vývoj a testy, nie na používanie.
