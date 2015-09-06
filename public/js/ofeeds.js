/**
 * Global variables
 */
var ta = [],
	gTemplateID = '',
	gTemplates = {
		'list': ['/templates/post-compact','/templates/post-expand'],
		'tile': ['/templates/post-tile'], 
		'mini': ['/templates/post-minimal','/templates/post-expand'],
	},
	g_Layzr = {},
	g_Slideout = {};
/**
 * On page load ready
 */
jQuery(document).ready(function($) {
	g_Layzr = new Layzr({ 
		attr: 'data-layzr',
		threshold: 50,
		callback: function() {
			var self = $(this);
			// wait for the image to finish loading
			self.bind('load', function() {
				// remove holderjs attributes
				self.removeAttr('data-src');
				self.removeAttr('data-holder-rendered');
				// remove layzr attributes
				self.removeAttr('data-layzr');
				// fit image to parent
				fit(self[0], self.parent()[0], { cover: true, watch: true, apply: true }, fit.cssTransform);
			});
		}
	});

	// create slideout navbar
	/*
	g_Slideout = new Slideout({
		'panel': document.getElementById('panel'),
		'menu': document.getElementById('menu'),
		'padding': $('#menu').outerWidth()
	});
	*/
	
	// navbar is visible by default
	//g_Slideout.open();
	
	// have some nice font scaling.
	$('.alert').flowtype({
		minFont:12,
		maxFont:36,
		fontRatio:96
	});
});

// single keys
/** Set focus on text input field
 */
Mousetrap.bind('/', function() {
	// set focus on search box
	$("#nrss").focus();
	// prevent default browser behavior
	return false;
});

function clamp(val,min,max) {
	return Math.min(Math.max(val, min), max);
}