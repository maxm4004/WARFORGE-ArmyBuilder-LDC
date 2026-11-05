/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1421693708",
        "max": 0,
        "min": 0,
        "name": "nome",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1124574758",
        "help": "",
        "hidden": false,
        "id": "relation1402081962",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_esercito",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3026460776",
        "help": "",
        "hidden": false,
        "id": "relation635884099",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_bpu",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_35116635942",
    "indexes": [],
    "listRule": "",
    "name": "unita",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_35116635942");

  return app.delete(collection);
})
