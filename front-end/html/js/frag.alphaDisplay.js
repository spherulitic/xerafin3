//Displays a group of tiles in a specified parent with data supplied as a JSON object.
//Id prefixes can be specified as can the maximum size of a tile.
//Being able to drag the tiles around is optional, defaults false.
//Script will calculate the maximum tile size possible and adjust the size accordingly
//Last Update 08:52 03-Dec-18 RF

AlphaDisplay.prototype = {

	constructor : AlphaDisplay,
	shuffle: function(){
		this.alpha=this.alpha.split('').sort(function() {
	        return 0.5 - Math.random();
	    }).join('');
		this.build();
	},
	revert: function(x){
		this.alpha = x;
		this.build();
	},
	dragable: function(){
		let that = this;
		$(this.container).sortable({
			placeholder: 'quizPlaceholder', tolerance: 'touch'
		});
		$(this.container).disableSelection();
		if (this.drag){
			$( function() {
				$(that.container).sortable( "option", "disabled", false );
			});
		}
		else {
			$(this.container).sortable( "option", "disabled", true );
		}
	},
	equateSize: function(){
		if (typeof this.tileSize==='undefined'){
			if (this.display===0) {
				typeof this.space!=='undefined' ? this.tileSize =  this.calcSize() : this.tileSize = this.maxTileSize;
			}
			else {
				typeof this.space!=='undefined' ? this.fontSize = this.calcFontSize(this.maxTileSize) : this.fontSize=this.maxTileSize;
			}
		}
	},
	getTileConfig:function(){
		let self=this;
		if (typeof (this.container)!=='undefined'){
			if (this.display===0){
				$(this.container).sortable({
					placeholder: 'quizPlaceholder', tolerance: 'touch'
				});
				$(this.container).disableSelection();
				let y = $(this.container).sortable('toArray');
				let x= '';
				y.forEach(function(v,i){
					let b = parseInt(v.replace(self.tilePrefix+"_",""));
					x+=self.alpha[b];
				});
				return x;
			}
			else {
				return self.alpha;
			}
		}
	},
	redraw: function(data){
		//console.log("REDRAW DATA");
		//console.log(data);
		this.alpha=data.alpha;
		this.space = data.space;
		if (typeof data.display!=='undefined'){this.display = data.display;}
		this.tileSize=undefined;
		this.build();
	},
	build: function(){
		this.equateSize();
		$(this.container).empty();
		this.tiles = [];
		this.letters = this.alpha.split('');
		if (this.display===0) {
			for (var i=0;i<this.letters.length;i++){
				this.tiles[i]=new Tile ({'letter': this.letters[i], 'size':this.tileSize,'id':this.tilePrefix+'_'+i,'showValue': this.tileValues});
				$(this.container).append(this.tiles[i].output());
			}
			this.dragable();
		}
		else {
			this.textWord = document.createElement('div');
			$(this.textWord).css({'font-size':this.fontSize+'px','line-height':this.fontSize+'px'});
			$(this.textWord).html(this.alpha);
			$(this.container).append(this.textWord);
		}
	},
	initUI: function(){
		this.container = document.createElement('div');
		$(this.container).addClass('quizAlpha');
		$(this.container).css({'vertical-align':'middle','margin':'auto'});
	},
	calcSize: function(){
		var x = Math.floor((this.space/this.alpha.length))-2;
		if (x > this.maxTileSize) {this.space = (this.maxTileSize + 1)*this.alpha.length; return this.maxTileSize;} else {return x;}
	},
	calcFontSize: function(value){
		var testDiv = document.createElement('div');
		$(testDiv).css({'font-size':value+'px','position':'absolute','left':'-5000px'});
		$(testDiv).html(this.alpha);
		$('body').append(testDiv);
		if ($(testDiv).width()>this.space) {$(testDiv).remove();return this.calcFontSize(value-1);}  else {$(testDiv).remove();return value;}
	},
	newAlpha: function(alpha,space,displayType){
		this.tileSize = undefined;
		this.alpha = alpha;
		this.space = space;
		this.display = displayType;
		this.originalAlpha = alpha;
		this.build();
	},
	setDisplay: function(n){
		this.display = n;
	},
	setTileValues:function(n){
		this.tileValues = n;
	},
	setDrag: function(n){
		this.drag = n;
		this.dragable();
	},
	output: function(){
		return this.container;
	}
};

function AlphaDisplay(data){
	this.maxTileSize = data.maxTileSize || 40;
	if (typeof data.space!=='undefined') {this.space = data.space;}
	if (typeof data.tileSize!=='undefined') {this.tileSize = data.tileSize;}
	this.display = data.display || 0;
	this.tilePrefix = data.tilePrefix || 'tile';
	this.drag = data.drag || false;
	this.initUI();
}
