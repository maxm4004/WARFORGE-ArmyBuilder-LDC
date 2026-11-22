/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1858144116")

  // add field
  collection.fields.addAt(13, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1101064607",
    "help": "",
    "hidden": false,
    "id": "relation905566443",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_tipo_reparto",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1858144116")

  // remove field
  collection.fields.removeById("relation905566443")

  return app.save(collection)
})
