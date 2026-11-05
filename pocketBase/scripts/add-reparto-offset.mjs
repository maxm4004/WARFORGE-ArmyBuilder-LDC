// Aggiunge id_reparto e id_tipo_reparto a offset. Rilanciabile: salta cio' che esiste.
// Prova:  node add-reparto-offset.mjs
// Scrive: node add-reparto-offset.mjs --apply
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD (superuser PocketBase).

const PB_URL = process.env.PB_URL ?? "http://127.0.0.1:8091";
const APPLY = process.argv.includes("--apply");
const { PB_EMAIL, PB_PASSWORD } = process.env;

let token = "";

async function api(path, options = {}) {
  const resp = await fetch(`${PB_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: token },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`${options.method ?? "GET"} ${path}: ${resp.status} ${JSON.stringify(data)}`);
  return data;
}

async function relation(name, collection) {
  const { id } = await api(`/api/collections/${collection}`);
  return { name, type: "relation", collectionId: id, maxSelect: 1, required: true, cascadeDelete: false };
}

async function main() {
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("Imposta PB_EMAIL e PB_PASSWORD.");
  const auth = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  token = auth.token;

  const offset = await api("/api/collections/offset");
  const nuovi = [await relation("id_reparto", "reparto"), await relation("id_tipo_reparto", "tipo_reparto")]
    .filter((f) => !offset.fields.some((c) => c.name === f.name));

  if (nuovi.length === 0) console.log("= offset: gia' aggiornata");
  else console.log(`+ offset: ${nuovi.map((f) => f.name).join(", ")}`);

  if (APPLY && nuovi.length > 0) {
    await api("/api/collections/offset", {
      method: "PATCH",
      body: JSON.stringify({ fields: [...offset.fields, ...nuovi] }),
    });
  }
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
