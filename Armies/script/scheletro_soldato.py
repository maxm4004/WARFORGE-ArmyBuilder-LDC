import bpy
from mathutils import Vector

def crea_scheletro_mani_unico_osso():
    # 1. Verifica selezione mesh
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        print("Errore: Seleziona la mesh del soldato!")
        return

    if bpy.context.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    # Calcola proporzioni reali
    matrix = obj.matrix_world
    punti_mondo = [matrix @ Vector(corner) for corner in obj.bound_box]
    z_min = min(p.z for p in punti_mondo)
    z_max = max(p.z for p in punti_mondo)
    altezza = z_max - z_min
    
    z_bacino = z_min + (altezza * 0.5)
    z_petto = z_min + (altezza * 0.7)
    y_centro = obj.location.y
    
    x_spalla = altezza * 0.1
    x_gomito = altezza * 0.25
    x_polso = altezza * 0.45
    x_punta_mano = altezza * 0.51
    
    mesh_name = obj.name
    
    # 2. Crea l'armatura vuota
    arm_data = bpy.data.armatures.new("Dati_Scheletro")
    arm_obj = bpy.data.objects.new("Scheletro_Mani_Unico", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    
    # Attiva l'armatura ed entra in Edit Mode
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')
    
    # Crea la colonna
    spine = arm_data.edit_bones.new("Spine")
    spine.head = (0, y_centro, z_bacino)
    spine.tail = (0, y_centro, z_petto)

    # --- LATO SINISTRO ---
    spalla_L = arm_data.edit_bones.new("Spalla.L")
    spalla_L.head = (0, y_centro, z_petto)
    spalla_L.tail = (x_spalla, y_centro, z_petto)
    spalla_L.parent = spine

    braccio_L = arm_data.edit_bones.new("Braccio.L")
    braccio_L.head = (x_spalla, y_centro, z_petto)
    braccio_L.tail = (x_gomito, y_centro, z_petto)
    braccio_L.parent = spalla_L

    avambraccio_L = arm_data.edit_bones.new("Avambraccio.L")
    avambraccio_L.head = (x_gomito, y_centro, z_petto)
    avambraccio_L.tail = (x_polso, y_centro, z_petto)
    avambraccio_L.parent = braccio_L

    mano_L = arm_data.edit_bones.new("Mano.L")
    mano_L.head = (x_polso, y_centro, z_petto)
    mano_L.tail = (x_punta_mano, y_centro, z_petto)
    mano_L.parent = avambraccio_L

    # --- LATO DESTRO ---
    spalla_R = arm_data.edit_bones.new("Spalla.R")
    spalla_R.head = (0, y_centro, z_petto)
    spalla_R.tail = (-x_spalla, y_centro, z_petto)
    spalla_R.parent = spine

    braccio_R = arm_data.edit_bones.new("Braccio.R")
    braccio_R.head = (-x_spalla, y_centro, z_petto)
    braccio_R.tail = (-x_gomito, y_centro, z_petto)
    braccio_R.parent = spalla_R

    avambraccio_R = arm_data.edit_bones.new("Avambraccio.R")
    avambraccio_R.head = (-x_gomito, y_centro, z_petto)
    avambraccio_R.tail = (-x_polso, y_centro, z_petto)
    avambraccio_R.parent = braccio_R

    mano_R = arm_data.edit_bones.new("Mano.R")
    mano_R.head = (-x_polso, y_centro, z_petto)
    mano_R.tail = (-x_punta_mano, y_centro, z_petto)
    mano_R.parent = avambraccio_R

    # 3. Torna in Object Mode e collega la mesh
    bpy.ops.object.mode_set(mode='OBJECT')
    
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj = bpy.data.objects[mesh_name]
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    # Parent con pesi automatici
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    print("Esecuzione completata con successo!")

crea_scheletro_mani_unico_osso()
