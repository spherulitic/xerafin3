OverviewSearch.prototype = {
	constructor:OverviewSearch,
//---------------------------------------------------------------------
	init: function(){
		this.cont=document.createElement('div');
		this.params = document.createElement('div');
		$(this.params).css({'width':'100%'});
		$(this.cont).addClass('overviewQueryRegion steelRowed');
		this.buildSearch('daily');
		this.drawSearchRows();
		$(this.cont).append(this.getTypeOption(),this.params);
		$(this.cont).append(this.addSearchButton());
	},

//---------------------------------------------------------------------
	setLexicon: function(d){
		this.lexicon = d;
	},
//---------------------------------------------------------------------
	drawSearchRows: function(){
		$(this.params).html('');
		let self= this;
		this.searchRows.forEach(function(v,i){
			$(self.params).append(self.searchRows[i].output());
		});

	},
	buildSearch: function(v){
		this.searchRows = new Array();
		switch (v) {
			case 'daily':
				this.searchRows[0] = new SearchDate({'isOptional':false});
				this.searchRows[1] = new SearchLength({'fieldName':'Length'});
				break;
			case 'weekly':
				this.searchRows[0] = new SearchDate({'isOptional':false});
				break;
			case 'monthly':
				this.searchRows[0] = new SearchDate({'isOptional':false});
				break;
			case 'probability':
				this.searchRows[0] = new SearchLength({'fieldName':'Length','isOptional':false});
				this.searchRows[1] = new SearchProb({'fieldName':'Prob'});
				break;
			case 'new':
			case 'vowel':
				this.searchRows[0] = new SearchLength({'fieldName':'Length'});
				break;
		}
	},
	getTypeOption:function() {
		var row = document.createElement('div');
		$(row).addClass('overviewQueryRow');
		var label = document.createElement('div');
		$(label).addClass('overviewQueryLabel');
		$(label).css({'margin-left':'5%'});
		$(label).html('Type:');
		var input = document.createElement('div');
		let self = this;
		this.typeSelect = new XeraSelect({
			'data': [
				{'name':'Daily Quiz', 'value':'daily'},
				{'name':'Weekly Workout', 'value':'weekly'},
				{'name':'Monthly Marathon', 'value':'monthly'},
				{'name':'High Vowel', 'value':'vowel'},
				{'name':'New Words', 'value':'new'},
				{'name':'Probability', 'value':'probability'}
			],
			'id': 'overviewSearchType',
			'onChange': function(value){
				self.buildSearch(value);
				self.drawSearchRows();
			},
			'maxHeight': $('window').height()/4
		});
		$(input).addClass('overviewQueryInput');
		$(input).css({'width':'70%','margin-left':'8%'});
		$(input).append(this.typeSelect.output());
		$(row).append(label,input);
    return row;
	},

//---------------------------------------------------------------------
	buildQuery: function(){
		this.searchQuery = new Object();
		this.searchQuery.searchType = this.typeSelect.val();
		let self=this;
		this.searchRows.forEach(function(v,i){
			//console.log(v.values);
			if (self.searchRows[i].isSelected){
				Object.entries(v.values).forEach(function([obj,objVal]){
					self.searchQuery[obj] = objVal;
				});
			}
		});
		this.searchQuery['lexicon'] = this.lexicon;
		xerafin.error.log.add(this.searchQuery,'JSON');
	},
//---------------------------------------------------------------------

	addSearchButton: function() {
		this.searchRow = document.createElement('div');
		$(this.searchRow).addClass('overviewQueryRow');
		this.searchButton = document.createElement('button');
		$(this.searchButton).addClass('overviewButton');
		$(this.searchRow).css({'padding-top':'5px','padding-bottom':'2px','text-align':'center'});
		$(this.searchButton).css({'margin':'auto!important'});
		$(this.searchButton).html('Search');
		var self=this;
		$(this.searchButton).on('click',function(){
			self.values = self.buildQuery();
			self.toggleSearch(false);
			self.action('SEARCH_GET_RESULTS', self.searchQuery); // --> Send to Overview to handle
			//$(self.dateInput).datepicker("refresh");
		});
		$(this.searchRow).append(this.searchButton);
		return this.searchRow;
	},

//---------------------------------------------------------------------

	toggleSearch:function(on){
		var self = this;
		if (!on) {
			$(this.searchButton).prop('disabled',true);
			$(this.searchRow).slideUp(1000);

		}
		else {
			$(this.searchRow).slideDown(1500,function(){
				$(self.searchButton).prop('disabled',false);
			});
		}
	},

//---------------------------------------------------------------------

	show: function(){
		$('#'+this.pare).append(this.cont);
	}
}
function OverviewSearch(data){
	this.lexicon = data.lexicon || 'CSW19';
	this.pare = data.pare;
	this.init();
}

// These two object have just been thrown in to same time in testing:
