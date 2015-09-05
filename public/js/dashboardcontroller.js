(function() {
	'use strict';

	angular
        .module('webapp')
        .controller('dashboardController', dashboardController)
        .service('dashboardService', dashboardService);

	dashboardService.$inject = [
		'$resource'
	];

	function dashboardService($resource) {
		return {
			recentFeeds: recentFeeds,
			recentPosts: recentPosts
		};
		
		function recentFeeds() {
			return $resource('/api/0/feeds/list', {n:5, r:'a'}, { query:{ method: 'GET', isArray: false } });
		}
		
		function recentPosts() {
			return $resource('/api/0/posts', {n:5, r:'n'}, { query:{ method: 'GET', isArray: true } });
		}
	};

    dashboardController.$inject = [
		'$scope', 
		'dashboardService'
	];

	function dashboardController($scope, dashboardService) {
		dashboardService.recentFeeds().query(function(data) {
			if (data && data.feeds && data.feeds.length > 0) {
				$scope.rf = data.feeds;
				for (var i in $scope.rf) {
					$scope.rf[i].url = ['/subscription/feed/',encodeURIComponent($scope.rf[i].id),'/'].join('');
				}
			}
		});
		dashboardService.recentPosts().query(function(data) {
			if (data.length > 0) {
				$scope.rp = data;
			}
		});
	}
})();