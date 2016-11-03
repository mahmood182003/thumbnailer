/* eslint-env node */

var handler = {}
module.exports = handler

const fs = require('fs')
const mkdirp = require('mkdirp')
const debug = require('debug')('imagethumbnailer')
const request = require('request')
const base64url = require('base64-url')
const validator = require('validator')
const gm = require('gm').subClass({ imageMagick: true })

const config = require('config')
const myConf = config.get('thumbnailer')

const temp = require('temp')
const rootDir = process.cwd()
const tmpDir = rootDir + myConf.tempdir

const bunyan = require('bunyan')
const log = bunyan.createLogger({
  name: 'thumbnailer',
  serializers: bunyan.stdSerializers,
  streams: [ { path: rootDir + myConf.LOG_PATH, period: '1d' } ]
})
const crypto = require('crypto')
function getSignature (secret, urlBase64, width, height, ext) {
  const hmac = crypto.createHmac('sha256', secret)
    .update(urlBase64)
    .update(width.toString())
    .update(height.toString())
    .update(ext)
    .digest('base64')
  return base64url.escape(hmac)
}

// NJS http errors
const ERRORS = {
  BADREQ: 400,
  FORBIDDEN: 403,
  TIMEOUT: 504,
  BADGW: 502,
  ECONNREFUSED: 'ECONNREFUSED',
  ETIMEDOUT: 'ETIMEDOUT',
  TEMP_ERR: [ 'ENOTFOUND', 'EAI_AGAIN' ]
}

var download = function (url, attempts, callback) {
  request.get(url, { timeout: myConf.timeout }, function (err, res) {
    if (err) {
      debug('download error ', attempts, err)
      if (ERRORS.TEMP_ERR.includes(err.code) && (err = ERRORS.BADGW) && --attempts > 0) { // temporary problems => retry
        return setTimeout(() => {
          download(url, attempts, callback)
        }, 1000)
      } else if (err.code === ERRORS.ETIMEDOUT) { // either server hasn't responded yet or it's very slow
        err = ERRORS.TIMEOUT
      } else if (err.code === ERRORS.ECONNREFUSED) {
        err = ERRORS.BADREQ
      }
      return callback(err || res.statusCode || 500)
    }
    // mime-type must match image/* or application/*
    if (!/^(application|image)\/.*/.test(res.headers[ 'content-type' ])) {
      log.warn('received unexpected mime-type:', url, res.headers)
      return callback(ERRORS.BADREQ)
    }
    debug('content-type:', res.headers[ 'content-type' ])

    var stream = temp.createWriteStream({ dir: tmpDir })
    stream.on('close', () => {
      callback(null, stream.path)
    })
    request(url).pipe(stream)
  })
}

function hasValidattionErr (urlBase64, imgUrl, maxWidth, maxHeight, signatureBase64, extension) {
  debug('copy the signature for your tests ==> ', getSignature(myConf.secret, urlBase64, maxWidth, maxHeight, extension))
  if (signatureBase64 !== getSignature(myConf.secret, urlBase64, maxWidth, maxHeight, extension)) {
    return ERRORS.FORBIDDEN
  } else if (!validator.isURL(imgUrl)) {
    return 1
  } else if (!validator.isInt(maxWidth, { min: 3, max: 1024 })) {
    return 5
  } else if (!validator.isInt(maxHeight, { min: 3, max: 1024 })) {
    return 10
  } else if (![ 'gif', 'jpg', 'jpeg', 'png' ].includes(extension)) {
    return 15
  }
  return 0
}

handler.getThumbnail = function getThumbnail ({ urlBase64, maxWidth, maxHeight, signatureBase64, extension }, callback) {
  var imgUrl = base64url.decode(urlBase64)
  var code = hasValidattionErr(urlBase64, imgUrl, maxWidth, maxHeight, signatureBase64, extension)
  if (code) {
    debug('validation error: ', code)
    return callback(code < 50 ? ERRORS.BADREQ : code)
  }

  download(imgUrl, myConf.retry, function (err, filename) {
    if (err) {
      return callback(err)
    }
    debug('downloaded in ' + filename)
    var rstream = gm(filename).resize(maxWidth, maxHeight).flatten().stream().on('end', () => {
      fs.unlink(filename, (err) => {
        if (err) {
          throw new Error(err)
        }
      })
    })
    callback(null, rstream)
  })
}

// init
log.info('initializing handler...')
mkdirp(tmpDir, function (err) {
  if (err) log.error('could not create temp dir', err)
})
