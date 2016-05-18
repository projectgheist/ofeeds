(function () {
	'use strict';
	
	/** Declare modules to be included in the controller */
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
		'$window',
		'services',
	];

	/** Declare controller */
	function panelController($rootScope, $scope, $http, $location, $route, $routeParams, $anchorScroll, $sce, $timeout, $window, services) {
		/** Type of template to use */
		$scope.templateID = 'list';
		
		/** Declare templates */
		$scope.templates = {
			'list': ['views/templates/post-compact','views/templates/post-expand'],
			'tile': ['views/templates/post-tile'], 
			'mini': ['views/templates/post-minimal','views/templates/post-expand'],
		},

		/** function showAlert
		 @param t: type of alert (eg. warning, danger)
		 @param m: message to relay
		*/
		$scope.showAlert = function (t,m) {
			$rootScope.$apply(function () {
				// set alert type
				$scope.alertType = ['alert-',t].join('');
				// set alert message
				$scope.alertMessage = $sce.trustAsHtml(m);
				// find all alert objects
				var a = $("#alert");
				// remove the hidden class
				a.removeClass('hidden');
				// 
				a.fadeTo(5000, 500).slideUp(500, function () {
					a.alert('close');
				});
			});
		};
		
		/** function isAlertVisible
		 * @returns Flag true if alert is visible, else false
		 */
		$scope.isAlertVisible = function () {
			return $('#alert').is(':visible');
		};
		
		/** function navToggle
		 * toggle the slideout of the nav sidebar
		 */
		$scope.nt = function () {
			$('#menu').toggle();
		};
		
		/** function isNavVisible
		 * @returns Flag true if the menu sidebar is extended, else false
		 */
		$scope.isNavVisible = function () {
			return $('#menu').is(':visible');
		};
		
		// go to a subscription
		$scope.gotostream = function (obj) {
			var url = ['/feed/',obj.value].join('');
			if ($location.path() !== url) {
				// go to subscription local url
				$rootScope.$apply(function () {
					$location.path(url);
				});
			}
		};
		
		//
		$scope.showModal = function (e) {
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
		$scope.canScroll = function () {
			return $(document).scrollTop() > 10;
		};
		
		// search for a subscription
		/*
		$scope.gotoFeed = function (r) {
			$http.get('/api/0/subscription/search',{ params:{ q: r } })
			.success(function (data, status, headers, config) {
				$scope.gotostream(data[0],false);
			})
			.error(function (data, status, headers, config) {
			});
		};
		*/
		
		// scroll back to top
		$scope.gotoTop = function () {
		   $scope.scrollto('mah', 0);
		};
		
		// scroll to a specific post
		$scope.scrollto = function (id, po) {
			// clear scroll to array
			$.scrollTo.window().queue([]).stop();
			// scroll to next element
			$('html,body').scrollTo($('#'+id), 0, { queue: false, offset: {top: po || 0} });
		};
		
		// refresh the current subscription
		$scope.rfrsh = function () {
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
				function (data) {
					// clear array of posts
					$scope.stream.items = [];
					// reset times on params
					$scope.params.nt = undefined;
					// reset expanded post
					$scope.cp = undefined;
					// get new latest items
					$scope.getPosts({
						t:'success',
						m:['<strong>Successfully</strong> refreshed feed (', $scope.stream.title, ')'].join(' ')
					});
				},
				function (err) {
					// show error message
					$scope.showAlert('danger',['An <strong>error</strong> occured when trying to refresh feed (', $scope.stream.title, ')'].join(' '));
					// turn off spinner
					scope.rf = false;
			});
		};
		
		$scope.delt = function () {
			
		};
		
		$scope.sbmt = function () {
			// submit new feed URL to server
			FeedSubmit.save({q: $scope.stream.feedURL},function (data) {
				// show message
				$scope.showAlert('success',['<strong>Successfully</strong> subscribed to feed (', $scope.stream.title, ')'].join(' '));
				// set stream as subscribed
				$scope.stream.subscribed = true;
				// notify sidebar to update
				$rootScope.$broadcast('updateSubs');
			}, function (err) {
				$scope.showAlert('danger',['An <strong>error</strong> occured when trying to subscribe to', $scope.stream.title].join(' '));
			});
		};
		
		/** format past date to shorter version
		 */
		$scope.formatTime = function (str) {
			var d = moment().diff(str);
			var t = moment.duration(d);
			if (t.asDays() >= 7) { // amount of weeks
				return [Math.ceil(t.asDays() / 7), 'w'].join(''); // weeks
			} else if (t.asDays() >= 1) { // amount of days
				return [Math.ceil(t.asDays()), 'd'].join(''); // days
			} else if (t.asHours() >= 1) { // amount of hours
				return [Math.ceil(t.asHours()), 'h'].join(''); // hours
			} else { // amount of minutes
				return [Math.ceil(t.asMinutes()), 'm'].join(''); // days
			}
		};

		/** retrieve singular posts
		*/
		$scope.getPost = function (m) {
			// make sure that it has a param value
			if ($scope.params === undefined) {
				$scope.rf = false;
				return;
			}
			// is still loading?
			if ($scope.rf) {
				return;
			}
			// set refresh page to TRUE
			$scope.rf = true;
			// reset post data
			$scope.post = undefined;
			// execute external calls
			services.getPost().query($scope.params, function (data) {
				// turn off refresh
				$scope.rf = false;
				// no data retrieved
				if (!data) {
					return;
				}
				// local reference to item
				var ref = $scope.post = data;
				// format date
				ref.formatted = $scope.formatTime(ref.published);
				// shorten the author name
				if (ref.author) {
					var author = /(by\s)(\w*\s\w*)/i.exec(ref.author);
					if (author) {
						ref.author = author[2];
					}
				}
				// encode origin url
				ref.origin.url = ['/feed/',encodeURIComponent(ref.origin.url)].join('');
				// retrieve video image
				if (ref.content.videos.length) {
					var e; // declare variable
					// copy array into temp variable
					var a = ref.content.videos;
					// reset array (angularjs needs to approve it first)
					ref.content.videos = [];
					// loop videos
					for (var j in a) {
						if ((e = /(?:youtube.com\/[\s\S]+|youtu.be)\/([\s\S][^?]+)/gi.exec(ref.content.videos[j])) !== null) { // contains youtube video?
							// replace url for embeded
							ref.content.videos[j] = $sce.trustAsResourceUrl(['https://www.youtube.com/embed/',e[1]].join(''));
						}
					}
				}
				// local reference to variable
				var str = ref.content.content;
				// check if string
				if (typeof str == 'string' || str instanceof String) {
					ref.content.hasContent = (str.length > 0);
					// Post HTML content needs to be set as TRUSTED to Angular otherwise it will not be rendered
					ref.content.content = $sce.trustAsHtml(str);
				}
			});
		};
		/** adds row data to groups and resets row array
		*/
		$scope.addRowToGroupsAndReset = function () {
			// has valid row to add?
			if ($scope.row.length) {
				// add to row to groups
				$scope.groups.push($scope.row);
				// reset column
				$scope.row = [];
			}
		};

		/** adds column data to row and resets column data
		*/
		$scope.addColumnToRowAndReset = function () {
			// has valid column to add?
			if ($scope.column.items.length) {
				// convert size to column class
				$scope.column.class = ['col-lg-', $scope.column.size].join('');
				// add to column to row
				$scope.row.push($scope.column);
				// reset column
				$scope.resetColumn();
			}
		};
		
		/** get previous column size
		*/
		$scope.getLastColumnSize = function () {
			return $scope.row.length ? $scope.row[$scope.row.length-1].size : 0;
		};

		/** reset column data
		*/
		$scope.resetColumn = function () {
			$scope.column = {
				// template that the column is going to use
				template: '',
				// how much space we have used on the row
				size: 0,
				// constructed when column is added to row
				class: '',
				// which items we need to render
				items: []
			};
		};
		
		/** retrieve multiple posts
		*/
		$scope.getPosts = function (m) {
			// make sure that it has a param value
			if ($scope.params === undefined) {
				$scope.rf = false;
				return;
			}
			// is still loading?
			if ($scope.rf) {
				return;
			}
			// set refresh page to TRUE
			$scope.rf = true;
			// ignore read articles if flagged
			if ($scope.ignoreReadArticles) {
				$scope.params.xt = 'user/-/state/read';
			}
			// retrieve from database
			services.getElements().query($scope.params, function (data) {
				// turn off refresh
				$scope.rf = false;
				// make sure variables exist
				if (!data) {
					return;
				}
				
				// clear the title from the search box
				if (data.title && data.title.length > 0) {
					// defocus search box and reset value
					$('.typeahead').blur().val('');
				}
				
				// reset end of file reached
				$scope.eof = false;
				
				// old last index (don't want to re-iterate over old values)
				var idx = 0;

				// information about previous post's
				var prev = {
					// how much space we have used on the row
					colnum: 0,
					// kind of article to render
					type: $scope.templateID || 'none'
				};
				
				// what to do with the retrieved data
				if ($scope.stream &&
					(($scope.stream.items && $scope.stream.items.length === 0) || (data.items.length <= 0) || (data.items[0].timestampUsec <= $scope.stream.items[$scope.stream.items.length-1].timestampUsec))
					) {
					// has retrieved posts?
					if (data.items.length > 0) {
						// new start index
						idx = $scope.stream.items.length;
						// append to the articles that were already in the array
						$scope.stream.items = $scope.stream.items.concat(data.items);
					} else {
						// append end of stream reached
						$scope.eof = true;
					}
					// possible to retrieve more posts?
					if (!$scope.eof) {
						// continue from last column?
						var lastRow = $scope.groups[$scope.groups.length - 1];
						// loop columns
						for (var k in lastRow) {
							prev.colnum += lastRow[k].size;
						}
						// over column count?
						if (prev.colnum >= 12) {
							// start new row
							prev.colnum = 0;
						} else {
							// set last row as current row
							$scope.row = lastRow;
							// remove last row from groups
							$scope.groups.splice($scope.groups.length - 1, 1);
						}
					}
				} else {
					// copy retrieved articles to stream
					$scope.stream = data;
					// array of groups to display
					$scope.groups = [];
					$scope.row = [];
					$scope.resetColumn();
				}
				
				// how often a list should appear
				var listfreq = 6;

				// loop all articles/items
				for (var i = idx; !$scope.eof && i < $scope.stream.items.length; ++i) {
					// local reference to item
					var ref = $scope.stream.items[i];
										
					// format date
					ref.formatted = $scope.formatTime(ref.published);
					
					// shorten the author name
					if (ref.author) {
						var author = /(by\s)(\w*\s\w*)/i.exec(ref.author);
						if (author) {
							ref.author = author[2];
						}
					}

					// local reference to variable
					var str = ref.content.content;
					// check if string
					if (typeof str == 'string' || str instanceof String) {
						// Flag if text body is present
						ref.content.hasContent = (str.length > 0);
						// Post HTML content needs to be set as TRUSTED to Angular otherwise it will not be rendered
						ref.content.content = $sce.trustAsHtml(str);
					}
					
					// !Setup for templating posts
					// 	group = [row] (used as a way to iterate over the rows)
					// 	row = [column]
					// 	column = {template, size, [element]}
					// 	element = object
					
					// local reference to item
					var ref = $scope.stream.items[i];
					
					// when not a list, do other stuff
					if (prev.type !== 'list') {
						// add to element to column
						$scope.column.items.push(ref);
						// set column template
						$scope.column.template = $scope.templates['tile'][0];
						// retrieve video image
						if (ref.content.videos.length) {
							// declare variable
							var e;
							// loop videos and find thumbnail
							for (var j in ref.content.videos) {
								// contains youtube video?
								if ((e = /(?:youtube.com\/[\s\S]+|youtu.be)\/([\s\S][^?]+)/gi.exec(ref.content.videos[j])) !== null) {
									// replace url for embedded
									ref.content.videos[j] = ['https://www.youtube.com/embed/',e[1]].join('');
									// add video as thumbnail
									ref.content.images.other.splice(0, 0, {
										url: ['http://img.youtube.com/vi/', e[1], '/hqdefault.jpg'].join('')
									});
								}
							}
							// calculate column size
							$scope.column.size = (ref.content.images.other.length ? (((prev.colnum % 6) === 0) ? 6 : (12 - prev.colnum)) : 4);
							// increment column count
							prev.colnum = Math.min(prev.colnum + $scope.column.size, 12);
							// adds column to row and resets
							$scope.addColumnToRowAndReset();
							// end of row reached?
							if (prev.colnum === 12) {
								// reset number
								prev.colnum = 0;
								// set what the next type of column is going to be
								prev.type = ((i % listfreq) === 0) ? 'list' : 'none';
								// add to row to groups and reset
								$scope.addRowToGroupsAndReset();
							} else {
								// set what the next type of column is going to be
								prev.type = ((prev.colnum % 6 === 0) && (i % listfreq === 0)) ? 'list' : 'video';
							}
						} else if (ref.content.images.other.length) {
							var c = 4;
							if (prev.colnum) {
								c = ((prev.colnum % 6) === 0) ? 6 : 4;
							} else {
								if (prev.type === 'none' || prev.type === 'image') {
									var j = ($scope.groups.length % 3);
									if (prev.colnum === 0 && j === 0) {
										c = 12;
									} else {
										c = (j === 1) ? 6 : 4;
									}
								}
							}
							// calculate column size
							$scope.column.size = c;
							// increment column count
							prev.colnum = Math.min(prev.colnum + $scope.column.size, 12);
							// adds column to row and resets
							$scope.addColumnToRowAndReset();
							// end of row reached?
							if (prev.colnum === 12) {
								// reset number
								prev.colnum = 0;
								// decide if the next time we get a list or decide on the item when we see it
								prev.type = ((i % listfreq) === 0) ? 'list' : 'none';
								// add to row to groups and reset
								$scope.addRowToGroupsAndReset();
							} else {
								// set type
								prev.type = ((prev.colnum % 6 === 0) && (i % listfreq === 0)) ? 'list' : 'image';
							}
						} else { // text only article
							// calculate column size
							$scope.column.size = ((prev.colnum > 0 || $scope.groups.length !== 0) && (prev.colnum % 6) === 0) ? 6 : 4;
							// increment column count
							prev.colnum = Math.min(prev.colnum + $scope.column.size, 12);
							// adds column to row and resets
							$scope.addColumnToRowAndReset();
							// end of row reached?
							if (prev.colnum === 12) {
								// reset number
								prev.colnum = 0;
								// decide if the next time we get a list or decide on the item when we see it
								prev.type = ((i % listfreq) === 0) ? 'list' : 'none';
								// add to row to groups and reset
								$scope.addRowToGroupsAndReset();
							} else { 
								// set type
								prev.type = ((prev.colnum % 6 === 0) && (i % listfreq === 0)) ? 'list' : 'text';
							}
						}
					} else { // render a list
						// calculate column size
						$scope.column.size = (prev.colnum === 0) ? 6 : (12 - prev.colnum);
						// set column template
						$scope.column.template = $scope.templates['list'][0];
						// add to element to column
						$scope.column.items.push(ref);
						// reached maximum size of list?
						if ($scope.column.items.length === 6) {
							// reset type
							prev.type = 'none';
							// increment
							prev.colnum += $scope.column.size;
							// adds column to row and resets
							$scope.addColumnToRowAndReset();
							// end of row reached?
							if (prev.colnum === 12) {
								// reset number
								prev.colnum = 0;
								// add to row to groups and reset
								$scope.addRowToGroupsAndReset();
							}
						} else {
							// keep the type
							prev.type = 'list';
						}
					}
					
					/*
					// set article's template
					if ($scope.cp && ref.uid === $scope.cp.uid) { // has currentpost and id's are the same
						$scope.expand($scope.stream.items[i]);
					} else if ($scope.templateID !== '') { // template id specified
						ref.template = $scope.templates[$scope.templateID][0];
					} else { // no template id specified, default to tile template
						$scope.templateID = 'tile';
						ref.template = $scope.templates[$scope.templateID][0];
					}
					*/
				}
				
				// add to row to groups and reset
				$scope.addRowToGroupsAndReset();
			
				// is message present?
				if (m) {
					$scope.showAlert(m.t, m.m); // show message
				}
			}, function (err) {
				$scope.rf = false;
			});
		};
		
		/** selects a different page layout
		*/
		$scope.updateStyle = function (n) {
			// if the same template id is set
			if ($scope.templateID === n) {
				return;
			}
			// set new template id
			$scope.templateID = n;
			// null pointer check
			if ($scope.stream) {
				// set the template for all the items
				for (var i in $scope.stream.items) {
					$scope.stream.items[i].template = $scope.templates[$scope.templateID][0];
				}
			}
		};
		
		/** retrieve more posts
		*/
		$scope.loadMore = function () {
			// make sure that articles exist
			if (!$scope.stream || !$scope.stream.items || $scope.stream.items.length <= 0 ||
				$route.current.params.value !== $routeParams.value) {
				return; // skip rest of function
			}
			// last post update time
			var t = $scope.stream.items[$scope.stream.items.length-1].timestampUsec;
			// set new fetch time if not the same and retrieve posts
			if (t !== $scope.params.nt) {
				// set new fetch time
				$scope.params.nt = t;
				// retrieve posts
				$scope.getPosts();
			}
		};
		
		/** scroll to the next article in the stream
		*/
		$scope.next = function () {
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

		/** scroll to the previous article in the stream
		*/
		$scope.prev = function () {
			if (!$scope.cp && $scope.stream !== undefined && $scope.stream.items.length > 0) {
				$scope.expand($scope.stream.items[0]);
			} else if ($scope.cp) {
				var p = angular.element($('#'+$scope.cp.uid).prev()).scope();
				if (p) {
					$scope.toggle(p.post);
				}
			}
		};

		/** Flag article as read/unread
		*/
		$scope.toggleRead = function (p) {
			if (!p || p === undefined) {
				return;
			}
			if ($scope.isRead(p)) {
				$scope.markAsUnread(p);
			} else {
				$scope.markAsRead(p);
			}
		};

		/** Ignore read/unread flag when loading stream
		*/
		$scope.toggleIgnoreReadArticles = function () {
			if ($scope.ignoreReadArticles) {
				$scope.ignoreReadArticles = !$scope.ignoreReadArticles;
			} else {
				$scope.ignoreReadArticles = true;
			}
			// refresh stream to indicate new value
			$scope.rfrsh();
		};

		/** Flag article as read
		*/
		$scope.markAsRead = function (p) {
			if (!$('#m').length || (!p || p === undefined)) {
				return;
			}
			SetTag.query({ 
				i: p.lid, 
				a: 'user/-/state/read' 
			}, function (d) {
				// mark post as read
				p.read = true;
				// notify sidebar to update
				$rootScope.$broadcast('updateSubs');
			}, function (e) {
			});
		};

		/** Flag article as unread
		*/
		$scope.markAsUnread = function (p) {
			if (!$('#m').length || (!p || p === undefined)) {
				return;
			}
			SetTag.query({ 
				i: p.lid, 
				r: 'user/-/state/read' 
			}, function (d) {
				// mark post as unread
				p.read = false;
				// notify sidebar to update
				$rootScope.$broadcast('updateSubs');
			}, function (e) {
			});
		};
		
		/** Check if article is read
		*/
		$scope.isRead = function (p) {
			return $('#m').length && (p.read > 0);
		};
		
		/** Flagged if something is loading
		*/
		$scope.isSpinning = function () {
			return $scope.rf;
		};
		
		/** Expand the current selected post
		*/
		$scope.expand = function (p) {
			// if template style doesn't have an expanded version, skip
			if ($scope.templates[$scope.templateID].length <= 1) {
				return;
			}
			$timeout(function () {
				// change the template of the post to the expanded version
				p.template = $scope.templates[$scope.templateID][1];
				// store post as the current post
				$scope.cp = p;
				// reset
				$scope.params.nt = undefined;
			});
		};
		
		/** Toggle between expanding the current post and minimizing it
		*/
		$scope.toggle = function (p) {
			// if template style doesn't have an expanded version, skip
			if (!$scope.templates || !$scope.templates[$scope.templateID] || $scope.templates[$scope.templateID].length <= 1) {
				return;
			}
			// make previous expanded post small again
			if ($scope.cp && $scope.cp != p) {
				// remove expand class from current post
				$('#' + $scope.cp.uid).removeClass('expand');
				// set post template to compact version
				$scope.cp.template = $scope.templates[$scope.templateID][0];
			}
			// store current expanded post
			if (p.template !== $scope.templates[$scope.templateID][1]) {
				$scope.expand(p);
			} else {
				// set post template to compact version
				p.template = $scope.templates[$scope.templateID][0];
			}
		};
		
		/*// re-activate affix
		$scope.setaffix = function () {
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
		
		$scope.$on('onRepeatLast', function (scope, element, attrs) {
			// make all links open in a new tab
			$(".article-content a").each(function () {
				$(this).attr("target","_blank");
			});
			$scope.setaffix();
		});*/
				
		if (!$('.typeahead').parent().hasClass('twitter-typeahead')) {
			var sb = new Bloodhound({
				datumTokenizer: function (d) {
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
					filter: function (a) {
						var ta = [],
							m;
						// loop through retrieved info
						for (var i in a) {
							if (a[i].title !== '') ta.push(a[i]);
							// is alert present?
							if (a[i].alert) {
								if (a[i].alert === 'success') {
									m = 'Feed was added successfully.';
								} else {
									m = 'Failed to add feed.';
								}
								$scope.showAlert(a[i].alert, m);
							}
							// notify sidebar to update
							$rootScope.$broadcast('updateSubs');
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
			})
			.on('typeahead:asyncrequest', function () {
			})
			.on('typeahead:asynccancel typeahead:asyncreceive', function (a) {
			})
			.on('typeahead:selected', function (obj, datum) { // when option is selected from dropdown
				// change the page
				$scope.gotostream(datum);
				// lose focus
				$('.typeahead').blur();
			});
		};
		
		// focus on search box
		$('.typeahead').focus();
		
		// on URL change
		$scope.$on('$routeChangeSuccess', function () {
			// pre url change else post
			if (Object.keys($routeParams).length <= 0) {
				// reset the stream
				$scope.stream = undefined;
			} else {
				// post url change, $routeParams should be populated here
				if (!$scope.stream || encodeURIComponent($scope.stream.feedURL) !== $routeParams.value) { // no stream present OR not the same stream
					// reset the stream
					$scope.stream = undefined;
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
					if ($scope.params.type === 'feed') {
						$scope.getPosts();
					} else {
						$scope.getPost();
					}
				}
			}
		});

		// single keys
		/** Move to article below (previous) in stream
		 */
		Mousetrap.bind('j', function () {
			$scope.next();
		});

		/** Move to article above (next) in stream
		 */
		Mousetrap.bind('k', function () { 
			$scope.prev();
		});

		/** Open article in new tab/window from stream
		 */
		Mousetrap.bind('v', function () {
			window.open($scope.cp.alternate.href, '_blank');
			window.focus();
		});

		/** Toggle article read state
		 */
		Mousetrap.bind('m', function () {
			$scope.toggleRead(s.cp);
		});
	}

	angular
        .module('webapp')
        .controller('panelController', panelController);
})();