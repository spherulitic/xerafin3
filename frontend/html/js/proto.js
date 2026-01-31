ShowcaseItem.prototype = {
	constructor: ShowcaseItem
};

function ShowcaseItem(heading,image,content,layout) {
	this.heading = heading;
	this.image = new Image();
	this.image.src=image;
	this.layout = layout;
	if (typeof this.layout.position==='undefined'){this.layout.position='center';}
	if (typeof this.layout.size==='undefined'){this.layout.size='100%';}

	this.content = content;
}

Showcase.prototype = {
	constructor: Showcase,
	init: function(){
		this.current = 0;
		$('#'+this.target).css('opacity','1');
		this.fadeTimer=setTimeout(Showcase.prototype.getNext.bind(this),this.viewtime);
		$("#"+this.target).append(this.title,this.blurb);
		this.draw();
	},
	draw: function(){
		$('#'+this.target).css('background-image',"url('"+this.item[this.current].image.src+"')");
		$('#'+this.target).css('background-position',this.item[this.current].layout.position);
		$('#'+this.target).css('background-repeat',"no-repeat");
		$('#'+this.target).css('background-size',this.item[this.current].layout.size);
		$(this.title).html(this.item[this.current].heading);
		$(this.blurb).html(this.item[this.current].content);
	},
	getNext: function(){
		this.current == (this.item.length-1) ? this.current=0:this.current++;
		var that=this;
		$("#"+this.target).fadeTo(this.fadeout,0,function(){that.draw();$('#'+that.target).fadeTo(that.fadein,1);});
		this.fadeTimer=setTimeout(Showcase.prototype.getNext.bind(this),this.viewtime);
	}
}

function Showcase(items,target){
	this.item = new Array();
	this.target = target;
	for (var x=0;x<items.length;x++){
		this.item[x] = new ShowcaseItem (items[x][0],items[x][1],items[x][2],items[x][3]);
	}
	this.width = $('#'+target).width();
	this.height = Math.round(this.width*3/4);
	$('#'+this.target).css("height",this.height);
	this.viewtime = 20000;
	this.fadein = 1000;
	this.fadeout = 1000;
	this.title = document.createElement('div');
	this.blurb = document.createElement('div');
	this.title.className+= " showcaseTitle noselect";
	this.blurb.className+= " showcaseBlurb noselect";
	$('#'+this.target).css("border","1px solid black");
}
//------------------------------------------------------------------------------------------------------------------------>
Overlay.prototype = {
	constructor:Overlay,
	resizeEvent:function(){
		var that=this
		var x = function(){$(window).resize(function(){
			debounce(function(){
				that.setDimensions();
				typeof that.content!=='undefined' ? that.draw(that.content): that.draw();
			},200);
		});
		}
		x();
	},
	draw:function(){
		this.setDimensions();
		this.setPositions();
		if (typeof this.overlay=='undefined') {this.overlay = document.createElement('div');this.overlay.id=this.ident;}
		$(this.overlay).css(
			{
				"width" : this.width,
				"height" : this.height,
				"position" : this.position,
				"z-index" : this.zIndex,
				"top" : this.top,
				"left" : this.left,
				"background-color" : "rgba("+this.RGBcolor+","+this.opacity+")"
			}
		);
		if (typeof this.content!=='undefined'){
			typeof this.content.container!=='undefined' ? $(this.overlay).append(this.content.container) : $(this.overlay).append(this.content);
		}
		$(this.pare).append(this.overlay);
		$(this.overlay).fadeTo('slow',1);
		this.resizeEvent();
	},
	clear: function(){
		var that = this.overlay;
		$(this.overlay).fadeTo('slow',0,function(){$(that).remove();});
	},
	setDimensions: function(){
		if (this.pare == 'body') {
			this.height = Math.max ($(window).height(),$(document).height());
			this.width = '100vw';
		}
		else {
			this.pare = "#"+this.pare;
			this.height = $('#'+this.pare).height();
			this.width = $('#'+this.pare).width();
		}
	},
	setPositions: function(){
		this.top = 0;
		this.left = 0;
		this.pare == 'body' ? this.position = 'fixed' : this.position = 'relative';
	}
}

function Overlay(data){

	if (typeof data.ident!=='undefined'){this.ident = data.ident;}
	if (typeof data.opacity!=='undefined') {this.opacity = data.opacity} else {this.opacity = 0.6;}
	if (typeof data.content!=='undefined') {this.content = data.content;}
	if (typeof data.RGBcolor=='undefined') {this.RGBcolor = "26,26,26";}
	if (typeof data.pare=='undefined') {this.pare = 'body';}
	if (typeof data.zIndex!=='undefined') {this.zIndex = data.zIndex;} else {this.zIndex = 10000;}
	this.draw();
	if (typeof data.clickClear=='boolean') {if (data.clickClear) {var that=this;$(this.overlay).on('click',function(){that.clear();});}}
}

//------------------------------------------------------------------------------------------------------------------------>

