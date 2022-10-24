XeraLexiconSelector.prototype= {
	constructor: XeraLexiconSelector,
	drawDropdown: function(){
		let self=this;
		$(this.region).html('');
		this.selection = new XeraSelect({
			'data': this.list,
			'id':'lexicon_list',
			'hasImages':true,
			'val': this.data.default.lexicon.toUpperCase()+'-'+this.data.default.version,
			'onChange':function(value){self.action('SET_LEX_CUR', value, true);},
			'maxHeight': $(window).height()/4
		});
		$(this.region).append(this.selection.output());
	},
	change: function(v){
		if (typeof this.dropdownTimer!=='undefined') {clearTimeout(this.dropdownTimer);}
		if (typeof this.selection!=='undefined'){
			//xerafin.error.log.add("New value for dropdown","comment");
			//xerafin.error.log.add(v,'JSON');
			this.selection.val(v);
		}
		else {
			this.dropdownTimer=setTimeout(XeraLexiconSelector.prototype.change.bind(this,v),20);
		}
	},
	generateList: function(){
		xerafin.error.log.add("Data Received for Lexicon Dropdown","comment");
		xerafin.error.log.add(this.data,'JSON');
		this.list = new Array();
		let self=this;
		Object.entries(this.data.values).forEach(function([i,v]){
			self.list.push({
				'img' : 'images/flags/'+country.byId[Number(v.country)-1].short.toLowerCase()+'.png',
				'name' : v.name,
				'value' : v.lexicon.toUpperCase()+"-"+v.version
			});
		});
		console.log(this.list);
	},
	redraw: function(d){
		this.data = d;
		this.generateList();
		this.drawDropdown();
	},
	draw: function(){
		let self=this;
		this.content=document.createElement('div');
		this.content.id = this.id;
		$(this.content).addClass(this.className);
		this.region=document.createElement('div');
		$(this.region).css({'width':'90%','margin':'auto'});
		$(this.content).append(this.region);
	},
	output: function(){
		return this.content;
	},
	init: function(){
		this.draw();
	},
	show: function(){
		$('#'+this.pare).append(this.content);
	}
}
function XeraLexiconSelector(data){
	if (typeof data.id!=='undefined') {
		this.id = data.id;
		this.pare = data.pare;
		this.className = "overviewLexicon steelRowed";
		this.init();
	}
	else {appendDebugLog("XeraLexiconSelector Error : no id defined!");}
}
