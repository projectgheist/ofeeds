(function() {
	'use strict';

	angular
        .module('webapp')
        .controller('overviewController', overviewController)
        .service('overviewService', overviewService);

	overviewService.$inject = [
		'$resource',
	];

	function overviewService($resource) {
		return {
			getElements: getElements
		};
		
		function getElements() {
			return $resource('/api/0/feeds/list', {}, { query:{ method: 'GET', isArray: false } });
		}
	};

    overviewController.$inject = [
		'$scope', 
		'overviewService',
		'$timeout',
		'$interval',
	];

	function overviewController($scope, overviewService, $timeout, $interval) {
		$scope.fetch = function() {
			overviewService.getElements().query(function(data) {
				$scope.cron = moment(data.nextRunIn).format();
				$timeout($scope.fetch, 1000 * 60 * ($scope.diff+1));
				$scope.subs = data.feeds;
				for (var i in $scope.subs) {
					var ref = $scope.subs[i];
					ref.url = ['/subscription/feed/',encodeURIComponent(ref.id)].join('');
					ref.crawlFormatTime = moment(ref.crawlTime).format();
					ref.date = moment(ref.updated).format('DD MMM YYYY');
					ref.time = moment(ref.updated).format('HH:mm Z');
					ref = $scope.subs[i];
				}
			});
		};
		
		$scope.rfrsh = function(v) {
		};
		
		$scope.fetch();
		
		$interval(function() {
			if ($scope.cron) {
				$scope.diff = moment($scope.cron).diff(moment(), 'seconds');
			}
		}, 1000);
	}
})();