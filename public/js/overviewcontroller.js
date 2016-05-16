(function () {
	'use strict';

    overviewController.$inject = [
		'$scope',
		'$timeout',
		'$interval',
		'services',
	];

	angular
        .module('webapp')
        .controller('overviewController', overviewController);

	function overviewController($scope, $timeout, $interval, services) {
		/** function fetch
		 * Retrieve all feeds
		 */
		$scope.fetch = function () {
			services.getSubscriptions().query({}, function (data) {
				// store retrieved data
				$scope.subs = data.feeds;
				// store retrieved next cron runtime
				$scope.cron = data.nextRunIn;
				// diff in time
				var d = moment($scope.cron).diff(moment(),'milliseconds');
				// repeatitive fetch of information every n-time
				$timeout($scope.fetch, (d + 5000));
				// loop feeds
				for (var i in $scope.subs) {
					// local reference
					var ref = $scope.subs[i];
					//
					ref.url = ['/feed/',encodeURIComponent(ref.id)].join('');
					// formatted retrieved time
					ref.crawlTime = moment(ref.crawlTime).fromNow();
					// formatted feed modification time
					ref.updated = moment(ref.updated).format();
				}
			});
		};

		/** function fetch */
		$scope.rfrsh = function (v) {
		};
	
		// defocus search box and set value
		$('.typeahead').blur().val('');

		// execute the fetch on load
		$scope.fetch();

		// declare repetition
		$interval(function () {
			if ($scope.cron) {
				// diff in time
				var d = moment($scope.cron).diff(moment(), 'milliseconds');
				// do string conversion from date
				$scope.diff = moment(d).format('mm:ss');
			}
		}, 1000);
	}
})();