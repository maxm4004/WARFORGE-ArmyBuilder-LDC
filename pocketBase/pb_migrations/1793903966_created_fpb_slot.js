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
        "collectionId": "pbc_817761651",
        "help": "",
        "hidden": false,
        "id": "relation2705129304",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_fpb",
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
      },
      {
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
      },
      {
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
      }
    ],
    "id": "pbc_2914383703",
    "indexes": [
      "CREATE UNIQUE INDEX idx_fpb_slot ON fpb_slot (id_fpb, numero_slot)"
    ],
    "listRule": "",
    "name": "fpb_slot",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2914383703");

  return app.delete(collection);
})
