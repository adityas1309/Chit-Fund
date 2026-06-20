/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 50: "#f7f6f3", 100: "#eeece6", 200: "#d9d5c9", 300: "#bcb5a3", 400: "#8c8470", 500: "#615a48", 600: "#423c2e", 700: "#2a2519", 800: "#1a160d", 900: "#0d0b06" },
        amber: { 50: "#fff8eb", 100: "#fdecc7", 200: "#fbd685", 300: "#f8b942", 400: "#f49a16", 500: "#dd7c04", 600: "#b35e02", 700: "#8a4703", 800: "#623407", 900: "#3d2008" },
        leaf: { 50: "#eef7ec", 100: "#d6ecd0", 200: "#aed7a1", 300: "#7eb96d", 400: "#569944", 500: "#3e7a2e", 600: "#2f5e22", 700: "#23471a", 800: "#173213", 900: "#0c1d0a" },
        rust: { 50: "#fdf2ee", 100: "#f9dcd1", 200: "#f1b39e", 300: "#e48266", 400: "#cf5736", 500: "#b3411f", 600: "#8b311a", 700: "#652515", 800: "#421810", 900: "#220c08" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "Inter", "ui-serif", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 16 12 / 0.04), 0 1px 3px 0 rgb(15 16 12 / 0.06)",
        card: "0 1px 2px 0 rgb(15 16 12 / 0.04), 0 8px 24px -12px rgb(15 16 12 / 0.12)",
        lift: "0 2px 4px 0 rgb(15 16 12 / 0.06), 0 18px 36px -18px rgb(15 16 12 / 0.18)",
        ring: "0 0 0 1px rgb(15 16 12 / 0.08)",
      },
      backgroundImage: {
        grain: "radial-gradient(rgba(15,16,12,0.04) 1px, transparent 1px)",
        halo: "radial-gradient(60% 60% at 50% 0%, rgba(244,154,22,0.22) 0%, rgba(244,154,22,0) 70%)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
    },
  },
  plugins: [],
};
