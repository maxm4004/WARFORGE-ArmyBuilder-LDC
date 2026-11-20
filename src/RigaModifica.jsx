import { useState } from 'react'
import { etichetta } from './tabelle.js'

// Riga della tabella in modifica: le colonne modificabili diventano combo direttamente nella riga.
export default function RigaModifica({ numero, tabella, record, colonne, dati, cella, onSalva, onAnnulla }) {
  const modificabili = tabella.campi.filter((c) => tabella.soloModifica.includes(c.nome))
  const [valori, setValori] = useState(() => Object.fromEntries(modificabili.map((c) => [c.nome, record[c.nome] ?? ''])))

  function cambia(campo, valore) {
    setValori((v) => {
      const nuovi = { ...v, [campo]: valore }
      // Cambiando un campo, le scelte che dipendono da esso non sono piu' valide.
      modificabili.filter((c) => c.dipendeDa?.includes(campo)).forEach((c) => { nuovi[c.nome] = '' })
      return nuovi
    })
  }

  return (
    <tr className="selezionata">
      <td className="azioni">
        <button onClick={() => onSalva(valori)}>Salva</button>
        <button onClick={onAnnulla}>Annulla</button>
      </td>
      {numero !== null && <td className="numero">{numero}</td>}
      {colonne.map((c) => (
        <td key={c.nome}>
          {c.nome in valori ? (
            <select value={valori[c.nome]} onChange={(e) => cambia(c.nome, e.target.value)}>
              <option value="">—</option>
              {(dati[c.tabella] ?? [])
                .filter((r) => (c.dipendeDa ?? []).every((d) => valori[d] && r[d] === valori[d]))
                .map((r) => <option key={r.id} value={r.id}>{etichetta(r, dati)}</option>)}
            </select>
          ) : cella(c, record)}
        </td>
      ))}
    </tr>
  )
}
