var handler = {};
module.exports = handler;

const fs = require('fs'),
    debug = require('debug')('imagethumbnailer'),
    request = require('request'),
    base64url = require('base64-url'),
    validator = require('validator'),
    gm = require('gm').subClass({imageMagick: true});

const config = require('config'),
    myConf = config.get("thumbnailer");

const temp = require('temp'),
    rootDir = process.cwd(),
    tmpDir = rootDir + myConf.tempdir;

const crypto = require('crypto');
function getSignature(secret, uriBase64, width, height, ext) {
    const hmac = crypto.createHmac('sha256', secret)
        .update(uriBase64)
        .update(width.toString())
        .update(height.toString())
        .update(ext)
        .digest('base64');
    return base64url.escape(hmac);
}
const BADINPUT = 400, FORBIDDEN = 403, TIMEOUT = 504, BADGW = 502, ETIMEDOUT = "ETIMEDOUT", TEMP_ERR = ["ENOTFOUND", "EAI_AGAIN"];

var download = function (uri, attempts, callback) {
    request.get(uri, {timeout: myConf.timeout}, function (err, res) {
        if (err) {
            debug("download error ", attempts, err)
            if (err) {
                if (TEMP_ERR.includes(err.code) && (err = BADGW) && --attempts > 0) { // temporary problems, might retry
                    return setTimeout(()=> {
                        download(uri, attempts, callback);
                    }, 1000);
                } else if (err.code === ETIMEDOUT) { // either server hasn't responded yet or it's very slow
                    err = TIMEOUT;
                }
            }
            return callback(err || res.statusCode || 500);
        }
        debug('content-type:', res.headers['content-type']);
        debug('content-length:', res.headers['content-length']);

        var stream = temp.createWriteStream({dir: tmpDir});
        stream.on("close", ()=> {
            callback(null, stream.path)
        });
        // TODO test when readonly
        request(uri).pipe(stream);

    });
};

function hasValidattionErr(urlBase64, imgUrl, maxWidth, maxHeight, signatureBase64, extension) {
    console.log("sig for testing ===> ", getSignature(myConf.secret, urlBase64, maxWidth, maxHeight, extension));
    if (signatureBase64 !== getSignature(myConf.secret, urlBase64, maxWidth, maxHeight, extension)) {
        return FORBIDDEN;

    } else if (!validator.isURL(imgUrl)) {
        return 1;

    } else if (!validator.isInt(maxWidth, {min: 3, max: 1024})) {
        return 5;

    } else if (!validator.isInt(maxHeight, {min: 3, max: 1024})) {
        return 10;

    } else if (!["gif", "jpg", "jpeg", "png"].includes(extension)) {
        return 15;

    }
    return 0;
}

handler.getThumbnail = function getThumbnail({urlBase64:urlBase64, maxWidth, maxHeight, signatureBase64, extension}, callback) {
    debug('getThumbnail: ', arguments);
    var imgUrl = base64url.decode(urlBase64), code;

    if (code = hasValidattionErr(urlBase64, imgUrl, maxWidth, maxHeight, signatureBase64, extension)) {
        debug("validation error: ", code);
        return callback(code < 50 ? BADINPUT : code);
    }

    download(imgUrl, myConf.retry, function (err, filename) {
        if (err) {
            return callback(err);
        }
        debug('image downloaded in ', filename);
        var rstream = gm(filename).resize(maxWidth, maxHeight, '!').stream().on("end", ()=> {
            fs.unlink(filename, (err)=> {
                if (err) {
                    throw new Error(err);
                }
            });

        });
        callback(null, rstream);
    });
};