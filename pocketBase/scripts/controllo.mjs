// Controlla che il Censimento sia completo e coerente. Non modifica niente (--apply viene ignorato).
// Uso: node controllo.mjs
// Credenziali: variabili d'ambiente PB_EMAIL e PB_PASSWORD (superuser PocketBase).

import { leggiTutti, login } from "./lib/pb.mjs";

const TABELLE = [
  "esercito", "reparto", "tipo_reparto", "tipo_model", "dropbox_file", "texture", "collider", "base",
  "figura", "fpb", "fpb_slot", "bpu", "unita", "unita_base", "unita_slot",
];

async function main() {
  await login();
  const d = Object.fromEntries(await Promise.all(TABELLE.map(async (t) => [t, await leggiTutti(t)])));
  const per = (t) => new Map(d[t].map((r) => [r.id, r]));
  const [eserciti, reparti, tipi, file, fpbs, bpus, figure] =
    ["esercito", "reparto", "tipo_reparto", "dropbox_file", "fpb", "bpu", "figura"].map(per);
  const nomeFpb = (f) => `${reparti.get(f.id_reparto)?.nome ?? "?"} ${tipi.get(f.id_tipo_reparto)?.tipo ?? "?"} da ${f.figure} figure`;

  const problemi = {};
  const segnala = (sezione, testo) => (problemi[sezione] ??= []).push(testo);

  // Collegamento a un file Dropbox: obbligatorio o no, deve esistere ed essere ancora su Dropbox.
  function controllaFile(sezione, nome, idFile, etichetta, obbligatorio = true) {
    if (!idFile) {
      if (obbligatorio) segnala(sezione, `${nome}: manca ${etichetta}`);
      return;
    }
    const f = file.get(idFile);
    if (!f) segnala(sezione, `${nome}: ${etichetta} punta a un file inesistente`);
    else if (!f.trovato) segnala(sezione, `${nome}: ${etichetta} ${f.nome}.${f.estensione} non e' piu' su Dropbox`);
  }

  // Un asset bundle porta gia' la sua texture: la texture si controlla solo per i custom model.
  const bundle = new Set(d.tipo_model.filter((t) => t.nome.toLowerCase().includes("bundle")).map((t) => t.id));
  for (const r of d.figura) {
    controllaFile("Figura", r.nome, r.id_mesh, "mesh");
    if (!r.id_texture && !bundle.has(r.id_tipo_model)) segnala("Figura", `${r.nome}: manca la texture`);
  }
  for (const r of d.base) {
    controllaFile("Base", r.nome, r.id_mesh, "mesh");
    controllaFile("Base", r.nome, r.id_diffuse, "diffuse");
    controllaFile("Base", r.nome, r.id_normal, "normal", false);
  }
  for (const r of d.texture) controllaFile("Texture", r.nome, r.id_file, "file");
  for (const r of d.collider) controllaFile("Collider", r.nome, r.id_file, "file");

  for (const f of d.fpb) {
    if (!f.id_base) segnala("FPB", `${nomeFpb(f)}: manca la base`);
    const numeri = d.fpb_slot.filter((s) => s.id_fpb === f.id).map((s) => s.numero_slot);
    const mancanti = Array.from({ length: f.figure }, (_, i) => i + 1).filter((n) => !numeri.includes(n));
    const inPiu = numeri.filter((n) => n > f.figure);
    if (mancanti.length) segnala("Slot FPB", `${nomeFpb(f)}: mancano gli slot ${mancanti.join(", ")}`);
    if (inPiu.length) segnala("Slot FPB", `${nomeFpb(f)}: slot in piu' ${inPiu.join(", ")}`);
  }

  for (const u of d.unita) {
    const bpu = bpus.get(u.id_bpu);
    const fpb = fpbs.get(bpu?.id_fpb);
    if (!bpu || !fpb) {
      segnala("Unità", `${u.nome}: BPU o FPB mancante`);
      continue;
    }
    const gruppi = d.unita_base.filter((b) => b.id_unita === u.id);
    const totale = gruppi.reduce((s, b) => s + b.numero_basi, 0);
    if (totale !== bpu.basi) segnala("Unità", `${u.nome}: ${totale} basi nei gruppi, la BPU ne richiede ${bpu.basi}`);
    gruppi.forEach((g, i) => {
      const slot = d.unita_slot.filter((s) => s.id_unita_base === g.id);
      const vuoti = Array.from({ length: fpb.figure }, (_, n) => n + 1).filter((n) => !slot.some((s) => s.numero_slot === n && s.id_figura));
      if (vuoti.length) segnala("Unità", `${u.nome}, gruppo ${i + 1} (${g.tipo_base}): slot senza figura ${vuoti.join(", ")}`);
      for (const s of slot) {
        const fig = figure.get(s.id_figura);
        if (!fig) continue;
        const diversa = [
          fig.id_esercito !== u.id_esercito && `esercito ${eserciti.get(fig.id_esercito)?.nome ?? "?"}`,
          fig.id_reparto !== fpb.id_reparto && `reparto ${reparti.get(fig.id_reparto)?.nome ?? "?"}`,
          fig.id_tipo_reparto !== fpb.id_tipo_reparto && `tipo ${tipi.get(fig.id_tipo_reparto)?.tipo ?? "?"}`,
        ].filter(Boolean);
        if (diversa.length) segnala("Unità", `${u.nome}, gruppo ${i + 1}, slot ${s.numero_slot}: la figura ${fig.nome} ha ${diversa.join(", ")}`);
      }
    });
  }

  const usati = new Set([...d.figura.map((r) => r.id_mesh), ...d.base.flatMap((r) => [r.id_mesh, r.id_diffuse, r.id_normal]),
    ...d.texture.map((r) => r.id_file), ...d.collider.map((r) => r.id_file)].filter(Boolean));
  for (const f of d.dropbox_file) {
    if (f.trovato && !usati.has(f.id) && f.categoria) segnala("File Dropbox (info)", `${f.percorso}: non collegato a niente`);
  }

  const sezioni = Object.entries(problemi);
  for (const [sezione, righe] of sezioni) console.log(`\n${sezione} (${righe.length})\n  ${righe.join("\n  ")}`);
  const errori = sezioni.filter(([s]) => !s.endsWith("(info)")).reduce((n, [, r]) => n + r.length, 0);
  console.log(errori === 0 ? "\nTutto a posto." : `\nProblemi da sistemare: ${errori}.`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
