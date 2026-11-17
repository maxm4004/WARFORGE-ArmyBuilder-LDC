import { useEffect, useState } from 'react'
import { aggiorna, contaUsi, crea, elimina, leggiTutti } from './api.js'
import { TABELLE, etichetta, riferimentiA } from './tabelle.js'
import UnitaEditor from './UnitaEditor.jsx'
import Modulo from './Modulo.jsx'
import CoalizioniPage from './CoalizioniPage.jsx'

export default function App() {
  const [sezione, setSezione] = useState('censimento')
  const [tabId, setTabId] = useState(TABELLE[0].id)
  const [dati, setDati] = useState({})
  const [modifica, setModifica] = useState(null)
  const [copia, setCopia] = useState(null)
  const [avviso, setAvviso] = useState('')
  const [filtri, setFiltri] = useState({})
  const tabella = TABELLE.find((t) => t.id === tabId)
  const campiFiltro = (tabella.filtri ?? []).map((nome) => tabella.campi.find((c) => c.nome === nome))
  const righe = (dati[tabId] ?? []).filter((r) => campiFiltro.every((c) => !filtri[c.nome] || r[c.nome] === filtri[c.nome]))
  const colonne = tabella.campi.filter((c) => !tabella.elenco || tabella.elenco.includes(c.nome))

  function carica() {
    return Promise.all(TABELLE.map((t) => leggiTutti(t.id).then((r) => [t.id, r])))
      .then((coppie) => setDati(Object.fromEntries(coppie)))
      .catch((err) => setAvviso(`PocketBase non raggiungibile: ${err.message}`))
  }

  useEffect(() => { carica() }, [])

  // Cambiando un filtro, quelli che dipendono da esso (es. tipo reparto dal reparto) si azzerano.
  function cambiaFiltro(campo, valore) {
    setFiltri((f) => {
      const nuovi = { ...f, [campo]: valore }
      campiFiltro.filter((c) => c.dipendeDa?.includes(campo)).forEach((c) => { nuovi[c.nome] = '' })
      return nuovi
    })
  }

  function apri(id) {
    setTabId(id)
    setModifica(null)
    setCopia(null)
    setFiltri({})
    setAvviso('')
  }

  async function salva(valori) {
    try {
      const salvato = modifica ? await aggiorna(tabId, modifica.id, valori) : await crea(tabId, valori)
      setDati((d) => ({
        ...d,
        [tabId]: modifica ? d[tabId].map((r) => (r.id === salvato.id ? salvato : r)) : [...(d[tabId] ?? []), salvato],
      }))
      setModifica(null)
      setAvviso('')
    } catch (err) {
      setAvviso(err.message)
    }
  }

  async function rimuovi(record) {
    try {
      for (const rif of riferimentiA(tabId)) {
        const usi = await contaUsi(rif.tabella, rif.campo, record.id)
        if (usi > 0) {
          setAvviso(`Non eliminabile: in uso in ${rif.titolo} (${usi}).`)
          return
        }
      }
      if (!window.confirm(`Eliminare "${etichetta(record, dati)}"?`)) return
      await elimina(tabId, record.id)
      if (tabId === 'unita') await carica()
      else setDati((d) => ({ ...d, [tabId]: d[tabId].filter((r) => r.id !== record.id) }))
      if (modifica?.id === record.id) setModifica(null)
      if (copia?.id === record.id) setCopia(null)
      setAvviso('')
    } catch (err) {
      setAvviso(err.message)
    }
  }

  function cella(campo, record) {
    if (campo.tipo !== 'rel') return String(record[campo.nome] ?? '')
    return etichetta((dati[campo.tabella] ?? []).find((r) => r.id === record[campo.nome]), dati)
  }

  return (
    <>
      <header>
        <h1>ArmyBuilder-LDC</h1>
        <nav className="sezioni">
          {[['censimento', 'Censimento'], ['coalizioni', 'Coalizioni']].map(([id, titolo]) => (
            <button key={id} className={id === sezione ? 'attivo' : ''} onClick={() => { setSezione(id); setAvviso('') }}>{titolo}</button>
          ))}
        </nav>
        {sezione === 'censimento' && <nav>
          {TABELLE.filter((t) => !t.nascosta).map((t) => (
            <button key={t.id} className={t.id === tabId ? 'attivo' : ''} onClick={() => apri(t.id)}>{t.titolo}</button>
          ))}
        </nav>}
      </header>
      <main>
        {sezione === 'censimento' && campiFiltro.length > 0 && (
          <div className="filtri">
            {campiFiltro.map((c) => (
              <label key={c.nome}>Filtra per {c.label}
                <select value={filtri[c.nome] ?? ''} onChange={(e) => cambiaFiltro(c.nome, e.target.value)}>
                  <option value="">Tutti</option>
                  {(dati[c.tabella] ?? [])
                    .filter((r) => (c.dipendeDa ?? []).every((d) => !filtri[d] || r[d] === filtri[d]))
                    .map((r) => <option key={r.id} value={r.id}>{etichetta(r, dati)}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
        {avviso && <p className="avviso" role="alert">{avviso}</p>}
        {sezione === 'coalizioni' ? (
          <CoalizioniPage dati={dati} carica={carica} onAvviso={setAvviso} />
        ) : tabId === 'unita' ? (
          <UnitaEditor
            key={modifica?.id ?? (copia ? `copia-${copia.id}` : 'nuovo')}
            record={modifica}
            copia={copia}
            dati={dati}
            onSalvata={async () => { await carica(); setModifica(null); setCopia(null); setAvviso('') }}
            onErrore={(msg) => { setAvviso(msg); carica() }}
            onAvviso={setAvviso}
            onAnnulla={() => { setModifica(null); setCopia(null) }}
          />
        ) : (
          <Modulo key={`${tabId}-${modifica?.id ?? 'nuovo'}`} tabella={tabella} record={modifica} dati={dati} onSalva={salva} onAnnulla={() => setModifica(null)} />
        )}
        {sezione === 'censimento' && <div className="scorri">
          <table>
            <thead>
              <tr><th />{colonne.map((c) => <th key={c.nome}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id} className={modifica?.id === r.id ? 'selezionata' : ''}>
                  <td className="azioni">
                    <button onClick={() => { setCopia(null); setModifica(r) }}>Modifica</button>
                    {tabId === 'unita' && <button onClick={() => { setModifica(null); setCopia(r) }}>Copia</button>}
                    <button onClick={() => rimuovi(r)}>Elimina</button>
                  </td>
                  {colonne.map((c) => <td key={c.nome}>{cella(c, r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </main>
    </>
  )
}
