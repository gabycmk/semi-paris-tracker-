# Suivi d'entraînement — Semi de Paris 🏁

Appli de suivi d'entraînement pour le semi-marathon Harmonie Mutuelle de Paris
(11 octobre 2026), objectif 1h35, avec projection de temps (formule de Riegel)
et intégration Strava.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre l'URL affichée dans le terminal (en général `http://localhost:5173`).

Tes données (séances cochées, notes, tests, identifiants Strava) sont stockées
uniquement dans le `localStorage` de ton navigateur — rien n'est envoyé à un
serveur. Si tu changes de navigateur ou d'ordinateur, les données ne suivent
pas automatiquement.

## Déployer sur GitHub Pages

1. Crée un repo GitHub (ex : `semi-paris-tracker`) et pousse ce dossier dedans :
   ```bash
   git init
   git add .
   git commit -m "Premier commit"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/semi-paris-tracker.git
   git push -u origin main
   ```
2. Dans `vite.config.js`, remplace `base: "/"` par `base: "/semi-paris-tracker/"`
   (ou le nom exact de ton repo), puis commite ce changement.
3. Dans les paramètres du repo GitHub → **Settings → Pages**, choisis
   **Source : GitHub Actions**. Le workflow `.github/workflows/deploy.yml`
   inclus dans ce projet se charge du build et du déploiement à chaque push
   sur `main`.
4. Ton site sera disponible à `https://TON-PSEUDO.github.io/semi-paris-tracker/`
   après quelques minutes (visible dans l'onglet **Actions** du repo).

Alternative plus simple sans workflow : `npm run deploy` (utilise `gh-pages`,
déploie directement le dossier `dist/` sur la branche `gh-pages`).

## Connecter Strava

L'appli n'a pas de serveur, donc la connexion Strava se fait entièrement
depuis ton navigateur, avec tes propres identifiants d'application. C'est
adapté à un usage personnel (un site que toi seule utilises) — pas à un site
partagé publiquement, puisque le Client Secret est stocké dans le navigateur.

### 1. Créer une appli Strava

1. Va sur https://www.strava.com/settings/api et crée une application.
   - "Authorization Callback Domain" : mets `localhost` pour commencer (tu
     pourras changer plus tard si besoin).
2. Note ton **Client ID** et ton **Client Secret**.

### 2. Obtenir un refresh token (une seule fois)

1. Remplace `CLIENT_ID` dans l'URL suivante par le tien, et ouvre-la dans ton
   navigateur :
   ```
   https://www.strava.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all
   ```
2. Autorise l'accès. Tu seras redirigée vers une URL du type
   `http://localhost/?state=&code=XXXXX&scope=...` (la page ne se chargera
   pas, c'est normal — copie juste le `code` dans l'URL).
3. Échange ce code contre un refresh token avec `curl` (ou Postman) :
   ```bash
   curl -X POST https://www.strava.com/oauth/token \
     -d client_id=CLIENT_ID \
     -d client_secret=CLIENT_SECRET \
     -d code=LE_CODE_RECUPERE \
     -d grant_type=authorization_code
   ```
4. La réponse contient un `refresh_token` — c'est celui-là qu'il faut coller
   dans l'onglet **Strava** de l'appli (avec le Client ID et le Client Secret).

### 3. Utiliser la connexion dans l'appli

Dans l'onglet **Strava**, colle Client ID / Client Secret / Refresh Token,
clique sur **Récupérer mes activités**, puis pour chaque activité affichée,
choisis dans le menu déroulant la séance du plan qu'elle correspond, et
clique sur **Lier**. La séance est alors marquée comme faite, avec l'allure
réelle et un lien direct vers l'activité Strava.

### Si tu rencontres une erreur CORS

Certains navigateurs bloquent l'appel direct à `strava.com/oauth/token`
depuis un site statique. Si ça arrive, la solution la plus simple est
d'ajouter un petit serverless function qui fait ce seul appel côté serveur
(le Client Secret ne quitte alors plus jamais tes propres serveurs) :

- **Vercel** : crée `api/strava-token.js` qui reçoit la requête, appelle
  `https://www.strava.com/oauth/token` côté serveur avec `fetch`, et renvoie
  le résultat. Déploie le projet sur Vercel au lieu de GitHub Pages.
- **Netlify** : équivalent avec une "Netlify Function" dans `netlify/functions/`.

Dans `src/lib/strava.js`, il suffit alors de remplacer l'URL
`https://www.strava.com/oauth/token` par l'URL de ta fonction serverless.

## Structure du projet

```
src/
  App.jsx          — toute l'interface (programme, suivi, Strava, repères)
  lib/storage.js   — lecture/écriture dans le localStorage du navigateur
  lib/strava.js    — appels à l'API Strava (token + activités)
```
