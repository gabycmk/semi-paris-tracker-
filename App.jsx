import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Footprints, Zap, Mountain, Flag, Dumbbell, ChevronDown,
  Check, TrendingUp, Timer, X, Plus, Link2, RefreshCw
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import { loadState, saveState } from "./lib/storage";
import { refreshAccessToken, fetchRecentActivities } from "./lib/strava";

/* ---------------------------------------------------------
   DONNÉES DU PROGRAMME
   Semaines 3 à 10, du 17 août à la course du 11 oct 2026
   5 séances de course/semaine (vélo retiré), 10K le 20 septembre
--------------------------------------------------------- */

const TYPES = {
  EF:    { label: "Endurance fondamentale", icon: Footprints, color: "#8FBF9F" },
  FRA:   { label: "Fractionné",              icon: Zap,        color: "#E2603A" },
  SEU:   { label: "Seuil",                   icon: Zap,        color: "#E8B94A" },
  SL:    { label: "Sortie longue",           icon: Mountain,   color: "#6FA8DC" },
  TEST:  { label: "Course intermédiaire",    icon: Flag,       color: "#E8B94A" },
  REN:   { label: "Renforcement",            icon: Dumbbell,   color: "#C9BFE8" },
  REPOS: { label: "Repos",                   icon: Check,      color: "#6B7D75" },
};


