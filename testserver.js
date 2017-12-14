<!--
'use strict';
var fs = require('fs');
var os = require('os');
var url = require('url');
var exec = require('child_process').exec;

// http://stackoverflow.com/a/38897674/1414809
function fileSizeSI(size) {
  var e = (Math.log(size) / Math.log(1e3)) | 0;
  return Math.floor(size / Math.pow(1e3, e)) + ('kMGTPEZY'[e - 1] || '') + 'B';
}

// http://stackoverflow.com/a/6234804
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// http://stackoverflow.com/a/9756789
function quoteattr(s) {
  return escapeHtml(s).replace(/\r\n/g, '\n').replace(/[\r\n]/g, '\n');
}

// https://gist.github.com/ebraminio/a2e4338ce29d71156ea1703f5aaec4b6
var contentTypes = {
  html: 'text/html', htm: 'text/html', shtml: 'text/html', css: 'text/css',
  xml: 'text/xml', gif: 'image/gif', jpeg: 'image/jpeg', jpg: 'image/jpeg',
  js: 'application/javascript', atom: 'application/atom+xml',
  rss: 'application/rss+xml', mml: 'text/mathml', txt: 'text/plain',
  jad: 'text/vnd.sun.j2me.app-descriptor', wml: 'text/vnd.wap.wml',
  htc: 'text/x-component', png: 'image/png', tif: 'image/tiff',
  tiff: 'image/tiff', wbmp: 'image/vnd.wap.wbmp', ico: 'image/x-icon',
  jng: 'image/x-jng', bmp: 'image/x-ms-bmp', svg: 'image/svg+xml',
  svgz: 'image/svg+xml', webp: 'image/webp', md: 'text/markdown',
  woff: 'application/font-woff', jar: 'application/java-archive',
  war: 'application/java-archive', ear: 'application/java-archive',
  json: 'application/json', hqx: 'application/mac-binhex40',
  doc: 'application/msword', pdf: 'application/pdf',
  ps: 'application/postscript', eps: 'application/postscript',
  ai: 'application/postscript', rtf: 'application/rtf',
  m3u8: 'application/vnd.apple.mpegurl', xls: 'application/vnd.ms-excel',
  eot: 'application/vnd.ms-fontobject', ppt: 'application/vnd.ms-powerpoint',
  wmlc: 'application/vnd.wap.wmlc', kml: 'application/vnd.google-earth.kml+xml',
  kmz: 'application/vnd.google-earth.kmz', '7z': 'application/x-7z-compressed',
  cco: 'application/x-cocoa', jardiff: 'application/x-java-archive-diff',
  jnlp: 'application/x-java-jnlp-file', run: 'application/x-makeself',
  pl: 'application/x-perl', pm: 'application/x-perl', prc: 'application/x-pilot',
  pdb: 'application/x-pilot', rar: 'application/x-rar-compressed',
  rpm: 'application/x-redhat-package-manager', sea: 'application/x-sea',
  swf: 'application/x-shockwave-flash', sit: 'application/x-stuffit',
  tcl: 'application/x-tcl', tk: 'application/x-tcl',
  der: 'application/x-x509-ca-cert', pem: 'application/x-x509-ca-cert',
  crt: 'application/x-x509-ca-cert', xpi: 'application/x-xpinstall',
  xhtml: 'application/xhtml+xml', xspf: 'application/xspf+xml',
  zip: 'application/zip', bin: 'application/octet-stream',
  exe: 'application/octet-stream', dll: 'application/octet-stream',
  deb: 'application/x-debian-package', dmg: 'application/octet-stream',
  iso: 'application/octet-stream', img: 'application/octet-stream',
  msi: 'application/octet-stream', msp: 'application/octet-stream',
  msm: 'application/octet-stream',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mid: 'audio/midi', midi: 'audio/midi', kar: 'audio/midi', mp3: 'audio/mpeg',
  ogg: 'audio/ogg', m4a: 'audio/x-m4a',
  ra: 'audio/x-realaudio', '3gpp': 'video/3gpp', '3gp': 'video/3gpp',
  ts: 'video/mp2t', mp4: 'video/mp4', mpeg: 'video/mpeg', mpg: 'video/mpeg',
  mov: 'video/quicktime', webm: 'video/webm', flv: 'video/x-flv',
  m4v: 'video/x-m4v', mng: 'video/x-mng', asx: 'video/x-ms-asf', asf: 'video/x-ms-asf',
  wmv: 'video/x-ms-wmv', avi: 'video/x-msvideo', mkv: 'video/webm', mime: 'www/mime',
  tar: 'application/x-tar', tgz: 'application/x-tar-gz', gz: 'application/x-gzip'
};

