import bpy, json, math, heapq, os
from mathutils import Vector, Matrix

# =====================================================================
#  AUTO-RIG + LIBRERIA POSE per miniature umanoidi (OBJ, in piedi, guarda -Y)
#
#  MODO = "proponi"          importa OBJ_IN, stima lo scheletro, crea pesi e
#                            modificatore Armatura -> correggi le ossa in Edit Mode
#                            e prova le pose in Pose Mode
#  MODO = "salva_scheletro"  salva le ossa dell'oggetto "Scheletro" in SCHELETRO_JSON
#  MODO = "salva_posa"       salva la posa attuale di "Scheletro" come NOME_POSA in POSE_JSON
#  MODO = "applica"          per ogni file in LISTA_OBJ: scheletro da SCHELETRO_JSON,
#                            pesi, posa NOME_POSA, export "<nome>_<posa>.obj"
#
#  Gli accessori (armi, zaino...) seguono rigidi l'osso più vicino.
# =====================================================================

MODO = "proponi"
path = r"E:\Wargaming-DEV\Warforge-LDC\model\mesh"
OBJ_IN = path + r"\NTW_unit_french_voltiguer.obj"
CORPO = None                      # nome del gruppo del corpo; None = mesh più grande
SCHELETRO_JSON = path + r"\json\scheletro.json"
POSE_JSON = path + r"\json\pose.json"
NOME_POSA = "mira"
LISTA_OBJ = [OBJ_IN]a
DA_ELIMINARE = []                 # es. ["secondary_weapon"]
PASSATE_SFUMATURA = 2

# osso: (padre)
GERARCHIA = {
    "bacino": None, "petto": "bacino", "testa": "petto",
    "brac_R": "petto", "avam_R": "brac_R", "mano_R": "avam_R",
    "brac_L": "petto", "avam_L": "brac_L", "mano_L": "avam_L",
    "coscia_R": "bacino", "gamba_R": "coscia_R", "piede_R": "gamba_R",
    "coscia_L": "bacino", "gamba_L": "coscia_L", "piede_L": "gamba_L",
}


# ---------------------------------------------------------------------
def importa(path):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.wm.obj_import(filepath=path, use_split_groups=True)
    ogg = {o.name: o for o in bpy.context.selected_objects if o.type == 'MESH'}
    for n in DA_ELIMINARE:
        if n in ogg:
            bpy.data.objects.remove(ogg.pop(n), do_unlink=True)
    corpo = ogg[CORPO] if CORPO else max(ogg.values(), key=lambda o: len(o.data.vertices))
    return corpo, ogg


def grafo(V, E):
    adj = {i: [] for i in range(len(V))}
    for a, b in E:
        L = (V[a] - V[b]).length
        adj[a].append((b, L))
        adj[b].append((a, L))
    return adj


def dijkstra(adj, semi):
    """semi: {indice: etichetta}. Ritorna (distanza, etichetta) per vertice."""
    n = len(adj)
    dist, lab, coda = [1e9] * n, [None] * n, []
    for i, k in semi.items():
        dist[i], lab[i] = 0.0, k
        heapq.heappush(coda, (0.0, i))
    while coda:
        d, i = heapq.heappop(coda)
        if d > dist[i]:
            continue
        for j, L in adj[i]:
            if d + L < dist[j]:
                dist[j], lab[j] = d + L, lab[i]
                heapq.heappush(coda, (d + L, j))
    return dist, lab


