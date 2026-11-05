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
        "collectionId": "pbc_35116635942",
        "help": "",
        "hidden": false,
        "id": "relation4102833201",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_unita",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select3399166244",
        "maxSelect": 1,
        "name": "tipo_base",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Comando",
          "Standard"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2620572643",
        "max": null,
        "min": null,
        "name": "numero_basi",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_3596854844",
    "indexes": [],
    "listRule": "",
    "name": "unita_base",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3596854844");

  return app.delete(collection);
})
