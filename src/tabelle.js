const testo = (nome, label, obbligatorio = true) => ({ nome, label, tipo: 'text', obbligatorio })
const numero = (nome, label) => ({ nome, label, tipo: 'number' })
const rel = (nome, label, tabella, extra = {}) => ({ nome, label, tipo: 'rel', tabella, obbligatorio: true, ...extra })
const scelta = (nome, label, opzioni, extra = {}) => ({ nome, label, tipo: 'scelta', opzioni, obbligatorio: true, ...extra })

const SLOT = [1, 2, 3, 4, 5, 6]

const xyz = [testo('nome', 'Nome'), numero('valoreX', 'X'), numero('valoreY', 'Y'), numero('valoreZ', 'Z')]

export const TABELLE = [
  { id: 'esercito', titolo: 'Esercito', campi: [testo('nome', 'Nome'), testo('note', 'Note', false)] },
  { id: 'reparto', titolo: 'Reparto', campi: [testo('nome', 'Nome'), testo('note', 'Note', false)] },
  { id: 'tipo_reparto', titolo: 'Tipo reparto', campi: [rel('id_reparto', 'Reparto', 'reparto'), testo('tipo', 'Tipo')] },
  { id: 'tipo_model', titolo: 'Tipo model', campi: [testo('nome', 'Nome')] },
  { id: 'texture', titolo: 'Texture', campi: [testo('nome', 'Nome'), rel('id_esercito', 'Esercito', 'esercito'), rel('id_reparto', 'Reparto', 'reparto'), testo('url', 'URL'), testo('note', 'Note', false)] },
  { id: 'collider', titolo: 'Collider', campi: [testo('nome', 'Nome'), testo('url', 'URL'), testo('note', 'Note', false)] },
  { id: 'offset', titolo: 'Offset', campi: [testo('nome', 'Nome'), rel('id_reparto', 'Reparto', 'reparto'), rel('id_tipo_reparto', 'Tipo reparto', 'tipo_reparto', { dipendeDa: ['id_reparto'] }), ...xyz.slice(1)] },
  { id: 'scale', titolo: 'Scale', campi: xyz },
  { id: 'rotation', titolo: 'Rotation', campi: xyz },
  {
    id: 'figura',
    titolo: 'Figura',
    elenco: ['nome', 'id_esercito', 'id_reparto', 'id_tipo_reparto'],
    campi: [
      testo('nome', 'Nome'),
      rel('id_esercito', 'Esercito', 'esercito'),
      rel('id_reparto', 'Reparto', 'reparto'),
      rel('id_tipo_reparto', 'Tipo reparto', 'tipo_reparto', { dipendeDa: ['id_reparto'] }),
      rel('id_tipo_model', 'Tipo model', 'tipo_model'),
      testo('urlmesh', 'URL mesh'),
      rel('id_texture', 'Texture', 'texture', { obbligatorio: false, dipendeDa: ['id_esercito', 'id_reparto'] }),
      rel('id_collider', 'Collider', 'collider', { obbligatorio: false }),
    ],
  },
  {
    id: 'fpb',
    titolo: 'FPB',
    campi: [
      rel('id_reparto', 'Reparto', 'reparto'),
      rel('id_tipo_reparto', 'Tipo reparto', 'tipo_reparto', { dipendeDa: ['id_reparto'] }),
      scelta('figure', 'Figure per base', SLOT, { numerico: true }),
      scelta('misura', 'Misura base', ['4x3', '4x5']),
    ],
  },
  {
    id: 'fpb_slot',
    titolo: 'Slot FPB',
    campi: [
      rel('id_fpb', 'FPB', 'fpb', { cascata: true }),
      scelta('numero_slot', 'Slot', SLOT, { numerico: true }),
      rel('id_offset', 'Offset', 'offset'),
      rel('id_scale', 'Scale', 'scale'),
      rel('id_rotation', 'Rotation', 'rotation'),
    ],
  },
  {
    id: 'bpu',
    titolo: 'BPU',
    campi: [rel('id_fpb', 'FPB', 'fpb'), scelta('basi', 'Basi per unità', [2, 3, 4, 6], { numerico: true })],
  },
  {
    id: 'unita',
    titolo: 'Unità',
    campi: [testo('nome', 'Nome'), rel('id_esercito', 'Esercito', 'esercito'), rel('id_bpu', 'BPU', 'bpu')],
  },
  // Composizione dell'unita': si gestisce dall'editor Unità, non ha un tab proprio.
  {
    id: 'unita_base',
    titolo: 'Unità',
    nascosta: true,
    campi: [rel('id_unita', 'Unità', 'unita', { cascata: true }), testo('tipo_base', 'Tipo base'), numero('numero_basi', 'Basi')],
  },
  {
    id: 'unita_slot',
    titolo: 'Unità',
    nascosta: true,
    campi: [rel('id_unita_base', 'Base', 'unita_base', { cascata: true }), numero('numero_slot', 'Slot'), rel('id_figura', 'Figura', 'figura')],
  },
]

// Etichetta di un record nelle combo e negli elenchi.
export function etichetta(record, dati = {}) {
  if (!record) return ''
  const trova = (tabella, id) => (dati[tabella] ?? []).find((r) => r.id === id)
  if (record.basi) return `${etichetta(trova('fpb', record.id_fpb), dati)} · ${record.basi} basi`
  if (record.figure) return `${etichetta(trova('reparto', record.id_reparto))} ${etichetta(trova('tipo_reparto', record.id_tipo_reparto))} · ${record.figure} figure`
  if (record.nome) return record.nome
  if (record.tipo) return record.tipo
  const fine = (record.url ?? '').split('?')[0].split('/').pop()
  try { return decodeURIComponent(fine) || record.url } catch { return fine }
}

// Campi di altre tabelle che puntano a questa tabella.
export const riferimentiA = (id) =>
  TABELLE.flatMap((t) => t.campi.filter((c) => c.tabella === id && !c.cascata).map((c) => ({ tabella: t.id, titolo: t.titolo, campo: c.nome })))
