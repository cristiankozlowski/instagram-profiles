#!/usr/bin/env node
// Execução direta, sem cliente MCP: node src/cli.js <caminho-do-csv> <quantidade>
import { downloadTopVideos } from './download.js';

const [csv, quantidade] = process.argv.slice(2);
if (!csv || !(Number(quantidade) > 0)) {
  console.error('Uso: node src/cli.js <caminho-do-csv> <quantidade>');
  process.exit(1);
}

const r = await downloadTopVideos(csv, Number(quantidade), { log: (m) => console.error(m) });
console.log(JSON.stringify(r, null, 2));
