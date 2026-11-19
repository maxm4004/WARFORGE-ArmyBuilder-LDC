import { useState } from 'react'
import { etichetta } from './tabelle.js'

function valoriIniziali(tabella, record) {
  return Object.fromEntries(tabella.campi.map((c) => [c.nome, record?.[c.nome] ?? (c.tipo === 'number' ? 0 : '')]))
}

export default function Modulo({ tabella, record, dati, onSalva, onAnnulla, annullabile = false }) {
  const [valori, setValori] = useState(() => valoriIniziali(tabella, record))

  function cambia(campo, valore) {
    setValori((v) => {
      const nuovi = { ...v, [campo]: valore }
      // Cambiando un campo, le scelte che dipendono da esso non sono piu' valide.
      tabella.campi.filter((c) => c.dipendeDa?.includes(campo) || c.filtraPer?.via === campo).forEach((c) => { nuovi[c.nome] = '' })
      return nuovi
    })
  }

  // Tiene solo i record con gli stessi campi del record scelto in un'altra combo (es. offset con reparto e tipo della FPB).
  function filtraPer({ via, tabella: tabellaVia, campi }, r) {
    const padre = (dati[tabellaVia] ?? []).find((x) => x.id === valori[via])
    return Boolean(padre) && campi.every((k) => r[k] === padre[k])
  }

  function invia(e) {
    e.preventDefault()
    onSalva(Object.fromEntries(tabella.campi.map((c) => [c.nome, c.tipo === 'number' || c.numerico ? Number(valori[c.nome]) : valori[c.nome]])))
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
                .filter((r) => !c.filtraPer || filtraPer(c.filtraPer, r))
                .map((r) => <option key={r.id} value={r.id}>{etichetta(r, dati)}</option>)}
            </select>
          ) : c.tipo === 'scelta' ? (
            <select value={valori[c.nome]} required={c.obbligatorio} onChange={(e) => cambia(c.nome, e.target.value)}>
              <option value="">—</option>
              {c.opzioni.map((o) => <option key={o.valore ?? o} value={o.valore ?? o}>{o.label ?? o}</option>)}
            </select>
          ) : (
            <input type={c.tipo} step="any" value={valori[c.nome]} required={c.obbligatorio || c.tipo === 'number'} onChange={(e) => cambia(c.nome, e.target.value)} />
          )}
        </label>
      ))}
      <div className="azioni">
        <button type="submit">{record ? 'Salva' : 'Aggiungi'}</button>
        {(record || annullabile) && <button type="button" onClick={onAnnulla}>Annulla</button>}
      </div>
    </form>
  )
}
