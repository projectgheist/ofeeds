(function () {
	'use strict';

	/** Declare controller */
	function dashboardController ($scope, $sce, $interval, services) {
		services.recentFeeds().query(function (data) {
			// strip properties with leading $$ characters
			data = JSON.parse(angular.toJson(data));
			if (data && data.feeds && data.feeds.length > 0) {
				$scope.rf = data.feeds;
				for (var i in $scope.rf) {
					$scope.rf[i].url = ['/feed/',encodeURIComponent($scope.rf[i].id),'/'].join('');
				}
			}
		});

		services.popularFeeds().query(function (data) {
			// strip properties with leading $$ characters
			data = JSON.parse(angular.toJson(data));
			if (data && data.feeds && data.feeds.length > 0) {
				$scope.pf = data.feeds;
				for (var i in $scope.pf) {
					$scope.pf[i].url = ['/feed/',encodeURIComponent($scope.pf[i].id),'/'].join('');
				}
			}
		});
		
		$scope.recentPosts = function () {
			services.recentPosts().query(function (data) {
				// strip properties with leading $$ characters
				data = JSON.parse(angular.toJson(data));
				if (data.length > 0) {
					// local reference to item
					$scope.rp = data;
					// loop recent posts
					for (var i in $scope.rp) {
						// local reference
						var ref = $scope.rp[i];
						// check for author
						if (ref.author) {
							// shorten the author name
							var author = /(by\s)(\w*\s\w*)/i.exec(ref.author);
							// valid author string?
							if (author) {
								// replace string with shortend version
								ref.author = author[2];
							}
						}
						// format date
						ref.formatted = moment(ref.published).fromNow();
						// Post HTML content needs to be set as TRUSTED to Angular otherwise it will not be rendered
						ref.content.summary = $sce.trustAsHtml(ref.content.summary);
						ref.origin.url = ['/feed/',encodeURIComponent(ref.origin.url),'/'].join('');
					}
				}
			});
		}
		
		// retrieve recent posts
		$scope.recentPosts();
		
		// define interval to refresh recent posts
		$interval($scope.recentPosts, 2 * 1000 * 60, false);
	}
	
	/** Declare modules to be included in the controller */
    dashboardController.$inject = [
		'$scope',
		'$sce',
		'$interval',
		'services'
	];
	
	/** Declare controller */
	angular
        .module('webapp')
        .controller('dashboardController', dashboardController);
})();