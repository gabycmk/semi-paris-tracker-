const KEY = "semi-paris-v1";

const DEFAULT_STATE = {
  sessions: {},
  tests: [],
  strava: {
    clientId: "",
    clientSecret: "",
    refreshToken: "",
    accessToken: "",
    expiresAt: 0,
    activities: [],
    lastFetch: null,
  },
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      strava: { ...structuredClone(DEFAULT_STATE.strava), ...(parsed.strava || {}) },
    };
  } catch (e) {
    console.error("Erreur de lecture du stockage local", e);
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error("Erreur d'écriture du stockage local", e);
    return false;
  }
}
