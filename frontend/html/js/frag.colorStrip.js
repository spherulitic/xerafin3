ColorStrip.prototype = {
	constructor:ColorStrip,
	genColor:function(i){
		let x = document.createElement('div');
		$(x).addClass('noselect');
		$(x).css({
			'background-color':this.colors[i],
			'height':this.height+'px',
			'width':(99.9/this.colors.length)+"%",
			'display':'inline-block',
			'border':'1px solid black',
			'box-sizing':'border-box',
			'padding':'0px',
			'font-size':'0.5em',
			'text-align':'center'
		});
		this.isNumbered ? $(x).html(i+1) : $(x).html('');
		return x;
	},
	draw:function(){
		this.strip = document.createElement('div');
		$(this.strip).css({
			'width':this.width,
			'margin':'auto',
			'display':'inline-block',
		});
		let self=this;
		this.colors.forEach(function(v,i){
			$(self.strip).append(self.genColor(i));
		});

	},
	output:function(){
		return this.strip;
	}
}
function ColorStrip(data={}){
	typeof data.colors!=='undefined' ? this.colors = data.colors : this.colors = ["azure", "plum", "palegreen", "yellowgreen", "khaki", "salmon", "hotpink", "crimson", "magenta", "chocolate", "peachpuff", "mistyrose", "floralwhite" ] // maximum number of anagrams is 13
	typeof data.height!=='undefined' ? this.height = data.height : this.height = 10;
	typeof data.width!=='undefined' ? this.width = data.width : this.width = '100%';
	typeof data.isNumbered!=='undefined' ? this.isNumbered = data.isNumbered : this.isNumbered = true;
	this.draw();
}
