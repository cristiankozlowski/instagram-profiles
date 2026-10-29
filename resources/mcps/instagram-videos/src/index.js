#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { syncAccount } from './sync.js';

const server = new McpServer({ name: 'instagram-videos', version: '1.0.0' });

server.tool(
  'listar_videos_instagram',
  'Obtém todos os vídeos públicos de uma conta do Instagram (sem autenticação), com visualizações e curtidas, ' +
    'e salva/atualiza resources/videos/<conta>/lista.csv ordenado do mais novo para o mais antigo.',
  {
    conta: z.string().describe('Nome de usuário do Instagram (ex.: "natgeo", "@natgeo" ou URL do perfil)'),
    max_paginas: z.number().int().positive().optional().describe('Limite de páginas a percorrer (padrão: 1000)'),
  },
  async ({ conta, max_paginas }) => {
    try {
      const r = await syncAccount(conta, {
        maxPaginas: max_paginas ?? 1000,
        log: (m) => console.error(`[instagram-videos] ${m}`),
      });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Erro: ${e.message}` }] };
    }
  },
);

await server.connect(new StdioServerTransport());
