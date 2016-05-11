(function () {
	'use strict';

	/** Declare service provider */
	var services = function ($resource) {
		return {
			// Feeds
			recentFeeds: recentFeeds,
			popularFeeds: popularFeeds,
			submitFeed: submitFeed,
			getSubscriptions: getSubscriptions,
			
			// Posts
			recentPosts: recentPosts,
			getPost: getPost,
			
			// Tags
			setTag: setTag,

			// Streams
			getElements: getElements,
		};

		function refreshFeed() {
			return $resource('/api/0/subscription/refresh', { q: '@q' }, { query: { method: 'GET', isArray: false } });
		}

		function submitFeed() {
			return $resource('/api/0/subscription/quickadd', {q: '@q'}, { query: { method: 'POST' } });
		}

		function setTag() {
			return $resource('/api/0/tag/edit', {i:'@i',s:'@s',a:'@a',r:'@r'}, {query:{method:'POST'}});
		}

		function getSubscriptions() {
			return $resource('/api/0/subscription/list', {}, { query:{ method: 'GET', isArray: false } });
		}

		function recentFeeds() {
			return $resource('/api/0/feeds/list', {n:5, r:'a'}, { query:{ method: 'GET', isArray: false } });
		}

		function popularFeeds() {
			return $resource('/api/0/feeds/list', {n:5, r:'s'}, { query:{ method: 'GET', isArray: false } });
		}

		function recentPosts() {
			return $resource('/api/0/posts', {n:5, r:'n'}, { query:{ method: 'GET', isArray: true } });
		}

		function getElements() {
			return $resource('/api/0/stream/contents/', {type:'@type', params:'@params'}, { query:{ method: 'GET', isArray: false } });
		}

		function getPost() {
			return $resource('/api/0/post/', {params:'@params'}, { query:{ method: 'GET', isArray: false } });
		}
	};
	
	/** Declare modules to be included in the service */
	services.$inject = [
		'$resource'
	];
	
	/** Include the service provider for usage in the application */
	angular
        .module('webapp')
        .service('services', services);
})();