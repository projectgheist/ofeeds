/**
 * Global variables
 */
var ta = [];

/**
 * On page load ready
 */
jQuery(document).ready(function($) {
	var sb = new Bloodhound({
		datumTokenizer: function(d) { console.log(d); return Bloodhound.tokenizers.whitespace(d.title); },
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
			url: '/api/0/subscription/search?q=',
			replace: function () {
				var q = '/api/0/subscription/search?q=';
				if ($('#nrss').val()) {
					q += encodeURIComponent($('#nrss').val());
				}
				return q;
			},
			filter: function(a) {
				ta = a;
				return a; 
			}
		}
	});
	sb.initialize();
	// prep typeahead
	$('.typeahead').typeahead(null, {
		name: 'sb', // identifier
		displayKey: 'title', // name of value to check against
		source: sb.ttAdapter()
	}).on('typeahead:selected', function(obj, datum) {
		angular.element($('#m')).scope().gotosub(datum);
	});
});

var app = angular.module('webapp', [
	'ngRoute',
	'ngSanitize',
	'ngResource',
	'AppFeeds',
	'AppService'
]);

/**
 * Other
 */
var AppService = angular.module('AppService', []);
AppService.factory('GetFeeds', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/list', {}, { query: {method:'GET', isArray:true} });
	}
]);

AppService.factory('GetPosts', ['$resource',
	function($resource) {
		return $resource('/api/0/stream/contents/', {type:'@type', params:'@params'}, { query: {method:'GET', isArray:false} });
	}
]);

AppService.factory('FeedSubmit', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/search', {q:'@q'}, { query: {method:'POST'} });
	}
]);

var AppFeeds = angular.module('AppFeeds', []);

/**
 * App configuration
 */
app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
	$locationProvider.html5Mode(true);
	$routeProvider
	.when('/stream/:value*\/', {
		templateUrl: function(urlattr) {
			return '/templates/posts-compact';
		},
		controller: 'AppFeeds'
	})
	.when('/subscription/:type/:value*\/', {
		templateUrl: function(urlattr) {
			return '/templates/posts-list';
		},
		controller: 'AppFeeds'
	});
}]);

app.directive('onLastRepeat', function() {
	return function(scope, element, attrs) {
		if (scope.$last) setTimeout(function(){
			scope.$emit('onRepeatLast', element, attrs);
		}, 1);
	};
});
	
app.controller('AppFeeds', ['$scope', '$http', '$location', '$routeParams', '$anchorScroll', 'GetFeeds', 'FeedSubmit', 'GetPosts', function($scope, $http, $location, $routeParams, $anchorScroll, GetFeeds, FeedSubmit, GetPosts) {
	$scope.gtsubs = function() {
		GetFeeds.query(function(data) {
			$scope.subs = data;
		}, function(err) {
		});
	}	
	$scope.gtposts = function(QueryParams) {
		GetPosts.query(QueryParams,function(data) {
			$scope.stream = data;
		}, function(err) {
		});
	}
	$scope.isActive = function(viewLocation) { 
		return ('/subscription'+decodeURIComponent(viewLocation)+'*/') === $location.path();
	}
	$scope.$watch(
		function () {
			return $('#sa').width() === $('#sap').width();
		},
		function (n, o) {
			$('#sa').width($('#sap').width());
		}
	)
	$scope.toggle = function(id) {
		var v = $(String(['#',id].join('')));
		v.hide();
		$(['<div id="',String(['#',id].join('')),"\" ng-include src=\"/templates/empty\" onload=\"post\" />"].join('')).insertAfter(v);
	};
	$scope.gotosub = function(obj) {
		$scope.gtposts(obj);
		$location.path(['/subscription/feed/',obj.value,'/'].join(''));
	}
	$scope.gotoTop = function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('top');
        // call $anchorScroll()
        $anchorScroll();
	}
	$scope.gtsubs();
	// if it has parameters
	if (Object.keys($routeParams).length > 0) {
		// don't URL encode the values of param as they get converted later on anyway
		var v = String($routeParams.value);
		// store parameters
		var obj = {};
		obj.type = String($routeParams.type) || 'feed';
		obj.value = /\*(\/)*$/.test(v) ? v.substring(0,v.length-1) : v;
		var idx = $location.path().search(obj.type) + obj.type.length;
		// don't retrieve posts if we are already in the subscription/stream
		if ($location.path().substring(idx,$location.path()) !== obj.value) {
			$scope.gtposts(obj);
		}
	}
	$scope.$on('onRepeatLast', function(scope, element, attrs){
		// re-activate affix
		$('#ma').affix({
			offset: {
				top: 85
			}
		});
	});
	$scope.$watch(
		function () {
			return $('#ma').width() === $('#map').width();
		},
		function (n, o) {
			$('#ma').width($('#map').width());
		}
	)
}]);