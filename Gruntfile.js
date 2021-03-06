//Gruntfile
module.exports = function(grunt) {
	//Initializing the configuration object
	grunt.initConfig({
		// Read package information
		pkg: grunt.file.readJSON('package.json'),
		
		// Task configuration
		concat: {
			//...
			options: {
				separator: ';',
			},
			dist: {
				src: [
					'./bower_components/jquery/dist/jquery.js', // needs to be included before bootstrap and angularjs
					'./bower_components/angular/angular.js',
					'./bower_components/angular-route/angular-route.js',
					'./bower_components/angular-sanitize/angular-sanitize.js',
					'./bower_components/angular-resource/angular-resource.js',
					'./bower_components/tether/dist/js/tether.js', // needs to be included before bootstrap
					'./bower_components/bootstrap/dist/js/bootstrap.js',
					'./bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
					'./bower_components/handlebars/handlebars.js',
					'./bower_components/holderjs/holder.js',
					'./bower_components/videogular/videogular.js',
					'./bower_components/videogular-controls/vg-controls.js',
					'./bower_components/videogular-buffering/vg-buffering.js',
					'./bower_components/videogular-overlay-play/vg-overlay-play.js',
					'./bower_components/bower-videogular-youtube/youtube.js',
					'./bower_components/moment/moment.js',
					'./bower_components/typeahead.js/dist/bloodhound.js',
					'./bower_components/typeahead.js/dist/typeahead.jquery.js',
					'./bower_components/layzr.js/dist/layzr.min.js',
					'./bower_components/matchHeight/jquery.matchHeight.js',
					'./bower_components/ngInfiniteScroll/build/ng-infinite-scroll.js',
					'./bower_components/Flowtype.js/flowtype.js',
					'./bower_components/angular-flowtype/angular-flowtype.js',
					'./private/js/fit.js',
					'./private/js/mousetrap.js',
					'./private/js/jquery.texttailor.js'
				],
				dest: './public/js/<%= pkg.name %>.js'
			}
		},
		cssmin: {
			options: {
				shorthandCompacting: false,
				roundingPrecision: -1,
				keepSpecialComments: 0
			},
			dist: {
				src: [
					'./bower_components/font-awesome/css/font-awesome.css',
					'./bower_components/bootstrap/dist/css/bootstrap.css',
					'./bower_components/angular-bootstrap/ui-bootstrap-csp.css',
					'./bower_components/tether/dist/css/tether.css',
				],
				dest: './public/css/<%= pkg.name %>.min.css'
			}
		},
		uglify: {
			//...
			options: {
				mangle: false  // Use if you want the names of your functions and variables unchanged
			},
			build: {
				src: './public/js/<%= pkg.name %>.js',
				dest: './public/js/<%= pkg.name %>.min.js'
			}
		},
		copy: {
			dist: {
				files: [
					// includes files within path and its sub-directories
					{
						expand: true,
						flatten: true,
						src: [
							'./bower_components/font-awesome/fonts/*',
							'./bower_components/bootstrap/dist/fonts/*',
							'./bower_components/videogular-themes-default/fonts/*',
						], 
						dest: './public/fonts'
					},
					{
						expand: true,
						flatten: true,
						src: [
						], 
						dest: './public/js'
					},
					{
						expand: true,
						flatten: true,
						src: [
							'./bower_components/videogular-themes-default/videogular.css',
						], 
						dest: './public/css'
					}
				],
			},
		},
		watch: {
			//...
			scripts: {
				files: [
					'./public/js/*.js',
					'./public/css/*.css',
					'./private/js/*.js',
				],
				tasks: ['default'],
				options: {
				},
			},
		}
	});
	
	// Plugin loading
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');

	// Task definition
	grunt.registerTask('default', ['concat','cssmin','uglify','copy']);
};
