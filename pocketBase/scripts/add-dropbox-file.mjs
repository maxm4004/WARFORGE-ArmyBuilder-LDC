// Crea la staging dropbox_file e collega Figura, Base, Texture e Collider ai suoi file.
// - dropbox_file: un record per ogni file di Dropbox (lo riempie dropbox-import).
// - dropbox_file.id_tipo_reparto: si compila a mano dalla scheda File Dropbox.
// - esercito, reparto: campo cartella = nome della cartella su Dropbox (es. French, infantry).
// - figura.id_mesh, base.id_mesh / id_diffuse / id_normal, texture.id_file, collider.id_file.
// I vecchi campi URL restano con i loro valori ma non sono piu' obbligatori:
// dropbox-import li usa per collegare i record ai file.
// Prova:  node add-dropbox-file.mjs
// Scrive: node add-dropbox-file.mjs --apply
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD (superuser PocketBase).

import { api, login } from "./lib/pb.mjs";

const APPLY = process.argv.includes("--apply");

const testo = (name, required = false) => ({ name, type: "text", required });
const relazione = (name, collectionId) => ({ name, type: "relation", collectionId, maxSelect: 1, required: false, cascadeDelete: false });

async function main() {
  await login();
  const { items } = await api("/api/collections?perPage=500");
  const id = (nome) => items.find((c) => c.name === nome)?.id;

  let fileId = id("dropbox_file");
  if (fileId) console.log("= dropbox_file: esiste gia'");
  else {
    console.log("+ dropbox_file");
    if (APPLY) {
      const creata = await api("/api/collections", {
        method: "POST",
        body: JSON.stringify({
          name: "dropbox_file", type: "base",
          fields: [
            testo("id_dropbox", true), testo("percorso", true), testo("nome", true), testo("estensione"), testo("categoria"),
            testo("cartella_esercito"), testo("cartella_reparto"),
            relazione("id_esercito", id("esercito")), relazione("id_reparto", id("reparto")),
            testo("url"), { name: "modificato", type: "date", required: false }, { name: "trovato", type: "bool", required: false },
          ],
          indexes: ["CREATE UNIQUE INDEX idx_dropbox_file_id ON dropbox_file (id_dropbox)"],
          listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
        }),
      });
      fileId = creata.id;
    }
  }

  // collection -> { campi nuovi, vecchi campi da rendere facoltativi }
  const MODIFICHE = {
    dropbox_file: { nuovi: [relazione("id_tipo_reparto", id("tipo_reparto"))], facoltativi: [] },
    esercito: { nuovi: [testo("cartella")], facoltativi: [] },
    reparto: { nuovi: [testo("cartella")], facoltativi: [] },
    figura: { nuovi: [relazione("id_mesh", fileId)], facoltativi: ["urlmesh"] },
    base: { nuovi: ["id_mesh", "id_diffuse", "id_normal"].map((n) => relazione(n, fileId)), facoltativi: ["urlmesh", "diffuse"] },
    texture: { nuovi: [relazione("id_file", fileId)], facoltativi: ["url"] },
    collider: { nuovi: [relazione("id_file", fileId)], facoltativi: ["url"] },
  };

  for (const [nome, { nuovi, facoltativi }] of Object.entries(MODIFICHE)) {
    if (nome === "dropbox_file" && !fileId) continue; // prova: la collection non e' ancora stata creata
    const collection = await api(`/api/collections/${nome}`);
    const daAggiungere = nuovi.filter((f) => !collection.fields.some((c) => c.name === f.name));
    const daAllentare = collection.fields.filter((f) => facoltativi.includes(f.name) && f.required);
    if (daAggiungere.length === 0 && daAllentare.length === 0) {
      console.log(`= ${nome}: gia' aggiornata`);
      continue;
    }
    const note = [...daAggiungere.map((f) => `+${f.name}`), ...daAllentare.map((f) => `${f.name} facoltativo`)];
    console.log(`+ ${nome}: ${note.join(", ")}`);
    if (!APPLY) continue;
    const fields = collection.fields.map((f) => (facoltativi.includes(f.name) ? { ...f, required: false } : f));
    await api(`/api/collections/${nome}`, { method: "PATCH", body: JSON.stringify({ fields: [...fields, ...daAggiungere] }) });
  }
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
