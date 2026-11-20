// Sposta i collegamenti dai file Dropbox "non trovato" al file presente con lo stesso nome ed estensione
// (succede quando un file viene ricaricato o copiato: Dropbox gli da' un id nuovo e l'import crea una riga nuova).
// Copia anche esercito, reparto e tipo reparto sulla riga nuova, se li' sono vuoti.
// Le righe "non trovato" restano: non vengono cancellate.
// Se ci sono piu' file presenti con lo stesso nome, sceglie quello con stessa categoria, esercito e reparto;
// se resta ambiguo lo segnala e non tocca niente.
// Prova:  node relink-dropbox.mjs
// Scrive: node relink-dropbox.mjs --apply
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD (superuser PocketBase).

import { aggiorna, leggiTutti, login } from "./lib/pb.mjs";

const APPLY = process.argv.includes("--apply");

// collection -> campi che puntano a dropbox_file
const COLLEGAMENTI = {
  figura: ["id_mesh"],
  base: ["id_mesh", "id_diffuse", "id_normal"],
  texture: ["id_file"],
  collider: ["id_file"],
};
const COPIATI = ["id_esercito", "id_reparto", "id_tipo_reparto"];

const chiave = (f) => `${f.nome}.${f.estensione}`.toLowerCase();

function scegli(vecchio, candidati) {
  if (candidati.length <= 1) return candidati[0] ?? null;
  const stessi = (campi) => candidati.filter((c) => campi.every((k) => !vecchio[k] || c[k] === vecchio[k]));
  for (const campi of [["categoria", "id_esercito", "id_reparto"], ["categoria"]]) {
    const filtrati = stessi(campi);
    if (filtrati.length === 1) return filtrati[0];
  }
  return null;
}

async function main() {
  await login();
  const file = await leggiTutti("dropbox_file");
  const presenti = new Map();
  for (const f of file.filter((f) => f.trovato)) presenti.set(chiave(f), [...(presenti.get(chiave(f)) ?? []), f]);

  // id vecchio -> file nuovo
  const sostituti = new Map();
  const senzaSostituto = [];
  const ambigui = [];
  for (const vecchio of file.filter((f) => !f.trovato)) {
    const candidati = presenti.get(chiave(vecchio)) ?? [];
    const nuovo = scegli(vecchio, candidati);
    if (nuovo) sostituti.set(vecchio.id, { vecchio, nuovo });
    else if (candidati.length) ambigui.push(`${vecchio.percorso} (${candidati.length} file con lo stesso nome)`);
    else senzaSostituto.push(vecchio.percorso);
  }

  let copiati = 0;
  for (const { vecchio, nuovo } of sostituti.values()) {
    const patch = Object.fromEntries(COPIATI.filter((k) => vecchio[k] && !nuovo[k]).map((k) => [k, vecchio[k]]));
    if (Object.keys(patch).length === 0) continue;
    copiati++;
    Object.assign(nuovo, patch);
    if (APPLY) await aggiorna("dropbox_file", nuovo.id, patch);
  }

  const spostati = [];
  for (const [collection, campi] of Object.entries(COLLEGAMENTI)) {
    for (const r of await leggiTutti(collection)) {
      const patch = {};
      for (const campo of campi) {
        const s = sostituti.get(r[campo]);
        if (!s) continue;
        patch[campo] = s.nuovo.id;
        spostati.push(`${collection} "${r.nome}" ${campo}: ${s.vecchio.percorso} -> ${s.nuovo.percorso}`);
      }
      if (APPLY && Object.keys(patch).length) await aggiorna(collection, r.id, patch);
    }
  }

  console.log(`File non trovati: ${file.filter((f) => !f.trovato).length} · con un sostituto: ${sostituti.size}`);
  console.log(`Righe nuove completate con esercito, reparto o tipo reparto: ${copiati}`);
  console.log(`Collegamenti spostati: ${spostati.length}${spostati.length ? `\n  ${spostati.join("\n  ")}` : ""}`);
  if (ambigui.length) console.log(`Ambigui, da collegare a mano:\n  ${ambigui.join("\n  ")}`);
  if (senzaSostituto.length) console.log(`Senza un file presente con lo stesso nome:\n  ${senzaSostituto.join("\n  ")}`);
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
