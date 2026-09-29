# Tests de Spoties et 6flt Clients

Branche `outils-tests` : ces fichiers ne sont pas dans `main`, pour ne pas être publiés par GitHub Pages.
Ils visent la v1.57 (branche `v1.57-creneaux`). Chemins écrits en dur : dépôt dans `/home/claude/6flt-photoshoot-map`, tests copiés dans `/home/claude/work/t`.

## Installation dans le bac à sable
```
mkdir -p /home/claude/work/t && cp -r tests/* /home/claude/work/t/
cd /home/claude/work/t && npm i jsdom@24
```
Python avec Playwright et Chromium sont déjà installés dans l'environnement (ne pas lancer `playwright install`).

## Tests unitaires (jsdom), fonctions extraites de la page
`node test_v151.js` … `node test_v154.js`, `test_c.js`, `test_push.js`, `test_visible.js`, `test_confirm_sheet.js`.
Chacun finit par `TOUS LES TESTS PASSENT` ou le nombre d'échecs.

## Tests pleine page (Chromium, taille iPhone et ordinateur)
Vraie page Spoties et vraie app 6flt Clients servies en local, Supabase simulé en mémoire (`fake_sb.js` remplace supabase-js, `fake_mapbox.js` remplace Mapbox).
- `python3 full/run_v155.py` : fiche client, accepter / refuser une ou plusieurs dates, briefing ouvert dans l'éditeur, document gelé, republication des liens sans date.
- `python3 full/run_c157.py` : calendrier de proposition de date dans 6flt Clients (heures calculées, 3 options, refus, anciens formats).
- `python3 full/cloudonly.py` : fiche ouverte alors que le briefing n'existe que dans le cloud.
- `node full/gen_rows.js` puis `python3 full/gen_html.py` puis `python3 full/render_c.py tbd` : génère un briefing complet (tous les blocs) avec le vrai code de Spoties et contrôle sa mise en page dans 6flt Clients.
Les captures sont écrites dans le dossier `SP` défini en tête de `run_v155.py` (à adapter).
