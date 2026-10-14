import { defineConfig } from 'vite';
import {readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
export default defineConfig({
  define: {__APP_VERSION__: JSON.stringify(version)},
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
