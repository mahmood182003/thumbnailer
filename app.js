var express = require('express');
var logger = require('morgan');

var routes = require('./routes/router');

var app = express();

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// middleware stack
app.use(logger('dev'));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (err,req, res, next) {
    if(!err) {
        var err = new Error('Not Found');
        err.status = 404;
    }
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.send(err.status || err || 500);
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
