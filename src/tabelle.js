const testo = (nome, label, obbligatorio = true) => ({ nome, label, tipo: 'text', obbligatorio })
const numero = (nome, label) => ({ nome, label, tipo: 'number' })
const rel = (nome, label, tabella, extra = {}) => ({ nome, label, tipo: 'rel', tabella, obbligatorio: true, ...extra })
const scelta = (nome, label, opzioni, extra = {}) => ({ nome, label, tipo: 'scelta', opzioni, obbligatorio: true, ...extra })
// File della staging Dropbox di una categoria (mesh, texture, collider).
const file = (nome, label, categoria, extra = {}) => rel(nome, label, 'dropbox_file', { fisso: { categoria }, ...extra })

const SLOT = [1, 2, 3, 4, 5, 6]

// Valori del regolamento LDC: morale delle unita' (3.3) e valore dei Generali (7.1).
export const MORALE = ['Marmaglia', 'Coscritti', 'Regolari', 'Veterani', 'Elite'].map((label, i) => ({ valore: i + 1, label: `${i + 1} - ${label}` }))
export const VALORE_GENERALE = ['Imbecille', 'Incompetente', 'Affidabile', 'Abile', 'Geniale'].map((label, i) => ({ valore: i + 1, label: `${i + 1} - ${label}` }))
export const ARMI = ['Moschetto', 'Moschetto rigato', 'Sciabola', 'Lancia', 'Artiglieria leggera', 'Artiglieria media', 'Artiglieria pesante']

const xyz = [testo('nome', 'Nome'), numero('valoreX', 'X'), numero('valoreY', 'Y'), numero('valoreZ', 'Z')]

