// Crea la collection base (mesh della basetta) e aggiunge id_base a fpb. Rilanciabile: salta cio' che esiste.
// Prova:  node add-base.mjs
// Scrive: node add-base.mjs --apply
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

const testo = (name, required = true) => ({ name, type: "text", required });
const relazione = (name, collectionId, required) => ({ name, type: "relation", collectionId, maxSelect: 1, required, cascadeDelete: false });

async function main() {
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("Imposta PB_EMAIL e PB_PASSWORD.");
  const auth = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  token = auth.token;

  const { items } = await api("/api/collections?perPage=500");
  const id = (nome) => items.find((c) => c.name === nome)?.id;

  let baseId = id("base");
  if (baseId) console.log("= base: esiste gia'");
  else {
    console.log("+ base");
    if (APPLY) {
      const creata = await api("/api/collections", {
        method: "POST",
        body: JSON.stringify({
          name: "base", type: "base",
          fields: [testo("nome"), testo("urlmesh"), testo("diffuse"), testo("normal", false), relazione("id_collider", id("collider"), false)],
          listRule: "", viewRule: "", createRule: "", updateRule: "", deleteRule: "",
        }),
      });
      baseId = creata.id;
    }
  }

  const fpb = await api("/api/collections/fpb");
  if (fpb.fields.some((f) => f.name === "id_base")) console.log("= fpb: id_base esiste gia'");
  else {
    console.log("+ fpb: id_base");
    if (APPLY) {
      await api("/api/collections/fpb", {
        method: "PATCH",
        body: JSON.stringify({ fields: [...fpb.fields, relazione("id_base", baseId, true)] }),
      });
    }
  }
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
