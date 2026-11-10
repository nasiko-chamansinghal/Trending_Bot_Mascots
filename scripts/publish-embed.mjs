import { copyFileSync } from 'node:fs';

for (const name of ['mood-mates', 'emotion-ball']) {
  copyFileSync(`dist-lib/${name}.iife.js`, `dist/${name}.js`);
}
