/* eslint-env node */

var express = require('express')
var routes = require('./routes/router')

var app = express()

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade')

// middleware stack
// app.use(logger('dev'));

app.use('/', routes)

// catch 404 and forward to error handler
app.use(function (err, req, res, next) {
  if (!err) {
    err = new Error('Not Found')
    err.status = 404
  }
  next(err)
})

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.sendStatus(err.status || err || 500)
  })
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.sendStatus(err.status || 500)
})

module.exports = app