const RAW_WEEKS = [
  {
    num: 3, start: "2026-08-17", range: "17 – 23 août", theme: "Reprise avancée · volume déjà solide (~40 km)",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing facile", detail: "30 min à 5:45–6:00/km, décontracté." },
      { day: "Mar", type: "EF", title: "Footing + lignes droites", detail: "40 min à 5:40–5:50/km + 6x20s accélérations relâchées en fin de séance." },
      { day: "Mar", type: "REN", title: "Renforcement", detail: "15 min : gainage + mollets excentriques (clé pour le tendon d'Achille)." },
      { day: "Mer", type: "REPOS", title: "Repos", detail: "Repos complet — vrai jour off, pas de vélo de substitution." },
      { day: "Jeu", type: "FRA", title: "Fractionné", detail: "Échauffement 10 min. 8x(1 min à 4:10/km / 1min récup trot). Retour au calme 10 min. (~90% VMA)" },
      { day: "Ven", type: "REPOS", title: "Repos", detail: "Repos ou étirements doux." },
      { day: "Sam", type: "EF", title: "Footing + lignes droites", detail: "45 min à 5:40/km + 6x20s accélérations." },
      { day: "Sam", type: "REN", title: "Renforcement", detail: "15 min : proprioception cheville (équilibre 1 jambe, demi-pointes) + gainage." },
      { day: "Dim", type: "SL", title: "Sortie longue", detail: "1h10 (~12 km) à 5:40/km + 4 accélérations progressives en fin." },
    ],
  },
  {
    num: 4, start: "2026-08-24", range: "24 – 30 août", theme: "Montée en régime · introduction du seuil",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing facile", detail: "35 min à 5:45/km." },
      { day: "Mar", type: "EF", title: "Footing + lignes droites", detail: "40 min à 5:40/km + 6x20s accélérations." },
      { day: "Mar", type: "REN", title: "Renforcement", detail: "15 min : squats unilatéraux + mollets excentriques." },
      { day: "Mer", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Jeu", type: "SEU", title: "Premier seuil", detail: "Échauffement 15 min. 2x10 min à 4:25/km, récup 2 min trot. Retour au calme 10 min. (~86% VMA)" },
      { day: "Ven", type: "REPOS", title: "Repos", detail: "Repos ou étirements doux." },
      { day: "Sam", type: "EF", title: "Footing + lignes droites", detail: "45 min à 5:40/km + 6x20s accélérations." },
      { day: "Sam", type: "REN", title: "Renforcement", detail: "15 min : gainage + proprioception cheville." },
      { day: "Dim", type: "SL", title: "Sortie longue", detail: "1h20 (~14 km), 20 dernières minutes en tempo à 4:50/km." },
    ],
  },
  {
    num: 5, start: "2026-08-31", range: "31 août – 6 sept", theme: "Approche du 10K · intervalles plus longs",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing facile", detail: "35 min à 5:45/km." },
      { day: "Mar", type: "EF", title: "Footing + lignes droites", detail: "40 min à 5:40/km + 6x20s accélérations." },
      { day: "Mar", type: "REN", title: "Renforcement", detail: "15 min : mollets excentriques + gainage." },
      { day: "Mer", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Jeu", type: "FRA", title: "Fractionné 1200m", detail: "Échauffement 15 min. 5x1200m à 4:12/km, récup 2 min trot. Retour au calme 10 min. (~91% VMA)" },
      { day: "Ven", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Sam", type: "EF", title: "Footing + lignes droites", detail: "45 min à 5:40/km + 6x20s accélérations." },
      { day: "Sam", type: "REN", title: "Renforcement", detail: "15 min : proprioception cheville + gainage." },
      { day: "Dim", type: "SL", title: "Sortie longue + allure 10K", detail: "1h30 (~15–16 km) avec 6 km à l'allure visée pour le 10K (4:15/km)." },
    ],
  },
  {
    num: 6, start: "2026-09-07", range: "7 – 13 sept", theme: "Approche finale avant le 10K",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing facile", detail: "30 min à 5:45/km, décontracté." },
      { day: "Mar", type: "EF", title: "Footing + lignes droites", detail: "35 min à 5:45/km + 4x20s accélérations." },
      { day: "Mar", type: "REN", title: "Renforcement", detail: "15 min : gainage + mollets excentriques." },
      { day: "Mer", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Jeu", type: "FRA", title: "Séance spécifique 10K", detail: "Échauffement 15 min. 3x1 km à 4:10–4:15/km, récup 2 min trot. Retour au calme 10 min. Dernière grosse séance avant la course." },
      { day: "Ven", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Sam", type: "EF", title: "Footing court + lignes droites", detail: "25 min à 5:45/km + 3x100m lignes droites à allure vive." },
      { day: "Sam", type: "REN", title: "Renforcement léger", detail: "10 min de gainage léger — volume réduit à l'approche de la course." },
      { day: "Dim", type: "SL", title: "Sortie longue modérée", detail: "1h (~10–11 km), aucune vitesse, on garde les jambes fraîches pour le 10K." },
    ],
  },
  {
    num: 7, start: "2026-09-14", range: "14 – 20 sept", theme: "🎯 Semaine du 10 km — objectif 40–45 min, dimanche 20 septembre",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing très facile", detail: "25 min à 5:50/km, décontracté." },
      { day: "Mar", type: "EF", title: "Footing facile", detail: "25 min à 5:45/km + quelques foulées relâchées." },
      { day: "Mer", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Jeu", type: "EF", title: "Footing court + lignes droites", detail: "20 min à 5:45/km + 3x100m lignes droites, dernier rappel d'allure." },
      { day: "Ven", type: "REPOS", title: "Repos", detail: "Repos, hydratation, sommeil avant la course." },
      { day: "Sam", type: "REPOS", title: "Veille de course", detail: "Repos complet ou 10 min de trot très facile, préparation matériel." },
      { day: "Dim", type: "TEST", title: "🎯 10 KM — objectif 40–45 min", detail: "Dimanche 20 septembre. Départ prudent 1er km (4:20/km) puis calage sur 4:00–4:30/km selon les sensations. Note ton temps dans l'onglet Suivi." },
    ],
  },
  {
    num: 8, start: "2026-09-21", range: "21 – 27 sept", theme: "Retour au volume après le 10K",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing récupération", detail: "25 min très facile à 5:50–6:00/km." },
      { day: "Mar", type: "EF", title: "Footing + lignes droites", detail: "40 min à 5:40/km + 6x20s accélérations." },
      { day: "Mar", type: "REN", title: "Renforcement", detail: "15 min : gainage + mollets excentriques." },
      { day: "Mer", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Jeu", type: "SEU", title: "Séance de seuil", detail: "Échauffement 15 min. 3x10 min à 4:20/km, récup 2 min trot. Retour au calme 10 min." },
      { day: "Ven", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Sam", type: "EF", title: "Footing + lignes droites", detail: "45 min à 5:40/km + 6x20s accélérations." },
      { day: "Sam", type: "REN", title: "Renforcement", detail: "15 min : squats unilatéraux + proprioception cheville." },
      { day: "Dim", type: "SL", title: "Sortie longue", detail: "1h30 (~16 km), 8 derniers km à 4:30/km (allure objectif semi)." },
    ],
  },
  {
    num: 9, start: "2026-09-28", range: "28 sept – 4 oct", theme: "Semaine clé · pic de volume",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing facile", detail: "35 min à 5:45/km." },
      { day: "Mar", type: "EF", title: "Footing + lignes droites", detail: "45 min à 5:40/km + 6x20s accélérations." },
      { day: "Mar", type: "REN", title: "Renforcement", detail: "15 min : gainage + mollets excentriques." },
      { day: "Mer", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Jeu", type: "FRA", title: "Fractionné long", detail: "Échauffement 15 min. 6x1000m à 4:05/km, récup 1min30 trot. Retour au calme 10 min. (~93% VMA)" },
      { day: "Ven", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Sam", type: "EF", title: "Footing facile", detail: "30 min à 5:45/km." },
      { day: "Sam", type: "REN", title: "Renforcement", detail: "15 min : proprioception cheville + gainage." },
      { day: "Dim", type: "SL", title: "Sortie longue de référence", detail: "1h45 (~18–19 km), avec 10 à 12 km à l'allure objectif 4:30/km. La plus grosse séance du plan : bien s'échauffer, bien s'hydrater, et ça sert aussi de dernier repère avant la course." },
    ],
  },
  {
    num: 10, start: "2026-10-05", range: "5 – 11 oct", theme: "Semaine de course 🏁",
    sessions: [
      { day: "Lun", type: "EF", title: "Footing très facile", detail: "25 min tranquille, sensations." },
      { day: "Mar", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Mer", type: "EF", title: "Footing + rappels d'allure", detail: "20 min facile + 3x1 min à allure course (4:30/km), bien récupéré entre chaque." },
      { day: "Jeu", type: "REPOS", title: "Repos", detail: "Repos complet." },
      { day: "Ven", type: "EF", title: "Décrassage léger", detail: "15–20 min très facile + 10 min gainage léger." },
      { day: "Sam", type: "REPOS", title: "Repos total", detail: "Repos, préparation matériel, pâtes le soir, hydratation." },
      { day: "Dim", type: "TEST", title: "🏁 SEMI DE PARIS — objectif 1h35 (4:30/km)", detail: "Jour J ! Départ prudent les 3 premiers km (4:35–4:40/km) puis calage sur l'allure objectif. Amuse-toi." },
    ],
  },
];


const WEEKS = RAW_WEEKS.map(w => ({
  ...w,
  sessions: w.sessions.map((s, i) => ({ ...s, id: `w${w.num}-${i}-${s.day}` })),
}));

const ALL_SESSIONS = WEEKS.flatMap(w => w.sessions.map(s => ({ ...s, week: w.num })));
const RUN_TYPES = ["EF", "FRA", "SEU", "SL", "TEST"];

const PACE_TABLE = [
  { label: "VMA de référence", pace: "3:50 /km" },
  { label: "Endurance fondamentale (EF)", pace: "5:40 – 6:00 /km" },
  { label: "Tempo / fin de sortie longue", pace: "4:50 – 4:55 /km" },
  { label: "Seuil (~85–88% VMA)", pace: "4:20 – 4:30 /km" },
  { label: "Fractionné court 1 min (~95–100% VMA)", pace: "3:55 – 4:10 /km" },
  { label: "Fractionné 1000m / 1200m (~90–93% VMA)", pace: "4:05 – 4:15 /km" },
  { label: "Allure objectif 10K (40–45 min)", pace: "4:00 – 4:30 /km" },
  { label: "Allure objectif semi (1h35, ~85% VMA)", pace: "4:30 /km" },
];

/* ---------------------------------------------------------
   UTILITAIRES
--------------------------------------------------------- */

function secToPace(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function secToHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0
    ? `${h}h${m.toString().padStart(2, "0")}min`
    : `${m}min${s.toString().padStart(2, "0")}`;
}

// Formule de Riegel : T2 = T1 * (D2/D1)^1.06
function riegelPredict(distKm, timeSec, targetKm = 21.0975) {
  return timeSec * Math.pow(targetKm / distKm, 1.06);
}

function currentWeek() {
  const today = new Date();
  let match = WEEKS[0];
  for (const w of WEEKS) {
    if (new Date(w.start) <= today) match = w;
  }
  return match;
}

const RACE_DATE = new Date("2026-10-11T09:00:00");
const TARGET_SEC = 95 * 60; // 1h35

/* ---------------------------------------------------------
   STYLES INJECTÉS (fonts + variables)
--------------------------------------------------------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

      html, body, #root { height: 100%; }
      .spt-root {
        --bg: #16261F;
        --surface: #1E322A;
        --surface2: #24392F;
        --line: rgba(243,240,230,0.10);
        --gold: #E8B94A;
        --coral: #E2603A;
        --text: #F3F0E6;
        --muted: #9DB0A5;
        --green: #8FBF9F;
        background: var(--bg);
        color: var(--text);
        font-family: 'Inter', sans-serif;
        min-height: 100%;
        width: 100%;
      }
      .spt-root * { box-sizing: border-box; }
      .spt-display {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .spt-mono {
        font-family: 'JetBrains Mono', monospace;
      }
      .spt-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
      .spt-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }
      .spt-btn:focus-visible, .spt-tab:focus-visible, .spt-check:focus-visible, .spt-input:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }
      .spt-spin { animation: spt-rotate 0.9s linear infinite; }
      @keyframes spt-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        .spt-root * { transition: none !important; animation: none !important; }
      }
    `}</style>
  );
}

/* ---------------------------------------------------------
   COMPOSANT PRINCIPAL
--------------------------------------------------------- */

export default function App() {
  const [tab, setTab] = useState("apercu");
  const [state, setState] = useState(() => loadState());

  const persist = useCallback((next) => {
    saveState(next);
  }, []);

  const updateSession = (id, patch) => {
    setState(prev => {
      const next = {
        ...prev,
        sessions: { ...prev.sessions, [id]: { ...prev.sessions[id], ...patch } },
      };
      persist(next);
      return next;
    });
  };

  const addTest = (test) => {
    setState(prev => {
      const next = { ...prev, tests: [...prev.tests, test] };
      persist(next);
      return next;
    });
  };

  const removeTest = (idx) => {
    setState(prev => {
      const next = { ...prev, tests: prev.tests.filter((_, i) => i !== idx) };
      persist(next);
      return next;
    });
  };

  const updateStrava = (patch) => {
    setState(prev => {
      const next = { ...prev, strava: { ...prev.strava, ...patch } };
      persist(next);
      return next;
    });
  };

  const doneCount = Object.values(state.sessions).filter(s => s?.done).length;
  const totalCount = ALL_SESSIONS.length;
  const daysLeft = Math.max(0, Math.ceil((RACE_DATE - new Date()) / 86400000));

  const prediction = useMemo(() => {
    if (state.tests.length === 0) return null;
    const preds = state.tests.map(t => riegelPredict(t.distance, t.time));
    const latest = preds[preds.length - 1];
    const best = Math.min(...preds);
    return { latest, best };
  }, [state.tests]);

  return (
    <div className="spt-root" style={{ minHeight: "100vh", paddingBottom: 40 }}>
      <GlobalStyle />
      <Header daysLeft={daysLeft} doneCount={doneCount} totalCount={totalCount} />
      <Tabs tab={tab} setTab={setTab} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
        {tab === "apercu" && (
          <Apercu
            state={state}
            prediction={prediction}
            addTest={addTest}
            removeTest={removeTest}
          />
        )}
        {tab === "programme" && (
          <Programme sessions={state.sessions} updateSession={updateSession} />
        )}
        {tab === "strava" && (
          <StravaPanel
            strava={state.strava}
            sessions={state.sessions}
            updateStrava={updateStrava}
            updateSession={updateSession}
          />
        )}
        {tab === "reperes" && <Reperes />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HEADER
--------------------------------------------------------- */

function Header({ daysLeft, doneCount, totalCount }) {
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  return (
    <div style={{
      background: "linear-gradient(180deg, var(--surface2), var(--bg))",
      borderBottom: "1px solid var(--line)",
      padding: "28px 16px 22px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="spt-mono" style={{ color: "var(--gold)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Semi-marathon Harmonie Mutuelle · Paris
        </div>
        <div className="spt-display" style={{ fontSize: 42, lineHeight: 1.05, marginTop: 4 }}>
          J-{daysLeft} <span style={{ color: "var(--muted)", fontSize: 22 }}>avant le départ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1, height: 6, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--coral)", borderRadius: 4 }} />
          </div>
          <div className="spt-mono" style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
            {doneCount}/{totalCount} séances
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   TABS
--------------------------------------------------------- */

function Tabs({ tab, setTab }) {
  const items = [
    { id: "apercu", label: "Vue d'ensemble" },
    { id: "programme", label: "Programme" },
    { id: "strava", label: "Strava" },
    { id: "reperes", label: "Repères d'allure" },
  ];
  return (
    <div className="spt-scroll" style={{
      display: "flex", gap: 4, maxWidth: 720, margin: "0 auto", padding: "14px 16px 0",
      overflowX: "auto",
    }}>
      {items.map(it => (
        <button
          key={it.id}
          className="spt-tab spt-display"
          onClick={() => setTab(it.id)}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: tab === it.id ? "var(--coral)" : "transparent",
            color: tab === it.id ? "#1B120E" : "var(--muted)",
            fontSize: 15,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   VUE D'ENSEMBLE
--------------------------------------------------------- */

function Apercu({ state, prediction, addTest, removeTest }) {
  const [showForm, setShowForm] = useState(false);
  const current = currentWeek();

  const chartData = useMemo(() => {
    return state.tests.map((t, i) => ({
      name: t.label || `Test ${i + 1}`,
      projection: Math.round(riegelPredict(t.distance, t.time) / 60),
    }));
  }, [state.tests]);

  return (
    <div style={{ paddingTop: 20 }}>
      <SectionTitle icon={TrendingUp} label="Estimation de ton temps" />
      {prediction ? (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16,
          padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="spt-mono" style={{ color: "var(--muted)", fontSize: 12 }}>d'après ton dernier test</div>
              <div className="spt-display" style={{ fontSize: 40 }}>{secToHMS(prediction.latest)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="spt-mono" style={{ color: "var(--muted)", fontSize: 12 }}>objectif</div>
              <div className="spt-display" style={{ fontSize: 24, color: "var(--gold)" }}>1h35</div>
            </div>
          </div>
          <div className="spt-mono" style={{ fontSize: 13, color: prediction.latest <= TARGET_SEC ? "var(--green)" : "var(--coral)", marginTop: 10 }}>
            {prediction.latest <= TARGET_SEC
              ? `Sur cette base, l'objectif est tenable, avec ${secToHMS(Math.max(0, TARGET_SEC - prediction.latest))} de marge.`
              : `Il manque environ ${secToHMS(prediction.latest - TARGET_SEC)} par rapport à l'objectif — normal si c'est un test précoce, ça se resserre avec le travail d'allure.`}
          </div>
          {chartData.length > 1 && (
            <div style={{ height: 160, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} />
                  <YAxis stroke="var(--muted)" fontSize={11} unit="min" />
                  <ReferenceLine y={95} stroke="var(--gold)" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{ background: "var(--surface2)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--text)" }}
                    formatter={(v) => [`${v} min`, "projection semi"]}
                  />
                  <Line type="monotone" dataKey="projection" stroke="var(--coral)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: "var(--surface)", border: "1px dashed var(--line)", borderRadius: 16,
          padding: 20, marginBottom: 20, color: "var(--muted)", fontSize: 14,
        }}>
          Ajoute le résultat de ton test 10K (semaine 7, 20 sept) ou de la sortie longue de référence (semaine 9) pour obtenir une projection de ton temps sur semi.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {state.tests.map((t, i) => (
          <div key={i} className="spt-mono" style={{
            fontSize: 12, background: "var(--surface2)", border: "1px solid var(--line)",
            borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>{t.label} · {t.distance}km en {secToHMS(t.time)}</span>
            <button onClick={() => removeTest(i)} aria-label="Supprimer" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          className="spt-btn"
          onClick={() => setShowForm(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            background: "transparent", border: "1px solid var(--line)", borderRadius: 10,
            padding: "8px 12px", color: "var(--gold)", cursor: "pointer",
          }}
        >
          <Plus size={14} /> Ajouter un test
        </button>
      </div>

      {showForm && <TestForm onAdd={(t) => { addTest(t); setShowForm(false); }} onCancel={() => setShowForm(false)} />}

      <SectionTitle icon={Timer} label="Cette semaine" />
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div className="spt-display" style={{ fontSize: 20 }}>Semaine {current.num} · {current.range}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{current.theme}</div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>
          Ouvre l'onglet <strong style={{ color: "var(--text)" }}>Programme</strong> pour voir le détail de chaque semaine et cocher tes séances.
        </div>
      </div>
    </div>
  );
}

function TestForm({ onAdd, onCancel }) {
  const [label, setLabel] = useState("Test 10K");
  const [distance, setDistance] = useState("10");
  const [mm, setMm] = useState("");
  const [ss, setSs] = useState("");

  const submit = () => {
    const d = parseFloat(distance.replace(",", "."));
    const time = (parseInt(mm || "0", 10) * 60) + parseInt(ss || "0", 10);
    if (!d || !time) return;
    onAdd({ label, distance: d, time });
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>
          Nom du test
          <input className="spt-input" value={label} onChange={e => setLabel(e.target.value)}
            style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>
            Distance (km)
            <input className="spt-input" value={distance} onChange={e => setDistance(e.target.value)} inputMode="decimal"
              style={inputStyle} />
          </label>
          <label style={{ fontSize: 12, color: "var(--muted)", width: 70 }}>
            min
            <input className="spt-input" value={mm} onChange={e => setMm(e.target.value)} inputMode="numeric"
              style={inputStyle} />
          </label>
          <label style={{ fontSize: 12, color: "var(--muted)", width: 70 }}>
            sec
            <input className="spt-input" value={ss} onChange={e => setSs(e.target.value)} inputMode="numeric"
              style={inputStyle} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={submit} className="spt-btn spt-display" style={{ background: "var(--coral)", border: "none", borderRadius: 10, padding: "8px 16px", color: "#1B120E", fontSize: 15, cursor: "pointer" }}>
            Enregistrer
          </button>
          <button onClick={onCancel} className="spt-btn" style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 16px", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  display: "block", width: "100%", marginTop: 4, background: "var(--surface2)",
  border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 14,
};

function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <Icon size={16} color="var(--gold)" />
      <div className="spt-display" style={{ fontSize: 18, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   PROGRAMME
--------------------------------------------------------- */

function Programme({ sessions, updateSession }) {
  const [openWeek, setOpenWeek] = useState(currentWeek().num);

  return (
    <div style={{ paddingTop: 20 }}>
      {WEEKS.map(w => {
        const isOpen = openWeek === w.num;
        const weekDone = w.sessions.filter(s => sessions[s.id]?.done).length;
        return (
          <div key={w.num} style={{ marginBottom: 12, border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", background: "var(--surface)" }}>
            <button
              onClick={() => setOpenWeek(isOpen ? null : w.num)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text)",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div className="spt-display" style={{ fontSize: 19 }}>Semaine {w.num} · {w.range}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{w.theme}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="spt-mono" style={{ fontSize: 12, color: "var(--muted)" }}>{weekDone}/{w.sessions.length}</span>
                <ChevronDown size={18} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </div>
            </button>
            {isOpen && (
              <div style={{ borderTop: "1px solid var(--line)" }}>
                {w.sessions.map(s => (
                  <SessionRow key={s.id} session={s} data={sessions[s.id]} onUpdate={patch => updateSession(s.id, patch)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SessionRow({ session, data, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPES[session.type];
  const Icon = meta.icon;
  const done = !!data?.done;
  const isRun = RUN_TYPES.includes(session.type);

  return (
    <div style={{ borderBottom: "1px solid var(--line)", padding: "12px 16px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <button
          className="spt-check"
          aria-label={done ? "Marquer non faite" : "Marquer faite"}
          onClick={() => onUpdate({ done: !done })}
          style={{
            marginTop: 2, width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            border: `1.5px solid ${done ? "var(--green)" : "var(--line)"}`,
            background: done ? "var(--green)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          {done && <Check size={14} color="#16261F" />}
        </button>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="spt-mono" style={{ fontSize: 11, color: "var(--muted)", width: 30 }}>{session.day}</span>
            <Icon size={13} color={meta.color} />
            <span className="spt-mono" style={{ fontSize: 10, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{meta.label}</span>
            {data?.stravaId && (
              <span className="spt-mono" style={{ fontSize: 10, color: "#FC5200", border: "1px solid #FC5200", borderRadius: 6, padding: "1px 5px" }}>
                Strava
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3, textDecoration: done ? "line-through" : "none", color: done ? "var(--muted)" : "var(--text)" }}>
            {session.title}
          </div>
          {expanded && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
              {session.detail}
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, marginLeft: 32, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => onUpdate({ feel: n })}
                aria-label={`Ressenti ${n} sur 5`}
                style={{
                  width: 26, height: 26, borderRadius: "50%", fontSize: 11,
                  border: `1px solid ${data?.feel === n ? "var(--gold)" : "var(--line)"}`,
                  background: data?.feel === n ? "var(--gold)" : "transparent",
                  color: data?.feel === n ? "#1B120E" : "var(--muted)", cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
            <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center", marginLeft: 4 }}>ressenti</span>
          </div>
          {isRun && (
            <input
              className="spt-input"
              placeholder="Allure réelle, ex : 5:32"
              value={data?.actualPace || ""}
              onChange={e => onUpdate({ actualPace: e.target.value })}
              style={{ ...inputStyle, width: 200 }}
            />
          )}
          <textarea
            className="spt-input"
            placeholder="Notes (sensations, douleur, météo…)"
            value={data?.note || ""}
            onChange={e => onUpdate({ note: e.target.value })}
            style={{ ...inputStyle, width: "100%", minHeight: 50, resize: "vertical", fontFamily: "Inter, sans-serif" }}
          />
          {data?.stravaId && (
            <a
              href={`https://www.strava.com/activities/${data.stravaId}`}
              target="_blank" rel="noreferrer"
              className="spt-mono"
              style={{ fontSize: 12, color: "#FC5200" }}
            >
              Voir « {data.stravaName} » sur Strava →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   STRAVA
--------------------------------------------------------- */

function StravaPanel({ strava, sessions, updateStrava, updateSession }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linkChoice, setLinkChoice] = useState({}); // { [activityId]: sessionId }

  const connected = !!strava.refreshToken && !!strava.clientId && !!strava.clientSecret;

  const sync = async () => {
    setBusy(true);
    setError("");
    try {
      const tok = await refreshAccessToken({
        clientId: strava.clientId,
        clientSecret: strava.clientSecret,
        refreshToken: strava.refreshToken,
      });
      const activities = await fetchRecentActivities(tok.access_token, { perPage: 20 });
      updateStrava({
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token || strava.refreshToken,
        expiresAt: tok.expires_at,
        activities,
        lastFetch: new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
      setError(
        e.message?.includes("Failed to fetch")
          ? "Impossible de joindre l'API Strava depuis le navigateur (souvent un blocage CORS). Voir le README pour la solution de secours (proxy serverless)."
          : e.message || "Erreur inconnue."
      );
    } finally {
      setBusy(false);
    }
  };

  const linkActivity = (activity) => {
    const sessionId = linkChoice[activity.id];
    if (!sessionId) return;
    updateSession(sessionId, {
      done: true,
      actualPace: secToPace(activity.paceSecPerKm),
      stravaId: activity.id,
      stravaName: activity.name,
    });
  };

  return (
    <div style={{ paddingTop: 20 }}>
      <SectionTitle icon={Link2} label="Connexion Strava" />
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>
          Renseigne les identifiants de ton appli Strava (voir le README du projet pour la marche à suivre complète). Tout reste stocké uniquement dans ton navigateur.
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>
            Client ID
            <input className="spt-input" style={inputStyle} value={strava.clientId}
              onChange={e => updateStrava({ clientId: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>
            Client Secret
            <input className="spt-input" style={inputStyle} type="password" value={strava.clientSecret}
              onChange={e => updateStrava({ clientSecret: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>
            Refresh Token
            <input className="spt-input" style={inputStyle} type="password" value={strava.refreshToken}
              onChange={e => updateStrava({ refreshToken: e.target.value })} />
          </label>
        </div>
        <button
          onClick={sync}
          disabled={!connected || busy}
          className="spt-btn spt-display"
          style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 14,
            background: connected ? "#FC5200" : "var(--surface2)", border: "none", borderRadius: 10,
            padding: "9px 16px", color: connected ? "#fff" : "var(--muted)", fontSize: 15,
            cursor: connected ? "pointer" : "not-allowed",
          }}
        >
          <RefreshCw size={15} className={busy ? "spt-spin" : ""} />
          {busy ? "Synchronisation…" : "Récupérer mes activités"}
        </button>
        {error && <div style={{ color: "var(--coral)", fontSize: 12, marginTop: 10 }}>{error}</div>}
        {strava.lastFetch && (
          <div className="spt-mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            Dernière synchro : {new Date(strava.lastFetch).toLocaleString("fr-FR")}
          </div>
        )}
      </div>

      {strava.activities?.length > 0 && (
        <>
          <SectionTitle icon={Flag} label="Activités récentes" />
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {strava.activities.map(a => (
              <div key={a.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                  <div className="spt-mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                    {new Date(a.date).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="spt-mono" style={{ fontSize: 12, color: "var(--gold)", marginTop: 4 }}>
                  {a.distanceKm.toFixed(2)} km · {secToHMS(a.movingTimeSec)} · {secToPace(a.paceSecPerKm)}/km
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <select
                    value={linkChoice[a.id] || ""}
                    onChange={e => setLinkChoice(prev => ({ ...prev, [a.id]: e.target.value }))}
                    style={{ ...inputStyle, marginTop: 0, flex: 1, fontSize: 12 }}
                  >
                    <option value="">Lier à une séance…</option>
                    {WEEKS.map(w => (
                      <optgroup key={w.num} label={`Semaine ${w.num} · ${w.range}`}>
                        {w.sessions.filter(s => RUN_TYPES.includes(s.type)).map(s => (
                          <option key={s.id} value={s.id}>{s.day} · {s.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={() => linkActivity(a)}
                    disabled={!linkChoice[a.id]}
                    className="spt-btn"
                    style={{
                      background: "transparent", border: "1px solid var(--line)", borderRadius: 8,
                      padding: "0 12px", color: "var(--gold)", fontSize: 12,
                      cursor: linkChoice[a.id] ? "pointer" : "not-allowed",
                    }}
                  >
                    Lier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   REPÈRES D'ALLURE
--------------------------------------------------------- */

function Reperes() {
  return (
    <div style={{ paddingTop: 20 }}>
      <SectionTitle icon={Timer} label="Repères d'allure" />
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        {PACE_TABLE.map((row, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", padding: "12px 16px",
            borderBottom: i < PACE_TABLE.length - 1 ? "1px solid var(--line)" : "none",
          }}>
            <span style={{ fontSize: 14 }}>{row.label}</span>
            <span className="spt-mono" style={{ fontSize: 14, color: "var(--gold)" }}>{row.pace}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--text)" }}>Pourquoi ces allures ?</strong> Les allures de fractionné et de seuil sont calées sur ta VMA (3:50/km) : ~95–100% pour le fractionné court, ~90–93% pour le 1000m/1200m, ~85–88% pour le seuil. L'EF reste au ressenti, plus lente que le pur calcul VMA (c'est normal, c'est le rythme de la récupération active). L'objectif semi à 4:30/km correspond à ~85% VMA, cohérent avec ton chrono de 1h43 en avril et la marge que tu ressentais.
        <br /><br />
        <strong style={{ color: "var(--text)" }}>Sur la charge renforcée :</strong> le plan est passé à 5 séances de course/semaine (le vélo a été retiré, remplacé par une séance facile supplémentaire) pour coller à ton volume réel (~40 km/semaine). En contrepartie, les jours de repos sont maintenant du vrai repos, à respecter strictement : c'est ce qui protège la cheville et le 5e métatarse quand le volume augmente. Si une douleur apparaît, mieux vaut sauter une séance de qualité — ou raccourcir un footing — que la forcer.
      </div>
    </div>
  );
}
