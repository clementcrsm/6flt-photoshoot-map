# Passation Spoties v1.71 (suite de claude/PASSATION-spoties-v1.63.md)

En ligne le 04/11/2026 : Spoties v1.71, commit 41fc7f7 sur `main` (dépôt clementcrsm/6flt-photoshoot-map). Document projet `index.html` à jour. 6flt Clients inchangé.
Tests iPhone : v1.69 et v1.70 validées par Clément. v1.71 à tester.

## v1.68 : rythme des ajouts
Profil > Statistiques > Essentiels, carte « Rythme des ajouts » (dans `pfRenderStats`) : moyenne par semaine et par mois, 30 derniers jours comparés au rythme, heure la plus fréquente, barres par jour et par tranche horaire. Date = `pfCreated` (createdAt, sinon id = Date.now). C'est l'heure de création dans l'app, pas du repérage.

## v1.69 : heatmap
Interrupteur `vis-heat` dans Profil > Carte, mémorisé (`localStorage 6flt_heat`). `renderHeatmap()` appelé en fin de `renderMarkers()` (donc aussi après changement de style satellite). Source `spots-heat-src`, couche `spots-heat` (maxzoom 12, opacité 0,9 à zoom 9 puis 0 à 11,5). Respecte `spotPassesFilters`, routes comptées par leur point milieu. Heatmap active et zoom < 10 : classe `heat-low` sur `#view-map`, les `.marker-inner` sont masqués.

## v1.70 : types de spots
Liste unique `SPOT_TYPES` (g = `decor` ou `lieu`, v = valeur stockée sans accents, l = libellé, e = logo, p = pluriel du filtre). Selects `panel-type` et `filter-type` remplis par `fillTypeSelect` (groupes Décor / Lieux), boutons des lieux ajoutés dans `#filter-kind` par `buildFilterPanel`. `EMOJI_TYPES` dérivé des lieux. Nouveaux : Col / Montagne, Lac / Bord de l'eau (décor) ; Station essence, Chateau, Golf, Aerodrome, Port / Marina, Garage / Atelier, Domaine / Vignoble (lieux).
Alias `SPOT_TYPE_ALIAS` : « Circuit / Piste » lu comme « Circuit » (`normType`), réécrit au prochain enregistrement. Un type inconnu (ancien ou perso) reste affiché et conservé dans la fiche. `typeLabel` pour l'affichage (stats, recherche, briefing, fiche client).

## v1.71 : miniatures (latence carte mobile)
`spot.thumbs = {urlOriginale: urlMiniature}` (JPEG 400 px, qualité 0,72, bucket `photos`). Champ optionnel : sans miniature, l'original est utilisé.
- À l'upload : `makeThumb(file)` après l'original, `attachThumb` rattache au spot s'il est déjà enregistré, sinon `THUMB_NEW` et `thumbsFor` à l'enregistrement.
- Rattrapage : `thumbBackfill()` lancé 4 s après `syncLoadFromCloud`, une photo de couverture à la fois (fetch CORS de l'original, compression, upload, upsert du seul spot). Échec mémorisé pour la session dans `THUMB_FAIL`, sans casse : l'original reste affiché.
- Utilisé par : marqueurs carte (avec `loading="lazy"`), cartes de la galerie, bande de vignettes de la fiche, spots de la fiche client, listes et blocs du briefing (`spotCover`). Fiche et visionneuse gardent l'original.
- Non vérifié depuis la session : en-têtes CORS du stockage Supabase (proxy bloqué). Si le rattrapage échoue, seules les nouvelles photos auront une miniature.

## Suite
Rien d'engagé. Option évoquée : regroupement des marqueurs (clusters) si la carte reste chargée en zoom intermédiaire.
