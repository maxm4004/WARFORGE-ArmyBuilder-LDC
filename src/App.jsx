import { useEffect, useState } from 'react'
import { aggiorna, contaUsi, crea, elimina, leggiTutti } from './api.js'
import { TABELLE, etichetta, riferimentiA } from './tabelle.js'
import UnitaEditor from './UnitaEditor.jsx'
import Modulo from './Modulo.jsx'
import RigaModifica from './RigaModifica.jsx'
import { Ingrandita, Miniatura } from './Anteprima.jsx'
import CoalizioniPage from './CoalizioniPage.jsx'

export default function App() {
  const [sezione, setSezione] = useState('censimento')
  const [tabId, setTabId] = useState(TABELLE[0].id)
  const [dati, setDati] = useState({})
  const [modifica, setModifica] = useState(null)
  const [copia, setCopia] = useState(null)
  const [avviso, setAvviso] = useState('')
  const [filtri, setFiltri] = useState({})
  const [ingrandita, setIngrandita] = useState(null)
  const [selezionati, setSelezionati] = useState(new Set())
  const tabella = TABELLE.find((t) => t.id === tabId)
  // Un filtro e' il nome di un campo, oppure un campo letto risalendo i collegamenti (percorso).
  const campiFiltro = (tabella.filtri ?? []).map((f) => (typeof f === 'string' ? tabella.campi.find((c) => c.nome === f) : f))
  function valoreFiltro(r, c) {
    let x = r
    for (const [campo, tabellaVia] of c.percorso ?? []) x = (dati[tabellaVia] ?? []).find((y) => y.id === x?.[campo])
    return x?.[c.campo ?? c.nome]
  }
  // Ordine dell'elenco: i campi di tabella.ordine, altrimenti il nome se c'e' (i numeri in ordine numerico).
  const campiOrdine = (tabella.ordine ?? (tabella.campi.some((c) => c.nome === 'nome') ? ['nome'] : []))
    .map((nome) => tabella.campi.find((c) => c.nome === nome))
  function testoOrdine(r, c) {
    if (c.tipo !== 'rel') return String(r[c.nome] ?? '')
    return etichetta((dati[c.tabella] ?? []).find((x) => x.id === r[c.nome]), dati)
  }
  function confronta(a, b) {
    for (const c of campiOrdine) {
      const d = testoOrdine(a, c).localeCompare(testoOrdine(b, c), 'it', { numeric: true, sensitivity: 'base' })
      if (d !== 0) return d
    }
    return 0
  }
  const righe = (dati[tabId] ?? []).filter((r) => campiFiltro.every((c) => !filtri[c.nome] || valoreFiltro(r, c) === filtri[c.nome]))
    .sort(confronta)
  const colonne = tabella.campi
    .filter((c) => !tabella.elenco || tabella.elenco.includes(c.nome))
    .flatMap((c) => [
      c,
      ...(tabella.derivati ?? []).filter((d) => d.via === c.nome),
      ...(tabella.anteprima === c.nome ? [{ nome: '_anteprima', label: 'Anteprima', anteprimaDi: c.nome }] : []),
    ])

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
    setSelezionati(new Set())
    setAvviso('')
  }

  async function salva(valori) {
    try {
      const salvato = modifica ? await aggiorna(tabId, modifica.id, valori) : await crea(tabId, valori)
      // PocketBase ignora in silenzio i campi che non esistono nel database: va segnalato.
      const mancanti = Object.keys(valori).filter((k) => !(k in salvato))
      setDati((d) => ({
        ...d,
        [tabId]: modifica ? d[tabId].map((r) => (r.id === salvato.id ? salvato : r)) : [...(d[tabId] ?? []), salvato],
      }))
      setModifica(null)
      setAvviso(mancanti.length ? `Non salvato: il campo ${mancanti.join(', ')} non esiste nel database. Lancia lo script di aggiornamento.` : '')
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

  // Selezione multipla: conta solo le righe visibili con i filtri attuali.
  const selezionateVisibili = righe.filter((r) => selezionati.has(r.id))
  const tutteSelezionate = righe.length > 0 && selezionateVisibili.length === righe.length

  function seleziona(id, si) {
    setSelezionati((s) => {
      const nuovi = new Set(s)
      if (si) nuovi.add(id)
      else nuovi.delete(id)
      return nuovi
    })
  }

  // Elimina le righe selezionate; salta quelle ancora collegate ad altri record.
  async function eliminaSelezionati() {
    const inUso = (r) => riferimentiA(tabId).find((rif) => (dati[rif.tabella] ?? []).some((x) => x[rif.campo] === r.id))
    const bloccate = selezionateVisibili.filter(inUso)
    const daEliminare = selezionateVisibili.filter((r) => !inUso(r))
    const nota = bloccate.length ? `\n${bloccate.length} ${bloccate.length === 1 ? 'resta perché ancora collegata' : 'restano perché ancora collegate'}.` : ''
    if (daEliminare.length === 0) {
      setAvviso(`Nessuna riga eliminabile: le ${bloccate.length} selezionate sono ancora collegate.`)
      return
    }
    if (!window.confirm(`Eliminare ${daEliminare.length === 1 ? '1 riga' : `${daEliminare.length} righe`}?${nota}`)) return
    const eliminate = []
    try {
      for (const r of daEliminare) {
        await elimina(tabId, r.id)
        eliminate.push(r.id)
      }
      setAvviso(bloccate.length ? `Eliminate ${eliminate.length}. Non eliminate perché collegate: ${bloccate.map((r) => etichetta(r, dati)).join(', ')}` : '')
    } catch (err) {
      setAvviso(`Eliminate ${eliminate.length}, poi errore: ${err.message}`)
    }
    setDati((d) => ({ ...d, [tabId]: d[tabId].filter((r) => !eliminate.includes(r.id)) }))
    setSelezionati(new Set())
    if (eliminate.includes(modifica?.id)) setModifica(null)
  }

  function cella(campo, record) {
    if (campo.anteprimaDi) {
      const file = (dati.dropbox_file ?? []).find((r) => r.id === record[campo.anteprimaDi])
      return <Miniatura url={file?.url} onApri={setIngrandita} />
    }
    if (campo.via) {
      const padre = (dati[campo.tabellaVia] ?? []).find((r) => r.id === record[campo.via])
      return etichetta((dati[campo.tabella] ?? []).find((r) => r.id === padre?.[campo.campo]), dati)
    }
    if (campo.tipo === 'bool') return record[campo.nome] ? 'sì' : 'non trovato'
    if (campo.tipo !== 'rel') return String(record[campo.nome] ?? '')
    return etichetta((dati[campo.tabella] ?? []).find((r) => r.id === record[campo.nome]), dati)
  }

  return (
    <>
      <header>
        <h1>ArmyBuilder-LDC <span className="versione">v{__VERSIONE__}</span></h1>
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
                  {c.tipo === 'rel'
                    ? (dati[c.tabella] ?? [])
                      .filter((r) => (c.dipendeDa ?? []).every((d) => !filtri[d] || r[d] === filtri[d]))
                      .map((r) => <option key={r.id} value={r.id}>{etichetta(r, dati)}</option>)
                    : [...new Set((dati[tabId] ?? []).map((r) => r[c.nome]).filter(Boolean))].sort()
                      .map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
        {avviso && <p className="avviso" role="alert">{avviso}</p>}
        {sezione === 'censimento' && tabella.selezionabile && (
          <div className="azioni">
            <button disabled={selezionateVisibili.length === 0} onClick={eliminaSelezionati}>Elimina selezionati ({selezionateVisibili.length})</button>
          </div>
        )}
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
          !tabella.soloModifica && (
            <Modulo key={`${tabId}-${modifica?.id ?? 'nuovo'}`} tabella={tabella} record={modifica} dati={dati} onSalva={salva} onAnnulla={() => setModifica(null)} />
          )
        )}
        {sezione === 'censimento' && <div className="scorri">
          <table>
            <thead>
              <tr>
                {tabella.selezionabile && (
                  <th><input type="checkbox" aria-label="Seleziona tutte" checked={tutteSelezionate} onChange={(e) => setSelezionati(new Set(e.target.checked ? righe.map((r) => r.id) : []))} /></th>
                )}
                <th />{tabella.numerata && <th>#</th>}{colonne.map((c) => <th key={c.nome}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {righe.map((r, i) => tabella.soloModifica && modifica?.id === r.id ? (
                <RigaModifica key={r.id} numero={tabella.numerata ? i + 1 : null} tabella={tabella} record={r} colonne={colonne} dati={dati} cella={cella} onSalva={salva} onAnnulla={() => setModifica(null)} />
              ) : (
                <tr key={r.id} className={modifica?.id === r.id ? 'selezionata' : ''}>
                  {tabella.selezionabile && (
                    <td><input type="checkbox" aria-label="Seleziona" checked={selezionati.has(r.id)} onChange={(e) => seleziona(r.id, e.target.checked)} /></td>
                  )}
                  <td className="azioni">
                    <button onClick={() => { setCopia(null); setModifica(r) }}>Modifica</button>
                    {tabId === 'unita' && <button onClick={() => { setModifica(null); setCopia(r) }}>Copia</button>}
                    <button onClick={() => rimuovi(r)}>Elimina</button>
                  </td>
                  {tabella.numerata && <td className="numero">{i + 1}</td>}
                  {colonne.map((c) => <td key={c.nome}>{cella(c, r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </main>
      {ingrandita && <Ingrandita src={ingrandita} onChiudi={() => setIngrandita(null)} />}
    </>
  )
}
