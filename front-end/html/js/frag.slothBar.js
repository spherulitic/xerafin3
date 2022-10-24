SlothBar.prototype = {
	constructor: SlothBar,
	init: function(){
		this.value = 0;
		this.progress = 0;
		this.draw();
	},
	drawBar: function(){
		let x = document.createElement('div');
		$(x).addClass('progress silverRowed');
		this.bar = document.createElement('div');
		$(this.bar).addClass('progress-bar progress-bar-custom highlightRow');
		$(this.bar).attr({'role':'progressbar','aria-valuenow':'0%'});
		this.span = document.createElement('span');
		$(this.span).addClass('progress-value');
		$(this.span).html("0%");
		$(x).append(this.bar,this.span);
		return x;
	},
	reset: function(max){
		this.maxValue = max;
		this.update(0);
	},
	getProgress: function(){
		return this.progress;
	},
	update: function(value){
		this.progress = (value / this.maxValue) * 100;
		$(this.bar).css({'width':this.progress+'%'});
		$(this.span).html(Math.floor(this.progress)+'%');
		$(this.bar).attr({'aria-valuenow':this.progress+'%'});
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).addClass('progressWrap');
		$(this.content).append(this.drawBar());

	},
	output: function(){
		return this.content;
	}
}
function SlothBar(data={}){
	this.maxValue = data.maxValue;
	this.init();
}
