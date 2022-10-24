ComboFilters.prototype = {
	constructor: ComboFilters,
	init: function(){
		this.draw();
	},
	drawMainFilter: function(){
		this.mainFilter = new XeraListboxBasic({
			'style':this.styles.mainSelect,
			'options':this.mainSelect.data,
			'dependents':this.mainSelect.dependents,
			'val':this.mainSelect.val,
			'change': this.mainSelect.change
		});
	},
	drawAuxFilters:function(){
		this.auxFilter = new Array();
		let self=this;
		Object.entries(this.auxSelect).forEach(function([i,v]){
			self.auxFilter[i] = new XeraListboxBasic({
				'style':self.styles.subSelects,
				'options':v.data,
				'dependents':v.dependents,
				'val':v.val,
				'change': v.change
			});
		});
	},
	detachAux:function(a){
		let self=this;
		a.forEach(function(v){
			$(self.auxFilter[v].content).detach();
		});
	},
	attachAux: function(x){
		$(this.secondWrapper).append(this.auxFilter[x].output());
	},
	parseDependencies:function(a){
		let self=this;
		let y,z,v;
		if (a===-1){
			this.detachAux(this.selectorState) // clear all selects from screen
			this.selectorState = new Array();
			y = this.mainSelectorState(); //value of selector
			z = this.mainSelect.dependents[y]; //values of auxselect(s) required as array
		}
		else {
			y= this.auxSelectorState(a);
			v= this.auxSelect[a].dependents;
			if (typeof v=='object'){
				z = v[y];
			}
		}
		if (typeof z!=='undefined'){
			if (z.length>0){  //if there are required aux
				let c = this.selectorState.concat(z);
				this.selectorState = c;
				if (this.selectorState.length>0){this.parseDependencies(this.selectorState[this.selectorState.length-1]);}
			}
		}
		else {
			this.drawCurrentAux();
		}
	},
	mainSelectorState: function(){
		return $(this.mainFilter.content).val();
	},
	auxSelectorState:function(x){
		return $(this.auxFilter[x].content).val();
	},
	setAuxWidths: function(){
		let self=this;
		Object.entries(self.auxFilter).forEach(function([i,v]){
			self.auxFilter[i].setWidth(90/self.selectorState.length);
		});
	},
	drawMainRow: function(){
		this.mainWrapper = document.createElement('div');
		$(this.mainWrapper).addClass(this.styles.mainRow);
		this.drawMainFilter();
		$(this.mainWrapper).append(this.mainFilter.output());
	},
	drawSecondRow: function(){
		this.secondWrapper = document.createElement('div');
		$(this.secondWrapper).addClass(this.styles.secondRow);
		this.drawAuxFilters();
	},
	drawCurrentAux: function(){
		let self=this;
		self.selectorState.forEach(function(v){
			self.attachAux(v);
		});
		this.setAuxWidths();
	},
	draw: function(){
		this.content=document.createElement('div');
		$(this.content).addClass(this.styles.content);
		this.drawMainRow();
		this.drawSecondRow();
		$(this.content).append(this.mainWrapper,this.secondWrapper);
		this.drawCurrentAux();
	},
	output: function(){
		return this.content;
	}
}
function ComboFilters(data={}){
	// 0: Leaderboard/Myrank/Metarank, 1: Leaderboard/Myrank,
	// 2: QA Periods, 3: Meta Periods, 4: Award Sort, 5: Award Year
	this.selectorState = data.selectorState;
	if (typeof this.styles!=='undefined'){
		this.styles = data.styles;
	}
	else {
		this.styles = {
			'content':'',
			'mainRow':'mainRow steelRowed',
			'secondRow':'secondRow highlightRow',
			'mainSelect':'mainFilter',
			'subSelects':'auxFilter'
		}
	}
	this.dependency = data.dependency;
	this.mainSelect = data.mainSelect;
	this.auxSelect = data.auxSelect;
	this.init();
}
