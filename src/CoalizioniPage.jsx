import { useState } from 'react'
import { aggiorna, crea, elimina } from './api.js'
import Modulo from './Modulo.jsx'
import { MORALE, TABELLE, VALORE_GENERALE } from './tabelle.js'

// Livelli dell'albero: ogni livello conosce il campo che lo lega al padre.
const LIVELLI = {
  coalizione: { padre: null, figlio: 'comando', nuovo: '+ Comando' },
  comando: { padre: 'id_coalizione', figlio: 'brigata', nuovo: '+ Brigata' },
  brigata: { padre: 'id_comando', figlio: 'schierata', nuovo: '+ Unità' },
  schierata: { padre: 'id_brigata', figlio: null },
}

const tabella = (id) => {
  const t = TABELLE.find((x) => x.id === id)
  return { ...t, campi: t.campi.filter((c) => c.nome !== LIVELLI[id].padre) }
}
const label = (elenco, valore) => elenco.find((x) => x.valore === valore)?.label ?? ''

export default function CoalizioniPage({ dati, carica, onAvviso }) {
  // aperto = modulo visibile: { tab, record } per modificare, { tab, padreId } per aggiungere.
  const [aperto, setAperto] = useState(null)

  const figli = (tab, padreId) => (dati[tab] ?? []).filter((r) => r[LIVELLI[tab].padre] === padreId)
  const basiUnita = (s) => {
    const unita = (dati.unita ?? []).find((u) => u.id === s.id_unita)
    return (dati.bpu ?? []).find((b) => b.id === unita?.id_bpu)?.basi ?? 0
  }
  const basi = (tab, record) => {
    if (tab === 'schierata') return basiUnita(record)
    const figlio = LIVELLI[tab].figlio
    return figli(figlio, record.id).reduce((somma, r) => somma + basi(figlio, r), 0)
  }

  async function salva(valori) {
    const { tab, record, padreId } = aperto
    try {
      if (record) await aggiorna(tab, record.id, valori)
      else await crea(tab, LIVELLI[tab].padre ? { ...valori, [LIVELLI[tab].padre]: padreId } : valori)
      await carica()
      setAperto(null)
      onAvviso('')
    } catch (err) {
      onAvviso(err.message)
    }
  }

  async function rimuovi(tab, record) {
    const contenuto = LIVELLI[tab].figlio ? ' e tutto ciò che contiene' : ''
    if (!window.confirm(`Eliminare "${record.nome}"${contenuto}?`)) return
    try {
      await elimina(tab, record.id)
      await carica()
      setAperto(null)
      onAvviso('')
    } catch (err) {
      onAvviso(err.message)
    }
  }

  const modulo = (tab, record = null) => (
    <Modulo key={`${tab}-${record?.id ?? 'nuovo'}`} tabella={tabella(tab)} record={record} dati={dati} onSalva={salva} onAnnulla={() => setAperto(null)} annullabile />
  )
  const moduloNuovo = (tab, padreId) =>
    aperto?.tab === tab && !aperto.record && aperto.padreId === padreId && (
      <div className="nuovo">{modulo(tab)}</div>
    )

  function descrizione(tab, r) {
    if (tab === 'coalizione') return `${r.lato} · ${basi(tab, r)} basi`
    if (tab === 'comando') return `${r.comandante} (${label(VALORE_GENERALE, r.valore)}) · ${basi(tab, r)} basi`
    if (tab === 'brigata') {
      const generale = r.generale ? `${r.generale} (${label(VALORE_GENERALE, r.valore)})` : 'senza generale'
      return `${generale} · ${basi(tab, r)} basi`
    }
    const unita = (dati.unita ?? []).find((u) => u.id === r.id_unita)
    return `${unita?.nome ?? '?'} · ${basiUnita(r)} basi · ${label(MORALE, r.morale)} · ${r.arma}`
  }

  function nodo(tab, r) {
    const { figlio, nuovo } = LIVELLI[tab]
    const inModifica = aperto?.tab === tab && aperto.record?.id === r.id
    return (
      <div key={r.id} className={`nodo nodo-${tab}`}>
        {inModifica ? modulo(tab, r) : (
          <div className="riga">
            <span className="nome">{r.nome}</span>
            <span className="info">{descrizione(tab, r)}</span>
            <span className="azioni">
              <button onClick={() => setAperto({ tab, record: r })}>Modifica</button>
              <button onClick={() => rimuovi(tab, r)}>Elimina</button>
              {figlio && <button onClick={() => setAperto({ tab: figlio, padreId: r.id })}>{nuovo}</button>}
            </span>
          </div>
        )}
        {figlio && (
          <div className="figli">
            {figli(figlio, r.id).map((f) => nodo(figlio, f))}
            {moduloNuovo(figlio, r.id)}
          </div>
        )}
      </div>
    )
  }

  const coalizioni = [...(dati.coalizione ?? [])].sort((a, b) => a.lato.localeCompare(b.lato))
  return (
    <div className="albero">
      <div className="azioni"><button onClick={() => setAperto({ tab: 'coalizione', padreId: null })}>+ Coalizione</button></div>
      {moduloNuovo('coalizione', null)}
      {coalizioni.length === 0 && !aperto && <p className="info">Nessuna coalizione.</p>}
      {coalizioni.map((c) => nodo('coalizione', c))}
    </div>
  )
}
