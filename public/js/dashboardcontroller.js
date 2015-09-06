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
			recentPosts: recentPosts,
			popularFeeds: popularFeeds,
		};
		
		function recentFeeds() {
			return $resource('/api/0/feeds/list', {n:5, r:'a'}, { query:{ method: 'GET', isArray: false } });
		}

		function popularFeeds() {
			return $resource('/api/0/feeds/list', {n:5, r:'s'}, { query:{ method: 'GET', isArray: false } });
		}
		
		function recentPosts() {
			return $resource('/api/0/posts', {n:5, r:'n'}, { query:{ method: 'GET', isArray: true } });
		}
	};

    dashboardController.$inject = [
		'$scope', 
		'dashboardService',
		'$sce', 
	];

	function dashboardController($scope, dashboardService, $sce) {
		dashboardService.recentFeeds().query(function(data) {
			if (data && data.feeds && data.feeds.length > 0) {
				$scope.rf = data.feeds;
				for (var i in $scope.rf) {
					$scope.rf[i].url = ['/subscription/feed/',encodeURIComponent($scope.rf[i].id),'/'].join('');
				}
			}
		});

		dashboardService.popularFeeds().query(function(data) {
			if (data && data.feeds && data.feeds.length > 0) {
				$scope.pf = data.feeds;
				for (var i in $scope.pf) {
					$scope.pf[i].url = ['/subscription/feed/',encodeURIComponent($scope.pf[i].id),'/'].join('');
				}
			}
		});
		
		dashboardService.recentPosts().query(function(data) {
			data = JSON.parse(angular.toJson(data));
			if (data.length > 0) {
				// local reference to item
				$scope.rp = data;
				for (var i in $scope.rp) {
					var ref = $scope.rp[i];
					if (ref.author) {
						// shorten the author name
						var author = /(by\s)(\w*\s\w*)/i.exec(ref.author);
						if (author) {
							ref.author = author[2];
						}
					}
					// Post HTML content needs to be set as TRUSTED to Angular otherwise it will not be rendered
					ref.content.summary = $sce.trustAsHtml(ref.content.summary);
					ref.origin.url = ['/subscription/feed/',encodeURIComponent(ref.origin.url),'/'].join('');
				}
			}
		});
	}
})();