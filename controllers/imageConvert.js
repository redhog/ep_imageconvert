/**
 * Copyright 2009 RedHog, Egil Möller <egil.moller@piratpartiet.se>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins');

function prepareExecArgs(args) {
  if (!args.length) return "";
  return "'" + args.join("' '") + "'"
}

function getPages(filename, cb) {
  child_process.exec(
    prepareExecArgs([path.normalize(path.join(__dirname, "..", "getPages.sh")), filename]),
    function (err, stdout, stderr) {
      if (err) return cb(err);
      return cb(null, {pages:parseInt(stdout)});
    }
  );
}

function getSize(filename, page, cb) {
  child_process.exec(
    prepareExecArgs([path.normalize(path.join(__dirname, "..", "getSize.sh")), filename, page+1]),
    function (err, stdout, stderr) {
      if (err) return cb(err);
      var lines = stdout.split("\n");
        return cb(null, {w: parseFloat(lines[0]),
                         h: parseFloat(lines[1])});
    }
  );
}

function convertImage(inFileName, page, outFileName, offset, size, pixelOffset, pixelSize, cb) {
  fs.stat(outFileName, function (err, stat) {
    if (!err) return cb(null);

    var cmd;

    if (inFileName.split(".").pop().toLowerCase() == 'pdf') {
      var dpi = {x: pixelSize.w * 72.0 / size.w,
                 y: pixelSize.h * 72.0 / size.h};

      cmd = [path.normalize(path.join(__dirname, "..", "convertImage.sh")),
             inFileName,
             outFileName,
             page + 1,
             dpi.x, dpi.y,
             pixelOffset.x, pixelOffset.y,
             pixelSize.w, pixelSize.h];
    } else {
      cmd = ["convert",
             "-crop",
             "" + size.w + "x" + size.h + "+" + offset.x + "+" + offset.y,
             "-scale",
             "" + pixelSize.w + "x" + pixelSize.w,
             inFileName + "["+page+"]",
             outFileName];
    }

    child_process.exec(
      prepareExecArgs(cmd),
      function (err, stdout, stderr) {
          return cb(err);
      }
    );
  });
}

exports.onRequest = function(req, res) {
  var filePath =  path.normalize(path.join(plugins.plugins.ep_fileupload.package.path, "upload", req.params.filename))
  var page = req.query.p === undefined ? 0 : parseInt(req.query.p);
  var offset = {x:(req.query.x === undefined) ? 0 : parseFloat(req.query.x),
		y:(req.query.y === undefined) ? 0 : parseFloat(req.query.y)};
  var size = {w:(req.query.w === undefined) ? 0 : parseFloat(req.query.w),
	      h:(req.query.h === undefined) ? 0 : parseFloat(req.query.h)};
  var pixelOffset = {x:(req.query.px === undefined) ? 0 : parseFloat(req.query.px),
		     y:(req.query.py === undefined) ? 0 : parseFloat(req.query.py)};
  var pixelSize = {w:(req.query.pw === undefined) ? 0 : parseFloat(req.query.pw),
		   h:(req.query.ph === undefined) ? 0 : parseFloat(req.query.ph)};

  if (req.query.action == "getPages") {
    getPages(filePath, function (err, pages) {
      res.send(JSON.stringify(pages), {'Content-Type': 'text/plain'});
    });
  } else if (req.query.action == "getSize") {
    getSize(filePath, page, function (err, imageSize) {
      res.send(JSON.stringify(imageSize), {'Content-Type': 'text/plain'});
    });
  } else {
    var outFileName = filePath.split(".");
    var extension = outFileName.pop();
    outFileName.push("" + page + ":" + offset.x + "," +  offset.y + ":" + size.w + "," +  size.h + ":" + pixelSize.w + "," +  pixelSize.h);
    outFileName.push("png");
    outFileName = outFileName.join(".");

    convertImage(filePath, page, outFileName, offset, size, pixelOffset, pixelSize, function (err) {
      res.contentType("image/png");
      res.sendfile(outFileName)
    });
  }
}
