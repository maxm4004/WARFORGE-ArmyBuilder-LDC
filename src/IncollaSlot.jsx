import { useState } from 'react'
import { aggiorna, crea } from './api.js'
import { etichetta } from './tabelle.js'

const NUM = '(-?\\d+(?:\\.\\d+)?)'
// { "modello": "X", "x": 1.10, "y": 0.02, "z": 0.16, "rot_y": 0.0 }   (rot_y facoltativo)
const RIGA_FIGURA = new RegExp(`\\{\\s*"modello"\\s*:\\s*"([^"]*)"\\s*,\\s*"x"\\s*:\\s*${NUM}\\s*,\\s*"y"\\s*:\\s*${NUM}\\s*,\\s*"z"\\s*:\\s*${NUM}(?:\\s*,\\s*"rot_y"\\s*:\\s*${NUM})?\\s*\\}`)
// attaccata: rot x 0.0, y 90.0, z 0.0 (rispetto alla base), scala nel mondo 0.950
const RIGA_DETTAGLIO = new RegExp(`rot x ${NUM}, y ${NUM}, z ${NUM}.*scala nel mondo ${NUM}`)
const SCALA_PREDEFINITA = 0.95

// Figure stampate da debug_offsetFigure, nell'ordine della console.
export function leggiFigure(testo) {
  const figure = []
  for (const riga of testo.split(/\r?\n/)) {
    const f = riga.match(RIGA_FIGURA)
    if (f) {
      const [, modello, x, y, z, rotY] = f
      figure.push({ modello, x: +x, y: +y, z: +z, rot: [0, rotY === undefined ? 0 : +rotY, 0], scala: SCALA_PREDEFINITA })
      continue
    }
    const d = riga.match(RIGA_DETTAGLIO)
    if (d && figure.length) Object.assign(figure.at(-1), { rot: [+d[1], +d[2], +d[3]], scala: +d[4] })
  }
  return figure
}

const uguali = (r, [x, y, z]) => [r.valoreX, r.valoreY, r.valoreZ].every((v, i) => Math.abs((v ?? 0) - [x, y, z][i]) < 1e-6)

// Incolla l'output di debug_offsetFigure negli slot di una FPB: figura N -> slot N.
// Offset, rotation e scale con gli stessi valori vengono riusati, altrimenti creati.
export default function IncollaSlot({ dati, carica, onAvviso }) {
  const [idFpb, setIdFpb] = useState('')
  const [testo, setTesto] = useState('')
  const [esito, setEsito] = useState('')

  async function applica() {
    const fpb = (dati.fpb ?? []).find((f) => f.id === idFpb)
    const figure = leggiFigure(testo)
    if (!fpb) return setEsito('Scegli la FPB.')
    if (figure.length === 0) return setEsito('Nessuna figura riconosciuta: incolla le righe [FIGURE] della console.')

    const nomeFpb = `${etichetta((dati.reparto ?? []).find((r) => r.id === fpb.id_reparto))} ${etichetta((dati.tipo_reparto ?? []).find((t) => t.id === fpb.id_tipo_reparto))}`
    const usate = figure.slice(0, fpb.figure)
    const cache = { offset: [...(dati.offset ?? [])], rotation: [...(dati.rotation ?? [])], scale: [...(dati.scale ?? [])] }
    const conta = { creati: 0, riusati: 0 }

    async function trovaOCrea(tabella, valori, extra, nome) {
      const esistente = cache[tabella].find((r) => uguali(r, valori) && Object.entries(extra).every(([k, v]) => r[k] === v))
      if (esistente) {
        conta.riusati++
        return esistente.id
      }
      const [valoreX, valoreY, valoreZ] = valori
      const nuovo = await crea(tabella, { nome, valoreX, valoreY, valoreZ, ...extra })
      cache[tabella].push(nuovo)
      conta.creati++
      return nuovo.id
    }

    try {
      for (const [i, f] of usate.entries()) {
        const n = i + 1
        const slot = {
          id_offset: await trovaOCrea('offset', [f.x, f.y, f.z], { id_reparto: fpb.id_reparto, id_tipo_reparto: fpb.id_tipo_reparto }, `${nomeFpb} · slot ${n} · ${f.modello}`),
          id_rotation: await trovaOCrea('rotation', f.rot, {}, `rot ${f.rot.join(' / ')}`),
          id_scale: await trovaOCrea('scale', [f.scala, f.scala, f.scala], {}, `scala ${f.scala}`),
        }
        const esistente = (dati.fpb_slot ?? []).find((s) => s.id_fpb === fpb.id && s.numero_slot === n)
        if (esistente) await aggiorna('fpb_slot', esistente.id, slot)
        else await crea('fpb_slot', { id_fpb: fpb.id, numero_slot: n, ...slot })
      }
      await carica()
      const note = []
      const inPiu = figure.length - fpb.figure
      if (inPiu > 0) note.push(`${inPiu === 1 ? '1 figura in più ignorata' : `${inPiu} figure in più ignorate`} (la FPB ha ${fpb.figure} slot)`)
      if (inPiu < 0) note.push(figure.length + 1 === fpb.figure ? `slot ${fpb.figure} non toccato` : `slot ${figure.length + 1}-${fpb.figure} non toccati`)
      setEsito(`Slot aggiornati: ${usate.length} · record nuovi: ${conta.creati}, riusati: ${conta.riusati}${note.length ? ` · ${note.join(' · ')}` : ''}`)
      onAvviso('')
    } catch (err) {
      await carica()
      setEsito('')
      onAvviso(err.message)
    }
  }

  return (
    <section className="gruppo">
      <h2>Incolla da console (debug_offsetFigure)</h2>
      <div className="modulo">
        <label>FPB *
          <select value={idFpb} onChange={(e) => setIdFpb(e.target.value)}>
            <option value="">—</option>
            {(dati.fpb ?? []).map((f) => <option key={f.id} value={f.id}>{etichetta(f, dati)}</option>)}
          </select>
        </label>
      </div>
      <textarea rows={5} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={'[FIGURE] { "modello": "CAVALLO_DRAGONE", "x": -1.10, "y": 0.02, "z": 0.16, "rot_y": 0.0 },\n[FIGURE]     attaccata: rot x 0.0, y 0.0, z 0.0 (rispetto alla base), scala nel mondo 0.950\n...'} />
      <div className="azioni">
        <button onClick={applica}>Applica agli slot</button>
        {esito && <span className="info">{esito}</span>}
      </div>
    </section>
  )
}
