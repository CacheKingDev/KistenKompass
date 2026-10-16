import { defineConfig } from 'vite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const {version}=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
const buildId=randomUUID();
export default defineConfig({
  define: {__APP_VERSION__: JSON.stringify(version),__BUILD_ID__:JSON.stringify(buildId)},
  plugins:[{name:'app-version',generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({buildId})});}}],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
