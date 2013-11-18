;(function($){
	$("<style type='text/css'> [xo-schematic]{display:none !important;} </style>").appendTo("head");

	var _ = _ || {
		map : function(obj, fn){
			var result = [];
			for(var propName in obj){
				if(obj.hasOwnProperty(propName)){ result.push(fn(obj[propName], propName)); }
			}
			return result;
		},
		reduce : function(obj, fn, memo){
			for(var propName in obj){
				if(obj.hasOwnProperty(propName)){ memo = fn(memo, obj[propName], propName); }
			}
			return memo;
		},
	};

	var xo_ajax = function(self, url, method, type, callback){
		callback = callback || function(){};

		//Fire triggers
		_.map(self.models, function(model){model.trigger('before:' + method, self)});
		self.trigger('before:'+method, self);

		//TODO: Figure out what to do with NO URLS
		if(!url){
			self.trigger(method, self);
			_.map(self.models, function(model){model.trigger(method, self)});
			return callback();
		}

		$.ajax({
			url  : url + (self.id ? "/" + self.id : ""),
			type : type,
			data : self.attributes(),
			success : function(data){
				self.set(data);
				_.map(self.models, function(model){model.trigger(method, self)});
				self.trigger(method, self);
				return callback(undefined, data);
			},
			error : function(err){
				self.trigger('error', self, err);
				return callback(err);
			},
		});
	};


	xo = {};

	xo.view = Archetype.extend({
		view      : undefined,
		schematic : undefined,

		initialize : function(model){
			this.model = model;
			this.dom = {};
			if(this.view){
				this.once('created', function(){
					$(document).ready(this.injectInto.bind(this));
				});
			}
			return this;
		},
		injectInto : function(target, prepend){
			var self = this;
			if(this.schematic){
				var schematicElement = $('[xo-schematic="' + this.schematic + '"]');
				if(target.length === 0){throw 'xo-view: Could not find target';}
				if(schematicElement.length === 0 ){throw 'xo-view: Could not find schematic with name "' + this.schematic + '"';}

				var schematicClone = $($('<div>').append(schematicElement.clone().removeAttr('xo-schematic')).html());
				if(prepend){
					this.dom.view = schematicClone.prependTo(target);
				} else {
					this.dom.view = schematicClone.appendTo(target);
				}
			}
			if(this.view){
				this.dom.view = $('[xo-view="' + this.view + '"]');
				if(this.dom.view.length === 0 ){throw 'xo-view: Could not find view with name ' + this.view;}
			}
			this.dom.view.find('[xo-element]').each(function(index, element){
				self.dom[$(element).attr('xo-element')] = $(element);
			});
			this.render();
			this.trigger('render');
			return this;
		},
		remove : function(){
			this.trigger('remove');
			if(this.dom.view) this.dom.view.remove();
			this.off();
			return this;
		},
		render : function(){
			return this;
		},
		show : function(hide){
			if(hide===false) return this.hide();
			if(this.dom.view) this.dom.view.show();
			return this;
		},
		hide : function(){
			if(this.dom.view) this.dom.view.hide();
			return this;
		},
	});

	/*
		MODEL
	 */
	xo.model = Archetype.extend({
		URL : undefined,

		initialize : function(obj){
			this.set(obj);
			this.on('delete', this.off);
			return this;
		},
		set : function(key, value){
			var changes = {key : value};
			var hasChanges = false;
			if(typeof key === 'object') changes = key;

			for(var key in changes){
				var val = changes[key];
				if(this[key] !== val){
					this[key] = val;
					hasChanges = true;
					this.trigger('change:' + key, val);
				}
			}
			if(hasChanges) this.trigger('change');
			return this;
		},
		onChange : function(attrName, evt){
			if(typeof attrName === 'object'){
				for(var k in attrName){
					this.onChange(k, attrName[k]);
				}
				return this;
			}
			this.on('change:' + attrName, evt);
			evt(this[attrName]);
			return this;
		},
		attributes : function(){
			return _.reduce(this, function(result, v,k){
				if(k !== 'URL' && typeof v !=='function'){ result[k] = v; }
				return result;
			}, {});
		},

		//ajax methods
		save : function(callback){
			xo_ajax(this, this.URL, 'save', (this.id ? 'PUT' : 'POST'), callback);
			return this;
		},
		fetch : function(callback){
			xo_ajax(this, this.URL, 'fetch', 'GET', callback);
			return this;
		},
		delete : function(callback){
			xo_ajax(this, this.URL, 'delete', 'DELETE', callback);
			return this;
		},
	}),


	/*
		COLLECTION
	 */
	xo.collection = Archetype.extend({
		URL    : undefined,
		model  : undefined,
		models : [],

		initialize : function(objs){
			this.set(objs);
			if(this.model) this.URL = this.model.URL;
			if(!this.model) this.model = xo.model; //Setup for using a basic model

			//Make sure this works
			this.model.URL = this.model.URL || this.URL;

			return this;
		},
		set : function(objs){
			this.models = [];
			for(var i in objs){
				this.add(objs[i])
			}
			return this;
		},
		get : function(id){
			return _.reduce(this.models, function(result, model){
				if(model.id === id) result = model;
				return result;
			});
		},
		remove : function(arg){
			id = arg.id || arg; //handles models and raw ids
			for(var i in this.models){
				if(id == this.models[i].id) this.models.splice(i,1);
			}
			return this;
		},
		add : function(obj){
			var findModel = this.get(obj.id);
			if(findModel) return findModel.set(obj); //Update if already exists

			if(!this.model.isPrototypeOf(obj)) obj = this.model.create(obj);
			obj = this.model.create(obj);
			obj.on('delete', function(obj){
				this.remove(obj);
			}.bind(this));
			this.models.push(obj);
			this.trigger('add', obj);
			return obj;
		},
		each : function(fn){
			return _.map(this.models, fn);
		},
		attributes : function(){
			return _.map(this.models, function(model){
				return model.attributes();
			});
		},

		//Ajax methods
		fetch : function(callback){
			xo_ajax(this, this.URL || this.model.URL, 'fetch', 'GET', callback);
			return this;
		},
		delete : function(callback){
			xo_ajax(this, this.URL || this.model.URL, 'delete', 'DELETE', callback);
			return this;
		},
		save : function(callback){
			xo_ajax(this, this.URL || this.model.URL, 'save', 'PUT', callback);
			return this;
		},
	});

})(jQuery);





