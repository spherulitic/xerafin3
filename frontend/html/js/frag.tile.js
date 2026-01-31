//Creates a single tile with parameters supplied by a JSON input to the constructor, as long as a parent is specified.
//Font family, size, text colour and tile colour are customizable attributes in the JSON data, leaving those blank will cause
//the object to to be built on default values.
//Last Updated: 08:39 03-Dec-18 RF

Tile.prototype = {
	constructor:Tile,
	build:function(){
		this.tile = document.createElement('div');
		if (this.id){this.tile.id = this.id;}
		$(this.tile).css({
			'width': this.size+'px',
			'height': this.size+'px',
			'background-color': 'rgba('+this.RGB+',1)',
			'font-family': this.font,
			'color': 'rgba('+this.textRGB+',1)',
			'text-align' : 'center',
			'border-radius' : '0.15em',
			'font-size' : Math.floor(this.size*0.65)+'px',
			'line-height' : this.size+'px',
			'cursor':'grab',
			'cursor':'-webkit-grab',
			'margin':'0 auto',
			'margin-right':'1px',
			'margin-left':'1px',
			'display':'inline-block',
			'box-shadow':'0px 0px 12px #333',
			'position':'relative',
		});
		$(this.tile).addClass('noselect');
		this.tileLetter= document.createElement('div');
		$(this.tileLetter).css({'width':'inherit','height':'inherit','vertical-align' : 'middle','text-align':'center'});
		$(this.tileLetter).html(this.letter);
		if (Number(this.showValue)===1){
			this.valueDiv = document.createElement('div');
			var x = Math.floor(this.size*0.225);
			$(this.valueDiv).css({
				'position':'absolute',
				'bottom':0,
				'right':0,
				'margin-right':(x*0.15)+'px','margin-bottom':(x*0.15)+'px',
				'text-align':'right',
				'font-size': x+'px',
				'height':x+2+'px',
				'line-height':x+'px'
			})
			$(this.valueDiv).html(this.tileValues.csw[this.letter] || ' ')
			$(this.tile).append(this.tileLetter,this.valueDiv);
		}
		else {$(this.tile).append(this.tileLetter);}
	//	$(this.tile).addClass('noselect');

	},
	output: function(){
		return this.tile;
	}
};

function Tile(data){
	this.tileValues = {
		'csw':{
			'A':1,'B':3,'C':3,'D':2,'E':1,'F':4,'G':2,'H':4,'I':1,'J':8,'K':5,'L':1,
			'M':3,'N':1,'O':1,'P':3,'Q':10,'R':1,'S':1,'T':1,'U':1,'V':4,'W':4,'X':8,'Y':4,'Z':10,'?':' '
		}
	};
	if (typeof data.id!=='undefined') {this.id=data.id;}
	typeof data.showValue!=='undefined' ? this.showValue = data.showValue : this.showValue=1;
	this.RGB = data.RGB || "26,26,26";
	this.font = data.font || "Lato, sans serif";
	this.size = data.size || 50;
	this.textRGB = data.textRGB || '215,215,200';
	this.letter = data.letter || " ";
	this.build();
}
