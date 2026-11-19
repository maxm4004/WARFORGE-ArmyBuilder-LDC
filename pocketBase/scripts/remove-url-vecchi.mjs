// Toglie i vecchi campi URL, sostituiti dai collegamenti ai file Dropbox:
// figura.urlmesh, base.urlmesh / diffuse / normal, texture.url, collider.url.
// Per sicurezza si ferma se un record ha ancora un URL senza il file collegato (lo perderebbe);
// --forza li toglie comunque.
// Prova:  node remove-url-vecchi.mjs
// Scrive: node remove-url-vecchi.mjs --apply
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD (superuser PocketBase).

import { api, leggiTutti, login } from "./lib/pb.mjs";

const APPLY = process.argv.includes("--apply");
const FORZA = process.argv.includes("--forza");

// Vecchio campo URL -> collegamento che lo sostituisce.
const VECCHI = {
  figura: { urlmesh: "id_mesh" },
  base: { urlmesh: "id_mesh", diffuse: "id_diffuse", normal: "id_normal" },
  texture: { url: "id_file" },
  collider: { url: "id_file" },
};

async function main() {
  await login();

  const daTogliere = {};
  const scollegati = [];
  for (const [nome, campi] of Object.entries(VECCHI)) {
    const collection = await api(`/api/collections/${nome}`);
    const presenti = Object.keys(campi).filter((c) => collection.fields.some((f) => f.name === c));
    if (presenti.length === 0) {
      console.log(`= ${nome}: gia' pulita`);
      continue;
    }
    daTogliere[nome] = collection;
    console.log(`- ${nome}: ${presenti.join(", ")}`);
    for (const r of await leggiTutti(nome)) {
      for (const c of presenti) if (r[c] && !r[campi[c]]) scollegati.push(`${nome} "${r.nome}": ${c} senza ${campi[c]}`);
    }
  }

  if (scollegati.length > 0) {
    console.log(`\nURL ancora senza file collegato (${scollegati.length}):\n  ${scollegati.join("\n  ")}`);
    if (!FORZA) {
      console.log("\nFermo: collega questi record nell'app o rilancia dropbox-import. Per togliere comunque i campi: --forza.");
      return;
    }
  }

  if (APPLY) {
    for (const [nome, collection] of Object.entries(daTogliere)) {
      const vecchi = Object.keys(VECCHI[nome]);
      await api(`/api/collections/${nome}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: collection.fields.filter((f) => !vecchi.includes(f.name)) }),
      });
    }
  }
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
