var path = require('path');
var express = require('express');
var controller = require("./controllers/imageConvert");

exports.expressServer = function (hook_name, args, cb) {
  args.app.get('/imageConvert/:filename(*)', controller.onRequest);
}
