// Importa in dropbox_file l'elenco dei file di una cartella Dropbox, con il loro link diretto (dl=1).
// Il percorso .../{esercito}/{reparto}/{mesh|texture|collider}/... da' esercito, reparto e categoria;
// esercito e reparto si abbinano tramite il campo cartella di Esercito e Reparto.
// - file gia' importato (stesso id Dropbox): aggiornato; file nuovo: aggiunto;
// - esercito e reparto gia' compilati (anche a mano) non vengono sovrascritti; il tipo reparto si compila solo a mano;
// - file della cartella non piu' su Dropbox: segnato come non trovato (non viene cancellato);
// - Figura, Base, Texture e Collider senza file collegato: collegati se il vecchio URL coincide con quello del file.
// Prova:  node dropbox-import.mjs --cartella=/Armies/model            nessuna scrittura
// Scrive: node dropbox-import.mjs --cartella=/Armies/model --apply    crea anche i link Dropbox che mancano
// Credenziali: PB_EMAIL e PB_PASSWORD (superuser PocketBase); token Dropbox come per dropbox-links.

import { chiaveLink, elencaFile, linkDiretto, linkFile } from "./lib/dropbox.mjs";
import { aggiorna, crea, leggiTutti, login } from "./lib/pb.mjs";

const APPLY = process.argv.includes("--apply");
const CATEGORIE = ["mesh", "texture", "collider"];
const argomento = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);

// Vecchio campo URL -> nuovo collegamento al file, per ogni collection.
const COLLEGAMENTI = {
  figura: { urlmesh: "id_mesh" },
  base: { urlmesh: "id_mesh", diffuse: "id_diffuse", normal: "id_normal" },
  texture: { url: "id_file" },
  collider: { url: "id_file" },
};

function analizza(percorso) {
  const parti = percorso.split("/").filter(Boolean);
  const nomeFile = parti.at(-1);
  const punto = nomeFile.lastIndexOf(".");
  const i = parti.findIndex((p, idx) => idx < parti.length - 1 && CATEGORIE.includes(p.toLowerCase()));
  return {
    nome: punto > 0 ? nomeFile.slice(0, punto) : nomeFile,
    estensione: punto > 0 ? nomeFile.slice(punto + 1).toLowerCase() : "",
    categoria: i >= 0 ? parti[i].toLowerCase() : "",
    cartella_esercito: i >= 2 ? parti[i - 2] : "",
    cartella_reparto: i >= 1 ? parti[i - 1] : "",
  };
}

const cambiato = (vecchio, nuovo) => Object.entries(nuovo).some(([k, v]) => (k === "modificato" ? new Date(vecchio[k]).getTime() !== new Date(v).getTime() : vecchio[k] !== v));

async function main() {
  const cartella = argomento("cartella") ?? process.env.DROPBOX_CARTELLA ?? "";
  if (cartella && !cartella.startsWith("/")) throw new Error("La cartella deve iniziare con / (es. /Armies/model).");
  await login();

  const perCartella = (righe) => new Map(righe.filter((r) => r.cartella).map((r) => [r.cartella.toLowerCase(), r.id]));
  const eserciti = perCartella(await leggiTutti("esercito"));
  const reparti = perCartella(await leggiTutti("reparto"));
  const staging = await leggiTutti("dropbox_file");
  const perId = new Map(staging.map((r) => [r.id_dropbox, r]));

  const file = await elencaFile(cartella);
  console.log(`File trovati in "${cartella || "/"}": ${file.length}`);

  const conta = { nuovi: 0, aggiornati: 0, uguali: 0, senzaLink: 0, nonTrovati: 0 };
  const nonAbbinate = new Set();
  const visti = new Set();
  for (const f of file) {
    visti.add(f.id);
    const url = await linkFile(f.path_lower, APPLY);
    const dati = analizza(f.path_display);
    const record = {
      id_dropbox: f.id,
      percorso: f.path_display,
      ...dati,
      id_esercito: eserciti.get(dati.cartella_esercito.toLowerCase()) ?? "",
      id_reparto: reparti.get(dati.cartella_reparto.toLowerCase()) ?? "",
      url: url ? linkDiretto(url) : "",
      modificato: f.server_modified,
      trovato: true,
    };
    const esistente = perId.get(f.id);
    if (esistente?.id_esercito) record.id_esercito = esistente.id_esercito;
    if (esistente?.id_reparto) record.id_reparto = esistente.id_reparto;
    if (!url) conta.senzaLink++;
    if (dati.cartella_esercito && !record.id_esercito) nonAbbinate.add(`esercito "${dati.cartella_esercito}"`);
    if (dati.cartella_reparto && !record.id_reparto) nonAbbinate.add(`reparto "${dati.cartella_reparto}"`);

    if (!esistente) {
      conta.nuovi++;
      if (APPLY) staging.push(await crea("dropbox_file", record));
    } else if (cambiato(esistente, record)) {
      conta.aggiornati++;
      if (APPLY) Object.assign(esistente, await aggiorna("dropbox_file", esistente.id, record));
    } else conta.uguali++;
  }

  // Solo i file dentro la cartella importata: importare una sottocartella non tocca gli altri.
  const prefisso = cartella ? `${cartella.toLowerCase()}/` : "/";
  for (const r of staging) {
    if (r.trovato && !visti.has(r.id_dropbox) && r.percorso.toLowerCase().startsWith(prefisso)) {
      conta.nonTrovati++;
      if (APPLY) Object.assign(r, await aggiorna("dropbox_file", r.id, { trovato: false }));
    }
  }

  console.log(`Nuovi: ${conta.nuovi} · aggiornati: ${conta.aggiornati} · invariati: ${conta.uguali} · segnati non trovati: ${conta.nonTrovati}`);
  if (conta.senzaLink > 0) console.log(`File senza link Dropbox: ${conta.senzaLink}${APPLY ? "" : " (con --apply vengono creati)"}`);
  if (nonAbbinate.size > 0) console.log(`Cartelle senza corrispondenza (compila il campo Cartella): ${[...nonAbbinate].join(", ")}`);

  const perLink = new Map(staging.filter((r) => r.url).map((r) => [chiaveLink(r.url), r.id]));
  for (const [collection, campi] of Object.entries(COLLEGAMENTI)) {
    let collegati = 0;
    const mancanti = [];
    for (const r of await leggiTutti(collection)) {
      const patch = {};
      for (const [vecchio, nuovo] of Object.entries(campi)) {
        if (r[nuovo] || !r[vecchio]) continue;
        const idFile = perLink.get(chiaveLink(r[vecchio]));
        if (idFile) patch[nuovo] = idFile;
        else mancanti.push(`${r.nome} (${vecchio})`);
      }
      if (Object.keys(patch).length === 0) continue;
      collegati += Object.keys(patch).length;
      if (APPLY) await aggiorna(collection, r.id, patch);
    }
    if (collegati || mancanti.length) {
      console.log(`${collection}: collegati ${collegati}${mancanti.length ? ` · URL senza file corrispondente: ${mancanti.join(", ")}` : ""}`);
    }
  }
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
