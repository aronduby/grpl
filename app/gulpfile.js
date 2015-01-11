var 
	gulp       = require('gulp'),
	sass       = require('gulp-sass'),
	sourcemaps = require('gulp-sourcemaps'),
	cssmin     = require('gulp-cssmin'),
	rename     = require('gulp-rename'),
	gutil      = require('gulp-util');


gulp.task('sass',[], function() {
	gulp.src([
		'sass/app.scss',
		'sass/bootstrap.scss',
		'sass/pixel-admin.scss',		
		'sass/pixel-admin-scss/pages/pages.scss',
		'sass/pixel-admin-scss/themes/themes.scss'
	])
		.pipe(sourcemaps.init())
			.pipe(sass())
				.on('error', function (err) {
					var displayErr = gutil.colors.red(err);
					gutil.log(displayErr);
					gutil.beep();
					this.emit('end');
				})
			.pipe(cssmin())
		.pipe(sourcemaps.write())
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(gulp.dest('css'));
});

gulp.task('watch',['sass'], function() {
	gulp.watch('sass/**/*.scss', ['sass']);
});