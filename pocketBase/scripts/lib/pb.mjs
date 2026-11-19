// Accesso a PocketBase come superuser, per gli script.
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD.

const PB_URL = process.env.PB_URL ?? "http://127.0.0.1:8091";
let token = "";

export async function api(path, options = {}) {
  const resp = await fetch(`${PB_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: token },
  });
  if (resp.status === 204) return null;
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`${options.method ?? "GET"} ${path}: ${resp.status} ${JSON.stringify(data)}`);
  return data;
}

export async function login() {
  const { PB_EMAIL, PB_PASSWORD } = process.env;
  if (!PB_EMAIL || !PB_PASSWORD) throw new Error("Imposta PB_EMAIL e PB_PASSWORD.");
  const auth = await api("/api/collections/_superusers/auth-with-password", {
    method: "POST",
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  token = auth.token;
}

export async function leggiTutti(collection) {
  const righe = [];
  for (let page = 1; ; page++) {
    const data = await api(`/api/collections/${collection}/records?perPage=500&page=${page}`);
    righe.push(...data.items);
    if (page >= data.totalPages) return righe;
  }
}

export const crea = (collection, record) =>
  api(`/api/collections/${collection}/records`, { method: "POST", body: JSON.stringify(record) });

export const aggiorna = (collection, id, record) =>
  api(`/api/collections/${collection}/records/${id}`, { method: "PATCH", body: JSON.stringify(record) });
