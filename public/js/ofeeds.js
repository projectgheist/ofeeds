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
 * App configuration
 */

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
		return $resource('/api/0/stream/contents/user/-/state/:state', {state:'@state',n:'@n'}, { query: {method:'GET', isArray:true} });
	}
]);
AppService.factory('FeedSubmit', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/quickadd', {quickadd:'@quickadd'}, { query: {method:'POST'} });
	}
]);

var AppFeeds = angular.module('AppFeeds', [])
AppFeeds.controller('AppFeeds', ['$scope', '$http', 'FeedSubmit', 'GetFeeds', 'GetPosts', function($scope, $http, FeedSubmit, GetFeeds, GetPosts) {
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
	
	$scope.gtposts = function() {
		GetPosts.query({state:'reading-list'},function(data) {
			$scope.posts = data;
		}, function(err) {
		});
	}
	
	$scope.gtsubs();
	
	$scope.gtposts();
}]);
