/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_817761651")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "select2642823016",
    "maxSelect": 1,
    "name": "misura",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "4x3",
      "4x5"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_817761651")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "select2642823016",
    "maxSelect": 1,
    "name": "misura",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "4x1.5",
      "4x3",
      "4x5"
    ]
  }))

  return app.save(collection)
})