var argv = process.argv;
try {
  var config = require('./config.json');
  argv = argv.concat(config.argv || []);
} catch (e) {}

function hasOption(option) {
  return argv.indexOf(option) !== -1;
}

function getOption(option) {
  var arg = argv.filter(function (arg) {
    return arg.indexOf(option + '=') === 0;
  })[0];
  return arg ? arg.split('=')[1] : false;
}

var port = +process.env.PORT || +argv[2] || 9090;

var localOnly = hasOption('--local');
var allowDelete = hasOption('--delete');
var allowRename = hasOption('--rename');
var noCors = hasOption('--no-cors');
var noInfo = hasOption('--no-info');
var noMime = hasOption('--no-mime');
var noUpload = hasOption('--no-upload');
var noIndex = hasOption('--no-index');
var https = hasOption('--https');
var cmd = hasOption('--cmd');

// 'wx' disallows file replace
var writeFlag = hasOption('--replace') ? 'w' : 'wx';

var userpass = getOption('--userpass');
// early convert the given username and password pair to base64
if (userpass) userpass = new Buffer(userpass).toString('base64');

var prefix = getOption('--prefix');
if (prefix && prefix[0] !== '/')
  prefix = '/' + prefix;
var servedir = getOption('--servedir');

var timeout = +getOption('--timeout') || 10;

if (hasOption('-h') || hasOption('--help')) {
  console.log([
    'Usage: pad [PORT] [OPTION]...',
    '',
    'Options:',
    '      --local      run only on localhost',
    '      --no-cors    don\'t allow Cross-Origin Resource Sharing (CORS)',
    '      --no-info    hide extra info pad.js gives',
    '      --no-mime    don\'t add dangerous mime, for more safety',
    '      --no-upload  disable uploads',
    '      --no-index   disable index creation for folders',
    '      --delete     allow file deletion',
    '      --rename     allow file rename',
    '      --replace    allow file replace',
    '      --cmd        enable executing commands',
    '      --https      enable https',
    '  -h, --help       display this help and exit',
    '',
    '      --userpass=user:pass  run pad.js instance password protected',
    '      --prefix=/prefix      expect pad.js to have the specified prefix',
    '      --servedir=/files     serve pad.js from the specified directory',
    '      --timeout=10          minutes to exit if no request is issued,',
    '                            default is 10, -1 to disable',
    '',
    'The PORT argument is an integer and optional, its default value is 9090',
    'and can be set from environment variables also'
  ].join('\n'));
  process.exit();
}

if (servedir) {
  process.chdir(servedir);
}
var cwd = process.cwd() + '/';


var lastActivityTimestamp = Date.now();
if (timeout !== -1) {
  setInterval(function () {
    if (Date.now() - lastActivityTimestamp > timeout * 60 * 1000) {
      console.log('pad.js exited due to inactivity, set --timeout=-1 to disable this feature.');
      process.exit();
    }
  }, 60 * 1000);
}

