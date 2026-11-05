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
        "cascadeDelete": false,
        "collectionId": "pbc_2492658643",
        "help": "",
        "hidden": false,
        "id": "relation3680249161",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_reparto",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1101064607",
        "help": "",
        "hidden": false,
        "id": "relation905566443",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_tipo_reparto",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number794276730",
        "max": null,
        "min": null,
        "name": "figure",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
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
      }
    ],
    "id": "pbc_817761651",
    "indexes": [],
    "listRule": "",
    "name": "fpb",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_817761651");

  return app.delete(collection);
})
