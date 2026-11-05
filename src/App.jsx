import { useEffect, useState } from 'react'
import { aggiorna, contaUsi, crea, elimina, leggiTutti } from './api.js'
import { TABELLE, etichetta, riferimentiA } from './tabelle.js'

function valoriIniziali(tabella, record) {
  return Object.fromEntries(tabella.campi.map((c) => [c.nome, record?.[c.nome] ?? (c.tipo === 'number' ? 0 : '')]))
}

function Modulo({ tabella, record, dati, onSalva, onAnnulla }) {
  const [valori, setValori] = useState(() => valoriIniziali(tabella, record))

  function cambia(campo, valore) {
    setValori((v) => {
      const nuovi = { ...v, [campo]: valore }
      // Cambiando un campo, le scelte che dipendono da esso non sono piu' valide.
      tabella.campi.filter((c) => c.dipendeDa?.includes(campo)).forEach((c) => { nuovi[c.nome] = '' })
      return nuovi
    })
  }

  function invia(e) {
    e.preventDefault()
    onSalva(Object.fromEntries(tabella.campi.map((c) => [c.nome, c.tipo === 'number' ? Number(valori[c.nome]) : valori[c.nome]])))
  }

  return (
    <form className="modulo" onSubmit={invia}>
      {tabella.campi.map((c) => (
        <label key={c.nome}>
          {c.label}{c.obbligatorio ? ' *' : ''}
          {c.tipo === 'rel' ? (
            <select value={valori[c.nome]} required={c.obbligatorio} onChange={(e) => cambia(c.nome, e.target.value)}>
              <option value="">—</option>
              {(dati[c.tabella] ?? [])
                .filter((r) => (c.dipendeDa ?? []).every((d) => r[d] === valori[d]))
                .map((r) => <option key={r.id} value={r.id}>{etichetta(r)}</option>)}
            </select>
          ) : (
            <input type={c.tipo} step="any" value={valori[c.nome]} required={c.obbligatorio || c.tipo === 'number'} onChange={(e) => cambia(c.nome, e.target.value)} />
          )}
        </label>
      ))}
      <div className="azioni">
        <button type="submit">{record ? 'Salva' : 'Aggiungi'}</button>
        {record && <button type="button" onClick={onAnnulla}>Annulla</button>}
      </div>
    </form>
  )
}

export default function App() {
  const [tabId, setTabId] = useState(TABELLE[0].id)
  const [dati, setDati] = useState({})
  const [modifica, setModifica] = useState(null)
  const [avviso, setAvviso] = useState('')
  const tabella = TABELLE.find((t) => t.id === tabId)
  const righe = dati[tabId] ?? []
  const colonne = tabella.campi.filter((c) => !tabella.elenco || tabella.elenco.includes(c.nome))

  useEffect(() => {
    Promise.all(TABELLE.map((t) => leggiTutti(t.id).then((r) => [t.id, r])))
      .then((coppie) => setDati(Object.fromEntries(coppie)))
      .catch((err) => setAvviso(`PocketBase non raggiungibile: ${err.message}`))
  }, [])

  function apri(id) {
    setTabId(id)
    setModifica(null)
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
      if (!window.confirm(`Eliminare "${etichetta(record)}"?`)) return
      await elimina(tabId, record.id)
      setDati((d) => ({ ...d, [tabId]: d[tabId].filter((r) => r.id !== record.id) }))
      if (modifica?.id === record.id) setModifica(null)
      setAvviso('')
    } catch (err) {
      setAvviso(err.message)
    }
  }

  function cella(campo, record) {
    if (campo.tipo !== 'rel') return String(record[campo.nome] ?? '')
    return etichetta((dati[campo.tabella] ?? []).find((r) => r.id === record[campo.nome]))
  }

  return (
    <>
      <header>
        <h1>ArmyBuilder-LDC · Censimento</h1>
        <nav>
          {TABELLE.map((t) => (
            <button key={t.id} className={t.id === tabId ? 'attivo' : ''} onClick={() => apri(t.id)}>{t.titolo}</button>
          ))}
        </nav>
      </header>
      <main>
        {avviso && <p className="avviso" role="alert">{avviso}</p>}
        <Modulo key={`${tabId}-${modifica?.id ?? 'nuovo'}`} tabella={tabella} record={modifica} dati={dati} onSalva={salva} onAnnulla={() => setModifica(null)} />
        <div className="scorri">
          <table>
            <thead>
              <tr><th />{colonne.map((c) => <th key={c.nome}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id} className={modifica?.id === r.id ? 'selezionata' : ''}>
                  <td className="azioni">
                    <button onClick={() => setModifica(r)}>Modifica</button>
                    <button onClick={() => rimuovi(r)}>Elimina</button>
                  </td>
                  {colonne.map((c) => <td key={c.nome}>{cella(c, r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
