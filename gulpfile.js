/* eslint-env node */

const gulp = require('gulp')
const eslint = require('gulp-eslint')
const mocha = require('gulp-mocha')

gulp.task('eslint', () => {
  return gulp.src([ '**/*.js', '!node_modules/**' ])
    .pipe(eslint({ fix: true }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
})

gulp.task('mocha', () =>
  gulp.src('test/app.js', { read: false })
  // gulp-mocha needs filepaths so you can't have any plugins before it
    .pipe(mocha())
)

gulp.task('default', [ 'eslint', 'mocha' ], function () {
// This will only run if the lint task is successful...
})
