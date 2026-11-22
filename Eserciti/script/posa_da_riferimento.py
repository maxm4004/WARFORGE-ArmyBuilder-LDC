import bpy
import math
from mathutils import Vector, Matrix
from mathutils.geometry import intersect_point_line

# =====================================================================
#  FUCILIERE - POSA "MIRA DA IN PIEDI" copiata da un modello di riferimento (fucile senza baionetta, orizzontale)
#  Importa l'OBJ, crea uno scheletro semplice, assegna i pesi, mette
#  in posa braccia e testa, aggancia il fucile alle mani, applica tutto
#  ed esporta un OBJ statico.
#  Il soldato originale guarda verso -Y, piedi a Z=0.
# =====================================================================

# >>> metti qui il percorso del tuo OBJ (il .mtl deve stare nella stessa cartella)
OBJ_IN = r"E:\Wargaming-DEV\Warforge-LDC\Armies\model\French\infantry\mesh\INF_french_fusilier.obj"
OBJ_OUT = OBJ_IN[:-4] + "_mira.obj"
# Modello di riferimento già in posa di tiro: la posa viene misurata da qui
OBJ_POSA = r"E:\Wargaming-DEV\Warforge-LDC\Armies\model\French\infantry\mesh\Fuciliere.obj"
USA_POSA_RIFERIMENTO = True   # False = usa i valori scritti sotto
RUOTA_FINALE = False          # True = fucile verso -Y; False = fucile nella stessa
                              # direzione del riferimento rispetto alla base
PRESA_SX_MINIMA = 0.52        # distanza minima calcio -> mano sinistra (modello alto 1.94)
ANGOLO_RIFERIMENTO = 0.0

# Rotazione del corpo per la posizione di tiro (spalla sinistra avanti).
# Il fucile a fine script punta sempre verso -Y (davanti alla base).
ROTAZIONE_BUSTO_DEG = 40.0
ALTEZZA_CANNA = 1.52          # quota dell'asse del fucile (altezza dell'occhio/guancia)
CALCIO = Vector((-0.12, -0.06, 1.52))   # calcio nell'incavo della spalla destra (frame del corpo)
CAPOVOLGI_FUCILE = True       # ponticello del grilletto verso il basso
PRESA_DX = None               # distanza calcio -> mano destra; None = sotto il grilletto (automatico)
PRESA_SX = 0.44               # distanza calcio -> mano sinistra (sotto la cassa)
# Rotazione della presa attorno all'asse del fucile (gradi, -90 = mano sotto).
# Lo script prova i valori nell'intervallo e tiene quello col polso più dritto.
INTERVALLO_PRESA_DX = (-110, -70)    # destra: sotto il grilletto
INTERVALLO_PRESA_SX = (-150, -30)
PASSATE_SFUMATURA = 2        # quanto si sfumano i pesi alle giunture
MAX_SPIGOLO_SFUMATURA = 0.12 # spigoli più lunghi non sfumano
TESTA_GIRO_DEG = 40.0        # la testa si gira verso il bersaglio
TESTA_CHINA_DEG = 12.0        # testa china sul calcio
TESTA_INCLINA_DEG = 10.0      # testa inclinata verso la spalla destra

# Ossa: nome -> (testa, coda, padre, raggio della "capsula" usata per i pesi)
OSSA = {
    "corpo":   ((0.0, 0.03, 0.0),   (0.0, 0.0, 1.52),     None,       0.15),
    "testa":   ((0.0, -0.03, 1.56), (0.0, -0.05, 1.90),   "corpo",    0.10),
    "brac_R":  ((-0.19, 0.03, 1.46), (-0.28, 0.05, 1.19), "corpo",    0.05),
    "avam_R":  ((-0.28, 0.05, 1.19), (-0.22, -0.05, 0.98), "brac_R",  0.045),
    "mano_R":  ((-0.22, -0.05, 0.98), (-0.20, -0.08, 0.86), "avam_R", 0.04),
    "brac_L":  ((0.19, 0.0, 1.46),  (0.24, -0.10, 1.22),  "corpo",    0.05),
    "avam_L":  ((0.24, -0.10, 1.22), (0.13, -0.25, 1.35), "brac_L",   0.045),
    "mano_L":  ((0.13, -0.25, 1.35), (0.06, -0.31, 1.41), "avam_L",   0.04),
}
POLI = {"R": Vector((-0.60, 0.05, 1.55)),   # gomito destro alto e aperto
        "L": Vector((0.12, -0.25, 0.90))}    # gomito sinistro sotto il fucile

