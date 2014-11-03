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
	$('.typeahead').typeahead({
		hint: true,
		minLength: 3
	}, {
		name: 'sb', // identifier
		displayKey: 'title', // name of value to check against
		source: sb.ttAdapter(),
		templates: {
			empty: ['<p class="col-xs-12">','<i class="fa fa-times fa-fw"></i> No results found!','</p>'].join('\n'),
			suggestion: Handlebars.compile('<p><i class="fa fa-bookmark-o fa-fw"></i> <strong>{{title}}</strong><br>{{description}}</p>')
		}
	}).on('typeahead:selected', function(obj, datum) {
		if ($('#m').length) {
			angular.element($('#m')).scope().gotosub(datum);
		} else {
			angular.element($('#map')).scope().gotostream(datum);
		}
		$('.typeahead').val('').blur();
	});
	$('#sa').affix();
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
	window.open(angular.element($('#ma')).scope().cp.alternate.href, '_blank');
	window.focus();
});

function ShowAlertMessage(t,m) {
	$('#a').removeClass('hidden').addClass(t);
	$('#am').html(m);
	$("#a").fadeTo(2000, 500).slideUp(500, function(){
		$("#a").alert('close');
	});
}

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
		return $resource('/api/0/subscription/list', {}, {query:{method:'GET',isArray:true}});
	}
]);

AppService.factory('RefreshFeed', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/refresh', {q:'@q'}, {query:{method:'GET',isArray:false}});
	}
]);

AppService.factory('GetPosts', ['$resource',
	function($resource) {
		return $resource('/api/0/stream/contents/', {type:'@type', params:'@params'}, {query:{method:'GET',isArray:false}});
	}
]);

