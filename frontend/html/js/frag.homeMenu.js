HomeMenuItem.prototype = {
	constructor: HomeMenuItem,
	init:function(){
		this.draw();
	},
	update: function(d){
		this.valueSource = d;
		if (this.valueSource > 0){
			$(this.value).html(" ["+this.valueSource+"]");
			$(this.value).show();
		}
		else {
			$(this.value).hide();
		}
	},
	draw: function (){
		this.content=document.createElement('div');
		$(this.content).addClass('menuOption noselect nodrag');
		$(this.content).html(this.title);
		if (this.hasValue) {
			this.value = document.createElement('span');
			$(this.content).append(this.value);
			this.update(this.valueSource);
		}
	},
	output: function (){
		return this.content;
	}
}
function HomeMenuItem(data={}){
	this.hasValue = data.hasValue || false;
	this.valueSource = data.valueSource || 0;
	this.after = data.after;
	this.preload = data.preload;
	this.title = data.title || 'Test'
	this.init();
}

HomeMenu.prototype = {
	constructor: HomeMenu,
	init:function(){
		this.draw();
	},
	setSelection: function(n){
		let self=this;
		Object.entries(this.rows).forEach(function([i,v]){
			if ($(self.rows[i].content).hasClass('highlightRow')) {
				$(self.rows[i].content).removeClass('highlightRow menuSelected');
			}
		});
		$(self.rows[n].content).addClass('highlightRow menuSelected');

	},
	setClickEvent: function(i){
		let self=this;
		$(this.rows[i].content).click(function(e){
			self.setSelection(i);
			e.stopPropagation();
			self.rows[i].after();
		});
	},
	populate: function(d,startVal){
		let self=this;
		this.source = d;
		this.startVal = startVal;
		this.rows = new Object();
		$(this.options).html('');
		Object.entries(this.source).forEach(function([i,v]){
			self.rows[i] = new HomeMenuItem(self.source[i]);
			self.setClickEvent(i);
			$(self.options).append(self.rows[i].output());
		});
		this.setSelection(this.startVal);
		this.rows[this.startVal].after();
	},
	draw: function (){
		this.content=document.createElement('div');
		this.header = document.createElement('div');
		$(this.header).addClass('loginHead');
		this.options = document.createElement('div');
		this.footer = document.createElement('div');
		//$(this.footer).addClass('loginHead'); Haven't decided on how I would want a footer formatted yet
		this.populate(this.source,this.startVal);
		$(this.content).append(this.header,this.options,this.footer);
	},
	output: function (){
		return this.content;
	}
}
function HomeMenu(data={}){
	this.source = data.source;
	this.startVal = data.startVal;
	this.heading = data.heading || '';
	this.footing = data.footing || '';
	this.init();
}
