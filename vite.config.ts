import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  console.log("VITE CONFIG ENV API KEY:", env.API_KEY);
  console.log("VITE CONFIG ENV GEMINI API KEY:", env.GEMINI_API_KEY);
  console.log("VITE CONFIG PROCESS API KEY:", process.env.API_KEY);
  console.log("VITE CONFIG PROCESS GEMINI API KEY:", process.env.GEMINI_API_KEY ? "SET" : "UNSET");
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
