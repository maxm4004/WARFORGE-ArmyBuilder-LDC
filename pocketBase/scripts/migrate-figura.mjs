// Rinomina unita in figura e toglie id_offset, id_scale e id_rotation.
// Le nuove tabelle si creano dopo, con create-collections.
// ATTENZIONE: i valori dei tre campi tolti vanno persi.
// Prova:  node migrate-figura.mjs
// Scrive: node migrate-figura.mjs --apply
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD (superuser PocketBase).

const PB_URL = process.env.PB_URL ?? "http://127.0.0.1:8091";
const APPLY = process.argv.includes("--apply");
const { PB_EMAIL, PB_PASSWORD } = process.env;
const DA_TOGLIERE = ["id_offset", "id_scale", "id_rotation"];

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

async function main() {
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("Imposta PB_EMAIL e PB_PASSWORD.");
  const auth = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  token = auth.token;

  const { items } = await api("/api/collections?perPage=500");
  if (items.some((c) => c.name === "figura")) return console.log("= figura: migrazione gia' fatta");
  const unita = items.find((c) => c.name === "unita");
  if (!unita) throw new Error("Collection unita non trovata.");

  const { totalItems } = await api("/api/collections/unita/records?perPage=1");
  console.log(`+ unita -> figura (${totalItems} righe), tolgo ${DA_TOGLIERE.join(", ")}`);
  if (!APPLY) return console.log("\nProva completata: nessuna scrittura. Usa --apply.");

  await api(`/api/collections/${unita.id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: "figura", fields: unita.fields.filter((f) => !DA_TOGLIERE.includes(f.name)) }),
  });
  console.log("\nFatto.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
