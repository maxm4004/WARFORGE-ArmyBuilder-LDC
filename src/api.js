// Unico punto che parla con PocketBase.
const PB_URL = 'http://127.0.0.1:8091'

async function richiesta(path, options) {
  const resp = await fetch(`${PB_URL}/api/collections/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  })
  if (resp.status === 204) return null
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const campi = Object.entries(data.data ?? {}).map(([k, v]) => `${k}: ${v.message}`)
    throw new Error(campi.join(' · ') || data.message || `Errore ${resp.status}`)
  }
  return data
}

export async function leggiTutti(tabella) {
  const righe = []
  for (let page = 1; ; page++) {
    const data = await richiesta(`${tabella}/records?perPage=500&page=${page}`)
    righe.push(...data.items)
    if (page >= data.totalPages) return righe
  }
}

export async function contaUsi(tabella, campo, id) {
  const filtro = encodeURIComponent(`${campo}="${id}"`)
  const data = await richiesta(`${tabella}/records?perPage=1&filter=${filtro}`)
  return data.totalItems
}

export const crea = (tabella, record) =>
  richiesta(`${tabella}/records`, { method: 'POST', body: JSON.stringify(record) })

export const aggiorna = (tabella, id, record) =>
  richiesta(`${tabella}/records/${id}`, { method: 'PATCH', body: JSON.stringify(record) })

export const elimina = (tabella, id) =>
  richiesta(`${tabella}/records/${id}`, { method: 'DELETE' })
