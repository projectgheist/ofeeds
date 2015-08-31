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
		retinaAttr: 'data-layzr-retina',
		threshold: 50,
		callback: function() {
			var e = $(this);
				w = parseInt(e.attr('width')),
				h = parseInt(e.attr('height'));
			var x = (e.parent().width() / w) * h;
			if (x < e.parent().height()) {
				e.addClass('horizontal-image');
				var y = (e.parent().height() / h) * w;
				if (y > e.parent().width()) {
					e.css('left',(e.parent().width() - y) / 2);
				}
			} else {
				e.addClass('vertical-image');
				if (x > e.parent().height()) {
					e.css('top',(e.parent().height() - x) / 2);
				}
			}
		}
	});

	// create slideout navbar
	g_Slideout = new Slideout({
		'panel': document.getElementById('panel'),
		'menu': document.getElementById('menu'),
		'padding': $('#menu').outerWidth()
	});
	
	// navbar is visible by default
	g_Slideout.open();
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

function ShowAlertMessage(t, m) {
	$('#a').removeClass('hidden').addClass(t);
	$('#am').html(m);
	$("#a").fadeTo(5000, 500).slideUp(500, function() {
		$("#a").alert('close');
	});
}