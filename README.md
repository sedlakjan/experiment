# 5PEŇAZÍ — investičný experiment

## Spustenie

Otvorte **index.html** v prehliadači. Je to jeden samostatný súbor: obsahuje vzhľad, všetky dáta aj program. Funguje offline bez servera, inštalácie a pripojenia na internet. Môžete poslať iba tento súbor alebo ho umiestniť na statický hosting pre pohodlné otvorenie z mobilu cez URL.

## Používanie na prednáške

1. Rozdeľte jednorazový vklad **100 USD** medzi bezpečný fond (pevne **3,3 % ročne**) a akciový fond (historický **S&P 500 vrátane dividend**).
2. Najprv prejdete horizont **1 rok** s **5 vlastnými pokusmi**.
3. Kliknite na **Ukázať možný výsledok investície**. Každý výsledok pribudne priamo do frekvenčného grafu: konečná hodnota je na zvislej osi vpravo, frekvencia rastie vodorovne doľava. História vlastných pokusov zostáva pod grafom.
4. Po vlastných pokusoch kliknite na **Spustiť simuláciu**. Ďalšie historické výsledky rýchlo doplnia rozdelenie. Potom sa vyznačí priemer, percentily a vyhladená krivka frekvencií. Animáciu môžete dokončiť tlačidlom **Zobraziť hneď**.
5. Pokračujte na **10 rokov**. Použijeme rovnaké počiatočné roky a rovnaké rozdelenie vkladu. Každý výsledok opäť predstavuje samostatnú investíciu 100 $, nie pokračovanie predchádzajúceho pokusu.
6. Na konci porovnajte oba horizonty. Tlačidlo **Nová séria** zopakuje experiment s rovnakým pomerom fondov.

**Aplikácia sa nepýta na odhad rizika a nevyhodnocuje odpovede.** Priemer ani percentily neukazuje pred dokončením vlastných pokusov.

**Ovládanie:** medzerník = ďalší hlavný krok; **F** = fullscreen; **R** = nová séria; **Esc** = zavrieť vysvetlenie/fullscreen. Vstupy a tlačidlá majú aj štandardné klávesové ovládanie. Na mobile môže podpora fullscreen závisieť od prehliadača. Rešpektuje sa systémové obmedzenie animácií.

Pomer fondov môžete meniť posuvníkom kedykoľvek, aj počas animácie alebo po dokončení oboch horizontov. **Každá skutočná zmena pomeru okamžite zruší animácie, vymaže všetky predchádzajúce výsledky a začne novú sériu od 1 roka.** Nový pomer zostane nastavený. Kliknutie na už zvolený pomer sériu nevymaže. Samostatná voľba počtu pokusov, informácia o uzamknutí a tlačidlo „Začať odznova“ v bočnom paneli boli odstránené. Kláves **R** naďalej obnoví predvolené rozdelenie 50 : 50 a vymaže sériu. Rozpracovaný desaťročný horizont sa zachová pri prepnutí na dokončený jednoročný horizont bez zmeny fondov. Údaje zo sedenia sa nikam neposielajú ani neukladajú.

Pri názve akciového fondu je tlačidlo **i**. Zobrazuje stručnú informáciu o priemernom ročnom výnose **11,03 %** a výberovej smerodajnej odchýlke **16,82 %** v spoločnej jednoročnej vzorke 1966–2016 (51 rokov, výpočet smerodajnej odchýlky s menovateľom n−1).

## Mobilné ovládanie

Aplikácia je prispôsobená prednostne telefónom. Rozdelenie fondov sa mení iba posuvníkom v krokoch po 5 percentuálnych bodoch, s dotykovou plochou vysokou 46 px. Hlavné tlačidlo zostáva pri spodnom okraji obrazovky vrátane priestoru pre systémové gesto. Navigácia horizontov zostáva pri rolovaní hore. Po prvom pokuse a pri prechode na ďalší horizont sa pohľad presunie na graf. Väčšie popisy grafu, história v dvoch stĺpcoch a prehľadné bloky percentilov sú určené na čítanie bez približovania.

Posuvník používa krátke haptické impulzy cez `navigator.vibrate()`, jemne silnejšie na pozíciách 0 %, 50 % a 100 %. Fungujú iba na zariadeniach a v prehliadačoch s podporou [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate); dostupnosť môže obmedziť systémové nastavenie či používateľská aktivácia. Nepodporované zariadenia majú plne funkčné ovládanie s vizuálnou odozvou. Pri zapnutom obmedzení animácií sa vibrácie neposielajú. Fyzickú vibráciu treba overiť na cieľovom telefóne; pri vývoji boli overené rozloženie a funkcie pri šírkach 320, 375, 390 a 430 px.

## Výpočty

Pre podiel akcií `w`, horizont `h` a počiatočný rok `s`:

```
Konečná hodnota = 100 × [(1 − w) × 1,033^h + w × ∏(1 + ročný výnos)]
                                                    roky s až s+h−1
```

