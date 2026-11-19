// Funzioni comuni per l'API di Dropbox, usate da dropbox-links e dropbox-import.
// Token: variabile d'ambiente DROPBOX_TOKEN oppure file pocketBase/dropbox-token.txt (escluso da Git).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.DROPBOX_API ?? "https://api.dropboxapi.com/2";
export const CARTELLA_PB = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE_TOKEN = join(CARTELLA_PB, "dropbox-token.txt");

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
let token = null;

function leggiToken() {
  if (process.env.DROPBOX_TOKEN) return process.env.DROPBOX_TOKEN.trim();
  if (existsSync(FILE_TOKEN)) return readFileSync(FILE_TOKEN, "utf8").trim();
  throw new Error(`Token mancante: imposta DROPBOX_TOKEN o crea ${FILE_TOKEN}.`);
}

// Chiamata all'API di Dropbox. Restituisce { ok, data }; ritenta se Dropbox chiede di rallentare (429).
async function api(percorso, body) {
  token ??= leggiToken();
  for (let tentativo = 0; ; tentativo++) {
    const resp = await fetch(`${API}${percorso}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (resp.status === 429 && tentativo < 5) {
      await attendi(1000 * Number(resp.headers.get("Retry-After") ?? 2));
      continue;
    }
    const testo = await resp.text();
    let data;
    try { data = JSON.parse(testo); } catch { data = { error_summary: testo }; }
    if (resp.status === 401) throw new Error("Token non valido o scaduto: generane uno nuovo nell'App Console.");
    if (!resp.ok && resp.status !== 409) throw new Error(`${percorso}: ${resp.status} ${data.error_summary ?? testo}`);
    return { ok: resp.ok, data };
  }
}

// Tutti i file della cartella, sottocartelle comprese (le cartelle sono escluse).
export async function elencaFile(cartella) {
  const file = [];
  let { ok, data } = await api("/files/list_folder", { path: cartella, recursive: true, limit: 2000 });
  if (!ok) throw new Error(`Cartella non trovata: ${cartella || "/"} (${data.error_summary})`);
  for (;;) {
    file.push(...data.entries.filter((e) => e[".tag"] === "file"));
    if (!data.has_more) return file;
    ({ data } = await api("/files/list_folder/continue", { cursor: data.cursor }));
  }
}

async function linkEsistente(path) {
  const { data } = await api("/sharing/list_shared_links", { path, direct_only: true });
  return data.links?.[0]?.url ?? null;
}

async function creaLink(path) {
  const { ok, data } = await api("/sharing/create_shared_link_with_settings", { path });
  if (ok) return data.url;
  // Il link esiste gia' (creato nel frattempo): Dropbox lo restituisce nell'errore.
  return data.error?.shared_link_already_exists?.metadata?.url ?? null;
}

// Link di condivisione del file; se manca lo crea solo con crea = true. null se non c'e'.
export async function linkFile(path, crea) {
  const url = await linkEsistente(path);
  if (url || !crea) return url;
  return creaLink(path);
}

// TTS deve scaricare il file, non aprire la pagina di anteprima: dl=1.
export function linkDiretto(url) {
  const u = new URL(url);
  u.searchParams.set("dl", "1");
  return u.toString();
}

// Chiave per riconoscere lo stesso file in due link diversi (ignora dl, raw, st).
export function chiaveLink(url) {
  try {
    const u = new URL(url.trim());
    const rlkey = u.searchParams.get("rlkey");
    return `${u.hostname.replace(/^www\./, "")}${decodeURIComponent(u.pathname)}${rlkey ? `?rlkey=${rlkey}` : ""}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
