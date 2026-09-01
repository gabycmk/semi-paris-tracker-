import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ⚠️ Si tu déploies sur GitHub Pages à l'adresse
// https://TON-PSEUDO.github.io/NOM-DU-REPO/
// remplace la ligne "base" ci-dessous par : base: "/NOM-DU-REPO/"
// Si tu utilises un domaine perso ou Vercel/Netlify, laisse base: "/".
export default defineConfig({
  plugins: [react()],
  base: "/semi-paris-tracker/",
});
