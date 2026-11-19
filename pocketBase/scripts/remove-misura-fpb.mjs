// Toglie il campo misura da fpb: la misura ora la da' la Base collegata.
// ATTENZIONE: i valori di misura gia' inseriti vanno persi.
// Prova:  node remove-misura-fpb.mjs
// Scrive: node remove-misura-fpb.mjs --apply
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

async function main() {
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("Imposta PB_EMAIL e PB_PASSWORD.");
  const auth = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  token = auth.token;

  const fpb = await api("/api/collections/fpb");
  if (!fpb.fields.some((f) => f.name === "misura")) return console.log("= fpb: misura gia' tolta");
  console.log("- fpb: misura");
  if (APPLY) {
    await api("/api/collections/fpb", {
      method: "PATCH",
      body: JSON.stringify({ fields: fpb.fields.filter((f) => f.name !== "misura") }),
    });
  }
  console.log(APPLY ? "\nFatto." : "\nProva completata: nessuna scrittura. Usa --apply.");
}

main().catch((err) => { console.error(err.message); process.exit(1); });
