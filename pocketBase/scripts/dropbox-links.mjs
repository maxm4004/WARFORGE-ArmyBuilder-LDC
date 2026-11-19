// Elenca i file di una cartella Dropbox (sottocartelle comprese) con il loro link di download diretto (dl=1).
// Prova:  node dropbox-links.mjs --cartella=/Warforge/LDC            legge solo i link gia' esistenti
// Scrive: node dropbox-links.mjs --cartella=/Warforge/LDC --apply    crea anche i link che mancano
// Token: variabile d'ambiente DROPBOX_TOKEN oppure file pocketBase/dropbox-token.txt (escluso da Git).
// Risultato: pocketBase/dropbox-links.csv (separatore ;), apribile con Excel.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.DROPBOX_API ?? "https://api.dropboxapi.com/2";
const APPLY = process.argv.includes("--apply");
const CARTELLA_PB = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_TOKEN = join(CARTELLA_PB, "dropbox-token.txt");
const FILE_CSV = join(CARTELLA_PB, "dropbox-links.csv");

const argomento = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

function leggiToken() {
  if (process.env.DROPBOX_TOKEN) return process.env.DROPBOX_TOKEN.trim();
  if (existsSync(FILE_TOKEN)) return readFileSync(FILE_TOKEN, "utf8").trim();
  throw new Error(`Token mancante: imposta DROPBOX_TOKEN o crea ${FILE_TOKEN}.`);
}

let token = "";

// Chiamata all'API di Dropbox. Restituisce { ok, data }; ritenta se Dropbox chiede di rallentare (429).
async function api(percorso, body) {
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

async function elencaFile(cartella) {
  const file = [];
  let { ok, data } = await api("/files/list_folder", { path: cartella, recursive: true, limit: 2000 });
  if (!ok) throw new Error(`Cartella non trovata: ${cartella} (${data.error_summary})`);
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

// TTS deve scaricare il file, non aprire la pagina di anteprima: dl=1.
function linkDiretto(url) {
  const u = new URL(url);
  u.searchParams.set("dl", "1");
  return u.toString();
}

const csv = (valore) => (/[";\n]/.test(valore) ? `"${valore.replaceAll('"', '""')}"` : valore);

async function main() {
  token = leggiToken();
  const cartella = argomento("cartella") ?? process.env.DROPBOX_CARTELLA ?? "";
  if (cartella && !cartella.startsWith("/")) throw new Error("La cartella deve iniziare con / (es. /Warforge/LDC).");

  const file = await elencaFile(cartella);
  console.log(`File trovati in "${cartella || "/"}": ${file.length}`);

  const righe = [];
  let creati = 0;
  let mancanti = 0;
  for (const f of file) {
    let url = await linkEsistente(f.path_lower);
    if (!url && APPLY) {
      url = await creaLink(f.path_lower);
      if (url) creati++;
    }
    if (!url) mancanti++;
    righe.push([f.path_display, f.name, url ? linkDiretto(url) : ""]);
  }

  righe.sort((a, b) => a[0].localeCompare(b[0]));
  const testo = ["percorso;nome;url", ...righe.map((r) => r.map(csv).join(";"))].join("\r\n");
  writeFileSync(FILE_CSV, "﻿" + testo + "\r\n", "utf8");

  console.log(`Link creati: ${creati} · senza link: ${mancanti}`);
  if (mancanti > 0 && !APPLY) console.log("Prova: i link mancanti non sono stati creati. Usa --apply.");
  console.log(`Scritto ${FILE_CSV}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
