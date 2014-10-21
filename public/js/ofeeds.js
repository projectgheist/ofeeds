/**
 * Global variables
 */

/**
 * On page load ready
 */
jQuery(document).ready(function($) {
	/*var s = new Bloodhound({
		datumTokenizer: function(d) { return d.Name; },
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		limit: 10,
		remote: {
			url: "/api/0/subscription/list",
			filter: function(a) { 
				g_members_object = a; 
				return a; 
			}
		}
	});
	s.initialize();
	// prep typeahead
	$('.typeahead').typeahead({
		hint: true,
		highlight: true,
		minLength: 1
	}, {
		name: 'g_typeahead_members',
		displayKey: 'Name',
		source: s.ttAdapter()
	});*/
});

var app = angular.module('webapp', [
	'ngRoute',
	'ngSanitize',
	'AppNav',
	'AppFeeds',
	'AppService'
]);

/**
 * Other
 */
var AppService = angular.module('AppService', ['ngResource']);
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
var AppNav = angular.module('AppNav', []);

/**
 * App configuration
 */
app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
	$locationProvider.html5Mode(true);
	$routeProvider
	.when('/subscription/:type/:value*\/', {
		templateUrl: function(urlattr){
			return '/templates/posts-compact';
		},
		controller: 'AppFeeds'
	});
}]);

app.controller('AppNav', ['$scope', '$http', '$location', '$routeParams', '$anchorScroll', 'GetFeeds', 'FeedSubmit', 'GetPosts', function($scope, $http, $location, $routeParams, $anchorScroll, GetFeeds, FeedSubmit, GetPosts) {
	$scope.gtsubs = function() {
		GetFeeds.query(function(data) {
			$scope.subs = data;
		}, function(err) {
		});
	}	
	$scope.gtposts = function(QueryParams) {
		GetPosts.query(QueryParams,function(data) {
			console.log(data);
			$scope.stream = data;
		}, function(err) {
			console.log(err);
			$scope.stream = [];
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
	$scope.sbmt = function() {
		// get url from text box
		var u = $('#nrss');
		// disable the input
		u.prop('disabled', true);
		// make sure it exists
		if (u.val() !== undefined || u.val().trim().length > 0) {
			// submit to server
			FeedSubmit.save({q:u.val()}, function(r) {
				u.prop('disabled', false);
				// render feed to main section
				$scope.gtposts({'type':r.results[0].type,'value':r.results[0].value});
			}, function() {
				u.prop('disabled', false);
			});
		}
	}
	$scope.gotoTop = function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('top');
        // call $anchorScroll()
        $anchorScroll();
	}
	$scope.gtsubs();
	var obj = {};
	// if it has parameters
	if (Object.keys($routeParams).length > 0) {
		// don't URL encode the values of param as they get converted later on anyway
		var v = String($routeParams.value);
		// store parameters
		obj.type = String($routeParams.type);
		obj.value = /\*(\/)*$/.test(v) ? v.substring(0,v.length-1) : v;
		var idx = $location.path().search(obj.type) + obj.type.length;
		// don't retrieve posts if we are already in the subscription/stream
		if ($location.path().substring(idx,$location.path()) !== obj.value) {
			$scope.gtposts(obj);
		}
	}
}]);

app.directive('onLastRepeat', function() {
	return function(scope, element, attrs) {
		if (scope.$last) setTimeout(function(){
			scope.$emit('onRepeatLast', element, attrs);
		}, 1);
	};
});

app.controller('AppFeeds', ['$scope', '$http', '$location', function($scope, $http, $location) {
	$scope.$on('onRepeatLast', function(scope, element, attrs){
		// re-activate affix
		$('#ma').affix({
			offset: {
				top: 85
			}
		});
	});
	
	$scope.toggle = function(t) {
		console.log(t);
	}
	
	$scope.$watch(
		function () {
			return $('#ma').width() === $('#map').width();
		},
		function (n, o) {
			$('#ma').width($('#map').width());
		}
	)
}]);