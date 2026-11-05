const testo = (nome, label, obbligatorio = true) => ({ nome, label, tipo: 'text', obbligatorio })
const numero = (nome, label) => ({ nome, label, tipo: 'number' })
const rel = (nome, label, tabella, extra = {}) => ({ nome, label, tipo: 'rel', tabella, obbligatorio: true, ...extra })

const xyz = [testo('nome', 'Nome'), numero('valoreX', 'X'), numero('valoreY', 'Y'), numero('valoreZ', 'Z')]

export const TABELLE = [
  { id: 'esercito', titolo: 'Esercito', campi: [testo('nome', 'Nome'), testo('note', 'Note', false)] },
  { id: 'reparto', titolo: 'Reparto', campi: [testo('nome', 'Nome'), testo('note', 'Note', false)] },
  { id: 'tipo_reparto', titolo: 'Tipo reparto', campi: [rel('id_reparto', 'Reparto', 'reparto'), testo('tipo', 'Tipo')] },
  { id: 'tipo_model', titolo: 'Tipo model', campi: [testo('nome', 'Nome')] },
  { id: 'texture', titolo: 'Texture', campi: [testo('nome', 'Nome'), rel('id_esercito', 'Esercito', 'esercito'), rel('id_reparto', 'Reparto', 'reparto'), testo('url', 'URL'), testo('note', 'Note', false)] },
  { id: 'collider', titolo: 'Collider', campi: [testo('nome', 'Nome'), testo('url', 'URL'), testo('note', 'Note', false)] },
  { id: 'offset', titolo: 'Offset', campi: xyz },
  { id: 'scale', titolo: 'Scale', campi: xyz },
  { id: 'rotation', titolo: 'Rotation', campi: xyz },
  {
    id: 'unita',
    titolo: 'Unità',
    campi: [
      testo('nome', 'Nome'),
      rel('id_esercito', 'Esercito', 'esercito'),
      rel('id_reparto', 'Reparto', 'reparto'),
      rel('id_tipo_reparto', 'Tipo reparto', 'tipo_reparto', { dipendeDa: 'id_reparto' }),
      rel('id_tipo_model', 'Tipo model', 'tipo_model'),
      testo('urlmesh', 'URL mesh'),
      rel('id_texture', 'Texture', 'texture', { obbligatorio: false }),
      rel('id_collider', 'Collider', 'collider', { obbligatorio: false }),
      rel('id_offset', 'Offset', 'offset'),
      rel('id_scale', 'Scale', 'scale'),
      rel('id_rotation', 'Rotation', 'rotation'),
    ],
  },
]

// Etichetta di un record nelle combo e negli elenchi.
export function etichetta(record) {
  if (!record) return ''
  if (record.nome) return record.nome
  if (record.tipo) return record.tipo
  const fine = (record.url ?? '').split('?')[0].split('/').pop()
  try { return decodeURIComponent(fine) || record.url } catch { return fine }
}

// Campi di altre tabelle che puntano a questa tabella.
export const riferimentiA = (id) =>
  TABELLE.flatMap((t) => t.campi.filter((c) => c.tabella === id).map((c) => ({ tabella: t.id, titolo: t.titolo, campo: c.nome })))
