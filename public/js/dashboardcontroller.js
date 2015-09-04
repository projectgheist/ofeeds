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
			recent: recent
		};
		
		function recent() {
			return $resource('/api/0/feeds/list', {n:5, r:'n'}, { query:{ method: 'GET', isArray: false } });
		}
	};

    dashboardController.$inject = [
		'$scope', 
		'dashboardService'
	];

	function dashboardController($scope, dashboardService) {
		dashboardService.recent().query(function(data) {
			if (Object.keys(data).length > 0) {
				$scope.recent = data.feeds;
				for (var i in $scope.recent) {
					$scope.recent[i].url = ['/subscription/feed/',encodeURIComponent($scope.recent[i].id),'/'].join('');
				}
			}
		});
	}
})();