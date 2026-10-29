#!/usr/bin/env node
// Execução direta, sem cliente MCP: node src/cli.js <conta> [max_paginas]
import { syncAccount } from './sync.js';

const [conta, maxPaginas] = process.argv.slice(2);
if (!conta) {
  console.error('Uso: node src/cli.js <conta> [max_paginas]');
  process.exit(1);
}

const r = await syncAccount(conta, {
  maxPaginas: maxPaginas ? Number(maxPaginas) : 1000,
  log: (m) => console.error(m),
});
console.log(JSON.stringify(r, null, 2));
