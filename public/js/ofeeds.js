/**
 * Global variables
 */

/**
 * On page load ready
 */
jQuery(document).ready(function($) {
});

var app = angular.module('webapp', [
	'ngRoute',
	'AppController',
	'AppService'
]);

/**
 * App configuration
 */
app.config(['$routeProvider', '$httpProvider',
	function($routeProvider, $httpProvider) {
		/*$routeProvider
		.when(g_fetch_prefix_url+'/api/alliance/members', {
			templateUrl: 'partials/phone-list.html',
			controller: 'GrpController'
		})
		.otherwise({ 
			redirectTo: g_fetch_prefix_url + '/api/coalition/list' 
		})*/;
        $httpProvider.defaults.useXDomain = true;
	}
]);

/**
 * Other
 */
/*
var AppService = angular.module('AppService', ['ngResource']);
AppService.factory('Groups', ['$resource',
	function($resource) {
		return $resource(g_fetch_prefix_url+'/api/coalition/list', {}, { query: {method:'GET', isArray:true } });
	}
]);
*/
var AppController = angular.module('AppController', [])
AppController.controller('AppController', ['$scope', '$http', 'Groups', function($scope, $http, Groups) {
}]);
