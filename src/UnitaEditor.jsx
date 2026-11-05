import { useState } from 'react'
import { aggiorna, crea, elimina } from './api.js'
import { etichetta } from './tabelle.js'

const nuovoGruppo = () => ({ id: null, tipo_base: 'Standard', numero_basi: '', slot: {} })

function gruppiIniziali(record, copia, dati) {
  const origine = record ?? copia
  if (!origine) return [nuovoGruppo()]
  const gruppi = (dati.unita_base ?? []).filter((b) => b.id_unita === origine.id).map((b) => ({
    id: record ? b.id : null,
    tipo_base: b.tipo_base,
    numero_basi: b.numero_basi,
    slot: Object.fromEntries((dati.unita_slot ?? []).filter((s) => s.id_unita_base === b.id).map((s) => [s.numero_slot, s.id_figura])),
  }))
  return gruppi.length > 0 ? gruppi : [nuovoGruppo()]
}

// Aggiorna i record esistenti e cancella solo quelli tolti: gli id restano stabili.
async function salvaGruppo(unitaId, gruppo, nSlot, dati) {
  const valori = { id_unita: unitaId, tipo_base: gruppo.tipo_base, numero_basi: Number(gruppo.numero_basi) }
  const base = gruppo.id ? await aggiorna('unita_base', gruppo.id, valori) : await crea('unita_base', valori)
  const esistenti = (dati.unita_slot ?? []).filter((s) => s.id_unita_base === base.id)

  for (let n = 1; n <= nSlot; n++) {
    const slot = esistenti.find((s) => s.numero_slot === n)
    if (!slot) await crea('unita_slot', { id_unita_base: base.id, numero_slot: n, id_figura: gruppo.slot[n] })
    else if (slot.id_figura !== gruppo.slot[n]) await aggiorna('unita_slot', slot.id, { id_figura: gruppo.slot[n] })
  }
  for (const slot of esistenti.filter((s) => s.numero_slot > nSlot)) await elimina('unita_slot', slot.id)
}

export default function UnitaEditor({ record, copia, dati, onSalvata, onErrore, onAvviso, onAnnulla }) {
  const origine = record ?? copia
  const [valori, setValori] = useState({
    nome: copia ? `${copia.nome} (copia)` : record?.nome ?? '',
    id_esercito: origine?.id_esercito ?? '',
    id_bpu: origine?.id_bpu ?? '',
  })
  const [gruppi, setGruppi] = useState(() => gruppiIniziali(record, copia, dati))

  const bpu = (dati.bpu ?? []).find((b) => b.id === valori.id_bpu)
  const fpb = (dati.fpb ?? []).find((f) => f.id === bpu?.id_fpb)
  const nSlot = fpb?.figure ?? 0
  const numeriSlot = Array.from({ length: nSlot }, (_, i) => i + 1)
  const meta = Math.ceil(nSlot / 2)
  const righeSlot = [numeriSlot.slice(0, meta), numeriSlot.slice(meta)].filter((riga) => riga.length > 0)
  const figure = (dati.figura ?? []).filter((f) =>
    f.id_esercito === valori.id_esercito && f.id_reparto === fpb?.id_reparto && f.id_tipo_reparto === fpb?.id_tipo_reparto)

  // Esercito e BPU decidono le figure ammesse: se cambiano, gli slot si svuotano.
  function cambia(campo, valore) {
    setValori((v) => ({ ...v, [campo]: valore }))
    if (campo !== 'nome') setGruppi((g) => g.map((x) => ({ ...x, slot: {} })))
  }

  const cambiaGruppo = (i, modifica) => setGruppi((g) => g.map((x, j) => (j === i ? { ...x, ...modifica } : x)))
  const totale = gruppi.reduce((somma, g) => somma + Number(g.numero_basi || 0), 0)

  async function salva(e) {
    e.preventDefault()
    if (totale !== bpu.basi) return onAvviso(`Le basi inserite sono ${totale}, la BPU ne richiede ${bpu.basi}.`)
    const completo = gruppi.every((g) => Array.from({ length: nSlot }, (_, i) => g.slot[i + 1]).every((id) => figure.some((f) => f.id === id)))
    if (!completo) return onAvviso('Assegna una figura a ogni slot.')

    try {
      const unita = record ? await aggiorna('unita', record.id, valori) : await crea('unita', valori)
      const tenuti = gruppi.map((g) => g.id)
      for (const base of (dati.unita_base ?? []).filter((b) => b.id_unita === unita.id && !tenuti.includes(b.id))) {
        await elimina('unita_base', base.id)
      }
      for (const gruppo of gruppi) await salvaGruppo(unita.id, gruppo, nSlot, dati)
      await onSalvata()
    } catch (err) {
      onErrore(err.message)
    }
  }

  return (
    <form className="editor-unita" onSubmit={salva}>
      <div className="modulo">
        <label>Nome *<input value={valori.nome} required onChange={(e) => cambia('nome', e.target.value)} /></label>
        <label>Esercito *
          <select value={valori.id_esercito} required onChange={(e) => cambia('id_esercito', e.target.value)}>
            <option value="">—</option>
            {(dati.esercito ?? []).map((r) => <option key={r.id} value={r.id}>{etichetta(r, dati)}</option>)}
          </select>
        </label>
        <label>BPU *
          <select value={valori.id_bpu} required onChange={(e) => cambia('id_bpu', e.target.value)}>
            <option value="">—</option>
            {(dati.bpu ?? []).map((r) => <option key={r.id} value={r.id}>{etichetta(r, dati)}</option>)}
          </select>
        </label>
      </div>

      {bpu && valori.id_esercito && gruppi.map((g, i) => (
        <section className="gruppo" key={g.id ?? `nuovo-${i}`}>
          <h2>Gruppo di basi {i + 1}</h2>
          <div className="modulo">
            <label>Tipo base *
              <select value={g.tipo_base} onChange={(e) => cambiaGruppo(i, { tipo_base: e.target.value })}>
                <option>Comando</option>
                <option>Standard</option>
              </select>
            </label>
            <label>Numero basi *
              <input type="number" min="1" max={bpu.basi} required value={g.numero_basi} onChange={(e) => cambiaGruppo(i, { numero_basi: e.target.value })} />
            </label>
          </div>
          {righeSlot.map((riga) => (
            <div className="modulo" key={riga[0]}>
              {riga.map((n) => (
                <label key={n}>Slot {n} *
                  <select value={g.slot[n] ?? ''} required onChange={(e) => cambiaGruppo(i, { slot: { ...g.slot, [n]: e.target.value } })}>
                    <option value="">—</option>
                    {figure.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </label>
              ))}
            </div>
          ))}
          {gruppi.length > 1 && <div className="azioni"><button type="button" onClick={() => setGruppi((x) => x.filter((_, j) => j !== i))}>Togli gruppo</button></div>}
        </section>
      ))}

      <div className="azioni">
        {bpu && valori.id_esercito && <button type="button" onClick={() => setGruppi((g) => [...g, nuovoGruppo()])}>Aggiungi gruppo</button>}
        <button type="submit" disabled={!bpu}>{record ? 'Salva' : 'Aggiungi'}</button>
        {origine && <button type="button" onClick={onAnnulla}>Annulla</button>}
        {bpu && <span>Basi: {totale} / {bpu.basi}</span>}
      </div>
    </form>
  )
}
