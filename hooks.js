var path = require('path')
  , express = require('ep_etherpad-lite/node_modules/express')
  , controller = require("./controllers/imageConvert");

exports.expressServer = function (hook_name, args, cb) {
  args.app.get('/imageConvert/:filename(*)', controller.onRequest);
}