def dist_seg(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
    return (p - (a + ab * t)).length


# ---------------------------------------------------------------------
def stima_scheletro(V, adj):
    H = max(p.z for p in V)
    def media(cond, fallback):
        s = [p for p in V if cond(p)]
        return sum(s, Vector()) / len(s) if s else Vector(fallback)

    bac = media(lambda p: abs(p.z - 0.52 * H) < 0.03 * H, (0, 0, 0.52 * H))
    pet = media(lambda p: abs(p.z - 0.70 * H) < 0.03 * H, (0, 0, 0.70 * H))
    col = media(lambda p: abs(p.z - 0.83 * H) < 0.02 * H, (0, 0, 0.83 * H))
    gambe = [p.x for p in V if p.z < 0.45 * H]
    bac.x = (min(gambe) + max(gambe)) / 2 if gambe else bac.x     # asse di simmetria dalle gambe
    pet.x = col.x = bac.x
    cima = Vector((col.x, col.y, H))
    J = {"bacino": (bac, pet), "petto": (pet, col), "testa": (col, cima)}

    # mani: i punti più lontani dal collo lungo la superficie, sopra le ginocchia
    i_col = min(range(len(V)), key=lambda i: (V[i] - col).length)
    dcol, _ = dijkstra(adj, {i_col: 0})
    fascia = [p for p in V if abs(p.z - 0.80 * H) < 0.04 * H]
    for lato, s in (("R", -1), ("L", 1)):
        cand = [i for i, p in enumerate(V) if p.z > 0.5 * H and s * (p.x - bac.x) > 0 and dcol[i] < 1e8]
        i_mano = max(cand, key=lambda i: dcol[i] + s * (V[i].x - bac.x))
        estremo = max((s * (p.x - bac.x) for p in fascia), default=0.2 * H)
        spalla = Vector((bac.x + s * 0.75 * estremo, pet.y, 0.80 * H))
        dm, _ = dijkstra(adj, {i_mano: 0})
        i_sp = min(range(len(V)), key=lambda i: (V[i] - spalla).length)
        Lb = dm[i_sp]
        def banda(f, w):
            s_ = [V[i] for i in range(len(V)) if abs(dm[i] - f * Lb) < w * Lb]
            return sum(s_, Vector()) / len(s_) if s_ else V[i_mano]
        gom, pol, punta = banda(0.5, 0.07), banda(0.18, 0.05), banda(0.0, 0.05)
        J["brac_" + lato] = (spalla, gom)
        J["avam_" + lato] = (gom, pol)
        J["mano_" + lato] = (pol, punta)

        lato_g = lambda p, s=s: s * (p.x - bac.x) > 0
        anca = media(lambda p: lato_g(p) and abs(p.z - 0.47 * H) < 0.03 * H, (s * 0.1 * H, 0, 0.47 * H))
        anca.z = 0.50 * H
        gin = media(lambda p: lato_g(p) and abs(p.z - 0.28 * H) < 0.03 * H, (anca.x, anca.y, 0.28 * H))
        cav = media(lambda p: lato_g(p) and abs(p.z - 0.06 * H) < 0.03 * H, (anca.x, anca.y, 0.06 * H))
        piede = [p for p in V if lato_g(p) and p.z < 0.05 * H]
        punta_p = min(piede, key=lambda p: p.y) if piede else cav + Vector((0, -0.1 * H, 0))
        J["coscia_" + lato] = (anca, gin)
        J["gamba_" + lato] = (gin, cav)
        J["piede_" + lato] = (cav, Vector((punta_p.x, punta_p.y, 0.02 * H)))
    return {k: (list(a), list(b)) for k, (a, b) in J.items()}


def crea_armatura(J):
    ad = bpy.data.armatures.new("Scheletro")
    arm = bpy.data.objects.new("Scheletro", ad)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for n in GERARCHIA:
        b = ad.edit_bones.new(n)
        b.head, b.tail = Vector(J[n][0]), Vector(J[n][1])
    for n, p in GERARCHIA.items():
        if p:
            ad.edit_bones[n].parent = ad.edit_bones[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def assegna_pesi(corpo, arm, J, adj, V):
    # semi: vertici chiaramente vicini a un solo osso; poi crescita lungo la superficie
    semi = {}
    for i, p in enumerate(V):
        d = sorted((dist_seg(p, Vector(a), Vector(b)), n) for n, (a, b) in J.items())
        if d[0][0] < 0.5 * d[1][0]:
            semi[i] = d[0][1]
    _, lab = dijkstra(adj, semi)
    pesi = [{(l or "bacino"): 1.0} for l in lab]
    for _ in range(PASSATE_SFUMATURA):
        nuovi = []
        for i, w in enumerate(pesi):
            acc = {k: v * 2.0 for k, v in w.items()}
            for j, _L in adj[i]:
                for k, v in pesi[j].items():
                    acc[k] = acc.get(k, 0.0) + v
            t = sum(acc.values())
            nuovi.append({k: v / t for k, v in acc.items()})
        pesi = nuovi
    corpo.vertex_groups.clear()
    gr = {n: corpo.vertex_groups.new(name=n) for n in GERARCHIA}
    for i, w in enumerate(pesi):
        for k, v in w.items():
            if v > 0.01:
                gr[k].add([i], v, 'REPLACE')
    m = corpo.modifiers.new("Armatura", 'ARMATURE')
    m.object = arm


def osso_vicino(obj, J):
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    c = sum(vs, Vector()) / len(vs)
    return min(J, key=lambda n: dist_seg(c, Vector(J[n][0]), Vector(J[n][1])))


def prepara(path, J=None):
    corpo, ogg = importa(path)
    V = [corpo.matrix_world @ v.co for v in corpo.data.vertices]
    adj = grafo(V, [tuple(e.vertices) for e in corpo.data.edges])
    if J is None:
        J = stima_scheletro(V, adj)
    arm = crea_armatura(J)
    assegna_pesi(corpo, arm, J, adj, V)
    accessori = {n: osso_vicino(o, J) for n, o in ogg.items() if o is not corpo}
    for n, b in accessori.items():                       # seguono l'osso (prova in Pose Mode)
        o = ogg[n]
        mw = o.matrix_world.copy()
        o.parent, o.parent_type, o.parent_bone = arm, 'BONE', b
        o.matrix_world = mw
    return corpo, ogg, arm


# ---------------------------------------------------------------------
def main():
    if MODO == "proponi":
        prepara(OBJ_IN)
        print("Scheletro proposto: correggi le ossa in Edit Mode, poi MODO='salva_scheletro'")

    elif MODO == "salva_scheletro":
        arm = bpy.data.objects["Scheletro"]
        J = {b.name: (list(arm.matrix_world @ b.head_local), list(arm.matrix_world @ b.tail_local))
             for b in arm.data.bones}
        json.dump(J, open(SCHELETRO_JSON, "w"), indent=1)
        print("Salvato", SCHELETRO_JSON)

    elif MODO == "salva_posa":
        arm = bpy.data.objects["Scheletro"]
        lib = json.load(open(POSE_JSON)) if os.path.exists(POSE_JSON) else {}
        lib[NOME_POSA] = {pb.name: [list(r) for r in pb.matrix_basis] for pb in arm.pose.bones}
        json.dump(lib, open(POSE_JSON, "w"), indent=1)
        print("Posa salvata:", NOME_POSA)

    elif MODO == "applica":
        J = json.load(open(SCHELETRO_JSON))
        posa = json.load(open(POSE_JSON))[NOME_POSA]
        for path in LISTA_OBJ:
            corpo, ogg, arm = prepara(path, J)
            for pb in arm.pose.bones:
                if pb.name in posa:
                    pb.matrix_basis = Matrix(posa[pb.name])
            bpy.context.view_layer.update()
            dg = bpy.context.evaluated_depsgraph_get()
            for o in ogg.values():                       # cuoce posa e accessori in mesh statiche
                mw = o.matrix_world.copy()
                me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
                o.modifiers.clear()
                o.parent = None
                o.data = me
                o.data.transform(mw)
                o.matrix_world = Matrix.Identity(4)
                o.vertex_groups.clear()
            bpy.data.objects.remove(arm, do_unlink=True)
            bpy.ops.object.select_all(action='DESELECT')
            for o in ogg.values():
                o.select_set(True)
            out = os.path.splitext(path)[0] + "_" + NOME_POSA + ".obj"
            bpy.ops.wm.obj_export(filepath=out, export_selected_objects=True, export_materials=True)
            for o in list(ogg.values()):
                bpy.data.objects.remove(o, do_unlink=True)
            print("Esportato", out)


main()
