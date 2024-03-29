XeraSelect.prototype={
	constructor: XeraSelect,
	val: function(value){
		//mimics typical .val() behaviour
		var that=this;
		if (typeof value!=='undefined') {
			if (this.current!==value) {
				this.current=value;
				if (!this.initPhase) {
					this.drawSelected();
					this.change();}
				this.initPhase=false;
			}
		}
		else {return that.current;}
	},
	change: function(){
		//function feeding current value into onChange function generated by user
		this.onChange(this.current);

	},
	findDataIndex:function(value){
		for (var i = 0;i<this.data.length;i++){
			if (this.data[i].value === value) {return i;}
		}
		return this.data[0].value;
	},
	setSelectedOption: function(index){
		let self=this;
		$(this.dropDown).find('.'+this.styles.dropdownChild).each(function(i,div){
			if (Number($(div).attr('data-index')) === index) {
				$(div).addClass(self.styles.selected);
				self.selectedIndex = Number($(div).attr('data-index'));
			}
			else {$(div).removeClass(self.styles.selected);}

		});
	},
	animScroll: function(){
		var that=this;
		$(that.dropDown).stop();
		var x = $(that.dropDown).offset().top;
		var xDash = $(that.dropDown).scrollTop();
		var y = $('#'+that.dropDown.id+" ."+that.styles.dropdownChild+':eq('+that.selectedIndex+')').offset().top;
		var yDash = $('#'+that.dropDown.id+" ."+that.styles.dropdownChild+':eq('+that.selectedIndex+')').height();
		var z = $(that.dropDown).height();
		var calc = y-(yDash/2)-x+(xDash-x) + (z/2);
		$(that.dropDown).animate({scrollTop:calc},500,'linear');
	},
	setEvents: function(){
		var that=this;
		//apply arrow key / enter actions
		var y = '[id^='+that.id+'_]';
		$(this.dropDown).on("keydown", function(e) {
			if([13,27,37,38,39,40].indexOf(e.keyCode) > -1) {
				e.preventDefault();
				switch (e.which){
					case 13:
						that.dataIndex = that.selectedIndex;
						that.current = that.data[that.dataIndex].value;
						that.setSelectedOption(that.dataIndex);
						that.toggleSelection(false);
						$(that.currentValueDiv).empty();
						$(that.currentValueDiv).append(that.drawRow(that.data[that.dataIndex],-1,true));
						that.change();
						break;
					case 27:
						if (that.search){}
						else {that.toggleSelection(false);}
					case 38:
						//find earlier index value in dropdown
						var y = '.'+that.styles.dropdownChild;
						var z = [];
						$(that.dropDown).find('.'+that.styles.dropdownChild).each(function(i,div){
							z.push(Number($(div).attr('data-index')));
							if ((Number($(div).attr('data-index'))===that.selectedIndex) && (z.length>1)) {

								that.setSelectedOption(z[i-1]);
								that.animScroll();
							}
						});
						break;
					case 40:
						var y = '.'+that.styles.dropdownChild;
						var z = [];
						var x;
						$(that.dropDown).find('.'+that.styles.dropdownChild).each(function(i,div){
							z.push(Number($(div).attr('data-index')));
							if (Number($(div).attr('data-index'))===that.selectedIndex) {x=i;}
						});
						if (x!==(z.length-1)) {that.setSelectedOption(z[x+1]);that.animScroll();}
						break;
					default: break;
				}
			}
			//if (e.which === 39) {console.log('right movement detected');}
			//if (e.which === 37) {console.log('left movement detected');}

		});
		//if search apply toggle event to selector only, else whole select region.
		this.search ?
			$(selection).on('click',function(){that.toggleSelection();}) :
			$(this.content).on('click',function(){that.toggleSelection();});
		$(this.content).on('blur',function(){
			var x = !(document.activeElement.tagName === 'BODY');
			console.log("Focus Test:"+x+ " !Body");
			if (x) {that.toggleSelection(false);}
		});
		$(this.dropDown).on('blur',function(){$(that.dropDown).hide();});
	},
	toggleSelection: function(d=true){		//d indicating if content/dropdown interaction caused closure
		//console.log("Toggle Action:"+d);
		//console.log ("State:"+this.selectState);
		d ? this.selectState = !this.selectState : this.selectState = false;
		if (this.selectState) {
			$(this.dropDown).fadeTo(200,1);
			$(this.dropDown).focus();
			this.setSelectedOption(this.dataIndex);
		}
		else {
			$(this.dropDown).blur();
		}
	},
	drawDropdown: function(){
		var that=this;
		var dir;
		this.dropDown = document.createElement('div');
		this.dropDown.id = this.id+"_dropdown";
		switch (this.direction){
			case 'up' : $(this.dropDown).css({'bottom': $(this.contentWrap).height()});break;
			case 'down' : $(this.dropDown).css({'top':$(this.contentWrap).height()});break;
			case 'left' : $(this.dropDown).css({'right':'100%', 'top':'0'});break;
			case 'right' : $(this.dropDown).css({'left':'100%', 'top':'0'});break;
			default : dir = 'down';break;
		}
		$(this.dropDown).attr('tabindex',-1);
		$(this.dropDown).addClass(this.styles.dropdown+' noappearance pre-scrollable');
		$(this.dropDown).css({
			'width': '100%',
			'z-index' : this.zIndex,
			'position':'absolute',
			'max-height':this.maxHeight,
			'float':'left'
		});
		this.data.forEach(function(row,index){
			$(that.dropDown).append(that.drawRow(row,index,false));
		});
		$(this.contentWrap).append(this.dropDown);
		$(this.dropDown).hide();
	},
	addImage: function(img){
		var imageDiv = document.createElement('div');
		$(imageDiv).addClass(this.styles.image);
		$(imageDiv).css({'display':'table-cell','line-height':'20px','vertical-align':'middle','padding-left':'5px'});
		var curImage = new Image();
		$(curImage).addClass(this.styles.image);
		if (typeof img!=='undefined' && img!==null){
			curImage.src = img;
			$(imageDiv).append(curImage);
		}
		$(imageDiv).css({'width':$(curImage).css('width')});
		return imageDiv;
	},
	drawRow: function(data, index=-1, currentFlag=false){
		var that=this;
		var rowDiv = document.createElement('div');
		var rowContent = document.createElement('div');
		$(rowContent).css({'display':'table-cell','text-align':'left'});
		$(rowContent).html(data.name);
		if (currentFlag) {$(rowDiv).css({'border':'none'});}
		if (!currentFlag){ $(rowDiv).addClass(this.styles.dropdownChild);
		$(rowDiv).addClass("noselect noappearance");
		}
		$(rowDiv).attr('data-index',index);
		if (this.hasImages) { $(rowDiv).append(this.addImage(data.img));	}
		$(rowDiv).append(rowContent);
		if (!currentFlag){
			rowDiv.id = this.content.id+"_"+index; //change for columns
			$(rowDiv).on('mouseover',function(){
				that.setSelectedOption(Number($(rowDiv).attr('data-index')));
			});
			$(rowDiv).on('click',function(){
				that.toggleSelection(false);
					that.dataIndex = Number($(this).attr('data-index'));
					that.setSelectedOption(that.dataIndex);
				if ($(rowDiv).attr('data-index')!==that.dataIndex) {
					that.current = that.data[that.dataIndex].value;
					$(that.currentValueDiv).empty();
					$(that.currentValueDiv).append(that.drawRow(that.data[that.dataIndex],-1,true));
					that.change(that.current);
				}
			});

		}
		return rowDiv;
	},
	drawSelectionButton: function(){
		var selection = document.createElement('div');
		$(selection).css({'width':'20px','height':'20px!important','display':'table-cell','font-size':'0.5em','line-height':'20px','vertical-align':'middle'});
		$(selection).html(this.caret[this.direction]);
		return selection;
	},
	drawSelected: function(){
		$(this.content).empty();
		var that = this;
		this.currentValueDiv = document.createElement('div');
		$(this.currentValueDiv).css({
			'width':'calc('+$(this.contentWrap).css('width')+' - 20px)!important',
			'min-width':'calc('+$(this.contentWrap).css('width')+' - 20px)!important',
			'height':'20px',
			'max-height':'20px!important',
			'display':'table-cell',
			'border-radius':'10px 0 0 10px',
			'text-align':'left',
			'padding':'1px 7px',
			'text-overflow':'ellipsis'
		});
		typeof (this.current!=='undefined') ? $(this.currentValueDiv).append(this.drawRow(this.data[this.findDataIndex(this.current)], -1,true)) : $(this.currentValueDiv).html('');
		$(this.content).append(this.currentValueDiv,this.drawSelectionButton());
	},
	draw: function(){
		this.selectState = false;
		this.setSelectedOption(this.dataIndex);
		this.drawSelected();
		this.drawDropdown();
		this.setEvents();
	},
	output: function(){return this.contentWrap},
	init: function(){
		// sets up base select style div and begins drawing process

		this.caret = {'left':'<','right':'>','up':'▲','down':'▼'};
		this.contentWrap = document.createElement('div');
		this.content=document.createElement('div');
		$(this.content).addClass(this.styles.main);
		$(this.content).addClass('noselect noappearance');
		$(this.contentWrap).append(this.content);
		$(this.contentWrap).css({
			'position':'relative',
			'margin':'auto',
			'height': $(this.contentWrap).parent().css('height') || '24px',
			'width' : $(this.contentWrap).parent().css('width') || $(this.contentWrap).parent().width()
			});
		$(this.content).css({'width':'100%'});
		if (typeof this.id!=='undefined'){this.content.id = this.id;}
		$(this.content).attr('tabindex',-1);
		//console.log('Initial Value:'+this.current);
		this.dataIndex = this.findDataIndex(this.current);
		this.draw();
	}
}
function XeraSelect(d){
	this.initPhase=true;
	this.hasImages = d.hasImages || false;
	if (!isBool(this.hasImages)) {this.hasImages = false;}
	this.search = d.search || false;
	if (!isBool(this.search)) {this.search = false;}
	this.columns = d.columns || false;
	if (isNaN(d.columns)) {this.columns = 1;}
	this.zIndex = d.zIndex || 500;
	if (isNaN(d.zIndex)) {this.zIndex = 500;}
	this.id = d.id || undefined;
	//direction
	if (typeof d.direction!=='undefined'){
		var directions = ["up","down","left","right","auto"];
		if (directions.includes(d.direction)){this.direction = d.direction;}
	}
	else {this.direction = 'down';}

	let y = {
			'main' : 'xeraSelect',
			'selected' : 'xeraSelectDropdownSelected highlightRow',
			'child' : 'xeraSelectChild',
			'image' : 'xeraSelectImage',
			'dropdown' : 'xeraSelectDropdown silverRowed',
			'dropdownChild' : 'xeraSelectDropdownChild'
	};
	if (typeof d.styles!=='undefined'){
		Object.keys(d.styles).forEach(function(row,i){
			if (typeof y[row]!=='undefined') {y[row] = d.styles[row];}
		});
	}
	this.styles = y;
	//data
	typeof d.onChange!=='undefined' ? this.onChange = d.onChange : this.onChange = function(){};
	this.maxHeight = d.maxHeight || $(window).height()/3;
	if (typeof d.data!=='undefined'){
			this.data = d.data;
			d.val ? this.val(d.val):this.val(this.data[0].value);
			this.init();
	}
}
