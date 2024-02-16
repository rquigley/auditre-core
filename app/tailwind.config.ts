import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    // './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.tsx',
    './app/**/*.tsx',
    './controllers/output/react.tsx',
    './lib/**/*.tsx',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
