// Elenca i file di una cartella Dropbox (sottocartelle comprese) con il loro link di download diretto (dl=1).
// Prova:  node dropbox-links.mjs --cartella=/Warforge/LDC            legge solo i link gia' esistenti
// Scrive: node dropbox-links.mjs --cartella=/Warforge/LDC --apply    crea anche i link che mancano
// Token: variabile d'ambiente DROPBOX_TOKEN oppure file pocketBase/dropbox-token.txt (escluso da Git).
// Risultato: pocketBase/dropbox-links.csv (separatore ;), apribile con Excel.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARTELLA_PB, elencaFile, linkDiretto, linkFile } from "./lib/dropbox.mjs";

const APPLY = process.argv.includes("--apply");
const FILE_CSV = join(CARTELLA_PB, "dropbox-links.csv");
const argomento = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
const csv = (valore) => (/[";\n]/.test(valore) ? `"${valore.replaceAll('"', '""')}"` : valore);

async function main() {
  const cartella = argomento("cartella") ?? process.env.DROPBOX_CARTELLA ?? "";
  if (cartella && !cartella.startsWith("/")) throw new Error("La cartella deve iniziare con / (es. /Warforge/LDC).");

  const file = await elencaFile(cartella);
  console.log(`File trovati in "${cartella || "/"}": ${file.length}`);

  const righe = [];
  let mancanti = 0;
  for (const f of file) {
    const url = await linkFile(f.path_lower, APPLY);
    if (!url) mancanti++;
    righe.push([f.path_display, f.name, url ? linkDiretto(url) : ""]);
  }

  righe.sort((a, b) => a[0].localeCompare(b[0]));
  const testo = ["percorso;nome;url", ...righe.map((r) => r.map(csv).join(";"))].join("\r\n");
  writeFileSync(FILE_CSV, "﻿" + testo + "\r\n", "utf8");

  console.log(`File senza link: ${mancanti}`);
  if (mancanti > 0 && !APPLY) console.log("Prova: i link mancanti non sono stati creati. Usa --apply.");
  console.log(`Scritto ${FILE_CSV}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
