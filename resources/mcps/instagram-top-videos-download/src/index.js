#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { downloadTopVideos } from './download.js';

const server = new McpServer({ name: 'instagram-top-videos-download', version: '1.0.0' });

server.tool(
  'baixar_top_videos_instagram',
  'Lê a lista.csv de vídeos de uma conta do Instagram, ordena por curtidas (do mais curtido ao menos curtido) ' +
    'e baixa os N primeiros como <ordem>_<shortcode>.mp4 na pasta da conta, sem autenticação.',
  {
    csv: z
      .string()
      .describe(
        'Caminho do CSV (absoluto ou relativo à raiz do projeto), ou a pasta que o contém. Ex.: resources/videos/natgeo/lista.csv',
      ),
    quantidade: z.number().int().positive().describe('Quantos vídeos baixar, começando pelos mais curtidos'),
  },
  async ({ csv, quantidade }) => {
    try {
      const r = await downloadTopVideos(csv, quantidade, {
        log: (m) => console.error(`[instagram-top-videos-download] ${m}`),
      });
      return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Erro: ${e.message}` }] };
    }
  },
);

await server.connect(new StdioServerTransport());
