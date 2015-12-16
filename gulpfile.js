var gulp = require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

gulp.task('inject',['injectBower','injectSources']);
gulp.task('serve',['inject','browserSync']);

/**
 * Dependency Injection
 */
var inject = require('gulp-inject'),
  wiredep = require('wiredep');

gulp.task('injectBower', function () {
  wiredep({
    src: './www/index.html',
    directory: './www/lib/bower_components',
    bowerJson: require('./bower.json'),
    devDependencies: false
  });
});
gulp.task('injectSources', function () {
  var target = gulp.src('./www/index.html');

  return target.pipe(inject(gulp.src(
    [
      'js/**/*.js',
      '**/*.css',
      '!lib/**/*.css',
      '!lib/**/*.js'
    ],
    {
      read: false,
      cwd: 'www'
    })
  )).pipe(gulp.dest('./www'));
});

gulp.task('browserSync', function() {
  browserSync({
    server: {
      baseDir: 'www'
    }
  });
  gulp.watch(['js/**/*.js','*.html'], {cwd: 'www'}, reload);
});