AppService.factory('FeedSubmit', ['$resource',
	function($resource) {
		return $resource('/api/0/subscription/quickadd', {q:'@q'}, {query:{method:'POST'}});
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
	.when('/subscription/:type/:value', {
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
app.directive('ngInclude', function() {
    return {
        restrict: 'A',
		link: {
			post: function(scope, element, attrs) {
				var s = scope.$parent.$parent,
					p = scope.$parent.post;
				if (s.cp && p.id === s.cp.id) {
					element.addClass('expand');
					if (!s.params.nt) {
						s.scrollto(s.cp.id);
					}
				}
				// make all links open in a new tab
				var o = $('.article-content').find('a');
				//.each(function() {
					//console.log($(this));
					//$(this).attr("target","_blank");
				//});
			}
        }
    };
});
app.directive('resize', function ($window) {
    return function(scope, element, attr) {
        var w = angular.element($window);
        scope.$watch(function () {
            return {'h': w.height(), 'w': w.width()};
        }, function (newValue, oldValue) {
            scope.windowHeight 	= newValue.h;
            scope.windowWidth 	= newValue.w;
			$('#ftr').width($('#hdr').width());
			$('#sa').width($('#sap').width());
        }, true);
        w.bind('resize', function () {
            scope.$apply();
        });
    }
});
app.controller('AppStream', function($rootScope, $scope, $http, $location, $routeParams, $anchorScroll, GetPosts, FeedSubmit, RefreshFeed) {
	$scope.gotostream = function(obj) {
		// go to subscription local url
		$location.path(['/subscription/feed/',obj.value,'/'].join(''));
		// call '$apply' oteherwise angular doesn't recognize that the url has changed
		$scope.$apply();
	}
	$scope.canScroll = function() {
		return ($(document).scrollTop() > 50);
	}
	$scope.gotoTop = function() {
        $scope.scrollto('top');
	}
	$scope.scrollto = function(id) {
		$('#map').stop().scrollTo('#'+id, 800, {offset:{top:85}});
	}
	$scope.rfrsh = function() {
		RefreshFeed.query({'q':$scope.params.value},
			function(data) {
				// clear array of posts
				$scope.stream.items = [];
				// reset times on params
				$scope.params.nt = undefined;
				// reset expanded post
				$scope.cp = undefined;
				// get new latest items
				$scope.gtposts();
				// show message
				ShowAlertMessage('alert-success',['<strong>Successfully</strong> refreshed feed (',$scope.stream.title,')'].join(' '));
			}, 
			function(err) {
				ShowAlertMessage('alert-danger',['An <strong>error</strong> occured when trying to refresh feed (',$scope.stream.title,')'].join(' '));
		});
	}
	$scope.delt = function() {
		
	}
	$scope.sbmt = function() {
		FeedSubmit.save({q: $scope.stream.feedURL},function(data) {
			// show message
			ShowAlertMessage('alert-success',['<strong>Successfully</strong> subscribed to feed (',$scope.stream.title,')'].join(' '));
			$scope.stream.subscribed = true;
			$rootScope.$broadcast('updateSubs');
		}, function(err) {
			ShowAlertMessage('alert-danger',['An <strong>error</strong> occured when trying to subscribe to',$scope.stream.title].join(' '));
		});
	}	
	$scope.gtposts = function() {
		GetPosts.query($scope.params,function(data) {
			if (!data || !data.items || data.items.length <= 0) {
				return;
			}
			if ($scope.stream && $scope.stream.title === data.title &&
				($scope.stream.items.length === 0 || (data.items[0].timestampUsec <= $scope.stream.items[$scope.stream.items.length-1].timestampUsec))) {
				$scope.stream.items = $scope.stream.items.concat(data.items);
			} else {
				$scope.stream = data;
			}
			for (var i in $scope.stream.items) {
				if ($scope.cp && $scope.stream.items[i].id === $scope.cp.id) {
					$scope.expand($scope.stream.items[i]);
				} else {
					$scope.stream.items[i].template = '/templates/post-compact';
				}
			}
		}, function(err) {
		});
	}
	$scope.loadMore = function() {
		if (!$scope.stream || !$scope.stream.items ||
			$scope.stream.items.length <= 0) {
			return;
		}
		// last post update time
		var t = $scope.stream.items[$scope.stream.items.length-1].timestampUsec;
		if (t !== $scope.params.nt) {
			$scope.params.nt = t;
			// retrieve posts
			$scope.gtposts();
		}
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
		$scope.params.nt = undefined;
		if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
			$scope.$apply();
		}
	}
	$scope.toggle = function(p) {
		// make previous expanded post small again
		if ($scope.cp && $scope.cp != p) {
			$('#' + $scope.cp.id).removeClass('expand');
			$scope.cp.template = '/templates/post-compact';
		}
		// store current expanded post
		if (p.template === '/templates/post-expand') {
			p.template = '/templates/post-compact';
		} else {
			$scope.expand(p);
		}
	}
	// re-activate affix
	$scope.setaffix = function() {
		var o = $('#mah').position().top;
		$(window).off('.affix');
		$('#ma').removeData('bs.affix').removeClass('affix affix-top affix-bottom');
		$('#ma').affix({
			offset: {
				top: o
			}
		});
	}
	$scope.$watch(
		function () {
			return $('#ma').width() === $('#map').width();
		},
		function (n, o) {
			$('#ma').width($('#map').width());
			$scope.setaffix();
		}
	)
	$scope.$on('onRepeatLast', function(scope, element, attrs){
		// make all links open in a new tab
		$(".article-content a").each(function() {
			$(this).attr("target","_blank");
		});
		$scope.setaffix();
	});
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
app.controller('AppFeeds', function($scope, $http, $location, GetFeeds) {
	$scope.$on("updateSubs", function(event, args) {
		$scope.gtsubs();
	});
	$scope.gtsubs = function() {
		GetFeeds.query(function(data) {
			$scope.subs = data;
		}, function(err) {
		});
	}	
	$scope.isActive = function(str) {
		var s = str.substring('feed%2F'.length,str.length),
			a = new RegExp(decodeURIComponent(s));
		return a.test($location.path());
	}
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
	$scope.gtsubs();
});