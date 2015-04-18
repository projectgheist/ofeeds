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
					'./bower_components/jquery/dist/jquery.js', // needs to be included before bootstrap
					'./bower_components/angular/angular.js',
					'./bower_components/angular-route/angular-route.js',
					'./bower_components/angular-sanitize/angular-sanitize.js',
					'./bower_components/angular-resource/angular-resource.js',
					'./bower_components/bootstrap/dist/js/bootstrap.js',
					'./bower_components/bootstrap-material-design/dist/js/material.js',
					'./bower_components/holderjs/holder.js',
					'./bower_components/moment/moment.js',
					'./bower_components/typeahead.js/dist/bloodhound.js',
					'./bower_components/typeahead.js/dist/typeahead.jquery.js'
				],
				dest: './public/js/<%= pkg.name %>-<%= pkg.version %>.js'
			}
		},
		less: {
			//...
			/*development: {
				options: {
				  compress: true,  //minifying the result
				},
				files: {
					//compiling frontend.less into frontend.css
					"./public/css/frontend.css": "./app/assets/stylesheets/frontend.less",
				}
			}*/
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
		}
	});
	
	// Plugin loading
	grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');

	// Task definition
	grunt.registerTask('default', ['concat','uglify']);
};
