/**
 * Global variables
 */
var ta = [],
	gTemplateID = '',
	gTemplates = {
		'list': ['views/templates/post-compact','views/templates/post-expand'],
		'tile': ['views/templates/post-tile'], 
		'mini': ['views/templates/post-minimal','views/templates/post-expand'],
	},
	g_Layzr = {};
/**
 * On page load ready
 */
jQuery(document).ready(function($) {
	g_Layzr = new Layzr({ 
		attr: 'data-layzr',
		threshold: 50,
		callback: function(node) {
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
	
	// have some nice font scaling.
	$('.alert').flowtype({
		minFont:12,
		maxFont:36,
		fontRatio:96
	});
	
	//
	$('#menu').matchHeight({
		target: $(window)
	});
	$.fn.matchHeight._afterUpdate = function(event, groups) {
		var c = $('#menu').height(),
			a = $('#sidebar-header').height() + 10,
			b = $('#sidebar-footer').height() + 10;
		$('#sidebar-body').height(c - (a + b));
	};
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