export const TABELLE = [
  { id: 'esercito', titolo: 'Esercito', campi: [testo('nome', 'Nome'), testo('note', 'Note', false), testo('cartella', 'Cartella Dropbox', false)] },
  { id: 'reparto', titolo: 'Reparto', campi: [testo('nome', 'Nome'), testo('note', 'Note', false), testo('cartella', 'Cartella Dropbox', false)] },
  { id: 'tipo_reparto', titolo: 'Tipo reparto', campi: [rel('id_reparto', 'Reparto', 'reparto'), testo('tipo', 'Tipo')] },
  { id: 'tipo_model', titolo: 'Tipo model', campi: [testo('nome', 'Nome')] },
  {
    id: 'dropbox_file',
    titolo: 'File Dropbox',
    numerata: true,
    selezionabile: true,
    // I file li crea dropbox-import: a mano si correggono solo esercito, reparto e tipo reparto.
    soloModifica: ['id_esercito', 'id_reparto', 'id_tipo_reparto'],
    elenco: ['nome', 'estensione', 'categoria', 'id_esercito', 'id_reparto', 'id_tipo_reparto', 'trovato', 'percorso'],
    filtri: ['estensione', 'categoria', 'id_esercito', 'id_reparto', 'id_tipo_reparto'],
    campi: [
      testo('nome', 'Nome'),
      testo('estensione', 'Estensione'),
      testo('categoria', 'Categoria'),
      rel('id_esercito', 'Esercito', 'esercito', { obbligatorio: false }),
      rel('id_reparto', 'Reparto', 'reparto', { obbligatorio: false }),
      rel('id_tipo_reparto', 'Tipo reparto', 'tipo_reparto', { obbligatorio: false, dipendeDa: ['id_reparto'] }),
      { nome: 'trovato', label: 'Su Dropbox', tipo: 'bool' },
      testo('percorso', 'Percorso'),
    ],
  },
  {
    id: 'texture',
    titolo: 'Texture',
    anteprima: 'id_file',
    filtri: ['id_esercito', 'id_reparto'],
    campi: [
      testo('nome', 'Nome'),
      rel('id_esercito', 'Esercito', 'esercito'),
      rel('id_reparto', 'Reparto', 'reparto'),
      file('id_file', 'File', 'texture', { dipendeDa: ['id_esercito', 'id_reparto'] }),
      testo('note', 'Note', false),
    ],
  },
  { id: 'collider', titolo: 'Collider', campi: [testo('nome', 'Nome'), file('id_file', 'File', 'collider'), testo('note', 'Note', false)] },
  {
    id: 'base',
    titolo: 'Base',
    campi: [
      testo('nome', 'Nome'),
      file('id_mesh', 'Mesh', 'mesh'),
      file('id_diffuse', 'Diffuse', 'texture'),
      file('id_normal', 'Normal', 'texture', { obbligatorio: false }),
      rel('id_collider', 'Collider', 'collider', { obbligatorio: false }),
    ],
  },
  { id: 'offset', titolo: 'Offset', filtri: ['id_reparto', 'id_tipo_reparto'], campi: [testo('nome', 'Nome'), rel('id_reparto', 'Reparto', 'reparto'), rel('id_tipo_reparto', 'Tipo reparto', 'tipo_reparto', { dipendeDa: ['id_reparto'] }), ...xyz.slice(1)] },
  { id: 'scale', titolo: 'Scale', campi: xyz },
  { id: 'rotation', titolo: 'Rotation', campi: xyz },
  {
    id: 'figura',
    titolo: 'Figura',
    elenco: ['nome', 'id_esercito', 'id_reparto', 'id_tipo_reparto'],
    filtri: ['id_esercito', 'id_reparto'],
    campi: [
      testo('nome', 'Nome'),
      rel('id_esercito', 'Esercito', 'esercito'),
      rel('id_reparto', 'Reparto', 'reparto'),
      rel('id_tipo_reparto', 'Tipo reparto', 'tipo_reparto', { dipendeDa: ['id_reparto'] }),
      rel('id_tipo_model', 'Tipo model', 'tipo_model'),
      file('id_mesh', 'Mesh', 'mesh', { dipendeDa: ['id_esercito', 'id_reparto'] }),
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
      rel('id_base', 'Base', 'base'),
    ],
  },
  {
    id: 'fpb_slot',
    titolo: 'Slot FPB',
    filtri: ['id_fpb'],
    // Reparto e tipo reparto non sono salvati sullo slot: si leggono dalla FPB.
    derivati: [
      { nome: 'reparto', label: 'Reparto', via: 'id_fpb', tabellaVia: 'fpb', campo: 'id_reparto', tabella: 'reparto' },
      { nome: 'tipo_reparto', label: 'Tipo reparto', via: 'id_fpb', tabellaVia: 'fpb', campo: 'id_tipo_reparto', tabella: 'tipo_reparto' },
    ],
    campi: [
      rel('id_fpb', 'FPB', 'fpb', { cascata: true }),
      scelta('numero_slot', 'Slot', SLOT, { numerico: true }),
      rel('id_offset', 'Offset', 'offset', { filtraPer: { via: 'id_fpb', tabella: 'fpb', campi: ['id_reparto', 'id_tipo_reparto'] } }),
      rel('id_scale', 'Scale', 'scale'),
      rel('id_rotation', 'Rotation', 'rotation'),
    ],
  },
  {
    id: 'bpu',
    titolo: 'BPU',
    filtri: ['id_fpb'],
    campi: [rel('id_fpb', 'FPB', 'fpb'), scelta('basi', 'Basi per unità', [1, 2, 3, 4, 6], { numerico: true })],
  },
  {
    id: 'unita',
    titolo: 'Unità',
    // Il reparto dell'unita' e' quello della FPB della sua BPU.
    filtri: ['id_esercito', { nome: 'reparto', label: 'Reparto', tipo: 'rel', tabella: 'reparto', percorso: [['id_bpu', 'bpu'], ['id_fpb', 'fpb']], campo: 'id_reparto' }],
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
  // Coalizioni: si gestiscono dalla pagina Coalizioni, non hanno un tab nel Censimento.
  {
    id: 'coalizione',
    titolo: 'Coalizioni',
    nascosta: true,
    campi: [testo('nome', 'Nome'), scelta('lato', 'Lato', ['Army1', 'Army2'])],
  },
  {
    id: 'comando',
    titolo: 'Coalizioni',
    nascosta: true,
    campi: [
      rel('id_coalizione', 'Coalizione', 'coalizione', { cascata: true }),
      testo('nome', 'Nome comando'),
      testo('comandante', 'Comandante'),
      scelta('valore', 'Valore', VALORE_GENERALE, { numerico: true }),
    ],
  },
  {
    id: 'brigata',
    titolo: 'Coalizioni',
    nascosta: true,
    campi: [
      rel('id_comando', 'Comando', 'comando', { cascata: true }),
      testo('nome', 'Nome brigata'),
      testo('generale', 'Generale', false),
      scelta('valore', 'Valore', VALORE_GENERALE, { numerico: true, obbligatorio: false }),
    ],
  },
  {
    id: 'schierata',
    titolo: 'Coalizioni',
    nascosta: true,
    campi: [
      rel('id_brigata', 'Brigata', 'brigata', { cascata: true }),
      testo('nome', 'Nome'),
      rel('id_unita', 'Unità', 'unita'),
      scelta('morale', 'Morale', MORALE, { numerico: true }),
      scelta('arma', 'Arma', ARMI),
    ],
  },
]

// Etichetta di un record nelle combo e negli elenchi.
export function etichetta(record, dati = {}) {
  if (!record) return ''
  if (record.id_dropbox) return `${record.nome}.${record.estensione}${record.trovato ? '' : ' (non trovato)'}`
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
