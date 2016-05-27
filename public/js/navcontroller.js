(function () {
	'use strict';

	function navController($scope, $http, $location, $interval, services) {
		$scope.$on("updateSubs", function (event, args) {
			$scope.gtsubs();
		});

		$scope.gtsubs = function () {
			$scope.subs = false;
			services.getSubscriptions().query(function (data) {
				// loop subscription array
				for (var i = 0; i < data.feeds.length; ++i) {
					// retrieved crawl time
					var ot = data.feeds[i].crawlTime;
					// format time for crawlTime
					data.feeds[i].crawlFormatTime = (ot !== undefined) ? moment(ot).format('ddd, h:mm:ss A') : 'Never';
					// format time for crawlUpdate
					data.feeds[i].crawlUpdate = (ot !== undefined) ? (moment().diff(ot, 'minutes') + ' minutes ago') : 'Never';
					// format time for updated time
					data.feeds[i].updated = (data.feeds[i].updated !== undefined) ? moment(data.feeds[i].updated).format('h:mm:ss A|ddd, DD MMM YYYY') : 'Never';
					// split date string into multiple
					if (data.feeds[i].updated.search('|') > -1) {
						var a = data.feeds[i].updated.split('|');
						data.feeds[i].time = a[0];
						data.feeds[i].date = a[1];
					}
					// retrieve the original posted feed url
					data.feeds[i].feedURL = decodeURIComponent(data.feeds[i].id);
					// create url
					data.feeds[i].url = ['/subscription/feed/',encodeURIComponent(data.feeds[i].id),'/'].join('');
					// make sure it has a title
					if (data.feeds[i].title && data.feeds[i].title.length <= 0) {
						// else use the feed url
						data.feeds[i].title = data.feeds[i].feedURL;
					}
					// if reading-list found
					if (data.feeds[i].feedURL === 'label/reading-list') {
						// set reading-list unread count
						$scope.rlurc = data.feeds[i].unreadcount;
						// remove item from array
						data.feeds.splice(i, 1);
						// no need to continue
						break;
					}
				}
				// set next run time
				$scope.nextRunIn = data.nextRunIn;
				// if no next run time
				/*if (!$scope.nrt) {
					$interval(function () {
						var d = moment($scope.nextRunIn).diff(moment(), 'milliseconds');
						// do string conversion from date
						$scope.nrt = moment(d).format('mm:ss');
						if ((parseInt(d) % 60000) < 1000) {
							$scope.gtsubs();
						}
					}, 1000);
				}*/
				// update subscriptions
				$scope.subs = data.feeds;
			});
		}	

		$scope.gotostream = function (obj) {
			$scope.gotosub({ 'value': decodeURIComponent(obj.id) });
		}

		$scope.isActive = function (str) {
			// !special case for the main page
			if (str === '/') {
				return $location.path() === str;
			}
			var s = decodeURIComponent(str),
				b = s.indexOf('/subscription/feed/') === 0 ? s.substring('/subscription/feed/'.length, s.length) : str,
				a = new RegExp(b.replace('/',''));
			// do regex test
			return a.test($location.path());
		}

		$scope.rfrsh = function (idx) {
			RefreshFeed.query({ 'q': idx },
				function (data) {
					$scope.gtsubs();
				},
				function (err) {
			});
		}

		$scope.gotosub = function (obj) {
			// set new url
			$location.path(['/subscription/feed/',obj.value,'/'].join(''));
			// sync
			$scope.$apply()
		}

		$scope.gtsubs();
	}

	navController.$inject = [
		'$scope',
		'$http',
		'$location',
		'$interval',
		'services'
	];

	angular
        .module('webapp')
        .controller('navController', navController);
})();