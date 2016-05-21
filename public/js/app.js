(function () {
	'use strict';

	/**
	 * Global variables
	 */
	/** Create instance of lazy image loading */
	const g_Layzr = new Layzr({ 
		normal: 'data-layzr',
		retina: 'data-retina',
		srcset: 'data-srcset',
		threshold: 0
	})
	.on('src:before', (element) => {
		var self = $(element);
		// remove holderjs attributes
		self.removeAttr('data-src');
		self.removeAttr('data-holder-rendered');
	})
	.on('src:after', (element) => {
		var self = $(element);
		// has holderjs attribute?
		if (self.attr('holderjs').length) {
			// convert json to js-object
			obj = JSON.parse(self.attr('holderjs'));
			if (obj.height) {
				self.parent().css('height', obj.height);
			}
		} else {
			self.height('0'); // ignore current image height
			var img = self.parent(),
				panel = img.parent();
			img.css('height',panel.parent().height() - panel.height());
			self.height('100%'); // fill parent container
		}
		// fit image to parent
		fit(self[0], self.parent()[0], { cover: true, watch: true, apply: true }, fit.cssTransform);
	});
	
	/**
	 * On page load ready, only load images that are currently visible in the view area
	 */
	jQuery(document).ready(function ($) {
		// bind scroll and resize handlers
		g_Layzr.handlers(true);

		// have some nice font scaling.
		$('.alert').flowtype({
			minFont: 12,
			maxFont: 36,
			fontRatio: 96
		});
		
		// set sidebar height
		$('#menu').matchHeight({
			target: $(window)
		});
		
		// set the internal height of the sidebar
		$.fn.matchHeight._afterUpdate = function (event, groups) {
			// calc reduced height by navbar height
			var h = $('#menu').height() - $('.navbar-static-top').height();
			// set new height
			$('#menu').height(h);
			
			// calc sidebar body height
			var a = $('#sidebar-header').height() + 10,
				b = $('#sidebar-footer').height() + 10;
			// set new height
			$('#sidebar-body').height(h - (a + b));
		};
	});

	// single keys
	/** Set focus on text input field
	 */
	Mousetrap.bind('/', function () {
		// set focus on search box
		$("#nrss").focus();
		// prevent default browser behavior
		return false;
	});

	/** function clamp
	 */
	function clamp(val,min,max) {
		return Math.min(Math.max(val, min), max);
	}

	angular
		.module('webapp', [
			'ngRoute',
			'ngSanitize',
			'ngResource',
			'infinite-scroll',
			'ngFlowtype',
		])
		.config(appConfig)
		// directive names are only allowed to have one capitalized letter in them
		.directive('holderjs', holderjs)
		.directive('withripple', ['$rootScope','$window','$location',withripple])
		.directive('ngTextfit', ngTextfit)
		.directive('ngInclude', ['$compile',ngInclude]);

	/** function appConfig
	 */
	function appConfig($routeProvider, $locationProvider) {
		$locationProvider.html5Mode(true);
		$routeProvider
		.when('/manage', {
			templateUrl: function (urlattr) {
				return 'views/pages/manage';
			},
			controller: 'overviewController'
		})
		.when('/:type/:value', {
			templateUrl: function (urlattr) {
				if (urlattr.type === 'feed') {
					return 'views/pages/posts';
				} else if (urlattr.type === 'post') {
					return 'views/pages/single';
				} else {
					return 'views/pages/dashboard';
				}
			}
		})
		.otherwise({
			templateUrl: function (urlattr) {
				return 'views/pages/dashboard';
			},
			controller: 'dashboardController'
		});
	};
	
	/**
	*/
	function holderjs() {
		return {
			restrict: 'A', // attribute
			link: function (scope, element, attrs) {
				scope.$watch(function () {
					return scope.isNavVisible();
				}, function () {
					setTimeout(function () { // requires a 1ms delay for some reason
						element.height('0'); // ignore current image height
						var img = element.parent(), //eg. panel-image
							panel = img.parent();
						// set holderjs data
						attrs.$set('data-src', ['holder.js/',element.parent().width(),'x',panel.parent().height() - panel.height(),'/grey'].join(''));
						element.height('100%'); // fill parent container
						// run holderjs
						Holder.run({ images: $(element)[0] });
						// image link detected that needs loading?
						if (element.attr('data-layzr') && element.attr('data-layzr').length) {
							// remove holderjs attributes
							element.css('width', '');
							element.css('height', '');
							// force image lazy loading update
							g_Layzr.update().check();
						} else {
							element.removeAttr('data-layzr');
						}
					}, 1);
				});
			}
		}
	};

	/**
	*/
	function withripple(rootScope, window, location) {
		return {
			restrict: 'C', // class
			link: function (scope, element, attrs) {
				element.bind('click', function () {
					if (location.path() !== element.attr('data-target')) {
						if (element.attr('data-target').indexOf('https://') !== 0) {
							rootScope.$apply(function () {
								location.path(element.attr('data-target'));
							});
						} else {
							window.open(element.attr('data-target'));
						}
					}
				});
			}
		};
	};
	
	/**
	*/
	function ngTextfit() {
		return {
			restrict: 'A', // attribute
			link: function (scope, element, attrs) {
				scope.$parent.$watchGroup([
					function (_scope) {
						return _scope.isNavVisible();
					},
					'rf'
				], function (newValues, oldValues, _scope) {
					if (newValues[0] !== oldValues[0] || newValues[1] === undefined || newValues[1] !== oldValues[1]) {
						var b = ((attrs.ngTextfit.length === 0) || (attrs.ngTextfit === 'true'));
						element.textTailor({
							fit: b, // fit the text to the parent's height and width
							minFont: parseFloat(attrs.ngTtMinFont) || 16,
							maxFont: parseFloat(attrs.ngTtMaxFont) || 40,
							ellipsis: attrs.ngTtEllipsis || true,
							justify: b 	// adds css -> text-align: justify
						});
					}
				});
			}
		};
	}
	
	function ngImgLoaded() {
		return {
			restrict: 'A', // attribute
			link: function (scope, element, attrs) {
				element.bind('load', function () {
					fit(element[0], element.parent()[0], { cover: true, watch: true, apply: true }, fit.cssTransform);
				});
			}
		};
	};
	
	function ngInclude($compile) {
		return {
			restrict: 'A', // attribute
			link: function (scope, element, attrs) {
				/*var s = scope.$parent.$parent, // scope
					p = scope.$parent.post; // post info
				// Trigger when number of children changes, including by directives like ng-repeat
				scope.$watch(function () {
					return element.children().length;
				}, function () {
					// Wait for templates to finish rendering
					scope.$evalAsync(function () {
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
							element.find('.article-content').find('a').each(function (e) {
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
										'content': function () { return $compile(['<a ng-click="gotoFeed(\'',a[0].trim(),'rss\')">',a[1],'</a>'].join(''))(scope); }
									});
								}
							});
							// don't have iframes that are larger then the article width
							element.find('iframe').each(function (e) {
								if ($(this).width() > element.width()) {
									$(this).width('100%');
								}
							});
						}
					});
				});*/
			}
		}
	};

	function onResize($window) {
		return function (scope, element, attr) {
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
})();