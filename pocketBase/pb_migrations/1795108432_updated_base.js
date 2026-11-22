/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3887700433")

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1858144116",
    "help": "",
    "hidden": false,
    "id": "relation1783572052",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_mesh",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1858144116",
    "help": "",
    "hidden": false,
    "id": "relation1883012865",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_diffuse",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1858144116",
    "help": "",
    "hidden": false,
    "id": "relation129162505",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "id_normal",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4181717822",
    "max": 0,
    "min": 0,
    "name": "urlmesh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2929841777",
    "max": 0,
    "min": 0,
    "name": "diffuse",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3887700433")

  // remove field
  collection.fields.removeById("relation1783572052")

  // remove field
  collection.fields.removeById("relation1883012865")

  // remove field
  collection.fields.removeById("relation129162505")

  // update field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4181717822",
    "max": 0,
    "min": 0,
    "name": "urlmesh",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2929841777",
    "max": 0,
    "min": 0,
    "name": "diffuse",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
