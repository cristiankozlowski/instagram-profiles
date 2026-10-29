import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAccountVideos } from './instagram.js';
import { readCsv, writeCsv } from './csv.js';

// resources/mcps/instagram-videos/src -> resources/videos
const DEFAULT_VIDEOS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'videos');

export function normalizeAccount(conta) {
  return String(conta)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .toLowerCase();
}

/**
 * Baixa os vídeos da conta e atualiza resources/videos/<conta>/lista.csv.
 * Vídeos já existentes são mantidos; os novos entram na lista, que fica ordenada do mais novo para o mais antigo.
 */
export async function syncAccount(contaInput, opts = {}) {
  const conta = normalizeAccount(contaInput);
  if (!/^[a-z0-9._]{1,30}$/.test(conta)) throw new Error(`Nome de conta inválido: ${contaInput}`);

  const videosDir = process.env.INSTAGRAM_VIDEOS_DIR || DEFAULT_VIDEOS_DIR;
  const arquivo = path.join(videosDir, conta, 'lista.csv');

  const existentes = await readCsv(arquivo);
  const conhecidos = new Set(existentes.map((v) => v.id));

  const { videos, paginas, erros, perfil } = await fetchAccountVideos(conta, opts);
  const novos = videos.filter((v) => !conhecidos.has(v.id));

  const lista = [...novos, ...existentes].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  if (novos.length || existentes.length === 0) await writeCsv(arquivo, lista);

  return {
    conta,
    arquivo,
    perfil,
    paginas_lidas: paginas,
    videos_baixados: videos.length,
    videos_novos: novos.length,
    total_na_lista: lista.length,
    erros,
  };
}
