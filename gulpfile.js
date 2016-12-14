var gulp = require( 'gulp' );
var ts = require( 'gulp-typescript' );
var less = require( 'gulp-less' );
var del = require( 'del' );
var runSequence = require( 'run-sequence' );
var uglify = require( 'gulp-uglify' );
var concat = require( 'gulp-concat' );

gulp.task( 'less', function () {
	return gulp.src( 'client/stylesheets/*.less' )
		.pipe( less() )
		.pipe( gulp.dest( 'client/stylesheets/compiled' ) );
} );

gulp.task( 'build', function (callback) {
	runSequence( 'clean', [ 'app-bundle', 'less' ], callback );
} );

gulp.task( 'clean', function () {
	return del( [
		'client/javascripts/compiled/**/*',
		'client/stylesheets/compiled/**/*'
	] ) ;
} );

gulp.task( 'app-bundle', function () {
	return gulp.src( 'client/javascripts/**/*.ts' )
		.pipe( ts( {
			'target': 'es5',
			'module': 'system',
			'moduleResolution': 'node',
			'emitDecoratorMetadata': true,
			'experimentalDecorators': true,
			'sourceMap': true,
			'removeComments': false,
			'noImplicitAny': false,
			'outFile': 'app.min.js'
		} ) )
		.pipe( uglify() )
		.pipe( gulp.dest( 'client/javascripts/compiled' ) );
} );

gulp.task( 'watch', [ 'build' ], function () {
	gulp.watch( 'client/javascripts/**/*.ts', [ 'app-bundle' ] );
	gulp.watch( 'client/stylesheets/*.less', [ 'less' ] );
} );

gulp.task( 'default', [ 'build' ], function () {} );
