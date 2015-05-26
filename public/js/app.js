(function() {
	'use strict';

	angular
		.module('webapp', [
			'ngRoute',
			'ngSanitize',
			'ngResource',
			'infinite-scroll',
			'AppService'
		])
		.config(appConfig)
		.directive('holderjs', holderjs)
		.directive('onLastRepeat', onLastRepeat)
		.directive('onResize', onResize)
		.directive('ngInclude', ngInclude);

	function appConfig($routeProvider, $locationProvider) {
		$locationProvider.html5Mode(true);
		$routeProvider
		.when('/stream/:value*\/', {
			templateUrl: function(urlattr) {
				return '/templates/posts-list';
			},
			controller: 'panelController'
		})
		.when('/subscription/:type/:value', {
			templateUrl: function(urlattr) {
				return '/templates/posts-list';
			},
			controller: 'panelController'
		})
		.otherwise({
			templateUrl: function(urlattr) {
				return '/templates/post-dashboard';
			},
			controller: 'panelController'
		});
	};
	
	function holderjs() {
		return {
			link: function (scope, element, attrs) {
				if (!attrs.ngSrc && !attrs.layzr) {
					attrs.$set('data-src', ['holder.js/',element.parent().width(),'x',Math.max(element.parent().height(),175),'/random'].join(''));
					Holder.run({ 
						images: element.get(0),
						nocss: true 
					});
				} else {
					g_Layzr.update(); // force image lazy loading update
				}
			}
		}
	};
	
	function onLastRepeat() {
		return function(scope, element, attrs) {
			if (scope.$last) {
				setTimeout(function() {
					scope.$emit('onRepeatLast', element, attrs);
				}, 1);
			}
		}
	};

	function ngInclude($compile) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var s = scope.$parent.$parent, // scope
					p = scope.$parent.post; // post info
				// Trigger when number of children changes, including by directives like ng-repeat
				var watch = scope.$watch(function() {
					return element.children().length;
				}, function() {
					// Wait for templates to finish rendering
					scope.$evalAsync(function() {
						// set item id (can't do this in the template as it won't show up correctly in the document)
						element.attr('id',p.uid);
						// if a current element has been expanded
						if (s.cp && p.uid === s.cp.uid) {
							// set expand class
							element.addClass('expand');
							// mark post as read
							s.markAsRead(p);
							// if not infinite scrolling
							if (!s.params.nt) {
								// scroll to article
								s.scrollto(s.cp.uid, -80);
							}
							// make all links open in a new tab
							element.find('.article-content').find('a').each(function(e) {
								// open in new tab
								$(this).attr("target","_blank");
								// if tumblr site
								var u = $(this).attr("href"),
									r = new RegExp("(?:http:\/\/)?(?:www\.+)?([A-Za-z0-9\-]*)(\.tumblr\.com\/)"),
									a = u.match(r);
								// has a tumblr link?
								if (a && a.length > 0) {
									// give it a tooltip
									$(this).attr("data-toggle", "popover");
									// initialise tooltips
									$('[data-toggle="popover"]').popover({ 
									trigger: 'hover', 
										delay:{hide: 3000}, 
										html: true, 
										'content': function() { return $compile(['<a ng-click="gotoFeed(\'',a[0].trim(),'rss\')">',a[1],'</a>'].join(''))(scope); }
									});
								}
							});
							// don't have iframes that are larger then the article width
							element.find('iframe').each(function(e) {
								if ($(this).width() > element.width()) {
									$(this).width('100%');
								}
							});
						}
					});
				});
			}
		}
	};

	function onResize($window) {
		return function(scope, element, attr) {
			var w = angular.element($window);
			scope.$watch(function () {
				return {'h': w.height(), 'w': w.width()};
			}, function (newValue, oldValue) {
				// store new window height and width
				scope.windowHeight 	= newValue.h;
				scope.windowWidth 	= newValue.w;
				// copy parent width to child
				$('#ftr').width($('#hdr').width());
				$('#sa').width($('#sap').width());
			}, true);
			w.bind('resize', function () {
				if (!scope.$$phase && !scope.$root.$$phase) {
					scope.$apply();
				}
			});
		}
	};

	/**
	 * Other
	 */
	var AppService = angular.module('AppService', []);
	AppService.factory('GetSubs', ['$resource',
		function($resource) {
			return $resource('/api/0/subscription/list', {}, {query:{method:'GET',isArray: true}});
		}
	]);

	AppService.factory('GetFeeds', ['$resource',
		function($resource) {
			return $resource('/api/0/feeds/list', {}, {query:{method:'GET',isArray: false}});
		}
	]);

	AppService.factory('RefreshFeed', ['$resource',
		function($resource) {
			return $resource('/api/0/subscription/refresh', {q:'@q'}, {query:{method:'GET',isArray:false}});
		}
	]);

	AppService.factory('FeedSubmit', ['$resource',
		function($resource) {
			return $resource('/api/0/subscription/quickadd', {q:'@q'}, {query:{method:'POST'}});
		}
	]);

	AppService.factory('SetTag', ['$resource',
		function($resource) {
			return $resource('/api/0/tag/edit', {i:'@i',s:'@s',a:'@a',r:'@r'}, {query:{method:'POST'}});
		}
	]);

	/**
	 * App configuration
	 */
})();