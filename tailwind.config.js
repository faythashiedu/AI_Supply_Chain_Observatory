/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ── Brand purples ──────────────────────────────────────────────────
        brand:      "#7c3aed",   // primary purple action
        "brand-lt": "#a78bfa",   // lighter purple for text accents
        "brand-dk": "#4c1d95",   // deep purple for fills

        // ── Dark surface scale ──────────────────────────────────────────────
        canvas:  "#07050f",   // deepest bg — the page
        surface: "#0d0b18",   // panels, header, footer
        card:    "#13102a",   // cards, list items
        raised:  "#1a1535",   // hover states, raised elements
        subtle:  "#241e42",   // borders that need to show
        border:  "#2d2454",   // standard border

        // ── Text scale ──────────────────────────────────────────────────────
        primary: "#e2d9f3",   // headings, labels
        soft:    "#c4b5e8",   // body text
        dim:     "#8b7ab8",   // secondary text
        muted:   "#5a4d7a",   // placeholder, disabled

        // ── Severity (kept from reference) ──────────────────────────────────
        critical: "#ff1744",
        high:     "#ff6d00",
        medium:   "#ffea00",
        low:      "#76ff03",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "canvas-radial": "radial-gradient(ellipse at center, #0f0c1e 0%, #07050f 70%)",
      },
    },
  },
  plugins: [],
};