Investícia sa rozdelí iba na začiatku. Obe časti rastú samostatne, bez rebalansovania a ďalších vkladov; na konci sa sčítajú. Výnos za 10 rokov je geometricky zložený súčin faktorov, nie súčet ročných percent.

- **Celkový percentuálny výnos:** `(konečná hodnota / 100 − 1) × 100`. Desaťročný údaj patrí celým 10 rokom, nie jednému roku.
- **Priemer:** aritmetický priemer konečných hodnôt všetkých 51 historických scenárov s rovnakou váhou. Nepočítame ho ako umocnený priemerný ročný výnos. Ide o historický priemer, nie garantovaný budúci výsledok.
- **Medián:** 50. percentil, prostredný výsledok.
- **Stredných 70 %:** P15–P85. **Stredných 95 %:** P2,5–P97,5. Percentily používajú lineárnu interpoláciu na pozícii `(n−1)×p` (Hyndman–Fan typ 7). Pri konečnej vzorke tieto intervaly nemusia obsahovať presne 70 % a 95 % pozorovaní. Nie sú intervalmi spoľahlivosti ani zárukou budúceho výsledku.
- **Frekvenčný graf:** každý pruh predstavuje počet historických hodnôt v danom intervale. Nábehová animácia postupne pridáva všetkých 51 období, každé práve raz, vrátane už vyžrebovaných vlastných pokusov. Vyhladená krivka používa Gaussove jadrá (KDE) nad skutočnými výsledkami a je škálovaná na rovnaké frekvencie ako pruhy. Pri 100 % bezpečnom fonde je iba jeden pruh. Počet scenárov je daný dostupnou históriou; nevyrábame umelé pozorovania kvôli tvaru krivky.

## Dáta a kontrolné hodnoty

Vstup obsahuje **60 ročných výnosov 1966–2025**. Pre férové porovnanie používajú oba horizonty **51 spoločných začiatkov 1966–2016**. Posledné desaťročné obdobie je 2016–2025. Vlastné pokusy žrebujeme rovnomerne bez opakovania v jednej sérii; pri 10 rokoch sa zopakujú rovnaké začiatky v rovnakom poradí.

| Konečná hodnota zo 100 $ | 1 rok | 10 rokov |
| --- | ---: | ---: |
| S&P 500: priemerná hodnota | 111,03 $ | 303,51 $ |
| S&P 500: medián | 113,52 $ | 309,15 $ |
| Bezpečný fond | 103,30 $ | 138,36 $ |

Samotný S&P 500 má v tejto párovej vzorke 11/51 stratových jednoročných a 2/51 stratových desaťročných období. Výpočty vychádzajú z dodaných ročných údajov zaokrúhlených na 0,01 percentuálneho bodu. Dodaný JSON uvádza referenčnú bezpečnú sadzbu 3,35 %; podľa zadania aplikácia používa **3,3 %**.

Zdroj dát: [Damodaran / NYU Stern — S&P 500 includes dividends](https://pages.stern.nyu.edu/adamodar/New_Home_Page/datafile/histretSP.html), január 2026. Pôvodný vstup je v `data/experience_sampling_1_10_data.json`.

Didaktická adaptácia [Haisley, Kaufmann & Weber (2010), How much risk can I handle?](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1616186). Pôvodná štúdia používala MSCI USA, päťročný horizont a iný postup vzorkovania (v kombinovanom risk tool experimente aspoň osem vzoriek). Táto aplikácia je upravená na 1/10 rokov a 5 vlastných pokusov.

**Historické obdobia sa prekrývajú a nie sú nezávislé. Výsledky sú nominálne v USD bez inflácie, poplatkov a daní. Historická frekvencia nie je predpoveďou budúcnosti.** Bezpečný fond je didaktický model; skutočné dlhopisové fondy nemajú zaručený stály výnos.

## Úpravy projektu

`index.html` je hotová samostatná aplikácia. Editovateľné zdroje sú `src/index.template.html`, `styles.css`, `brand.css`, `mobile.css`, `engine.js` a `app.js`. Po zmene zdrojov obnovte výsledné HTML príkazom `node scripts/build.cjs`. Nie sú potrebné žiadne ďalšie balíky.

Vizuál vychádza z [manuálu 5PEŇAZÍ](https://5penazi.milk.sk/): nadpisy Animo Normal Regular vo verzálkach, text Azo Sans Regular/Bold, bubliny a paleta #4479FF, #7B79FF, #DED38F a #092B50. Priložené minilogo 5PEŇAZÍ / NBS je použité bez zmeny proporcií. Logo aj fonty sú uložené v `assets/` a pri zostavení sa vložia priamo do HTML, preto fungujú aj offline. V `assets/licenses/` je zachovaný webový licenčný dokument dodaný s písmom Animo.

Výpočty overíte cez `node --test tests/math.test.cjs`. Testy porovnávajú všetkých 102 párových výsledkov s dodaným JSON-om, bezpečný fond, miešanie fondov, percentily, frekvencie strát a histogram. Node.js je potrebný iba na vývoj a testy, nie na používanie.
