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
        "collectionId": "pbc_1557972799",
        "help": "",
        "hidden": false,
        "id": "relation319951269",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "id_brigata",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
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
        "id": "number1652106695",
        "max": 5,
        "min": 1,
        "name": "morale",
        "onlyInt": true,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select525186912",
        "maxSelect": 1,
        "name": "arma",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "Moschetto",
          "Moschetto rigato",
          "Sciabola",
          "Lancia",
          "Artiglieria leggera",
          "Artiglieria media",
          "Artiglieria pesante"
        ]
      }
    ],
    "id": "pbc_719137391",
    "indexes": [],
    "listRule": "",
    "name": "schierata",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_719137391");

  return app.delete(collection);
})