OverContainer.prototype = {
	constructor:OverContainer,
	draw:function(){
		this.container=document.createElement('div');
		this.container.id=this.ident;
		this.width=this.size.xs;
		if ($(window).width()>991){this.width=this.size.sm;}
		if ($(window).width()>1191){this.width=this.size.md;}
		this.height="80vh";
		this.top="10vh";

		$(this.container).css({
			"height":this.height,
			"width":this.width,
			//"position":this.position,
			"margin":"auto",
			"margin-top":this.top,
			"overflow":"hidden"
		});
		this.container.className+=" "+this.class;
		typeof this.content.container!=='undefined' ? $(this.container).append(this.content.container) : $(this.container).append(this.content);
		$('#'+this.pare).append(this.container);
	},
	setNewDimensions:function(){
		this.size.xs = "90vw";
		this.size.sm = "70vw";
		this.size.md = "60vw";
	},
	resizeEvent:function(){
		var that=this;
		//$(window).on('resize', $.proxy(this, this.setNewDimensions))
		//function(){
		//	that.setNewDimensions();
		//	debounce(function(){
		//		typeof that.content!=='undefined' ? that.draw(that.content):that.draw();
		//	},200);
		//});
	}
}
function OverContainer(data){
	if (typeof data.size=='undefined') {data.size={};this.size={};}
	if (typeof data.size.xs!=='undefined') {this.size.xs = data.size.xs;} else {this.size.xs = "90vw";}
	if (typeof data.size.sm!=='undefined') {this.size.sm = data.size.sm;} else {this.size.sm = "70vw";}
	if (typeof data.size.md!=='undefined') {this.size.md = data.size.md;} else {this.size.md = "60vw";}
	if (typeof data.class!=='undefined') {this.class = data.class;}
	if (typeof data.position=='undefined') {this.position = 'relative';} else {this.position=data.position;}
	this.container = document.createElement('div');
	if (typeof data.pare!=='undefined') {this.pare=data.pare;} else {this.pare='body';}
	if (typeof data.ident!=='undefined') {this.ident=data.ident;}
	if (typeof data.content!=='undefined') {this.content=data.content;}
	this.draw();
}

OverContentWrap.prototype = {
	constructor:OverContentWrap,
	draw:function(content){
		this.container = document.createElement('div');
		this.container.id=this.ident;
		this.contentWrap=document.createElement('div');
		typeof this.content.container!=='undefined' ? $(this.contentWrap).append(this.content.container) : $(this.contentWrap).append(this.content);
		if (typeof this.title!=="undefined") {
			this.heading = document.createElement('div');
			$(this.heading).addClass('steelRowed');
			$(this.heading).css({'width':'100%','color':'rgba(26,26,26,1)','text-align':'center','font-variant':'small-caps','font-size':'1.2em'});
			$(this.heading).html(this.title);
			$(this.container).append(this.heading);
		}
		$(this.container).append(this.contentWrap);
		if (this.closeMe) {
			this.buttonLevelWrap = document.createElement('div');
			$(this.buttonLevelWrap).css({'width':'100%','margin':'auto','text-align':'center'});
			this.closeButton = document.createElement('button');
			$(this.closeButton).addClass('btn btn-default steelRowed');
			$(this.closeButton).css({'margin':'auto','text-align':'center','margin':'5px'});
			$(this.closeButton).html('Close');
			var test = $.proxy(this.closeAction, this);
			$(this.closeButton).on('click', test);
			$(this.buttonLevelWrap).append(this.closeButton);
			$(this.buttonLevelWrap).css({'border-top':'1px solid #999'});
			$(this.container).css({'height':'inherit'})
			$(this.container).append(this.buttonLevelWrap);
			//$(this).off('click',test);}
		}
	}
}

function OverContentWrap(data){

	if (typeof data.ident!=='undefined') {this.ident=data.ident;}
	if (typeof data.title!=='undefined'){this.title=data.title;}
	if (typeof data.content!=='undefined') {this.content=data.content;}
	if (typeof data.closeAction!=='undefined') {this.closeAction = data.closeAction;}
	typeof this.closeAction!=='undefined' ? this.closeMe = true : this.closeMe = false;
	this.draw();
}

function generateLinkEvent(links, target){
	$('#'+links).ready(function(){
		$('#'+links+'Link').on('click',function(){
			$('#'+target).scrollTop(0);
			var x = $("#"+links).position().top-20;
			$('#'+target).scrollTop(x);
		});
	});
}

