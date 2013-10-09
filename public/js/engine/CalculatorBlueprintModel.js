
/**
 * This is what get fecthed and uploaded to the server
 * contains the blueprint for generating the actual Calculator Model
 */
Presto_Model_CalculatorBlueprint = XO.Model.extend({
	urlRoot : '/api/calculator',
	defaults : {
		title       : 'New Calculator',
		description : 'Click here to edit',
		icon        : 'icon-file-alt',
		color       : 'yellow',
		script      : "{\n	title       : 'New Calculator',\n	description : 'Click to edit',\n	icon        : 'icon-file-alt',\n	color       : 'yellow',\n\n	inputs : {\n		capital : {\n			title : 'Capital',\n			description : 'How much money ya got',\n			type  : Type.Money,\n			initialValue : 500\n		},\n		age : {\n			title : 'Age',\n			type  : Type.Number,\n			initialValue : 25\n		}\n	},\n\n	tables : {\n		sample : {\n			title : 'Sample Table',\n			columns : {\n				age : {\n					title : 'Age',\n					type : Type.Number,\n					firstCell : function(){\n						return Inputs.age;\n					},\n					generator : function(previousCellValue, index){\n						return previousCellValue + 1;\n					}\n				},\n				capitalDelta : {\n					title : 'Capital Change',\n					type  : Type.Money,\n					firstCell : function(){\n						return Inputs.capital;\n					},\n					generator : function(previousCellValue, index){\n						return previousCellValue + Math.random()*100;\n					}\n				},\n				random : {\n					title : 'Random',\n					type  : Type.Money,\n					firstCell : function(){\n						return 0;\n					},\n					generator : function(previousCellValue, index){\n						return previousCellValue + Math.random()*100;\n					}\n				},\n			}\n		}\n	},\n\n	charts : {\n		basic : {\n			title : function(){\n				return 'Sample Chart' + Outputs.test;\n			},\n			hover : function(x,y,label){\n				return '<b>$' + y + '</b> at month ' + x + '</br>' + label;\n			},\n			breakeven : [ ['capitalDelta', 'random'] ],\n			table : 'sample',\n		}\n	},\n\n	outputs : {\n		breakeven : {\n			title : 'Break-even Age',\n			description : 'Age at which you made 10% of your initial capital',\n			type : Type.Number,\n			value : function(){\n				var breakEvenAge = Tables.sample.age.find(function(age, index){\n					if(Tables.sample.capitalDelta[index] > Inputs.capital * 1.10){\n						return true;\n					}\n					return false;\n				});\n				return breakEvenAge;\n			}\n		}\n	}\n}\n"
	},

	upload : function(callback)
	{
		var self = this;
		//make sure the model is updated
		this.execute(function(){
			self.save({},{
				success  : function(model, response, options){
					if(callback){
						callback(response);
					}
				},
				error : function(model, response, options){
					throw 'Error uploading to server';
				}
			});
		});
		return this;
	},

	retrieve : function(callback)
	{
		var self = this;
		console.log('retrieve');
		$.get(this.urlRoot + '/' + this.get('id'), function(response){
			self.set(response);
			self.execute();
		});
		return this;
	},


	/**
	 * Executes the current script and triggers out the resultant object
	 * @return {[type]} [description]
	 */
	execute : function(callback)
	{
		var self = this;

		eval("with (this) {var result = (" + this.get('script') + ")}");

		//update from result
		_.each(['title','description', 'color', 'icon', 'group', 'keywords'], function(modelAttributeName){
			if(typeof result[modelAttributeName] !== 'undefined'){
				self.set(modelAttributeName, result[modelAttributeName]);
			}
		});

		if(typeof callback === 'function'){
			callback(result);
		}

		this.trigger('execute', result);
		return result;
	},

});



