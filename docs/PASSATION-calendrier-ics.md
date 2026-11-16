# Flux calendrier iPhone (08/11/2026)

Côté serveur uniquement, index.html inchangé (v1.71).

- Edge Function `calendar` (verify_jwt false), URL : `https://gpirhmddoeokakikbjkr.supabase.co/functions/v1/calendar?t=<token>`
- Table `cal_feed(token, user_id)`, RLS active sans policy (lue via service role uniquement). Révoquer = supprimer la ligne ; nouveau lien = insérer un nouveau token.
- Contenu : `clients.data.shoots[]` (clients non supprimés) en 📸 « Nom · voiture », + `events` en 🏁. Heure présente : créneau de 2 h en Europe/Paris, sinon journée entière. Lieu = `shoot.place`, sinon premier spot lié. Description : voiture, offre, prix, téléphone, spots, notes.
- UID stable `clientId-index-date@spoties`.
- Abonnement iPhone via webcal://, refresh iOS environ 1 h.