ACCESSORI = {"Zaino1": "corpo", "Object01": "corpo", "Object12": "corpo"}
FUCILE = "secondary_weapon"         # moschetto con baionetta
DA_ELIMINARE = ["primary_weapon"]


def dist_segmento(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def segmenta(V, E):
    """Divide i vertici in corpo / testa / braccio R / braccio L con una
    distanza geodetica (lungo gli spigoli) a partire da gruppi di vertici sicuri."""
    import heapq
    adj = {i: [] for i in range(len(V))}
    for i, j in E:
        L = (V[i] - V[j]).length
        adj[i].append((j, L))
        adj[j].append((i, L))
    semi = {
        "corpo": [i for i, p in enumerate(V)
                  if (abs(p.x) < 0.1 and 0.75 < p.z < 1.3 and p.y > -0.18)
                  or (abs(p.x) < 0.12 and 1.25 < p.z < 1.5 and p.y > -0.16) or p.z < 0.6],
        "testa": [i for i, p in enumerate(V) if p.z > 1.65],
        "R": [i for i, p in enumerate(V) if (0.8 < p.z < 0.95 and p.x < -0.17) or (p.x < -0.22 and 1.15 < p.z < 1.47)],
        "L": [i for i, p in enumerate(V) if (p.y < -0.24 and p.z > 1.3) or (p.x > 0.21 and 1.15 < p.z < 1.47)],
    }
    dist = [1e9] * len(V)
    reg = ["corpo"] * len(V)
    coda = []
    for k, s in semi.items():
        for i in s:
            dist[i] = 0.0
            reg[i] = k
            heapq.heappush(coda, (0.0, i, k))
    while coda:
        d, i, k = heapq.heappop(coda)
        if d > dist[i]:
            continue
        for j, L in adj[i]:
            if d + L < dist[j]:
                dist[j] = d + L
                reg[j] = k
                heapq.heappush(coda, (d + L, j, k))
    return reg


def frame_fucile(obj):
    """Frame del fucile: origine al calcio, Y = asse verso la volata, Z = lato canna."""
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    c = sum(vs, Vector()) / len(vs)
    # asse principale (iterazione di potenza sulla covarianza)
    cov = Matrix(((0, 0, 0), (0, 0, 0), (0, 0, 0)))
    for v in vs:
        d = v - c
        for i in range(3):
            for j in range(3):
                cov[i][j] += d[i] * d[j]
    a = Vector((0.3, 0.3, 1.0))
    for _ in range(100):
        a = (cov @ a).normalized()
    proj = [(v - c).dot(a) for v in vs]
    # il calcio è l'estremità più bassa
    lo, hi = c + a * min(proj), c + a * max(proj)
    if lo.z > hi.z:
        a = -a
        proj = [-p for p in proj]
    calcio = c + a * min(proj)
    lungh = max(proj) - min(proj)
    # lato canna: verso cui stanno i vertici vicino alla volata rispetto ai vertici del calcio
    vicino_volata = [v for v, p in zip(vs, proj) if p > max(proj) - 0.3 * lungh]
    vicino_calcio = [v for v, p in zip(vs, proj) if p < min(proj) + 0.3 * lungh]
    mv = sum(vicino_volata, Vector()) / len(vicino_volata)
    mc = sum(vicino_calcio, Vector()) / len(vicino_calcio)
    su = (mv - mc) - a * (mv - mc).dot(a)
    if su.length < 1e-6:
        su = Vector((0, 0, 1)) - a * a.z
    su.normalize()
    if CAPOVOLGI_FUCILE:
        su = -su
    x = a.cross(su).normalized()
    su = x.cross(a).normalized()
    m = Matrix((x, a, su)).transposed().to_4x4()
    m.translation = calcio
    return m, lungh


def misura_posa(path):
    """Legge l'OBJ di riferimento (un pezzo unico va bene) e ricava, in
    proporzione all'altezza H: direzione e quota del fucile, calcio,
    gomiti e presa della mano sinistra."""
    import numpy as np
    V = []
    for riga in open(path, encoding="utf-8", errors="ignore"):
        if riga.startswith("v "):
            x, y, z = (float(a) for a in riga.split()[1:4])
            V.append((x, -z, y))                  # OBJ Y-su -> Blender Z-su
    B = np.array(V)
    B[:, 2] -= B[:, 2].min()
    H = B[:, 2].max()
    # asse del fucile: punti ben davanti al corpo
    avanti = B[B[:, 1] < B[:, 1].min() + 0.65 * (np.median(B[:, 1]) - B[:, 1].min())]
    c = avanti.mean(0)
    d = np.linalg.svd(avanti - c)[2][0]
    if d[1] > 0:
        d = -d
    t = (B - c) @ d
    r = np.linalg.norm(B - c - np.outer(t, d), axis=1)
    sulla = r < 0.03 * H
    tmin = t[sulla].min()
    calcio = c + d * tmin
    gom_R = B[(B[:, 0] < -0.11 * H) & (B[:, 2] > 0.65 * H)]
    gom_R = gom_R[gom_R[:, 0].argmin()]
    sx = B[(B[:, 0] > 0.04 * H) & (B[:, 2] > 0.6 * H) & (B[:, 2] < calcio[2] - 0.02 * H) & ~sulla]
    gom_L = sx[sx[:, 2].argmin()]
    vicino = (r > 0.025 * H) & (r < 0.08 * H) & (B[:, 0] > 0.05 * H) & (B[:, 2] > 0.65 * H)
    presa_L = (np.median(t[vicino]) - tmin) if vicino.any() else 0.35 * H
    ang = math.degrees(math.atan2(d[0], -d[1]))
    print(f"riferimento: fucile {ang:.1f} gradi a sinistra del fronte, quota {calcio[2]/H:.3f} H, "
          f"mano sx a {presa_L/H:.3f} H dal calcio")
    return {"ang": ang, "calcio": calcio / H, "gom_R": gom_R / H, "gom_L": gom_L / H,
            "presa_L": presa_L / H}


def applica_posa_riferimento(Hd, spalla_L, braccio_L):
    """Converte le misure del riferimento nei parametri di questo script."""
    global ROTAZIONE_BUSTO_DEG, TESTA_GIRO_DEG, CALCIO, POLI, PRESA_SX, ANGOLO_RIFERIMENTO
    m = misura_posa(OBJ_POSA)
    ROTAZIONE_BUSTO_DEG = TESTA_GIRO_DEG = m["ang"]
    cal = Vector(m["calcio"]) * Hd
    # x e quota dal riferimento; la profondità resta davanti alla spalla
    # (il busto di questo modello non si torce, il calcio non deve entrarci)
    CALCIO = Vector((cal.x, -0.06 * Hd / 1.94, cal.z))
    POLI = {"R": CALCIO + (Vector(m["gom_R"]) - Vector(m["calcio"])) * Hd,
            "L": CALCIO + (Vector(m["gom_L"]) - Vector(m["calcio"])) * Hd}
    # presa sinistra come nel riferimento, ma non oltre la portata del braccio:
    # se il braccio non ci arriva si gira di più il busto (spalla sinistra avanti),
    # poi la rotazione finale rimette il fucile nella direzione del riferimento
    voluta = m["presa_L"] * Hd
    minima = min(voluta, PRESA_SX_MINIMA * Hd / 1.94)
    def portata(rot):
        dir_m = Matrix.Rotation(math.radians(rot), 3, 'Z') @ Vector((0, -1, 0))
        s = 0.0
        while s + 0.01 <= voluta and ((CALCIO + dir_m * (s + 0.01)) - spalla_L).length <= 0.97 * braccio_L:
            s += 0.01
        return s
    rot = m["ang"]
    while portata(rot) < minima and rot < 75:
        rot += 2.0
    ROTAZIONE_BUSTO_DEG = TESTA_GIRO_DEG = rot
    PRESA_SX = portata(rot)
    ANGOLO_RIFERIMENTO = m["ang"]
    print(f"busto girato {rot:.0f} gradi, presa sx {PRESA_SX:.2f} (riferimento {voluta:.2f})")


def main():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    # via eventuali resti di un'esecuzione precedente
    for n in ["Scheletro", "IK_R", "IK_L", "Polo_R", "Polo_L"]:
        ob = bpy.data.objects.get(n)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.wm.obj_import(filepath=OBJ_IN, use_split_groups=True)
    scena = bpy.context.scene
    # solo gli oggetti appena importati (l'import li lascia selezionati);
    # se nella scena c'erano già, Blender li chiama "Body_400.001": si toglie il suffisso
    oggetti = {o.name.split(".")[0]: o for o in bpy.context.selected_objects if o.type == 'MESH'}
    for n in DA_ELIMINARE:
        if n in oggetti:
            bpy.data.objects.remove(oggetti.pop(n), do_unlink=True)
    corpo = oggetti["Body_400"]
    fucile = oggetti[FUCILE]
    if USA_POSA_RIFERIMENTO:
        Hd = max((corpo.matrix_world @ v.co).z for v in corpo.data.vertices)
        spalla_L = Vector(OSSA["brac_L"][0])
        braccio_L = (Vector(OSSA["brac_L"][1]) - spalla_L).length + \
                    (Vector(OSSA["avam_L"][1]) - Vector(OSSA["avam_L"][0])).length
        applica_posa_riferimento(Hd, spalla_L, braccio_L)

    # --- 1. Scheletro ---
    arm_data = bpy.data.armatures.new("Scheletro")
    arm = bpy.data.objects.new("Scheletro", arm_data)
    scena.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for nome, (h, t, padre, _) in OSSA.items():
        b = arm_data.edit_bones.new(nome)
        b.head, b.tail = Vector(h), Vector(t)
        if padre:
            b.parent = arm_data.edit_bones[padre]
            b.use_connect = Vector(h) == Vector(OSSA[padre][1])
    bpy.ops.object.mode_set(mode='OBJECT')

    # --- 2. Pesi ---
    # a) si separano braccia, testa e corpo seguendo gli spigoli della mesh
    #    (distanza "lungo la superficie"), così il braccio vicino al fianco
    #    non si porta dietro i vertici del busto e viceversa
    V = [corpo.matrix_world @ v.co for v in corpo.data.vertices]
    regione = segmenta(V, [tuple(e.vertices) for e in corpo.data.edges])
    # b) dentro ogni braccio: osso più vicino fra braccio, avambraccio e mano
    pesi = []
    for p, reg in zip(V, regione):
        if reg in ("R", "L"):
            ossa = ["brac_" + reg, "avam_" + reg, "mano_" + reg]
            nome = min(ossa, key=lambda n: dist_segmento(p, Vector(OSSA[n][0]), Vector(OSSA[n][1])))
        else:
            nome = reg
        pesi.append({nome: 1.0})
    # c) sfumatura alle giunture: media con i vicini (2 passate)
    vicini = {i: [] for i in range(len(V))}
    for e in corpo.data.edges:
        a, b = e.vertices
        # gli spigoli lunghi (es. ginocchio-mano) non devono sfumare i pesi
        if (V[a] - V[b]).length < MAX_SPIGOLO_SFUMATURA:
            vicini[a].append(b)
            vicini[b].append(a)
    for _ in range(PASSATE_SFUMATURA):
        nuovi = []
        for i, w in enumerate(pesi):
            acc = dict((k, v * 2.0) for k, v in w.items())     # il vertice conta doppio
            for j in vicini[i]:
                for k, v in pesi[j].items():
                    acc[k] = acc.get(k, 0.0) + v
            tot = sum(acc.values())
            nuovi.append({k: v / tot for k, v in acc.items()})
        pesi = nuovi
    # il corpo si fonde solo con la parte alta del braccio (spalla), mai con
    # avambraccio o mano: altrimenti la mano trascina il fianco/coscia
    for i, w in enumerate(pesi):
        if regione[i] in ("corpo", "testa"):
            w = {k: v for k, v in w.items() if not k.startswith(("avam_", "mano_"))}
        else:
            w = {k: v for k, v in w.items() if k not in ("corpo", "testa") or v > 0.0 and k == "corpo"
                 and not max(w, key=w.get).startswith(("avam_", "mano_"))}
        t = sum(w.values())
        pesi[i] = {k: v / t for k, v in w.items()}
    gruppi = {n: corpo.vertex_groups.new(name=n) for n in OSSA}
    for i, w in enumerate(pesi):
        for k, v in w.items():
            if v > 0.01:
                gruppi[k].add([i], v, 'REPLACE')
    mod = corpo.modifiers.new("Armatura", 'ARMATURE')
    mod.object = arm

    # --- 3. Posa del fucile (nel frame del corpo, poi si ruota tutto) ---
    F_old, lungh = frame_fucile(fucile)
    dir_mira = Matrix.Rotation(math.radians(ROTAZIONE_BUSTO_DEG), 3, 'Z') @ Vector((0, -1, 0))
    su = Vector((0, 0, 1))
    x = dir_mira.cross(su).normalized()
    F_new = Matrix((x, dir_mira, su)).transposed().to_4x4()
    F_new.translation = CALCIO
    M_fucile = F_new @ F_old.inverted()
    fucile.data.transform(M_fucile @ fucile.matrix_world)
    fucile.matrix_world = Matrix.Identity(4)

    # --- 4. Mani sul fucile: stessa presa dell'originale, fatta scorrere lungo l'asse ---
    rest = {b.name: arm.matrix_world @ b.matrix_local for b in arm_data.bones}

    # punto del grilletto: i vertici che sporgono sotto la cassa (ponticello)
    presa_dx = PRESA_DX
    if presa_dx is None:
        # il ponticello è un pezzo staccato della mesh del fucile, sotto l'asse:
        # si prendono i pezzi sciolti (escluso il corpo del fucile) e si tiene
        # quello col baricentro più in basso
        loc = [F_old.inverted() @ (M_fucile.inverted() @ v.co) for v in fucile.data.vertices]
        vicini_f = {i: [] for i in range(len(loc))}
        for e in fucile.data.edges:
            a, b = e.vertices
            vicini_f[a].append(b)
            vicini_f[b].append(a)
        visti, pezzi = set(), []
        for i in range(len(loc)):
            if i in visti:
                continue
            pila, pezzo = [i], []
            visti.add(i)
            while pila:
                k = pila.pop()
                pezzo.append(k)
                for j in vicini_f[k]:
                    if j not in visti:
                        visti.add(j)
                        pila.append(j)
            pezzi.append(pezzo)
        pezzi.sort(key=len, reverse=True)
        # solo i pezzi nella metà posteriore (esclude la baionetta in volata)
        piccoli = [pz for pz in pezzi[1:] if sum(loc[k].y for k in pz) / len(pz) < 0.5 * lungh]
        if piccoli:
            ponticello = min(piccoli, key=lambda pz: sum(loc[k].z for k in pz) / len(pz))
            presa_dx = sum(loc[k].y for k in ponticello) / len(ponticello)
        else:
            presa_dx = 0.30
        print(f"grilletto a {presa_dx:.2f} dal calcio")

    def obiettivo(lato, presa, gradi, inverti=False):
        H_old = rest["mano_" + lato]
        rel = F_old.inverted() @ H_old                      # mano nel frame del vecchio fucile
        # ruota la mano attorno all'asse del fucile fino all'angolo voluto
        h, t = Vector(OSSA["mano_" + lato][0]), Vector(OSSA["mano_" + lato][1])
        centro = F_old.inverted() @ ((h + t) / 2)
        phi = math.atan2(centro.z, centro.x) - math.radians(gradi)
        rot = Matrix.Rotation(phi, 4, 'Y')
        if inverti:
            # mano girata di 180° (dita verso la volata invece che verso il calcio)
            c = rot @ centro
            radiale = Vector((c.x, 0.0, c.z)).normalized()
            rot = Matrix.Translation(c) @ Matrix.Rotation(math.pi, 4, radiale) @ Matrix.Translation(-c) @ rot
        rel = rot @ rel
        # e la fa scorrere lungo l'asse fino al punto di presa
        rel = Matrix.Translation((0, presa - (rot @ centro).y, 0)) @ rel
        return F_new @ rel

    pb = arm.pose.bones
    for lato, presa, intervallo in (("R", presa_dx, INTERVALLO_PRESA_DX),
                                    ("L", PRESA_SX, INTERVALLO_PRESA_SX)):
        bersaglio = bpy.data.objects.new("IK_" + lato, None)
        scena.collection.objects.link(bersaglio)
        polo = bpy.data.objects.new("Polo_" + lato, None)
        scena.collection.objects.link(polo)
        polo.location = POLI[lato]

        ik = pb["avam_" + lato].constraints.new('IK')
        ik.target = bersaglio
        ik.pole_target = polo
        ik.chain_count = 2
        cr = pb["mano_" + lato].constraints.new('COPY_ROTATION')
        cr.target = bersaglio

        # Per ogni rotazione della presa si cerca l'angolo del polo che porta il
        # gomito più vicino al polo; fra tutte si tiene quella col polso più dritto
        # (angolo minimo fra avambraccio e mano).
        migliore = None
        for gradi_presa, inverti in [(g, i) for g in range(intervallo[0], intervallo[1] + 1, 10)
                                     for i in (False, True)]:
            bersaglio.matrix_world = obiettivo(lato, presa, gradi_presa, inverti)
            polo_migliore = None
            for gradi_polo in range(-180, 180, 15):
                ik.pole_angle = math.radians(gradi_polo)
                bpy.context.view_layer.update()
                gomito = arm.matrix_world @ pb["avam_" + lato].head
                d = (gomito - POLI[lato]).length
                if polo_migliore is None or d < polo_migliore[0]:
                    polo_migliore = (d, gradi_polo)
            ik.pole_angle = math.radians(polo_migliore[1])
            bpy.context.view_layer.update()
            av = pb["avam_" + lato]
            mn = pb["mano_" + lato]
            piega = (av.tail - av.head).angle(mn.tail - mn.head)
            # piccola penalità se il gomito resta lontano dal polo
            punteggio = math.degrees(piega) + 40.0 * polo_migliore[0]
            if migliore is None or punteggio < migliore[0]:
                migliore = (punteggio, gradi_presa, polo_migliore[1], math.degrees(piega), inverti)
        bersaglio.matrix_world = obiettivo(lato, presa, migliore[1], migliore[4])
        ik.pole_angle = math.radians(migliore[2])
        print(f"mano {lato}: presa {migliore[1]}°, polo {migliore[2]}°, piega polso {migliore[3]:.0f}°, girata {migliore[4]}")

    # --- 5. Testa ---
    pt = pb["testa"]
    pt.rotation_mode = 'XYZ'
    china = Matrix.Rotation(math.radians(-TESTA_CHINA_DEG), 4, dir_mira.cross(Vector((0, 0, 1))))
    inclina = Matrix.Rotation(math.radians(TESTA_INCLINA_DEG), 4, dir_mira)
    perno = Vector(OSSA["testa"][0])
    W = Matrix.Translation(perno) @ inclina @ china @ Matrix.Translation(-perno)
    Rm = rest["testa"]
    # la testa ruota verso la direzione di mira (sinistra del corpo)
    G = Matrix.Translation(perno) @ Matrix.Rotation(math.radians(TESTA_GIRO_DEG), 4, 'Z') @ Matrix.Translation(-perno)
    pt.matrix_basis = Rm.inverted() @ W @ G @ Rm
    bpy.context.view_layer.update()

    # --- 6. Applica: mesh in posa, poi rotazione finale di tutto ---
    dg = bpy.context.evaluated_depsgraph_get()
    ev = corpo.evaluated_get(dg)
    nuova = bpy.data.meshes.new_from_object(ev)
    corpo.modifiers.clear()
    vecchia = corpo.data
    corpo.data = nuova
    bpy.data.meshes.remove(vecchia)
    corpo.vertex_groups.clear()

    ang_fin = ROTAZIONE_BUSTO_DEG if RUOTA_FINALE else ROTAZIONE_BUSTO_DEG - ANGOLO_RIFERIMENTO
    R_fin = Matrix.Rotation(math.radians(-ang_fin), 4, 'Z')
    for o in oggetti.values():
        if o.name in DA_ELIMINARE:
            continue
        o.data.transform(R_fin @ o.matrix_world)
        o.matrix_world = Matrix.Identity(4)

    for n in ["Scheletro", "IK_R", "IK_L", "Polo_R", "Polo_L"]:
        ob = bpy.data.objects.get(n)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)

    # --- 7. Export OBJ statico ---
    for o in scena.objects:
        o.select_set(o in oggetti.values())
    bpy.ops.wm.obj_export(filepath=OBJ_OUT, export_selected_objects=True,
                          export_materials=True, forward_axis='NEGATIVE_Z', up_axis='Y')
    print("Esportato:", OBJ_OUT)


main()
