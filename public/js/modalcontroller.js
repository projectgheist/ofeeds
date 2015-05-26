(function() {
	'use strict';

	angular
        .module('webapp')
        .controller('modalController', modalController);
	
    modalController.$inject = [
		'$scope', 
	];

	function modalController($scope) {
		$scope.$on("showModal", function(event, args) {
			if ($scope.$parent.stream) {
				var e = $scope.$parent.stream.items[args.idx];
				$scope.title = e.title;
				$scope.images = e.content.images.other;
				$('.carousel').carousel({
					interval: false
				});
				$('#myModal').modal('show');
				$('.carousel').carousel({interval: false});
			}
		});
	}
})();