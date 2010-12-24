/**
 * @package assets
 */

(function($) {

	/**
	 * This plugin creates a Symphony duplicator.
	 *
	 * @param {Object} custom_settings
	 *  An object with custom duplicator settings
	 */
	$.fn.symphonyDuplicator = function(custom_settings) {
		var objects = this;
		var settings = {
			instances:			'> li:not(.template)',	// What children do we use as instances?
			templates:			'> li.template',		// What children do we use as templates?
			headers:			'> :first-child',		// What part of an instance is the header?
			orderable:			false,					// Can instances be ordered?
			collapsible:		false,					// Can instances be collapsed?
			constructable:		true,					// Allow construction of new instances?
			destructable:		true,					// Allow destruction of instances?
			minimum:			0,						// Do not allow instances to be removed below this limit.
			maximum:			1000,					// Do not allow instances to be added above this limit.
			speed:				'fast',					// Control the speed of any animations
			delay_initialize:	false
		};
		
		$.extend(settings, custom_settings);
		
	/*-----------------------------------------------------------------------*/
		
		// Language strings
		Symphony.Language.add({
			'Add item': false,
			'Remove item': false,
			'Expand all': false,
			'Collapse all': false
		});
		
		// Collapsible
		if (settings.collapsible) objects = objects.symphonyCollapsible({
			items:			'.instance',
			handles:		'.header span'
		});
		
		// Orderable
		if (settings.orderable) objects = objects.symphonyOrderable({
			items:			'.instance',
			handles:		'.header'
		});
		
		// Duplicator
		objects = objects.map(function() {
			var object = this;
			var templates = [];
			var widgets = {
				controls:		null,
				selector:		null,
				constructor:	null,
				topcontrols:	null,
				collapser:		null
			};
			var silence = function() {
				return false;
			};
			
			// Construct a new instance:
			var construct = function(source) {
				var template = $(source).clone(true);
				var instance = prepare(template);
				
				widgets.controls.before(instance);
				object.trigger('construct', [instance]);
				refresh(true);
				
				return instance;
			};
			
			var destruct = function(source) {
				var instance = $(source).remove();
				
				object.trigger('destruct', [instance]);
				refresh();
				
				return instance;
			};
			
			// Prepare an instance:
			var prepare = function(source) {
				var instance = $(source)
					.addClass('instance expanded');
				var header = instance.find(settings.headers)
					.addClass('header')
					.wrapInner('<span />');
				var destructor = header
					.append('<a class="destructor" />')
					.find('a.destructor:first')
					.text(Symphony.Language.get('Remove item'));
				
				header.nextAll().wrapAll('<div class="content" />');
				
				destructor.click(function() {
					if ($(this).hasClass('disabled')) return;
					
					destruct(source);
				});
				
				header.bind('selectstart', silence);
				header.mousedown(silence);
				
				return instance;
			};
			
			// Refresh disabled states:
			var refresh = function(input_focus) {
				var constructor = settings.constructable;
				var selector = settings.constructable;
				var destructor = settings.destructable;
				var instances = object.children('.instance');
				var empty = false;
				
				// Update field names:
				instances.each(function(position) {
					$(this).find('*[name]').each(function() {
						var exp = /\[\-?[0-9]+\]/;
						var name = $(this).attr('name');
						
						if (exp.test(name)) {
							$(this).attr('name', name.replace(exp, '[' + position + ']'));
						}
					});
				});

				// Give focus to the first input in the first instance
				if (input_focus) instances.filter(':last').find('input[type!=hidden]:first').focus();
				
				// No templates to add:
				if (templates.length < 1) {
					constructor = false;
				}
				
				// Only one template:
				if (templates.length <= 1) {
					selector = false;
				}
				
				// Maximum reached?
				if (settings.maximum <= instances.length) {
					constructor = false;
					selector = false;
				}
				
				// Minimum reached?
				if (settings.minimum >= instances.length) {
					destructor = false;
				}
				
				if (constructor) widgets.constructor.removeClass('disabled');
				else widgets.constructor.addClass('disabled');
				
				if (selector) widgets.selector.removeClass('disabled');
				else widgets.selector.addClass('disabled');
				
				if (destructor) instances.find(settings.headers).find('.destructor').removeClass('disabled');
				else instances.find(settings.headers).find('.destructor').addClass('disabled');
				
				if (!empty) object.removeClass('empty');
				else object.addClass('empty');
				
				if (settings.collapsible) object.collapsible.initialize();
				if (settings.orderable) object.orderable.initialize();
			};
			
			var collapsingEnabled = function() {
				widgets.topcontrols.removeClass('hidden');
				widgets.collapser.removeClass('disabled');
			}
			
			var collapsingDisabled = function() {
				widgets.topcontrols.addClass('hidden');
				widgets.collapser.addClass('disabled');
			}
			
			var toCollapseAll = function() {
				widgets.collapser
					.removeClass('compact')
					.text(Symphony.Language.get('Collapse all'));
			};
			
			var toExpandAll = function() {
				widgets.collapser
					.addClass('compact')
					.text(Symphony.Language.get('Expand all'));
			}
			
		/*-------------------------------------------------------------------*/
			
			if (object instanceof $ === false) {
				object = $(object);
			}
			
			object.duplicator = {
				refresh: function() {
					refresh();
				},
				
				initialize: function() {
					object.addClass('duplicator');
					
					// Prevent collapsing when ordering stops:
					object.bind('orderstart', function() {
						if (settings.collapsible) {
							object.collapsible.cancel();
						}
					});
					
					// Refresh on reorder:
					object.bind('orderstop', function() {
						refresh();
					});
					
					// Slide up on collapse:
					object.bind('collapsestop', function(event, item) {
						item.find('> .content').show().slideUp(settings.speed);
					});
					
					// Slide down on expand:
					object.bind('expandstop', function(event, item) {
						item.find('> .content').hide().slideDown(settings.speed);
					});
					
					widgets.controls = object
						.append('<div class="controls" />')
						.find('> .controls:last');
					widgets.selector = widgets.controls
						.prepend('<select />')
						.find('> select:first');
					widgets.constructor = widgets.controls
						.append('<a class="constructor" />')
						.find('> a.constructor:first')
						.text(Symphony.Language.get('Add item'));
					
					// Prepare instances:
					object.find(settings.instances).each(function() {
						var instance = prepare(this);
						
						object.trigger('construct', [instance]);
					});
					
					// Store templates:
					object.find(settings.templates).each(function(position) {
						var template = $(this).clone(true);
						var header = template.find(settings.headers).addClass('header');
						var option = widgets.selector.append('<option />')
							.find('option:last');
							
						var header_children = header.children();
						if (header_children.length) {
							header_text = header.get(0).childNodes[0].nodeValue + ' (' + header_children.filter(':eq(0)').text() + ')';
						} else {
							header_text = header.text();
						}
						option.text(header_text).val(position);
						
						// HACK: preselect Text Input for Section editor
						if (header_text == 'Text Input') option.attr('selected', 'selected');
						
						templates.push(template.removeClass('template'));
						
						// Remove template source
						$(this).remove();
					});
					
					// Construct new template:
					widgets.constructor.bind('selectstart', silence);
					widgets.constructor.bind('mousedown', silence);
					widgets.constructor.bind('click', function() {
						if ($(this).hasClass('disabled')) return;
						
						var position = widgets.selector.val();
						
						if (position >= 0) construct(templates[position]);
					});
					
					if (settings.collapsible) {
						widgets.topcontrols = object
							.prepend('<div class="controls top hidden" />')
							.find('> .controls:first')
							.append(widgets.controls
								.prepend('<a class="collapser disabled" />')
								.find('> a.collapser:first')
								.text(Symphony.Language.get('Collapse all'))
								.clone()
							);
						widgets.collapser = object
							.find('.controls > .collapser');
						
						if (object.children('.instance').length > 0) {
							collapsingEnabled();
						}
						
						object.bind('construct', function() {
							var instances = object.children('.instance');
							
							if (instances.length > 0) {
								collapsingEnabled();
							}
						});
						
						object.bind('destruct', function() {
							var instances = object.children('.instance');
							
							if (instances.length < 1) {
								collapsingDisabled();
								toCollapseAll();
							}
						});
						
						object.bind('collapsestop destruct', function() {
							if (object.has('.expanded').length == 0) {
								toExpandAll();
							}
						});
						
						object.bind('expandstop destruct', function() {
							if (object.has('.collapsed').length == 0) {
								toCollapseAll();
							}
						});
						
						widgets.collapser.bind('click', function() {
							var item = $(this);
							
							if (item.is('.disabled')) return;
							
							object.duplicator[item.is('.compact') ? 'expandAll' : 'collapseAll']();
						});
					}
					
					refresh();
				},
				
				expandAll: function() {
					object.collapsible.expandAll();
					toCollapseAll();
				},
				
				collapseAll: function() {
					object.collapsible.collapseAll();
					toExpandAll();
				}
			};
			
			if (settings.delay_initialize !== true) {
				object.duplicator.initialize();
			}
			
			return object;
		});
		
		return objects;
	};


	/**
	 * This plugin creates a Symphony duplicator with name.
	 *
	 * @param {Object} custom_settings
	 *  An object with custom duplicator settings
	 */
	$.fn.symphonyDuplicatorWithName = function(custom_settings) {
		var objects = $(this).symphonyDuplicator($.extend(
			custom_settings, {
				delay_initialize:		true
			}
		));
		
		objects = objects.map(function() {
			var object = this;
			
			object.bind('construct', function(event, instance) {
				var input = instance.find('input:visible:first');
				var header = instance.find('.header:first > span:first');
				var fallback = header.text();
				var refresh = function() {
					var value = input.val();
					
					header.text(value ? value : fallback);
				};
				
				input.bind('change', refresh).bind('keyup', refresh);
				
				refresh();
			});
			
			object.duplicator.initialize();
		});
		
		return objects;
	};

})(jQuery.noConflict());
