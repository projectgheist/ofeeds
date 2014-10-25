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

// single keys
/** Move to article below (previous) in stream
 */
Mousetrap.bind('j', function() {
	angular.element($('#ma')).scope().next();
});

/** Move to article above (next) in stream
 */
Mousetrap.bind('k', function() { 
	angular.element($('#ma')).scope().prev();
});

/** Open article in new tab/window from stream
 */
Mousetrap.bind('v', function() {
	window.open(g_contentView.exp.$el.attr("data-target"), '_blank');
	window.focus();
});

var app = angular.module('webapp', [
	'ngRoute',
	'ngSanitize',
	'ngResource',
	'infinite-scroll',
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

/**
 * App configuration
 */
app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
	$locationProvider.html5Mode(true);
	$routeProvider
	.when('/stream/:value*\/', {
		templateUrl: function(urlattr) {
			return '/templates/posts-list';
		},
		controller: 'AppStream'
	})
	.when('/subscription/:type/:value*\/', {
		templateUrl: function(urlattr) {
			return '/templates/posts-list';
		},
		controller: 'AppStream'
	});
}]);
app.directive('onLastRepeat', function() {
	return function(scope, element, attrs) {
		if (scope.$last) setTimeout(function(){
			scope.$emit('onRepeatLast', element, attrs);
		}, 1);
	};
});
app.directive('article', function() {
	return {
		restrict: 'AE',
		link: function(scope, element, attrs) {
		},
		template: '<article ng-include="\'/templates/post-compact\'" />'
	}
});
app.controller('AppStream', function($scope, $http, $location, $routeParams, $anchorScroll, GetPosts) {
	$scope.gotoTop = function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('top');
        // call $anchorScroll()
        $anchorScroll();
	}
	$scope.gtposts = function() {
		GetPosts.query($scope.params,function(data) {
			if (!data || data.items <= 0) {
				return;
			}
			if ($scope.stream && $scope.stream.title === data.title) {
				$scope.stream.items = $scope.stream.items.concat(data.items);
			} else {
				$scope.stream = data;
			}
			for (var i in $scope.stream.items) {
				$scope.stream.items[i].template = '/templates/post-compact';
			}
		}, function(err) {
		});
	}
	$scope.loadMore = function() {
		if (!$scope.stream) {
			return;
		}
		// last post update time
		var t = $scope.stream.items[$scope.stream.items.length-1].timestampUsec;
		$scope.params.nt = t;
		// retrieve posts
		$scope.gtposts();		
	};
	$scope.next = function() {
		if (!$scope.cp && $scope.stream.items.length > 0) {
			$scope.expand($scope.stream.items[0]);
		} else {
			var p = angular.element($('#'+$scope.cp.id).next()).scope();
			if (p) {
				$scope.toggle(p.post);
			}
		}
	}
	$scope.prev = function() {
		if (!$scope.cp && $scope.stream.items.length > 0) {
			$scope.expand($scope.stream.items[0]);
		} else {
			var p = angular.element($('#'+$scope.cp.id).prev()).scope();
			if (p) {
				$scope.toggle(p.post);
			}
		}
	}
	$scope.expand = function(p) {
		p.template = '/templates/post-expand';
		$scope.cp = p;
		if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
			$scope.$apply();
		}
	}
	$scope.toggle = function(p) {
		// make previous expanded post small again
		if ($scope.cp && $scope.cp != p) {
			$scope.cp.template = '/templates/post-compact';
		}
		// store current expanded post
		if (p.template === '/templates/post-expand') {
			p.template = '/templates/post-compact';
		} else {
			$scope.expand(p);
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
	// if it has parameters
	if (Object.keys($routeParams).length > 0) {
		// don't URL encode the values of param as they get converted later on anyway
		var v = String($routeParams.value);
		// declare variable
		$scope.params = {};
		// set type
		$scope.params.type = String($routeParams.type) || 'feed';
		// remove trailing '*/' otherwise use normal url
		$scope.params.value = /\*(\/)*$/.test(v) ? v.substring(0,v.length-1) : v;
		// retrieve posts
		$scope.gtposts();
	}
});
app.controller('AppFeeds', function($scope, $http, $location, GetFeeds, FeedSubmit) {
	$scope.gtsubs = function() {
		GetFeeds.query(function(data) {
			$scope.subs = data;
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
	$scope.gotosub = function(obj) {
		// go to subscription local url
		$location.path(['/subscription/feed/',obj.value,'/'].join(''));
		// call '$apply' oteherwise angular doesn't recognize that the url has changed
		$scope.$apply();
	}
	$scope.gotoTop = function() {
        // set the location.hash to the id of
        // the element you wish to scroll to.
        $location.hash('top');
        // call $anchorScroll()
        $anchorScroll();
	}
});