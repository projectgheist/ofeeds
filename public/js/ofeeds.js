/**
 * Global variables
 */

/**
 * On page load ready
 */
jQuery(document).ready(function($) {
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
		return $resource('/api/0/stream/contents/', {type:'@type', params:'@params'}, { query: {method:'GET', isArray:false} });
	}
]);

AppService.factory('FeedSubmit', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/search', {q:'@q'}, { query: {method:'POST'} });
	}
]);

var AppFeeds = angular.module('AppFeeds', []);

/**
 * App configuration
 */
app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
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
			FeedSubmit.save({q:u.val()}, function() {
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
			$scope.stream = [];
		});
	}
	$scope.gtsubs();

	var StreamParams = {};
	if (Object.keys($routeParams).length > 0) {
		// don't URL encode the values of param as they get converted later on anyway
		var v = String($routeParams.param);
		StreamParams.type = String($routeParams.type);
		StreamParams.params = v.substring(0,v.length-1);
	} else {
		StreamParams = { type:'user', params:'-/state/reading-list' };
	}
	$scope.gtposts(StreamParams);
}]);
app.controller('AppPosts', function($scope) {
	$scope.message = 'Contact us! JK. This is just a demo.';
});