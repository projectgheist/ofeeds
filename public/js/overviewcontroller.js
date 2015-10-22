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
				$scope.cron = data.nextRunIn;
				// diff in time
				var d = moment($scope.cron).diff(moment(),'milliseconds');
				$timeout($scope.fetch, (d + 5000));
				$scope.subs = data.feeds;
				for (var i in $scope.subs) {
					var ref = $scope.subs[i];
					ref.url = ['/feed/',encodeURIComponent(ref.id)].join('');
					ref.crawlTime = moment(ref.crawlTime).fromNow();
					ref.updated = moment(ref.updated).format();
				}
			});
		};
		
		$scope.rfrsh = function(v) {
		};
	
		// defocus search box and set value
		$('.typeahead').blur().val('');
	
		$scope.fetch();
		
		$interval(function() {
			if ($scope.cron) {
				// diff in time
				var d = moment($scope.cron).diff(moment(),'milliseconds');
				// do string conversion from date
				$scope.diff = moment(d).format('mm:ss');
			}
		}, 1000);
	}
})();