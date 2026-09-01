// Intégration Strava en client pur (sans backend).
//
// ⚠️ Limite à connaître : le Client Secret Strava est stocké et utilisé
// depuis le navigateur (localStorage), donc visible par quiconque inspecte
// le code de TON site. C'est acceptable pour un usage strictement personnel
// (site non partagé, credentials à toi), mais ce n'est pas une intégration
// "grand public" sécurisée. Si tu veux la rendre plus robuste, remplace ces
// appels par un petit serverless function (Vercel/Netlify) qui garde le
// Client Secret côté serveur — voir le README.
//
// Comment obtenir tes identifiants (une seule fois) :
// 1. Crée une appli sur https://www.strava.com/settings/api
// 2. Récupère le Client ID et le Client Secret
// 3. Autorise l'accès et récupère un refresh_token via le flux OAuth Strava
//    (voir le README pour le lien d'autorisation prêt à l'emploi)

const TOKEN_URL = "https://www.strava.com/oauth/token";
const ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

export async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Échec du rafraîchissement du token Strava (${res.status}) ${text}`);
  }
  return res.json(); // { access_token, refresh_token, expires_at, ... }
}

export async function fetchRecentActivities(accessToken, { perPage = 30 } = {}) {
  const res = await fetch(`${ACTIVITIES_URL}?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Échec de récupération des activités Strava (${res.status}) ${text}`);
  }
  const data = await res.json();
  return data
    .filter((a) => a.type === "Run" || a.sport_type === "Run")
    .map((a) => ({
      id: a.id,
      name: a.name,
      date: a.start_date_local,
      distanceKm: a.distance / 1000,
      movingTimeSec: a.moving_time,
      paceSecPerKm: a.moving_time / (a.distance / 1000),
    }));
}
