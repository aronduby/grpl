// Include gulp
var gulp = require('gulp');

// Our plugins
var 
	jshint       = require('gulp-jshint'),
	uglify       = require('gulp-uglify'),
	postcss      = require('gulp-postcss'),
	autoprefixer = require('autoprefixer-core'),
	cssmin       = require('gulp-cssmin'),
	del          = require('del'),
	useref       = require('gulp-useref'),
	gulpif       = require('gulp-if'),
	changed      = require('gulp-changed'),
	gutil        = require('gulp-util'),
	plumber      = require('gulp-plumber'),
	notify       = require('gulp-notify');


var onError = notify.onError({
   title:    'Error',
   // subtitle: '<%= file.relative %> did not compile!',
   message:  '<%= error.message %>'   
});


// Clean our CSS dist
gulp.task('clean:css', function(cb) {
	del([ 'dist/css/**' ], cb);
});

// Clean our JS dist
gulp.task('clean:js', function(cb) {
	del([ 'dist/js/**' ], cb);
});

// Linter
gulp.task('lint', function(){
	return gulp.src(['js/*.js', 'app-components/**/*.*'])
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});


// Handle HTML replacement
gulp.task('html', function() {

	var assets = useref.assets();

	gulp.src('index.html')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(assets)
		.pipe(gulpif('*.js', uglify()))
		.pipe(gulpif('*.css', cssmin()))
		.pipe(assets.restore())
		.pipe(useref())
		.pipe(gulp.dest('dist'));

	gulp.src('favicon.ico')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(changed('dist'))
		.pipe(gulp.dest('dist'));

	gulp.src(['app-components/**/*.*', 'app-components/.htaccess'])
		.pipe(plumber({ errorHandler: onError }))
		.pipe(changed('dist/app-components'))
		//.pipe(gulpif('*.js', uglify()))
		.pipe(gulp.dest('dist/app-components'));

	gulp.src('icons/**/*.*')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(changed('dist/icons'))
		.pipe(gulp.dest('dist/icons'));

	gulp.src('layout_imgs/**/*.*')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(changed('dist/layout_imgs'))
		.pipe(gulp.dest('dist/layout_imgs'));

	gulp.src(['js/**/*.*', 'bower_components/angular/**/*.*', 'bower_components/requirejs/**/*.*', 'bower_components/slip/**/*.*'], {base: './'})
		.pipe(plumber({ errorHandler: onError }))
		.pipe(gulp.dest('dist/'));

});

gulp.task('images', function() {
	gulp.src('layout_imgs/**/*.*')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(changed('dist/layout_imgs'))
		.pipe(gulp.dest('dist/layout_imgs'));
});


// Watch files for changes
gulp.task('watch', function() {
	gulp.watch('./', ['html']);
});

// Default task
gulp.task('default',['html', 'watch']);