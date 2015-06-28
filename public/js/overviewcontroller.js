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
		});
	}
})();