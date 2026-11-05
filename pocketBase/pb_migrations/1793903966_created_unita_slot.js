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
        "cascadeDelete": true,
        "collectionId": "pbc_3596854844",
        "help": "",
        "hidden": false,
        "id": "relation2371425915",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_unita_base",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number4181610958",
        "max": null,
        "min": null,
        "name": "numero_slot",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3511663594",
        "help": "",
        "hidden": false,
        "id": "relation235782798",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_figura",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_3134814266",
    "indexes": [
      "CREATE UNIQUE INDEX idx_unita_slot ON unita_slot (id_unita_base, numero_slot)"
    ],
    "listRule": "",
    "name": "unita_slot",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3134814266");

  return app.delete(collection);
})
