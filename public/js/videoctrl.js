(function () {
	'use strict';
	
	/** Declare modules to be included in the controller */
    videoCtrl.$inject = [
		'$sce', 
	];

	/** Declare controller */
	function videoCtrl($sce) {
		// theme that the player should use
		this.theme = 'css/videogular.css';
		// urls of the video's in different formats
		this.sources = [
			// Declare Youtube videos as below
			// { src: $sce.trustAsResourceUrl('https://www.youtube.com/watch?v={{UniqueID}}') }
			// Declare other video as below
			// { src: $sce.trustAsResourceUrl('https://www.tumblr.com/video_file/{{UniqueID}}'), type: 'video/mp4' }
		];
		// no idea what this is for
		this.tracks = [
			{
				src: 'fonts/videogular.woff',
				kind: 'subtitles',
				srclang: 'en',
				label: 'English',
				default: ''
			}
		];
	}

	angular
        .module('webapp')
        .controller('videoCtrl', videoCtrl);
})();