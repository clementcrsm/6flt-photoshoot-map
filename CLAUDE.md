# Spoties (6flt Spots)

PWA de cartographie de spots photo automobile et de gestion clients, pour 6flt Photographies.
Un seul fichier `index.html` (HTML, CSS, JS inline), backend Supabase (base + bucket Storage `photos`), carte Mapbox GL, APIs météo et golden hour. Hébergé sur GitHub Pages depuis `main` (dépôt clementcrsm/6flt-photoshoot-map). Fichiers annexes : `sw.js`, `manifest.json`, `fr.html`, dossier `c/` (6flt Clients).

## Contexte à lire avant toute action
- `docs/PASSATION-spoties-v1.71.md` : derniers paliers documentés (v1.68 à v1.71).
- `docs/backlog-2026-11-16.md` : état actuel, bugs ouverts, décisions en attente, ordre conseillé. En ligne : v1.73. Un palier v1.73.1 est prêt sur la branche `v1.73.1-galerie` et PAS en ligne.
- `docs/PASSATION-calendrier-ics.md` : flux calendrier iPhone, côté serveur (Edge Function `calendar`).
- Les passations plus anciennes (v1.35 à v1.63), le changelog complet et la feuille de route sont dans le projet Claude "Spoties" sur claude.ai, pas dans ce dépôt.

## Règles impératives
- Ne jamais casser la rétrocompatibilité : les données existantes (clients, spots, events en localStorage et Supabase) doivent continuer de s'afficher après tout changement de structure. Faire une migration douce des anciens champs.
- Valider le JS avant chaque livraison : extraire les scripts inline de `index.html` et lancer `node --check` sur chacun. Aucune livraison sans validation verte.
- Bumper la version à chaque livraison (le span du splash dans `index.html`). Fonctionnalité = version mineure, correctif = patch. Si `sw.js` est modifié, bumper aussi le numéro de cache.
- Avancer par paliers validés, un seul à la fois. Clément déploie et teste sur iPhone avant le palier suivant. Résister fermement s'il veut empiler plusieurs grosses fonctionnalités : c'est sa règle et il l'oublie sous l'impatience.
- Ne jamais pousser sur `main` (déploiement direct en production). Travailler sur une branche, Clément merge lui-même.
- Clément teste sur iPhone en PWA et ne peut pas débugger en console : le code doit marcher du premier coup. Après déploiement, il doit fermer et rouvrir la PWA deux fois pour voir la nouvelle version.

## Façon de travailler
- Être un partenaire qui contredit quand Clément a tort. Signaler les failles. Si une fonctionnalité ne vaut pas le coup, le dire franchement.
- Réponses courtes et directes. Pas de description de chaque action pendant les modifications de fichiers.
- Pas de tirets cadratins. Ne pas commencer les phrases par "Stop".
- Clément envoie souvent des captures d'écran annotées (flèches, ronds, rectangles) : lire le croquis et coder la modification réelle.

## Pièges techniques (ne pas re-casser)
- Marqueurs : toujours un div nu comme `element` du `mapboxgl.Marker`, style dans un enfant `.marker-inner`. Un wrapper `inline-block` / `width:max-content` ou un `transform:scale` sur l'élément positionné par Mapbox provoque la dérive au dézoom.
- Géocodage Mapbox : ne pas utiliser `proximity` (erreur 422).
- three.js r128 : pas de `CapsuleGeometry` ni `OrbitControls` ; `resetState()` au lieu de `state.reset()` avec Mapbox v3.
- Changement de style de carte (satellite) : détruit les custom layers, remettre `models3dLayerAdded=false; m3dObjects={}; m3dScene=null` puis `renderMarkers()` sur `style.load`.
- GitHub secret scanning bloque les commits à cause du token Mapbox public (`pk.`) : faux positif, à valider à chaque commit.
- Upload photo : ne jamais remettre de base64 dans localStorage (quota 5 Mo, a cassé la synchro PC / iPhone en juin).
- Ne jamais mettre de clé secrète (service_role par exemple) dans le dépôt : il est public.
