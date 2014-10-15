/**
 * Global variables
 */

/**
 * On page load ready
 */
jQuery(document).ready(function($) {
	$('.article').flowtype();
});

var app = angular.module('webapp', [
	'ngRoute',
	'AppFeeds',
	'AppService'
]);

/**
 * Other
 */
var AppService = angular.module('AppService', ['ngResource']);
AppService.factory('GetFeeds', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/list', {}, { query: {method:'GET', isArray:true} });
	}
]);

AppService.factory('GetPosts', ['$resource',
	function($resource) {
		return $resource('/api/0/stream/contents/:params', {params:'@params'}, { query: {method:'GET', isArray:false} });
	}
]);

AppService.factory('FeedSubmit', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/quickadd', {quickadd:'@quickadd'}, { query: {method:'POST'} });
	}
]);

var AppFeeds = angular.module('AppFeeds', []);

/**
 * App configuration
 */
app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/', {
		templateUrl: '/templates/empty',
		controller: 'AppFeeds'
	})
	.when('/subscription/:type/:param*\/', {
		templateUrl: function(urlattr){
			return '/templates/posts-compact';
		},
		controller: 'AppFeeds'
	})
	.otherwise({
		templateUrl: function(urlattr){
			return '/templates/empty';
		},
		controller: 'AppFeeds'
	});
}]);

app.controller('AppFeeds', ['$scope', '$http', '$routeParams', 'FeedSubmit', 'GetFeeds', 'GetPosts', function($scope, $http, $routeParams, FeedSubmit, GetFeeds, GetPosts) {
	$scope.sbmt = function() {
		// get url from text box
		var u = $('#nrss');
		u.prop('disabled', true);
		// make sure it exists
		if (u.val() !== undefined || u.val().trim().length > 0) {
			// submit to server
			FeedSubmit.save({quickadd:u.val()}, function() {
				u.prop('disabled', false);
				$scope.gtsubs();
			}, function() {
				u.prop('disabled', false);
			});
		}
	}
	$scope.gtsubs = function() {
		GetFeeds.query(function(data) {
			$scope.subs = data;
		}, function(err) {
		});
	}	
	$scope.gtposts = function(QueryParams) {
		GetPosts.query(QueryParams,function(data) {
			$scope.stream = data;
		}, function(err) {
		});
	}
	$scope.gtsubs();

	var StreamParams = { params:'user/-/state/reading-list' };
	if (Object.keys($routeParams).length > 0) {
		var k = String($routeParams.type),
			v = String($routeParams.param);
		v = v.substring(0,v.length-1);
		StreamParams.params = [k,v].join('/');
	}	
	$scope.gtposts(StreamParams);
}]);
app.controller('AppPosts', function($scope) {
	$scope.message = 'Contact us! JK. This is just a demo.';
});