(https ? function (requestListener) {
  return require('https').createServer({
    key: fs.readFileSync('/etc/ssl/pad.js/pad.js.key'),
    cert: fs.readFileSync('/etc/ssl/pad.js/pad.js.crt')
  }, requestListener);
} : require('http').createServer)(function (req, res) {
  lastActivityTimestamp = Date.now();

  if (userpass && ((req.headers.authorization || '').split(' ')[1] || '') !== userpass) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="nope"' });
    return res.end('HTTP Error 401 Unauthorized: Access is denied');
  }

  if (noCors && req.headers.origin &&
      url.parse(req.headers.origin).host !== req.headers.host) {
    res.writeHead(403);
    return res.end('HTTP Error 403 CORS is not allowed');
  }

  if (noUpload && ['POST', 'PUT'].indexOf(req.method) !== -1) {
    res.writeHead(405);
    return res.end('HTTP Error 405 Method Not Allowed');
  }

  var path = req.url.split('?')[0];
  try {
    path = decodeURI(path);
  } catch (e) {
    res.writeHead(400);
    return res.end('HTTP Error 400 Bad Request, error on parsing url');
  }
  if (prefix) {
    if (path.indexOf(prefix) === 0) {
      path = path.replace(prefix, '');
    } else {
      res.writeHead(302, { 'Location': prefix + req.url });
      return res.end();
    }
  }
  if (cmd) {
    if (path.indexOf('/@cmd/') === 0) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return exec(decodeURI(req.url).split('/@cmd/')[1] + ' 2>&1').stdout.pipe(res);
    }
  }
  path = path.replace(/^[\/\\]+/, '').replace(/(^|[\/\\])\.\.(?=[\/\\]|$)/g, '');

  if (allowRename && req.method === 'PATCH') {
    var from = path.split('@')[0];
    var to = path.split('@')[1];
    try {
      if ((fs.realpathSync(from.replace(/[^\/\\]+$/, '')) + '/').indexOf(cwd) === 0 &&
          (fs.realpathSync(to.replace(/[^\/\\]+$/, '')) + '/').indexOf(cwd) === 0) {
        return fs.rename(cwd + from, cwd + to, function () {
          return res.end();
        });
      } else {
        res.writeHead(500);
        return res.end('HTTP Error 500 Internal Error, error on move');
      }
    } catch (e) {
      res.writeHead(500);
      return res.end('HTTP Error 500 Internal Error, exception on move, ' + e);
    }
  }

  try {
    if ((fs.realpathSync(path.replace(/[^\/\\]+$/, '')) + '/').indexOf(cwd) !== 0) {
      res.writeHead(404);
      return res.end('HTTP Error 404 File not found, invalid path');
    }
  } catch (e) {
    // a rare case
    res.writeHead(404);
    return res.end('HTTP Error 404 File not found, error');
  }

  if (allowDelete && req.method === 'DELETE') {
    return fs.stat(cwd + path, function (err, stats) {
      if (err) {
        console.error(err.message);
        return res.end('HTTP 404 File not found, invalid path to delete');
      }
      if (stats.isDirectory()) {
        return fs.rmdir(cwd + path, function (err) {
          if (err) {
            res.writeHead(500);
            return res.end('HTTP Error 500 ' + err.message);
          }
          res.end('OK');
        });
      }
      return fs.unlink(cwd + path, function () {
        if (err) {
          res.writeHead(500);
          return res.end('HTTP Error 500 ' + err.message);
        }
        res.end();
      });
    });
  }

  if (req.method === 'PUT') {
    return fs.mkdir(cwd + path, function () {
      return res.end();
    });
  }

  if (req.method === 'POST') {
    // aggregate received chunks of file
    var bufferArray = [];
    req.on('data', function (data) {
      bufferArray.push(data);
    });

    return req.on('end', function () {
      var buffer = Buffer.concat(bufferArray);

      // buffer.indexOf('\r\n\r\n') + 4 but for older nodes, 13 => '\r'
      for (var start = 4; start < buffer.length; ++start)
        if (buffer[start - 2] === 13 && buffer[start - 4] === 13) break;

      // buffer.lastIndexOf('\r\n-') but for older nodes, 13 => '\r', 45 => '-'
      for (var end = buffer.length - 1 - 2; end >= 0; --end)
        if (buffer[end] === 13 && buffer[end + 2] === 45) break;

      fs.writeFile(cwd + path, buffer.slice(start, end), { flag: writeFlag }, function (err) {
        if (err) {
          console.error(err.message);
          res.writeHead(409);
          return res.end('HTTP Error 409 Conflict, a file with same name exists');
        }

        console.log('"' + path + '" SAVED!');
        res.writeHead(200, {
          'Content-Type' : 'text/plain',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end('OK');
      });
    });
  }

  return fs.stat(cwd + path, function (err, stats) {
    if (err) {
      if (path.indexOf('favicon.ico') === -1) // don't show error for lack of favicon
        console.error('"' + path + '" was requested but not found.');
      res.writeHead(404);
      return res.end('HTTP 404 File not found');
    }

    if (stats.isSymbolicLink()) {
      console.error('"' + path + '" a symlink was requested but got denied.');
      res.writeHead(403);
      return res.end('HTTP 403 Serving symlink is forbidden, at least for now');
    }

    if (!stats.isDirectory()) { // i.e. is a file
      var contentType = contentTypes[path.replace(/^.*\.(.*)$/, "$1")];

      if (contentType === undefined) // fallback mime
        contentType = 'application/octet-stream';

      if (contentType.indexOf('text/') === 0 ||
          contentType === 'application/json')
        contentType = contentType + '; charset=utf-8';

      if (noMime && !/^(audio|video)\//.test(contentType))
        contentType = 'application/octet-stream';

      // http://stackoverflow.com/a/28972079/1414809
      if (req.headers.range) {
        var parts = req.headers.range.replace(/bytes=/, "").split("-");

        var start = +parts[0];
        var end = parts[1] ? +parts[1] : stats.size - 1;
        console.log('"' + path + '" SERVED! RANGE: ' + start + ' - ' + end);

        res.writeHead(206, {
          'Content-Range': 'bytes ' + start + '-' + end + '/' + stats.size,
          'Accept-Ranges': 'bytes',
          'Content-Length': (end - start) + 1,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        var Throttle = require('throttle');
        var throttle = new Throttle(1000);
        return fs.createReadStream(path, { start: start, end: end }).pipe(throttle).pipe(res);
      }

      console.log('"' + path + '" SERVED!');
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      return fs.createReadStream(path).pipe(res);
    }

    // so is a directory, create and serve directory index page
    if (!req.url.match(/\/$/)) {
      res.writeHead(302, { 'Location': req.url + '/' });
      return res.end();
    }

    if (noIndex) {
      res.writeHead(403);
      console.error('"' + path + '" index was requested but rejected due to configs.');
      return res.end('Access is denied');
    }

    return fs.readdir(cwd + path, function (err, dir) {
      return res.end([
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        ' <meta charset="utf-8">',
        ' <link rel="icon" href="data:,">',
        ' <style>',
          'td:nth-child(3), th:nth-child(3) { text-align: right; }',
          'th, td { padding: 0 14px 0 0; } th { padding-bottom: 3px; }',
          'a, a:active { text-decoration: none; }',
          'a { color: blue; }',
          'a:visited { color: #48468F; }',
          'a:hover, a:focus { text-decoration: underline; color: red; }',
          'body { background-color: #F5F5F5; }',
          '@media (max-width: 800px) {',
          '  table, tbody, tr { display: block; }',
          '  td:nth-child(2), td:nth-child(4), thead { display: none; }',
          '  td:nth-child(1), td:nth-child(3) { display: inline; }',
          '  td:nth-child(3) { float: right; }',
          '  tr, h2 { font-size: 300%; }',
          '  input[type="file"] { font-size: 90%; }',
          '}',
        ' </style>',
        ' <title>Index of ' + escapeHtml('/' + path) + '</title>',
        '</head>',
        '<body>',
        (noUpload ? '' : ' <div style="float: right">' +
          '<a onclick="createFolder(); return false;" href="#" title="Create a folder">📁</a> ' +
          '<a onclick="noteSubmit(); return false;" href="#" title="Create a note">📝</a> ' +
          '<input type="file" onchange="upload(this.files)" multiple></div>'),
        ' <h2 style="margin-bottom: 12px;">Index of /' +
          path.split('/').map(function (x, i, arr) {
            return '<a href="/' +
              quoteattr(arr.slice(0, i + 1).join('/')) + '/">' +
              escapeHtml(x) + '</a>';
          }).join('/') + '</h2>',
        ' <div style="background-color: white;' +
          ' border-top: 1px solid #646464; border-bottom: 1px solid #646464;' +
          ' padding-top: 10px; padding-bottom: 14px;">',
        '  <table ellpadding="0" cellspacing="0" style="' +
          'margin-left: 12px; font: 90% monospace; text-align: left;' +
        '">', '   <thead>', '    <tr>',
        '     <th onclick="sort(1); return false;"><a href="#">Name↓</a></a></th>',
        '     <th onclick="sort(2); return false;"><a href="#">Last Modified:</a></th>',
        '     <th onclick="sort(3); return false;"><a href="#">Size:</a></th>',
        '     <th onclick="sort(4); return false;"><a href="#">Type:</a></th>',
        '    </tr>', '   </thead>', '   <tbody>',
        ['..'].concat(dir).map(function (x) {
          var fileStats;
          try {
            fileStats = fs.statSync(cwd + path + x);
          } catch (e) {
            res.writeHead(500);
            res.end('HTTP Error 500 Internal Error ' + e);
            return { name: e.message };
          }
          var ext = x.replace(/^.*\.(.*)$/, "$1");
          return {
            name: x.toString(),
            ext: ext,
            size: fileStats.size,
            date: new Date(fileStats.mtime),
            isDir: fileStats.isDirectory()
          };
        }).sort(function (x, y) {
          return x.isDir !== y.isDir
            ? (x.isDir < y.isDir ? 1 : -1)
            : (x.name > y.name ? 1 : -1);
        }).map(function (x) {
          return '   <tr>\n    <td>' +
            (allowRename && x.name !== '..' && path === '' ?
              '<a href="#" onclick="renameFile(this); return false;"' +
              ' title="Rename" style="color: green; line-height: 0;">✍</a> ' : '') +
            (allowDelete && x.name !== '..' ?
              '<a href="#" onclick="deleteFile(this); return false;" title="Delete"' +
              ' style="color: red">✗</a> ' : '') +
            '<a href="' + quoteattr(x.name) + (x.isDir ? '/' : '') + '"' +
              (allowRename && x.name !== '..' && path === '' ?
                (x.isDir ? ' ondrop="dropHandler(event);" ondragover="dragOverHandler(event);"'
                  : ' draggable="true" ondragstart="dragStart(event);"') :
                  '') + '>' +
            escapeHtml(x.name) + '</a>' + (x.isDir ? '/' : '') +
            '</td>\n    ' +
              (x.name === '..' ? '<td></td>' :
                '<td title="' + x.date.getTime() + '">' +
                x.date.toISOString().replace('T', ' ').split('.')[0] + '</td>') +
            '\n    <td title="' + x.size + '">' +
            (x.isDir ? '-&nbsp;&nbsp;' : fileSizeSI(x.size)) + '</td>' +
            '\n    <td>' + (x.isDir ? 'Directory' : contentTypes[x.ext] || '') +
            '</td>\n   </tr>';
        }).join('\n'),
        '  </tbody></table>',
        ' </div>', ' <div style="' +
        'font: 90% monospace; color: #787878; padding-top: 4px;' +
        '">' + (noInfo ? '' : os.hostname() + ', ' + os.platform() + '/' + os.arch() +
          ', memory: ' + fileSizeSI(os.totalmem()) + ', ') +
          ' pad.js.org, ' +
            (noUpload ? '' : 'supports upload by drag-and-drop and copy-and-paste, ') +
            'your IP is: ' +
            req.connection.remoteAddress + ' ' +
            (req.headers['x-forwarded-for'] || '') + '</div>' +
            (cmd && path === ''
              ? '<br><input placeholder="Enter your command here and press enter" ' +
                'style="float: right; width: 250px" ' +
                'onkeypress="if (event.which === 13) location.href += \'@cmd/\' + this.value;">'
              : ''), ' <script>',
        '"use strict";',
        'document.addEventListener("dragover", function (e) {',
        '  e.stopPropagation(); e.preventDefault();',
        allowRename ? '  return;' : '', // don't add overlay on the case, we have other uses
        '  if (!document.getElementById("over"))',
        '    document.body.innerHTML += "<pre id=\'over\' style=\'top: 0; right: 0; ' +
              'width: 100%; height: 100%; opacity: .9; position: absolute; margin: 0; ' +
              'background-color: white; text-align: center; padding-top: 10em;' +
              '\'>&hellip;drop anything here&hellip;</pre>";',
        '}, false);',
        'document.addEventListener("dragleave", function (e) {',
        '  e.stopPropagation(); e.preventDefault();',
        '  if (document.getElementById("over")) document.getElementById("over").remove();',
        '}, false);',
        'document.addEventListener("drop", function (e) {',
        '  e.stopPropagation(); e.preventDefault();',
        '  if (document.getElementById("over")) document.getElementById("over").remove();',
        '  handleDataTransfer(e.dataTransfer);',
        '});',
        'document.body.addEventListener("paste", function (e) {',
        '  if (e.target.nodeName !== "INPUT")', // don't interfere with input elements
        '    handleDataTransfer(e.clipboardData);',
        '});',
        'function noteSubmit(text) {',
        '  text = text || prompt("Enter a note:");',
        '  if (!text) return;',
        // fakemime as we split second part for the upload extension which is okay most of the times
        '  upload([new Blob([text], { type: "fakemime/txt" })]);',
        '}',
        'function request(callback, url, method, body, onProgress) {',
        '  var xhr = new XMLHttpRequest();',
        '  xhr.open(method, url);',
        '  xhr.onload = function () {',
        '    if (xhr.readyState === xhr.DONE) {',
        '      if (xhr.status !== 200) alert(xhr.responseText);',
        '      callback(xhr.responseText);',
        '    }',
        '  };',
        '  xhr.onerror = function (err) { alert(err); callback(err); };',
        '  if (xhr.upload && onProgress)',
        '    xhr.upload.onprogress = onProgress;',
        '  xhr.withCredentials = true;',
        '  xhr.send(body);',
        '}',
        'function createFolder() {',
        '  var name = prompt("Enter folder name:");',
        '  if (!name) return;',
        '  request(function () { location.reload(); }, encodeURIComponent(name), "PUT");',
        '}',
        'function deleteFile(element) {',
        '  var name = element.parentElement.lastElementChild.textContent;',
        '  request(function () { location.reload(); }, encodeURIComponent(name), "DELETE");',
        '}',
        'function dragStart(ev) {',
        '  ev.dataTransfer.setData("text/plain", ev.target.textContent);',
        '}',
        'function dropHandler(ev) {',
        '  ev.preventDefault();',
        '  var source = ev.dataTransfer.getData("text");',
        '  var target = ev.target.textContent;',
        '  request(function () { location.reload(); },',
        '    encodeURIComponent(source) +',
        '    "@" + encodeURIComponent(target) + "/" + encodeURIComponent(source), "PATCH");',
        '}',
        'function dragOverHandler(ev) {',
        '  ev.preventDefault();',
        '  ev.dataTransfer.dropEffect = "move";',
        '}',
        'function renameFile(element) {',
        '  var entry = element.parentElement.lastElementChild;',
        '  entry.draggable = false;', // https://stackoverflow.com/q/10317128
        '  var from = entry.textContent;',
        '  entry.contentEditable = true;',
        '  entry.focus();',
        '  entry.onkeypress = function (e) {',
        '    if (e.which === 13 || e.which === 27) entry.blur();',
        '    if (e.which !== 13) return;',
        '    e.preventDefault();',
        '    var to = entry.textContent;',
        '    request(function () { location.reload(); },',
        '      encodeURIComponent(from) + "@" + encodeURIComponent(to), "PATCH");',
        '  };',
        '  entry.onblur = function (e) {',
        '    entry.contentEditable = false;',
        '    entry.draggable = true;',
        '  };',
        '}',
        'function handleDataTransfer(dataTransfer) {',
        '  if (dataTransfer.files.length) upload(dataTransfer.files);',
        '  else if ((dataTransfer.items || [{}])[0].kind === "string")',
        '    dataTransfer.items[0].getAsString(noteSubmit);',
        '}',
        'function upload(files) {',
        '  document.body.innerHTML += "<pre id=\'over\' style=\'top: 0; right: 0; ' +
            'width: 100%; height: 100%; opacity: .9; position: absolute; margin: 0; ' +
            'background-color: white; text-align: center; padding-top: 10em;' +
            '\'>Uploading&hellip;<br>' +
            '<div style=\'margin: 0 auto; width: 200px; background-color: #DDD\'>' +
            '<div id=\'bar\' style=\'height: 30px; background-color: #4CAF50\'>' +
            '</div></div></pre>";',
        '  var jobs = Array.prototype.slice.call(files).map(function (file) {',
        '    return function (callback) {',
        '      var name = file.name;',
        '      if (!name || name === "image.png")', // Firefox uses image.png for clipboard images
        '        name = Date.now() + "." + file.type.split("/")[1];',
        '      var formData = new FormData();',
        '      formData.append("blob", file);',
        '      document.getElementById("over").innerHTML += "<div>" + name + "&hellip;</div>";',
        '      request(callback, encodeURIComponent(name), "POST", formData, function (e) {',
        '        document.getElementById("bar").style.width = e.loaded / e.total * 100 + "%";',
        '      });',
        '    };',
        '  });',
        '  (function reactor() {',
        '    (jobs.shift() || function () { location.reload(); })(reactor);',
        '  }());',
        '}',
        'var sortState = 1;',
        'function sort(ord) {',
        '  sortState = ord === sortState ? -ord : ord;',
        '  var p = document.getElementsByTagName("tbody")[0];',
        // http://stackoverflow.com/a/39569822
        '  Array.prototype.slice.call(p.children)',
        '    .map(function (x) { return p.removeChild(x); })',
        '    .sort(function (x, y) {',
        '      x = x.getElementsByTagName("td");',
        '      y = y.getElementsByTagName("td");',
        '      var xDir = x[3].textContent === "Directory";',
        '      var yDir = y[3].textContent === "Directory";',
        '      if (xDir !== yDir) return xDir < yDir ? 1 : -1;',
        '      if (x[0].textContent === "../") return -1;',
        '      if (y[0].textContent === "../") return 1;',
        '      if (ord === 2 || ord === 3)',
        '        return +x[ord - 1].title > +y[ord - 1].title ? sortState : -sortState;',
        '      return x[ord - 1].textContent > y[ord - 1].textContent ? sortState : -sortState;',
        '    }).forEach(function (x) { p.appendChild(x); });',
        '  Array.prototype.slice.call(document.getElementsByTagName("th")).forEach(function (x, i) {',
        '    x.firstChild.textContent = x.firstChild.textContent.replace(/.$/, i === ord - 1',
        '      ? (sortState < 0 ? "↑" : "↓") : ":");',
        '  });',
        '}',
        ' </script>', '</body>', '</html>'
      ].join('\n'));
    });
  });
}).listen(port, localOnly ? '127.0.0.1' : '0.0.0.0');

console.log('pad.js is listening on ' + port +
  ' port of ' + (localOnly ? 'local' : 'all') + ' network interface(s)');
var ifs = os.networkInterfaces();
// http://stackoverflow.com/a/38929214/1414809
console.log('(' + Object.keys(ifs)
  .map(function (x) {
    return [x, ifs[x].filter(function (x) { return x.family === 'IPv4'; })[0]];
  })
  .filter(function (x) { return x[1]; })
  .filter(function (x) { return !localOnly || (x[1].address === '127.0.0.1'); })
  .map(function (x) { return x[0] + ': ' + (https ? 'https' : 'http') + '://' +
    x[1].address + ':' + port; })
  .join(', ') + ')');

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});
/* -->
<!DOCTYPE html>
<h1>pad.js</h1>
<h2>Total fancy node.js webserver for transferring files from/to browser console and terminal</h2>

<em><a href="https://stackoverflow.com/a/44990733/1414809">What is this?</a></em> (stackoverflow)

<h3>Setup:</h3>
<pre>curl pad.js.org | node</pre>

<p>Or:</p>
<pre>curl pad.js.org | PORT=9090 node</pre>

<p>Or without curl:</p>
<pre>wget -O- pad.js.org | node</pre>

<p>You should probably use this instead if you are using Debian/Ubuntu based Linux distribution:</p>
<pre>curl pad.js.org | nodejs</pre>

<p>And try this on Windows:</p>
<pre>powershell -Command "(iwr pad.js.org).Content | node"</pre>

<p>Or this which doesn't need curl/powershell:</p>
<pre>node -e "require('http').request({host:'pad.js.org'},function(r){var t='';r.on('data',function(c){t+=c});r.on('end',function(){eval(t)})}).end();"</pre>

<p>Or this sets it up as a Docker daemon which exposes pad.js on 7070 of all your interfaces:</p>
<pre>docker run --restart=always -v /files:/files --name pad.js -d -p 7070:9090 quay.io/ebraminio/pad.js</pre>

<p>Use this if you want to have it as a terminal tool:
  <u>(please install nodejs-legacy on Debian before the installation)</u></p>
<pre>npm install -g pad.js
pad [PORT]</pre>

<h3>HTTPS:</h3>
<pre>
sudo mkdir /etc/ssl/pad.js
sudo openssl genrsa -out "/etc/ssl/pad.js/pad.js.key" 2048
sudo openssl req -new -key "/etc/ssl/pad.js/pad.js.key" -out "/etc/ssl/pad.js/pad.js.csr"
sudo openssl x509 -req -days 365 -in "/etc/ssl/pad.js/pad.js.csr" -signkey "/etc/ssl/pad.js/pad.js.key" -out "/etc/ssl/pad.js/pad.js.crt"
</pre>
Then run locally installed pad.js like:
<pre>pad --https</pre>
or: (needs <a href="https://github.com/nodejs/node/pull/13012">Node.js 8</a>)
<pre>curl pad.js.org | node - --https</pre>
or: (works only on macOS, at least for now)
<pre>curl pad.js.org | node /dev/stdin --https</pre>

<h3>Show cases:</h3>

<u>download a file from the place the server is ran from:</u>
<pre>
fetch('http://127.0.0.1:9090/a.txt')
  .then(x => x.text())
  .then(x => console.log('File content: ' + x));
</pre>

<u>upload a text file:</u>
<pre>
var formData = new FormData();
formData.append('blob', new Blob(['STRING YOU LIKE TO SAVE']));
fetch('http://127.0.0.1:9090/a.txt', { method: 'POST', body: formData })
  .then(x => x.text())
  .then(console.log);
</pre>

<u>upload a file:</u>
<pre>
// Create a canvas, make 200x200 blue rectangle on it, upload its base64 encoded binary
var canvas = document.createElement('canvas'), context = canvas.getContext('2d');
canvas.width = 200; canvas.height = 200; context.fillStyle = 'blue'; context.fillRect(0, 0, 200, 200);
canvas.toBlob(function (blob) {
  var formData = new FormData();
  formData.append('blob', blob);
  fetch('http://127.0.0.1:9090/a.png', { method: 'POST', body: formData })
    .then(x => x.text())
    .then(console.log);
});
</pre>

<u>upload a file from terminal:</u>
<pre>curl -F "file=@a.png" http://127.0.0.1:9090/a.png</pre>

<p><a href="https://github.com/ebraminio/pad.js">Source</a></p>

<!-- */
