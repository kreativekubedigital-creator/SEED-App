import { defineConfig } from 'vite';
const config = defineConfig({
  define: {
    'process.env.API_KEY': undefined,
    'process.env.GEMINI_API_KEY': JSON.stringify("VALID_KEY"),
  }
});
console.log(config);
