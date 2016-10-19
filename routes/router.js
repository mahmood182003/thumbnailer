/**
 * this is a basic REST controller.
 *
 * ideally, this should be a single controller that recognizes a specific REST pattern,
 * parses the REST uri, automatically forwards the request to the specified endpoint API,
 * and finally takes care of API callback and response.
 *
 */

const express = require('express'),
    router = express.Router(),
    imageHandler = require('../api/handler');

const config = require('config'),
    myConf = config.get("thumbnailer");

router.get('/:urlBase64/:maxWidth/:maxHeight/:signatureBase64.:extension', function (req, res, next) {
    imageHandler.getThumbnail(req.params, function (err, readStream) {
        if (err) {
            return next(err);
        }
        res.setHeader("Cache-Control", "public, max-age=" + myConf.maxage);
        res.writeHead(200, {'Content-Type': 'image/png' });
        readStream.pipe(res);
    });
});

module.exports = router;
