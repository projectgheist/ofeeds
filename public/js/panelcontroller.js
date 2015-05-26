(function() {
	'use strict';

	angular
        .module('webapp')
        .controller('panelController', panelController)
        .service('panelService', panelService);
	
	panelService.$inject = [
		'$resource'
	];

	function panelService($resource) {
		return {
			getElements: getElements
		};
		
		function getElements() {
			return $resource('/api/0/stream/contents/', {type:'@type', params:'@params'}, { query:{ method: 'GET', isArray: false } });
		}
	};

    panelController.$inject = [
		'$rootScope', 
		'$scope', 
		'$http', 
		'$location',
		'$route',
		'$routeParams', 
		'$anchorScroll', 
		'$sce', 
		'$timeout', 
		'panelService'
	];

	function panelController($rootScope, $scope, $http, $location, $route, $routeParams, $anchorScroll, $sce, $timeout, panelService) {
		// toggle the slideout of the nav sidebar
		$scope.nt = function() {
			g_Slideout.toggle();
		};
		
		// is slideout open
		$scope.isNavVisible = function() {
			if (Object.keys(g_Slideout).length > 0) {
				return g_Slideout.isOpen();
			}
		};
		
		// go to a subscription
		$scope.gotostream = function(obj,refresh) {
			// go to subscription local url
			$timeout(function() {
				$location.path(['/subscription/feed/',obj.value,'/'].join(''));
			});
		};
		
		//
		$scope.showModal = function(e) {
			var idx = -1;
			for (idx in $scope.stream.items) {
				if ($scope.stream.items[idx].uid === e) break;
			}
			if (idx > -1) {			
			// notify modal to show
				$rootScope.$broadcast('showModal', {idx: idx});
			}
		};
		
		// if scrolling is allowed
		$scope.canScroll = function() {
			return $(document).scrollTop() > 10;
		};
		
		// search for a subscription
		$scope.gotoFeed = function(r) {
			$http.get('/api/0/subscription/search',{ params:{ q: r } })
			.success(function(data, status, headers, config) {
				$scope.gotostream(data[0],false);
			})
			.error(function(data, status, headers, config) {
			});
		};
		
		/*$scope.makeHorizontal = function(e) {
			// make element use the horizontal CSS
			e.addClass('horizontal-image');
			if (e.width() > e.parent().width()) {
				e.css('left',Math.min(0,(e.parent().width() - e.width()) / 2));
			} else if (e.width() < e.parent().width()) {
				e.removeClass('horizontal-image');
				$scope.makeVertical(e);
			}
		}
		$scope.makeVertical = function(e) {
			e.addClass('vertical-image');
			if (e.height() > e.parent().height()) {
				e.css('top',Math.min(0,(e.parent().height() - e.height()) / 2));
			} else if (e.height() < e.parent().height()) {
				e.removeClass('vertical-image');
				$scope.makeHorizontal(e);
			}
		}*/
		
		// scroll back to top
		$scope.gotoTop = function() {
		   $scope.scrollto('mah', 0);
		};
		
		// scroll to a specific post
		$scope.scrollto = function(id, po) {
			// clear scroll to array
			$.scrollTo.window().queue([]).stop();
			// scroll to next element
			$('html,body').scrollTo($('#'+id), 0, { queue: false, offset: {top: po || 0} });
		};
		
		// refresh the current subscription
		$scope.rfrsh = function() {
			// make sure that it has a param value
			if ($scope.params === undefined) {
				$scope.rf = false;
				return;
			}
			// set refresh page to TRUE
			if (!$scope.rf) {
				$scope.rf = true;
			}
			RefreshFeed.query({ 'q': $scope.params.value },
				function(data) {
					// clear array of posts
					$scope.stream.items = [];
					// reset times on params
					$scope.params.nt = undefined;
					// reset expanded post
					$scope.cp = undefined;
					// get new latest items
					$scope.gtposts({
						t:'alert-success',
						m:['<strong>Successfully</strong> refreshed feed (',$scope.stream.title,')'].join(' ')
					});
				},
				function(err) {
					// show error message
					ShowAlertMessage('alert-danger',['An <strong>error</strong> occured when trying to refresh feed (',$scope.stream.title,')'].join(' '));
					// turn off spinner
					scope.rf = false;
			});
		};
		
		$scope.delt = function() {
			
		};
		
		$scope.sbmt = function() {
			// submit new feed URL to server
			FeedSubmit.save({q: $scope.stream.feedURL},function(data) {
				// show message
				ShowAlertMessage('alert-success',['<strong>Successfully</strong> subscribed to feed (',$scope.stream.title,')'].join(' '));
				// set stream as subscribed
				$scope.stream.subscribed = true;
				// notify sidebar to update
				$rootScope.$broadcast('updateSubs');
			}, function(err) {
				ShowAlertMessage('alert-danger',['An <strong>error</strong> occured when trying to subscribe to',$scope.stream.title].join(' '));
			});
		};
		
		$scope.gtposts = function(m) {
			// make sure that it has a param value
			if ($scope.params === undefined) {
				$scope.rf = false;
				return;
			}
			// set refresh page to TRUE
			$scope.rf = true;
			// ignore read articles if flagged
			if ($scope.ignoreReadArticles) {
				$scope.params.xt = 'user/-/state/read';
			}
			panelService.getElements().query($scope.params,function(data) {
				// turn off refresh
				$scope.rf = false;
				// make sure variables exist
				if (!data || !data.items || data.items.length <= 0) {
					return;
				}
				// make sure it has a title
				if (data.title.length > 0) {
					// defocus search box and set value
					$('.typeahead').blur().val(data.title);
				}
				// what to do with the retrieved data
				if ($scope.stream && 
					$scope.stream.title === data.title &&
					($scope.stream.items.length === 0 || (data.items[0].timestampUsec <= $scope.stream.items[$scope.stream.items.length-1].timestampUsec))) {
					// append to the articles that were already in the array
					$scope.stream.items = $scope.stream.items.concat(data.items);
				} else {
					// copy retrieved articles to stream
					$scope.stream = data;
				}
				// loop all articles/items
				for (var i in $scope.stream.items) {
					// local reference to item
					var ref = $scope.stream.items[i];
					// format date
					if (moment().diff(ref.published,'days') > 1) {
						ref.formatted = moment(ref.published).format('ddd, hh:mm');
					} else {
						ref.formatted = moment(ref.published).fromNow();
					}
					// local reference to variable
					var str = ref.content.content;
					// check if string
					if (typeof str == 'string' || str instanceof String) {
						// Post HTML content needs to be set as TRUSTED to Angular otherwise it will not be rendered
						ref.content.content = $sce.trustAsHtml(ref.content.content);
					}
					// set article's template
					if ($scope.cp && ref.uid === $scope.cp.uid) {
						$scope.expand($scope.stream.items[i]);
					} else if (gTemplateID !== '') {
						ref.template = gTemplates[gTemplateID][0];
					}
					// store back
					$scope.stream.items[i] = ref;
				}
				// update templates
				$scope.updateStyle('tile');
				// is message present?
				if (m) {
					ShowAlertMessage(m.t, m.m); // show message
				}
			}, function(err) {
				$scope.rf = false;
			});
		};
		
		$scope.updateStyle = function(n) {
			// if the same template id is set
			if (gTemplateID === n) {
				return;
			}
			// set new template id
			gTemplateID = n;
			// set the template for all the items
			for (var i in $scope.stream.items) {
				$scope.stream.items[i].template = gTemplates[gTemplateID][0];
			}
		};
		
		$scope.loadMore = function() {
			// make sure that articles exist
			if (!$scope.stream || !$scope.stream.items || $scope.stream.items.length <= 0 ||
				$route.current.params.value !== $routeParams.value) {
				return; // skip rest of function
			}
			// last post update time
			var t = $scope.stream.items[$scope.stream.items.length-1].timestampUsec;
			if (t !== $scope.params.nt) {
				// set new fetch time
				$scope.params.nt = t;
				// retrieve posts
				$scope.gtposts();
			}
		};
		
		$scope.lmf = function() {
			
		};
		
		$scope.next = function() {
			if (!$scope.cp && $scope.stream !== undefined && $scope.stream.items.length > 0) {
				$scope.expand($scope.stream.items[0]);
			} else if ($scope.cp) {
				// retrieve the next post in the list
				var p = angular.element($('#'+$scope.cp.uid).next()).scope();
				// if next post exists
				if (p) {
					$scope.toggle(p.post);
				}
			}
		};
		
		$scope.prev = function() {
			if (!$scope.cp && $scope.stream !== undefined && $scope.stream.items.length > 0) {
				$scope.expand($scope.stream.items[0]);
			} else if ($scope.cp) {
				var p = angular.element($('#'+$scope.cp.uid).prev()).scope();
				if (p) {
					$scope.toggle(p.post);
				}
			}
		};
		
		$scope.toggleRead = function(p) {
			if (!p || p === undefined) {
				return;
			}
			if ($scope.isRead(p)) {
				$scope.markAsUnread(p);
			} else {
				$scope.markAsRead(p);
			}
		};
		
		$scope.toggleIgnoreReadArticles = function() {
			if ($scope.ignoreReadArticles) {
				$scope.ignoreReadArticles = !$scope.ignoreReadArticles;
			} else {
				$scope.ignoreReadArticles = true;
			}
			// refresh stream to indicate new value
			$scope.rfrsh();
		};
		
		$scope.markAsRead = function(p) {
			if (!$('#m').length || (!p || p === undefined)) {
				return;
			}
			SetTag.query({i:p.lid,a:'user/-/state/read'}, function(d) {
				// mark post as read
				p.read = true;
				// notify sidebar to update
				$rootScope.$broadcast('updateSubs');
			}, function(e) {
			});
		};
		
		$scope.markAsUnread = function(p) {
			if (!$('#m').length || (!p || p === undefined)) {
				return;
			}
			SetTag.query({i:p.lid,r:'user/-/state/read'}, function(d) {
				// mark post as unread
				p.read = false;
				// notify sidebar to update
				$rootScope.$broadcast('updateSubs');
			}, function(e) {
			});
		};
		
		$scope.isRead = function(p) {
			if (!$('#m').length) {
				return false;
			}
			return (p.read > 0) ? true : false;
		};
		
		$scope.isSpinning = function() {
			return $scope.rf;
		};
		
		$scope.expand = function(p) {
			// if template style doesn't have an expanded version, skip
			if (gTemplates[gTemplateID].length <= 1) {
				return;
			}
			$timeout(function() {
				// change the template of the post to the expanded version
				p.template = gTemplates[gTemplateID][1];
				// store post as the current post
				$scope.cp = p;
				// reset
				$scope.params.nt = undefined;
			});
		};
		
		$scope.toggle = function(p) {
			// if template style doesn't have an expanded version, skip
			if (gTemplates[gTemplateID].length <= 1) {
				return;
			}
			// make previous expanded post small again
			if ($scope.cp && $scope.cp != p) {
				// remove expand class from current post
				$('#' + $scope.cp.uid).removeClass('expand');
				// set post template to compact version
				$scope.cp.template = gTemplates[gTemplateID][0];
			}
			// store current expanded post
			if (p.template !== gTemplates[gTemplateID][1]) {
				$scope.expand(p);
			} else {
				// set post template to compact version
				p.template = gTemplates[gTemplateID][0];
			}
		};
		
		// re-activate affix
		$scope.setaffix = function() {
			$(window).off('.affix');
			$('#ma').width($('body').width())
		};
		
		$scope.$watch(
			function () {
				return $('#ma').width() === $('body').width();
			},
			function (n, o) {
				$scope.setaffix();
			}
		);
		
		$scope.$on('onRepeatLast', function(scope, element, attrs) {
			// make all links open in a new tab
			$(".article-content a").each(function() {
				$(this).attr("target","_blank");
			});
			$scope.setaffix();
		});
		
		if (!$('.typeahead').parent().hasClass('twitter-typeahead')) {
			var sb = new Bloodhound({
				datumTokenizer: function(d) {
					return Bloodhound.tokenizers.whitespace(d.title); 
				},
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
						ta = [];
						for (var i in a) {
							if (a[i].title !== '') ta.push(a[i]);
						}
						return ta; 
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
					empty: '<p class="tt-empty"><i class="fa fa-times fa-fw"></i>&nbsp;No results found!</p>',
					suggestion: Handlebars.compile('<p><i class="fa fa-bookmark-o fa-fw"></i>&nbsp;<strong>{{title}}</strong><br>{{description}}</p>')
				}
			}).on('typeahead:selected', function(obj, datum) {
				if ($('#m').length) {
					$scope.gotosub(datum);
				} else {
					$scope.gotostream(datum,true);
				}
				// lose focus
				$('.typeahead').blur();
			});
		};
		
		// focus on search box
		$('.typeahead').focus();
		
		// on URL change
		$scope.$on('$routeChangeSuccess', function() {
			// $routeParams should be populated here
			// if it has parameters AND not the same URL
			if (Object.keys($routeParams).length > 0 &&
				(!$scope.stream || encodeURIComponent($scope.stream.feedURL) !== $routeParams.value)) {
				if ($scope.stream === undefined) {
					// no longer undefined
					$scope.stream = {};
				}
				// don't URL encode the values of param as they get converted later on anyway
				var v = String($routeParams.value);
				// declare variable
				$scope.params = {
					// set type
					type: (String($routeParams.type) || 'feed'),
					// remove trailing '*/' otherwise use normal url
					value: (/\*(\/)*$/.test(v) ? v.substring(0, v.length - 1) : v)
				};
				// retrieve posts
				$scope.gtposts();
			} else {
				// console.log('loading')
			}
		});

		// single keys
		/** Move to article below (previous) in stream
		 */
		Mousetrap.bind('j', function() {
			$scope.next();
		});

		/** Move to article above (next) in stream
		 */
		Mousetrap.bind('k', function() { 
			$scope.prev();
		});

		/** Open article in new tab/window from stream
		 */
		Mousetrap.bind('v', function() {
			window.open($scope.cp.alternate.href, '_blank');
			window.focus();
		});

		/** Toggle article read state
		 */
		Mousetrap.bind('m', function() {
			$scope.toggleRead(s.cp);
		});
	}
})();