(function() {
	'use strict';

	angular
        .module('webapp')
        .controller('overviewController', overviewController)
        .service('overviewService', overviewService);

	overviewService.$inject = [
		'$resource'
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
		'overviewService'
	];

	function overviewController($scope, overviewService) {
		overviewService.getElements().query(function(data) {
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
		
		$scope.rfrsh = function(v) {
		};
	}
})();