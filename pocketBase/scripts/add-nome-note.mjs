// Aggiunge nome e note a texture e collider. Rilanciabile: salta cio' che esiste.
// Prova:  node add-nome-note.mjs
// Scrive: node add-nome-note.mjs --apply
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

async function aggiorna(nome) {
  const collection = await api(`/api/collections/${nome}`);
  const nuovi = [
    { name: "nome", type: "text", required: true },
    { name: "note", type: "text", required: false },
  ].filter((f) => !collection.fields.some((c) => c.name === f.name));

  if (nuovi.length === 0) return console.log(`= ${nome}: gia' aggiornata`);
  console.log(`+ ${nome}: ${nuovi.map((f) => f.name).join(", ")}`);
  if (!APPLY) return;
  await api(`/api/collections/${nome}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: [...collection.fields, ...nuovi] }),
  });
}

async function main() {
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("Imposta PB_EMAIL e PB_PASSWORD.");
  const auth = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  token = auth.token;
  for (const nome of ["texture", "collider"]) await aggiorna(nome);
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });