/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_817761651")

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3887700433",
    "help": "",
    "hidden": false,
    "id": "relation1268048483",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_base",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_817761651")

  // remove field
  collection.fields.removeById("relation1268048483")

  return app.save(collection)
})
