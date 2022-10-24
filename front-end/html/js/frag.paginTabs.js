PaginTab.prototype = {
	constructor: PaginTab,
	init:function(){
		this.content = document.createElement('div');
		$(this.content).addClass(this.isCurrent?this.styles.current:this.styles.base);
		this.draw();
	},
	draw: function(){
		let self=this;
		$(this.content).html(this.value);
		$(this.content).on('click',function(){self.action(self.value);});
	},
	output: function(){
		return this.content;
	}
}
function PaginTab(data={}){
	this.value = data.value || 0;
	this.isCurrent = data.isCurrent || false;
	if (typeof data.styles!=='undefined'){
		this.styles = data.styles;
	}
	else {
		this.styles = {
			base:'paginNumTabs noselect nodrag',
			current:'paginNumTabs paginNumTabCur noselect nodrag'
		}
	}
	this.action = data.action;
	this.init();
}

PaginTabs.prototype = {
	constructor: PaginTabs,
	createGap:function(){
		let x=document.createElement('div');
		$(x).addClass(this.styles.gap);
		$(x).html('...');
		$(this.content).append(x);
	},
	init:function(){
		this.draw();
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).addClass(this.styles.content);
		this.update({'pages':this.pages});
	},
	update: function(d){
		this.pages = d.pages || 0;
		$(this.content).empty();
		this.populate();
	},
	output: function(){
		return this.content;
	},
	runActions:function(x){
		this.currentPage = x;
		this.action(x);
	},
	addTab: function(x){
		let self=this;
		this.numTabs.push(
			new PaginTab({
				'value':x+1,
				'isCurrent': (this.currentPage===x+1),
				'action': function(x){self.runActions(x);}
			})
		);
		$(this.content).append(this.numTabs[this.numTabs.length-1].output());
	},
	populate: function(){
		this.numTabs = new Array();
		if (this.pages > 1){
			$(this.content).show();
			let maxValues = (2*this.pageRange) +1;
			let min = Math.max(this.currentPage-this.pageRange,1);
			let max = Math.min(this.pages, this.currentPage + this.pageRange);
			if (min>this.currentPage-this.pageRange){
				max = Math.min(maxValues,this.pages);
			}
			if (max<this.currentPage+this.pageRange){
				min = Math.max(this.pages - maxValues +1, 1);
			}
			if (min > 1){
				this.addTab(0);
			}
			if ((this.currentPage - 1000 > 1) && ((this.currentPage - 1000) < min)) {
				this.addTab(this.currentPage - 1001);
			}
			if ((this.currentPage - 100 > 1) && ((this.currentPage - 100) < min)) {
				this.addTab(this.currentPage - 101);
			}
			if ((this.currentPage - 10 > 1) && ((this.currentPage - 10) < min)) {
				this.addTab(this.currentPage - 11);
				if ((this.currentPage - 9) < min) {this.createGap();}
			}
			for (let x=min-1;x<max;x++){
				this.addTab(x);
			}
			if ((this.currentPage + 10 < this.pages) && ((this.currentPage + 10) > max)) {
				if ((this.currentPage +11) > max) {this.createGap();}
				this.addTab(this.currentPage + 9);
			}
			if ((this.currentPage + 100 < this.pages) && ((this.currentPage + 100) > max)) {
				this.addTab(this.currentPage + 99);
			}
			if ((this.currentPage + 1000 < this.pages) && ((this.currentPage + 1000) > max)) {

				this.addTab(this.currentPage + 999);
			}
			if (max < this.pages) {
				this.addTab(this.pages-1);
			}
		}
		else {
			$(this.content).hide();
			}
	}
}
function PaginTabs(data={}){
	this.pages = data.pages || 0;
	this.pageRange = data.pageRange || 3;
	this.currentPage = data.currentPage || 1;
	this.action = data.action || function(){alert("No pagination function defined");}
	if (typeof data.styles!=='undefined') {
		this.styles = data.styles;
	}
	else {
		this.styles = {
			content:'paginTabs',
			gap:'paginNumTabGap'
		}
	}
	this.init();
}
