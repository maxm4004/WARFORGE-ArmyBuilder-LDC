/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3511663594")

  // update collection data
  unmarshal({
    "name": "figura"
  }, collection)

  // remove field
  collection.fields.removeById("relation2134736701")

  // remove field
  collection.fields.removeById("relation46359732")

  // remove field
  collection.fields.removeById("relation2041017444")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3511663594")

  // update collection data
  unmarshal({
    "name": "unita"
  }, collection)

  // add field
  collection.fields.addAt(9, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1847179166",
    "help": "",
    "hidden": false,
    "id": "relation2134736701",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_offset",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_654351215",
    "help": "",
    "hidden": false,
    "id": "relation46359732",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_scale",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1764933864",
    "help": "",
    "hidden": false,
    "id": "relation2041017444",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_rotation",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
