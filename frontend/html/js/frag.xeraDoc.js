XeraDoc.prototype = {
	constructor: XeraDoc,
	resizeAction: function(){
		if (this.hasBookmarks){
			if ($(window).width()>1191) {
				console.log("BOOKMARK LIST SHOWN");
				$(this.bookmarkList).show();
				$(this.myBookmarks.dDown).hide();
			}
			else {
				console.log("BOOKMARK LIST HIDDEN");
				$(this.bookmarkList).hide();
				$(this.myBookmarks.dDown).show();
			}
		}
	},
	draw: function(){
		let self=this;
		this.content = document.createElement('div');
		$(this.content).addClass(this.styles.container);
		if (this.hasHeader) {
			this.header = document.createElement('div');
			$(this.header).addClass(this.styles.header);
			$(this.header).html(this.head);
			$(this.content).append(this.header);
		}
		this.bodyRegion = document.createElement('div');
		$(this.bodyRegion).html(this.body);
		if (this.hasBookmarks){
			this.bookmarkList = document.createElement('div');
			this.myBookmarks = new XeraDocBookmarks ({
				'bookmarks':this.bookmarks,
				'target':this.bodyRegion,
				'side':this.bookmarkSide,
				'minWidth':1191
			});
			$(this.bookmarkList).addClass(this.styles.bookmarks);
			$(this.bookmarkList).html(this.myBookmarks.output());
			$(this.content).append(this.bookmarkList);

		}
		if (this.hasScroll) {$(this.bodyRegion).addClass('pre-scrollable')};
		$(this.bodyRegion).addClass(this.styles.body);
		$(this.content).append(this.bodyRegion);

		if (this.hasFooter) {
			this.footer = document.createElement('div');
			if (this.hasBookmarks) {
				$(this.footer).append(this.myBookmarks.dDown);
			}
			else {
				$(this.footer).html(this.foot);
			}
			$(this.footer).addClass(this.styles.footer);
			$(this.content).append(this.footer);
		}
	},
	init: function(){
		this.draw();
	},
	output: function (){
		let self=this;
		$(this.pare).html(this.content);
		if (this.hasBookmarks){
			this.resizeAction();
			$(window).on('resize',function(){self.resizeAction();});
		}
	}
}
function XeraDoc(data={}){
	this.hasHeader = data.hasHeader || false;
	this.head = data.head || 'Test';
	this.foot = data.foot || 'Test';
	this.hasFooter = data.hasFooter || true;
	this.hasBookmarks = data.hasBookmarks || false;
	typeof data.hasScroll!=='undefined' ? this.hasScroll = data.hasScroll : this.hasScroll = true;
	this.bookmarks = data.bookmarks || ['Test','Test'];
	this.bookmarkSide = data.bookmarkSide || 'left';
	this.styles = {
		'header': 'col-xs-12 docHead steelRowed',
		'footer': 'col-xs-12 docFoot steelRowed',
		'container': 'xeraDoc',
		'body': 'col-lg-9 col-md-12 col-sm-12 col-xs-12 docBody',
		'bookmarks' : 'col-lg-3 col-md-12 col-sm-12 col-xs-12 bookmarkList'
	}
	if (!this.hasBookmarks){this.styles.body = 'col-lg-12 col-xs-12 docBody'}
	if (typeof data.styles!=='undefined'){
		let d = data.styles;
		Object.entries(d).forEach(function([v,i]){
			this.styles[i] = v;
		});
	}
	this.head = data.head || 'Testing';
	this.foot = data.foot || "Testing Even More";
	this.body = data.body || 'Testing More';
	this.pare = data.pare;
	this.init();
}

XeraDocBookmarks.prototype = {
	constructor:XeraDocBookmarks,
	scrollTowards: function(d){
		$(this.target).scrollTop(0);
		let x = $('#'+d).position().top-20;
		$(this.target).scrollTop(x);
	},
	buildDropdown: function(target){
		this.dropdownList = new Array();
		let self=this;
		this.bookmarks.forEach(function(v){
			self.dropdownList.push({'name':v[0],'value':v[1]})
		});
		this.list = new XeraSelect ({
			'data': this.dropdownList,
			'direction':'up',
			'onChange': function(value){
				self.scrollTowards(value);
			},
			'maxHeight': $('window').height()/3
		});
	},
	createLinkEvent: function(x,v,target){
		let self=this;
		$(x).on('click',function(){
			$(self.target).scrollTop(0);
			let x = $('#'+v[1]).position().top-20;
			$(self.target).scrollTop(x);
		});
	},
	drawBookmark: function(v){
		let x = document.createElement('div');
		$(x).addClass('bookmark');
		$(x).html(v[0]);
		this.createLinkEvent(x,v,this.target);
		return x;
	},
	draw: function(){
		let self=this;
		this.bookmarkList = document.createElement('div');
		this.bookmarks.forEach(function(v){
			self.bookmarkList.append(self.drawBookmark(v));

		});
		this.buildDropdown(this.bookMarks);
		this.dDown = document.createElement('div');
		$(this.dDown).css({'font-size':'1em','margin':'auto','width':'90%','vertical-align':'middle','height':'1.2em','line-height':'1.2em','padding-top':'3px','padding-bottom':'5px'});
		$(this.dDown).append(this.list.output());
	},
	init: function(){
		this.draw();
	},
	output: function(){
		return this.bookmarkList;
	}
}
function XeraDocBookmarks (data={}){
	this.bookmarks = data.bookmarks;
	this.minWidth = data.minWidth;
	this.target = data.target;
	this.init();
}
