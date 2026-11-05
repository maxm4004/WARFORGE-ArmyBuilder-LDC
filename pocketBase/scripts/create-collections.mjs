// Crea le collection del Censimento LDC e i dati di base. Rilanciabile: salta cio' che esiste.
// Prova:  node create-collections.mjs
// Scrive: node create-collections.mjs --apply
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD (superuser PocketBase).

const PB_URL = process.env.PB_URL ?? "http://127.0.0.1:8091";
const APPLY = process.argv.includes("--apply");
const { PB_EMAIL, PB_PASSWORD } = process.env;

const testo = (name, required = true) => ({ name, type: "text", required });
const rel = (name, collection, required = true) => ({ name, type: "relation", collection, required });
// I numeri non sono obbligatori: per PocketBase 0 conta come valore vuoto.
const numero = (name) => ({ name, type: "number", required: false });
const xyz = [testo("nome"), numero("valoreX"), numero("valoreY"), numero("valoreZ")];

// L'ordine conta: ogni relation punta a una collection gia' creata.
const COLLECTIONS = [
  { name: "esercito", fields: [testo("nome"), testo("note", false)] },
  { name: "reparto", fields: [testo("nome"), testo("note", false)] },
  { name: "tipo_reparto", fields: [rel("id_reparto", "reparto"), testo("tipo")] },
  { name: "tipo_model", fields: [testo("nome")] },
  { name: "texture", fields: [testo("url"), testo("nome"), testo("note", false), rel("id_esercito", "esercito"), rel("id_reparto", "reparto")] },
  { name: "collider", fields: [testo("url"), testo("nome"), testo("note", false)] },
  { name: "offset", fields: xyz },
  { name: "scale", fields: xyz },
  { name: "rotation", fields: xyz },
  {
    name: "unita",
    fields: [
      testo("nome"),
      rel("id_esercito", "esercito"),
      rel("id_reparto", "reparto"),
      rel("id_tipo_reparto", "tipo_reparto"),
      rel("id_tipo_model", "tipo_model"),
      testo("urlmesh"),
      rel("id_texture", "texture", false),
      rel("id_collider", "collider", false),
      rel("id_offset", "offset"),
      rel("id_scale", "scale"),
      rel("id_rotation", "rotation"),
    ],
  },
];

const BASE = {
  esercito: ["Francese", "Inglese", "Austriaco", "Russo", "Prussiano"].map((nome) => ({ nome })),
  reparto: ["Fanteria", "Cavalleria", "Artiglieria"].map((nome) => ({ nome })),
  tipo_model: ["custom-model", "asset-bundle"].map((nome) => ({ nome })),
};
const TIPI = {
  Fanteria: ["Linea", "Leggera"],
  Cavalleria: ["Pesante", "Media"],
  Artiglieria: ["A piedi", "A cavallo"],
};

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
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });

async function lista(name) {
  const data = await api(`/api/collections/${name}/records?perPage=500`);
  return data.items;
}

async function creaCollection(def, esistenti) {
  if (esistenti.has(def.name)) return console.log(`= ${def.name}: esiste gia'`);
  console.log(`+ ${def.name}`);
  if (!APPLY) return;
  const fields = def.fields.map(({ collection, ...f }) =>
    collection ? { ...f, collectionId: esistenti.get(collection), maxSelect: 1, cascadeDelete: false } : f
  );
  const creata = await post("/api/collections", {
    name: def.name, type: "base", fields,
    listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
  });
  esistenti.set(def.name, creata.id);
}

async function creaRecord(name, record, trovati, chiave) {
  if (trovati.some((r) => r[chiave] === record[chiave])) return;
  console.log(`+ ${name}: ${record[chiave]}`);
  if (APPLY) trovati.push(await post(`/api/collections/${name}/records`, record));
}

async function main() {
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("Imposta PB_EMAIL e PB_PASSWORD.");
  const auth = await post("/api/collections/_superusers/auth-with-password", {
    identity: PB_EMAIL, password: PB_PASSWORD,
  });
  token = auth.token;

  const { items } = await api("/api/collections?perPage=500");
  const esistenti = new Map(items.map((c) => [c.name, c.id]));
  for (const def of COLLECTIONS) await creaCollection(def, esistenti);

  if (!COLLECTIONS.every((c) => esistenti.has(c.name))) {
    console.log("\nProva completata: i dati di base si vedono dopo --apply.");
    return;
  }

  for (const [name, righe] of Object.entries(BASE)) {
    const trovati = await lista(name);
    for (const riga of righe) await creaRecord(name, riga, trovati, "nome");
  }
  const reparti = await lista("reparto");
  const tipi = await lista("tipo_reparto");
  for (const [nome, elenco] of Object.entries(TIPI)) {
    const reparto = reparti.find((r) => r.nome === nome);
    if (!reparto) continue;
    const delReparto = tipi.filter((t) => t.id_reparto === reparto.id);
    for (const tipo of elenco) await creaRecord("tipo_reparto", { id_reparto: reparto.id, tipo }, delReparto, "tipo");
  }
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
