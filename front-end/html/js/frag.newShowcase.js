NewShowcase.prototype = {
	constructor: NewShowcase,
	add: function(d){
		let x = d;
		x.layout = d.layout || {};
		if (typeof d.layout.position==='undefined'){x.layout.position='center';}
		if (typeof d.layout.size==='undefined'){x.layout.size='100%';}
		x.img = new Image();
		x.img.src= d.image;
		this.items.push(x);

	},
	draw: function(){

		$(this.content).css({
			'background-image':"url('"+this.items[this.current].img.src+"')",
			'background-position':this.items[this.current].layout.position,
			'background-repeat':'no-repeat',
			'background-size':this.items[this.current].layout.size,
		});
		$(this.title).html(this.items[this.current].title);
		$(this.blurb).html(this.items[this.current].blurb);
	},
	getNext: function(){
		this.width = $(this.pare).width();
		this.height = ($(this.pare).width() * 3/4);
		let self=this;
		$(this.content).fadeTo(this.fadeout,0,function(){
			self.draw();
			$(self.content).fadeTo(self.fadein,1);
		});
		this.current++;
		this.current = this.current % this.items.length;
		this.fadeTimer=setTimeout(NewShowcase.prototype.getNext.bind(this),this.viewtime);
	},
	init : function(){
		let self=this;
		this.content=document.createElement('div');
		this.title = document.createElement('div');
		this.blurb = document.createElement('div');
		$(this.title).addClass('showcaseTitle noselect');
		$(this.blurb).addClass('showcaseBlurb noselect');
		$(this.content).css("border","1px solid black");
		$(this.content).css("height",this.height);
		this.current = 0;
		if (Object.keys(this.data).length>0){
			Object.entries(this.data).forEach(function([i,v]){
				self.add(v);
			});
		}
		$(this.content).css('opacity','1');
		this.fadeTimer=setTimeout(NewShowcase.prototype.getNext.bind(this),this.viewtime);
		$(this.content).append(this.title,this.blurb);
		this.draw();
	},
	setDimensions(){
		this.width = $(this.pare).width();
		this.height = ($(this.pare).width() * 3/4);
		$(this.content).css({
			'height': this.height,
			'width': this.width
		});
	},
	output : function() {
		let self=this;
		this.setDimensions();
		$(this.pare).append(this.content);
		$(window).resize(function(){
			self.setDimensions();
		});
	}
}

function NewShowcase(data={}){
	this.width = $(this.pare).width();
	this.height = ($(this.pare).width() * 3/4);
	this.data = data.data || {};
	this.items = [];
	this.pare = data.pare;
	this.viewtime = data.viewtime || 20000;
	this.fadein = data.fadein || 1000;
	this.fadeout = data.fadeout || 1000;
}
//------------------------------------------------------------------------------------------------------------------------>