OverShortcut.prototype = {
	constructor:OverShortcut,
	generateFootNav:function(){
		this.footDrop = document.createElement('select');
		$(this.footDrop).css({'max-width':'60vw'});
		var listOption = new Array();
		for (var z=0;z<this.links.length;z++){
			listOption[z] = document.createElement('option');
			listOption[z].text = this.links[z][0];
			listOption[z].value = this.links[z][1];
			this.footDrop.add(listOption[z]);
		}
		$(this.footNav).append(this.footDrop);
		var that=this.contentWrap.id;

		$(this.footDrop).change(function(){
			$('#'+that).scrollTop(0);
			var x = $(this).val();
			var y = $('#'+x).position().top-20;
			$('#'+that).scrollTop(y);
		});
	},
	generateSidebar:function(){
		this.sidebarWrap = document.createElement('div');
		var that=this;
		var z = new Array();
		for (var x=0;x<this.links.length;x++){
			z[x] = document.createElement('div');
			z[x].id=this.links[x][1]+'Link';
			$(z[x]).css({'width':'100%','text-align':'left','border-bottom':'1px solid #999','color':'rgba(140,176,48,1)','font-size':'0.8em'});
			$(z[x]).addClass('noselect');
			$(this.sidebarWrap).append(z[x]);
			$(z[x]).html(this.links[x][0]);
			generateLinkEvent(this.links[x][1], this.contentWrap.id);
		};
		$(this.sidebarDisplay).append(this.sidebarWrap);
	},
	draw:function(content){
		this.getDisplayType();
		this.container = document.createElement('div');
		$(this.container).css({'margin':'auto','margin-top':'10px','width':'98%','padding':'3px'});
		$(this.container).addClass('row');
		this.contentWrap = document.createElement('div');
		this.contentWrap.id = "shortcutWrapContent";
		$(this.contentWrap).addClass("col-md-9 col-sm-8 col-xs-12");
		$(this.contentWrap).html(this.content);
		$(this.contentWrap).addClass('pre-scrollable');
		$(this.contentWrap).css({"border":"none", "max-height":"65vh", "box-shadow":"none","border-left":"1px solid #999",'border-radius':'0px','background':'transparent','overflow-x':'hidden'});


		if (this.sidebar){
			this.sidebarDisplay = document.createElement('div');
			$(this.sidebarDisplay).addClass("col-md-3 col-sm-4");
			$(this.sidebarDisplay).css({});
			this.generateSidebar();
			if (this.displaySide=='right'){
				$(this.container).prepend(this.contentWrap);
				$(this.container).append(this.sidebarDisplay);
			}
			if (this.displaySide=='left'){
				$(this.container).append(this.sidebarDisplay,this.contentWrap);
			}
		}
		else {
			this.footNav = document.createElement('div');

			$(this.contentWrap).css({'max-height':'55vh','border-left':'0px','font-size':'0.8em'});
			$(this.footNav).addClass("col-xs-12 steelRowed");
			$(this.footNav).css({'text-align':'center','margin':'auto','border-top':'1px solid #999','width':'100%','padding':'3px'});
			this.footNav.id = this.ident+"Nav";
			$(this.container).append(this.contentWrap);
			this.generateFootNav();
			$(this.container).append(this.footNav);
		}
	},
	getDisplayType:function(){
		if ($(window).width()>991){this.sidebar=true;}
		else {this.sidebar=false;}
	}
}
function OverShortcut(data){
	if (typeof data.displaySide!=='undefined') {
		if ((data.displaySide == 'left') || (data.displaySide == 'right')) {
			this.displaySide = data.displaySide;
		}
		else {this.displaySide = 'left';}
	}
	else {this.displaySide = 'left';}
	this.ident=data.ident;
	this.pare=data.pare;
	this.links=data.links;
	if (typeof data.content!=='undefined') {this.content=data.content;}
	this.draw();
}

OverBar.prototype = {
	constructor:OverBar,
	getListValues:function(){
		var count=0;
		$.ajax({
				type: "POST",
				url: this.source,
				success: function(response, responseStatus) {
					return response;
				},
				error: function(response, responseStatus) {
					count++;
					if (count<3){
						setTimeout(this.getListValues(),500);
					}
					else {
						console.log("Error trying to retrieve overBar from "+this.url+ ": "+responseStatus);
					}
				}
		});
	},
	initEvents:function(){
		var that=this;
		this.goButton.on('click',function(){$("#"+that.listId).val();})
	},

	draw:function(){
		gGenerateListBox(this.listId,this.options,this.ident,this.list);
		this.searchBar = document.createElement('input');
		$(this.searchBar).css({
			"width":"100%",
			"height":"25px",
			"background-color":"rgba(26,26,26,1)",
			"color":"rgba(239,239,207,1)"
		});
		this.wrapper = document.createElement('div');
		$(this.wrapper).css({
			'width':'100%',
			'background':'transparent'
		});
		this.initEvents();
		$(this.pare).append(this.wrapper);
		//$(this.wrapper).append(this.
	}
}
function OverBar(items){
	if ((typeof items.options!=='undefined')||(typeof items.url!=='undefined')){
		if (typeof items.options!=='undefined'){
			if (Array.isArray(item.options)){
				this.options = item.options;
			}
		}
		else {
			if (typeof items.url!=='undefined'){
				this.url = items.url;
				this.options = this.getListValues();
			}
		}
		if (typeof items.id!=='undefined') {
			this.ident = item.ident;
			this.listId = item.ident+"List";
		}
		if (typeof items.position!=='undefined') {}
		if (typeof items.pare!=='undefined') {this.pare = items.pare;}
		if (typeof items.target!=='undefined') {this.target = items.target;}
		if (typeof items.autoSearch==true) {this.autoSearch = true;}
		this.goButton = document.createElement('button');
	}
	else {
			appendDebugLog("Overbar population failed.  Either an array of options or a url returning the information needs to be specified correctly.");
	}
}
