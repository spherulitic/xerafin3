XeraTabGenerator.prototype = {
	constructor: XeraTabGenerator,
	calcWidths: function(){
		this.tabWidth = (100/this.tabs)-0.01;
	},
	drawTabDiv: function(x){
		var tab = document.createElement('div');
		$(tab).attr('data-index',x);
		tab.id=(this.id+"_"+x);
		return tab;
	},
	showTabContent:function(x){
		$(this.contents[this.current]).hide();
		$(this.contents[x]).fadeTo(200,1);
	},
	externShowTabContent: function(x){
		if (this.current!== x) {
			this.selectTab(x);
			this.showTabContent(x);
			this.current = x;
		};
	},

	drawTab:function(x){
		var that=this;
		var titles = this.titles;
		var butt = document.createElement('div');
		$(butt).addClass(this.styles.buttons+" noselect noappearance checkXeraTabX");
		$(butt).css({
			'width': this.tabWidth + '%',
			'min-width': this.tabWidth + '%',
			'max-width': this.tabWidth + '%'
		});
		$(butt).html(titles[x]);
		$(butt).attr('data-index',x);
		$(butt).on('click',function(){
			var x = Number($(this).attr('data-index'));
			if (that.current!==x){
			that.selectTab(x);
			that.showTabContent(x);
			that.current = x;
			}
		});
		return butt;
	},
	drawTabs: function(){
		for (var x=0;x<this.tabs;x++){
			this.tab.push(this.drawTab(x));
		}
	},
	selectTab: function(x){
		var that=this;
		$(this.buttonWrap).find('.checkXeraTabX').each(function(i,div){
			$(div).removeClass(that.styles.selected);
			if (Number($(div).attr('data-index')) === x) {
				$(div).addClass(that.styles.selected);
			}
		});
	},
	drawTabRegion : function(){
		var that=this;
		this.content = document.createElement('div');
		this.tabRegion = document.createElement('div');
		this.contentRegion = document.createElement('div');
		$(this.contentRegion).addClass(this.styles.windows);
		$(this.tabRegion).addClass(this.styles.tabRegion);
		this.buttonWrap = document.createElement('div');
		$(this.buttonWrap).addClass(this.styles.buttonRow);
		$(this.tabRegion).append(this.buttonWrap);
		this.drawTabs();
		this.tab.forEach(function(a,b){
			$(that.buttonWrap).append(a);
		});
		for (var x=0;x<this.contents.length;x++) {
			$(that.contentRegion).append(this.contents[x]);
			$(this.contents[x]).hide();
		}
		this.selectTab(0);
		this.showTabContent(0);
		$(this.content).append(this.tabRegion,this.contentRegion);

	},
	output: function(){
		return this.content;
	},
	show: function(){
		$('#'+this.pare).append(this.content);
	},
	init: function(){
		var that=this;
		this.current = this.default;
		this.tab = [];
		this.contents = [];
		this.calcWidths();
		for (var x=0;x<this.tabs;x++){
			this.contents.push(that.drawTabDiv(x));
		};
		this.drawTabRegion();
	},
}
function XeraTabGenerator(d){
	this.id = d.id || console.log("Error: XeraTabGenerator Object must have a DOM id");
	//temp
	this.pare = d.pare;
	var y = {
		'buttons':'xeraTabButtons steelRowed',
		'buttonRow' :'xeraTabButtonRow',
		'selected' : 'xeraTabButtonSelected highlightRow',
		'tabRegion': 'xeraTabRegion metalBOne',
		'tabs':'xeraTab',
		'windows':'xeraTabWindow'
	}
	if (typeof d.styles!=='undefined'){
		Object.keys(d.styles).forEach(function(row,i){
			if (typeof y[row]!=='undefined') {y[row] = d.styles[row];}
		});
	}
	this.styles = y;
	this.titles = d.titles || {}
	this.shorts = d.shorts || {}
	this.tabs = this.titles.length;
	this.default = d.default || 0;
	this.contents = d.textCont || [];
	this.hasImages = d.hasImages || false;
	if (this.hasImages) {this.imgs = d.imgs};
	this.init();
}
