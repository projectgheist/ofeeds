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
					'./bower_components/bootstrap/dist/js/bootstrap.js',
					'./bower_components/bootstrap-material-design/dist/js/ripples.js',
					'./bower_components/bootstrap-material-design/dist/js/material.js',
					'./bower_components/handlebars/handlebars.js',
					'./bower_components/holderjs/holder.js',
					'./bower_components/Flowtype.js/flowtype.js',
					'./bower_components/moment/moment.js',
					'./bower_components/typeahead.js/dist/bloodhound.js',
					'./bower_components/typeahead.js/dist/typeahead.jquery.js',
					'./bower_components/layzr.js/dist/layzr.js',
					'./bower_components/matchHeight/jquery.matchHeight.js',
					'./bower_components/ngInfiniteScroll/build/ng-infinite-scroll.js',
					'./private/js/fit.js',
					'./private/js/mousetrap.js',
					'./private/js/jquery.texttailor.js'
				],
				dest: './public/js/<%= pkg.name %>-<%= pkg.version %>.js'
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
					'./bower_components/bootstrap-material-design/dist/css/roboto.css',
					'./bower_components/bootstrap-material-design/dist/css/material.css',
					'./bower_components/bootstrap-material-design/dist/css/ripples.css',
				],
				dest: './public/css/<%= pkg.name %>-<%= pkg.version %>.min.css'
			}
		},
		uglify: {
			//...
			options: {
				mangle: false  // Use if you want the names of your functions and variables unchanged
			},
			build: {
				src: './public/js/<%= pkg.name %>-<%= pkg.version %>.js',
				dest: './public/js/<%= pkg.name %>-<%= pkg.version %>.min.js'
			}
		},
		watch: {
			//...
			scripts: {
				files: ['public/js/*.js', 'public/css/*.css'],
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

	// Task definition
	grunt.registerTask('default', ['cssmin','concat','uglify']);
};
