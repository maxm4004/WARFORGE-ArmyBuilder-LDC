import bpy
import math
from mathutils import Vector, Matrix
from mathutils.geometry import intersect_point_line

# =====================================================================
#  FUCILIERE - POSA "MIRA DA IN PIEDI" (fucile senza baionetta, orizzontale)
#  Importa l'OBJ, crea uno scheletro semplice, assegna i pesi, mette
#  in posa braccia e testa, aggancia il fucile alle mani, applica tutto
#  ed esporta un OBJ statico.
#  Il soldato originale guarda verso -Y, piedi a Z=0.
# =====================================================================

# >>> metti qui il percorso del tuo OBJ (il .mtl deve stare nella stessa cartella)
OBJ_IN = r"/home/claude/fus/fusilier.obj"
OBJ_OUT = OBJ_IN[:-4] + "_mira.obj"

# Rotazione del corpo per la posizione di tiro (spalla sinistra avanti).
# Il fucile a fine script punta sempre verso -Y (davanti alla base).
ROTAZIONE_BUSTO_DEG = 40.0
ALTEZZA_CANNA = 1.52          # quota dell'asse del fucile (altezza dell'occhio/guancia)
CALCIO = Vector((-0.12, -0.06, 1.52))   # calcio nell'incavo della spalla destra (frame del corpo)
PRESA_DX = 0.20               # distanza calcio -> mano destra (impugnatura)
PRESA_SX = 0.56               # distanza calcio -> mano sinistra (sotto la cassa)
LATO_PRESA_SX = -90.0        # mano sinistra sotto la cassa (angolo attorno all'asse: -90 = sotto)
LATO_PRESA_DX = -120.0       # mano destra sotto/di lato all'impugnatura (0 = lato destro)
PASSATE_SFUMATURA = 2        # quanto si sfumano i pesi alle giunture
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
POLI = {"R": Vector((-0.45, -0.30, 1.40)), "L": Vector((0.10, -0.35, 1.00))}

ACCESSORI = {"Zaino1": "corpo", "Object01": "corpo", "Object12": "corpo"}
FUCILE = "primary_weapon"
DA_ELIMINARE = ["secondary_weapon"]


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
    x = a.cross(su).normalized()
    su = x.cross(a).normalized()
    m = Matrix((x, a, su)).transposed().to_4x4()
    m.translation = calcio
    return m, lungh


def main():
    bpy.ops.wm.obj_import(filepath=OBJ_IN, use_split_groups=True)
    scena = bpy.context.scene
    # solo gli oggetti appena importati (l'import li lascia selezionati)
    oggetti = {o.name: o for o in bpy.context.selected_objects if o.type == 'MESH'}
    for n in DA_ELIMINARE:
        if n in oggetti:
            bpy.data.objects.remove(oggetti.pop(n), do_unlink=True)
    corpo = oggetti["Body_400"]
    fucile = oggetti[FUCILE]

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
    obiettivi = {}
    for lato, presa, lato_presa in (("R", PRESA_DX, LATO_PRESA_DX), ("L", PRESA_SX, LATO_PRESA_SX)):
        H_old = rest["mano_" + lato]
        rel = F_old.inverted() @ H_old                      # mano nel frame del vecchio fucile
        # ruota la mano attorno all'asse del fucile finché il palmo è dal lato voluto
        h, t = Vector(OSSA["mano_" + lato][0]), Vector(OSSA["mano_" + lato][1])
        centro = F_old.inverted() @ ((h + t) / 2)
        alfa = math.atan2(centro.z, centro.x)
        phi = alfa - math.radians(lato_presa)
        rel = Matrix.Rotation(phi, 4, 'Y') @ rel
        # e la fa scorrere lungo l'asse fino al punto di presa
        t_old = (Matrix.Rotation(phi, 4, 'Y') @ centro).y
        rel = Matrix.Translation((0, presa - t_old, 0)) @ rel
        obiettivi[lato] = F_new @ rel

    pb = arm.pose.bones
    for lato in ("R", "L"):
        bersaglio = bpy.data.objects.new("IK_" + lato, None)
        scena.collection.objects.link(bersaglio)
        bersaglio.matrix_world = obiettivi[lato]
        polo = bpy.data.objects.new("Polo_" + lato, None)
        scena.collection.objects.link(polo)
        polo.location = POLI[lato]

        ik = pb["avam_" + lato].constraints.new('IK')
        ik.target = bersaglio
        ik.pole_target = polo
        ik.pole_angle = math.radians(-90)
        ik.chain_count = 2
        cr = pb["mano_" + lato].constraints.new('COPY_ROTATION')
        cr.target = bersaglio

        # angolo del polo: si prova ogni 15° e si tiene quello che porta il gomito
        # più vicino al polo (dipende dal roll delle ossa, così non va indovinato)
        migliore = None
        for gradi in range(-180, 180, 15):
            ik.pole_angle = math.radians(gradi)
            bpy.context.view_layer.update()
            gomito = arm.matrix_world @ pb["avam_" + lato].head
            d = (gomito - POLI[lato]).length
            if migliore is None or d < migliore[0]:
                migliore = (d, gradi)
        ik.pole_angle = math.radians(migliore[1])

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

    R_fin = Matrix.Rotation(math.radians(-ROTAZIONE_BUSTO_DEG), 4, 'Z')
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
        o.select_set(o.name in oggetti)
    bpy.ops.wm.obj_export(filepath=OBJ_OUT, export_selected_objects=True,
                          export_materials=True, forward_axis='NEGATIVE_Z', up_axis='Y')
    print("Esportato:", OBJ_OUT)


main()
