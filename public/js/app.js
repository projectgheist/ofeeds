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
		// directive names are only allowed to have one capitalized letter in them
		.directive('holderjs', holderjs)
		.directive('ngRipple', ngRipple)
		.directive('ngTextfit', ngTextfit);
		//.directive('onLastRepeat', onLastRepeat)
		//.directive('onResize', onResize)
		//.directive('ngInclude', ngInclude)
		//.directive('ngImgLoaded', ngImgLoaded)

	function appConfig($routeProvider, $locationProvider) {
		$locationProvider.html5Mode(true);
		$routeProvider
		.when('/manage', {
			templateUrl: function(urlattr) {
				return '/templates/manage';
			},
			controller: 'overviewController'
		})
		.when('/subscription/:type/:value', {
			templateUrl: function(urlattr) {
				return '/templates/posts-list';
			}
		})
		.otherwise({
			templateUrl: function(urlattr) {
				return '/templates/post-dashboard';
			},
			controller: 'dashboardController'
		});
	};
	
	function holderjs() {
		return {
			restrict: 'A', // attribute
			link: function (scope, element, attrs) {
				scope.$watch(function () {
					return scope.isNavVisible();
				}, function() {
					setTimeout(function() { // requires a 1ms delay for some reason
						// set holderjs data
						attrs.$set('data-src', ['holder.js/',element.parent().width(),'x',Math.max(element.parent().height(),175),'/random'].join(''));
						// run holderjs
						Holder.run({ images: $(element)[0] });
						// image link detected?
						if (element.attr('data-layzr')) {
							// remove holderjs attributes
							element.css('width', '');
							element.css('height', '');
							// force image lazy loading update
							g_Layzr.update();
						} else if (element.attr('src')) {
							// fit image to parent
							fit(element[0], element.parent()[0], { cover: true, watch: true, apply: true }, fit.cssTransform);
						}
					}, 1);
				});
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

	function ngRipple() {
		return {
			restrict: 'A', // attribute
			link: function(scope, element, attrs) {
				// Trigger when number of children changes, including by directives like ng-repeat
				scope.$watch(function() {
					return element.children().length === parseInt(attrs['ngRipple']);
				}, function() {
					// initialize material ripple
					$.material.init();
				});
			}
		};
	}
	
	function ngTextfit() {
		return {
			restrict: 'A', // attribute
			link: function(scope, element, attrs) {
				scope.$watch(function () {
					return scope.isNavVisible();
				}, function() {
					setTimeout(function() { // requires a 1ms delay for some reason
						element.textTailor({
							minFont: 12,
							justify: true
						});
					}, 1);
				});
			}
		};
	}
	
	function ngImgLoaded() {
		return {
			restrict: 'A', // attribute
			link: function(scope, element, attrs) {
				element.bind('load', function() {
					fit(element[0], element.parent()[0], { cover: true, watch: true, apply: true }, fit.cssTransform);
				});
			}
		};
	};
	
	function ngInclude($compile) {
		console.log('ngI')
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var s = scope.$parent.$parent, // scope
					p = scope.$parent.post; // post info
				// Trigger when number of children changes, including by directives like ng-repeat
				scope.$watch(function() {
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