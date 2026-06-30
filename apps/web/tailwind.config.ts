import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          fg: "#312e81",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "70ch",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
