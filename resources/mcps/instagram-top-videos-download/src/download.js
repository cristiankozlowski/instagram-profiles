import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.js';
import { resolveVideoUrl, downloadFile } from './instagram.js';

// resources/mcps/instagram-top-videos-download/src -> raiz do projeto
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DEFAULT_VIDEOS_DIR = path.join(PROJECT_ROOT, 'resources', 'videos');

const LIKE_COLUMNS = ['likes', 'curtidas', 'like_count'];
const SHORTCODE_COLUMNS = ['shortcode', 'code'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const exists = (p) =>
  fs.stat(p).then(
    (s) => s,
    () => null,
  );

/**
 * Aceita caminho absoluto, relativo ao diretório atual ou à raiz do projeto, "file://" ou aspas.
 * Se for uma pasta, usa a lista.csv dentro dela (ou o único .csv existente).
 */
export async function resolveCsvPath(input) {
  let p = String(input).trim().replace(/^["']|["']$/g, '');
  if (p.startsWith('file://')) p = fileURLToPath(p);

  const candidates = path.isAbsolute(p) ? [p] : [path.resolve(process.cwd(), p), path.resolve(PROJECT_ROOT, p)];
  for (const c of candidates) {
    const st = await exists(c);
    if (st?.isFile()) return c;
    if (st?.isDirectory()) {
      const lista = path.join(c, 'lista.csv');
      if ((await exists(lista))?.isFile()) return lista;
      const csvs = (await fs.readdir(c)).filter((f) => f.toLowerCase().endsWith('.csv'));
      if (csvs.length === 1) return path.join(c, csvs[0]);
    }
  }
  throw new Error(`CSV não encontrado: ${input}`);
}

const pick = (row, columns) => columns.map((c) => row[c]).find((v) => v != null && v !== '');

function toNumber(v) {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return v === '' || v == null || Number.isNaN(n) ? -1 : n;
}

// Conta: coluna "conta" do CSV; senão, o nome da pasta onde o CSV está.
function identifyAccount(rows, csvPath) {
  const fromColumn = rows.map((r) => r.conta || r.username || r.account).find(Boolean);
  return (fromColumn || path.basename(path.dirname(csvPath))).trim().replace(/^@/, '').toLowerCase();
}

// Pasta da conta: a pasta do CSV quando ela tem o nome da conta; senão resources/videos/<conta>.
function accountDir(conta, csvPath) {
  const dir = path.dirname(csvPath);
  return path.basename(dir).toLowerCase() === conta ? dir : path.join(DEFAULT_VIDEOS_DIR, conta);
}

/**
 * Baixa os `quantidade` vídeos mais curtidos do CSV.
 * Arquivo: <ordem>_<shortcode>.mp4, onde a ordem é a posição no ranking de curtidas (1 = mais curtido).
 * Erros em um vídeo são registrados e o processo segue para o próximo.
 */
export async function downloadTopVideos(csvInput, quantidade, { delayMs = 1000, log = () => {} } = {}) {
  const csvPath = await resolveCsvPath(csvInput);
  const rows = await readCsv(csvPath);
  if (!rows.length) throw new Error(`CSV vazio: ${csvPath}`);

  const header = Object.keys(rows[0]);
  if (!SHORTCODE_COLUMNS.some((c) => header.includes(c))) throw new Error('CSV sem coluna "shortcode"');
  if (!LIKE_COLUMNS.some((c) => header.includes(c)))
    throw new Error(`CSV sem coluna de curtidas (${LIKE_COLUMNS.join(', ')})`);

  const conta = identifyAccount(rows, csvPath);
  const destino = accountDir(conta, csvPath);
  await fs.mkdir(destino, { recursive: true });

  const seen = new Set();
  const ranking = rows
    .map((r) => ({ shortcode: pick(r, SHORTCODE_COLUMNS), curtidas: toNumber(pick(r, LIKE_COLUMNS)) }))
    .filter((v) => v.shortcode && !seen.has(v.shortcode) && seen.add(v.shortcode))
    .sort((a, b) => b.curtidas - a.curtidas)
    .slice(0, quantidade);

  const baixados = [];
  const ja_existiam = [];
  const erros = [];

  for (const [i, v] of ranking.entries()) {
    const ordem = i + 1;
    const arquivo = path.join(destino, `${ordem}_${v.shortcode}.mp4`);
    const item = { ordem, shortcode: v.shortcode, curtidas: v.curtidas, arquivo };

    if ((await exists(arquivo))?.size > 0) {
      ja_existiam.push(item);
      log(`${ordem}/${ranking.length} ${v.shortcode}: já existe`);
      continue;
    }
    try {
      const videoUrl = await resolveVideoUrl(v.shortcode);
      const bytes = await downloadFile(videoUrl, arquivo);
      baixados.push({ ...item, bytes });
      log(`${ordem}/${ranking.length} ${v.shortcode}: ok (${bytes} bytes)`);
    } catch (e) {
      erros.push({ ...item, erro: e.message });
      log(`${ordem}/${ranking.length} ${v.shortcode}: erro - ${e.message}`);
    }
    if (i < ranking.length - 1) await sleep(delayMs);
  }

  return {
    conta,
    csv: csvPath,
    pasta: destino,
    solicitados: quantidade,
    selecionados: ranking.length,
    baixados,
    ja_existiam,
    erros,
  };
}
