QRack.prototype = {
	constructor: QRack,
	shuffleAlpha: function(){
		this.rack.shuffle();
	},
	revertAlpha: function(){
		this.rack.revert(this.originalAlpha);
	},
	resizeFunction: function(){
		let self=this;
		if (typeof (self.rack)!=='undefined'){
			if (typeof (self.rack.container)!=='undefined'){
				let x= (self.cycling? self.current: self.rack.getTileConfig());
				self.calcWidths(function(){
					self.tileValues = Number(localStorage.gTileDisplay);
					self.rack.setTileValues(self.tileValues);
					self.rack.redraw({'space':self.rackSize,'display':self.display,'alpha':x});
					$(self.container).append(self.leftHook,self.rack.output(),self.rightHook);
				});
			}
		}
	},
	initUI: function(){
		this.container = document.createElement('div');
		$(this.container).addClass('quizAlphaSuper noselect');
		$(this.container).css({'width':'95%'});
		this.container.id = 'QRackContainer';
		this.leftHook = document.createElement('div');
		$(this.leftHook).addClass('quizAlphaLeft');
		this.rightHook = document.createElement('div');
		$(this.rightHook).addClass('quizAlphaRight');
		this.rack = new AlphaDisplay({'display':this.display,'tilePrefix':'qTile','tileValues':this.tileValues});
	},
	getHookWidth: function(hook,fontSize){
		let testDiv = document.createElement('div');
		$(testDiv).css({'position':'absolute','left':'-5000px','font-size':fontSize+'px'});
		$(testDiv).addClass('quizAlphaLeft');
		$(testDiv).html(hook);
		$('body').append(testDiv);
		let x = $(testDiv).width();$(testDiv).remove();return x;
	},
	findMaxHook: function(fontSize){
		let max = [0,0];
		let maxInd= [0,0];
		let that=this;
		if (typeof this.keySort!=='undefined'){
		this.keySort.forEach(function(a,b){
			if (that.solutions[a][0].length!==0){
				let l= that.getHookWidth(that.solutions[a][0], fontSize);
				if (l>max[0]) {
					max[0] = l;
					maxInd[0] = b;
				}
			}
			if (that.solutions[a][1].length!==0){
				let r = that.getHookWidth(that.solutions[a][1], fontSize);
				if (r>max[1]) {
					max[1] = r;
					maxInd[1] = b;
				}
			}
		});
		let x = (max[1]>=max[0])? 1:0;
		return {'side':x,'position':maxInd[x],'value':max[x]};
	}
		return {'side':0,'position':0,'value':""};
	},
	findRecursive: function(current, step){
		v = this.getHookWidth(this.solutions[this.keySort[this.hookMax.position]][this.hookMax.side],current);
		if ((this.availableWidth-this.rackSize - (v*2)) > 0){
			if (step<1) {return Math.floor(current);}
			else {return this.findRecursive(current+step/2,step/2)}
		}
		else {
			if (((this.availableWidth - this.rackSize - (v*2)) > 0)  && (step < 1)) {return Math.floor(current-step);}
			else {return this.findRecursive(current-step,step/2);}
		}
	},
	displayAnswer: function(n){
		this.current = this.keySort[n];
		this.rack.setTileValues(Number(localStorage.gTileDisplay));
		this.rack.newAlpha(this.current,this.rackSize,this.display);
		$(this.leftHook).html(this.solutions[this.keySort[n]][0]);
		$(this.rightHook).html(this.solutions[this.keySort[n]][1]);

	},
	cycleAnswers: function(){
		let that=this;
		this.displayAnswer(this.cycle % (this.keySort.length));
		if (Object.keys(this.solutions).length>1){
			this.cycling=true;
			this.answerCycle = setTimeout(QRack.prototype.cycleAnswers.bind(this),this.cycleSpeed);
			this.cycle++;
		}
	},
	cycleFlag: function(correct){
		$(this.container).removeClass(this.styles.unanswered);
		if (correct) {$(this.container).addClass(this.styles.correct);$(this.container).removeClass(this.styles.wrong);}
		else {$(this.container).addClass(this.styles.wrong);$(this.container).removeClass(this.styles.correct);}
		this.rack.setDrag(false);
		let that=this;
		if (!this.cycling){
			this.cycleAnswers();
		}
	},
	splitHook: function(st){
		if (st.length <= this.maxHookLetters) {return st;}
		else {
			var d = Math.ceil(st.length/(Math.ceil(st.length/this.maxHookLetters)));
			var c = st;
			for (var i=1; i<Math.ceil(st.length/d); i++){
				c = c.substr(0,(i*d)+(4*(i-1)))+'<br>'+c.substr((i*d)+(4*(i-1)));
			}
			return c;
		}
	},
	splitHooks: function(){
		let that=this;
		this.keySort.forEach(function(a,b){
			that.solutions[a][0] = that.splitHook(that.solutions[a][0]);
			that.solutions[a][1] = that.splitHook(that.solutions[a][1]);
		});
	},
	calcWidths: function(after=function(){}){
		if (typeof this.readyTest!=='undefined') {clearTimeout(this.readyTest);}
			this.hookMax = this.findMaxHook(this.maxHookSize);
			this.hookMin = this.findMaxHook(this.minHookSize);
		if (this.initialized && $(this.container).width()>100){
			$(this.container).empty();
			this.calcWidthsTwo();
			after();
		}
		else {
			this.readyTest = setTimeout(QRack.prototype.calcWidths.bind(this,after),100);
		}
	},
	calcWidthsTwo: function(){
			this.availableWidth = $('#'+this.container.id).width() - 20;
				if (this.display===0) {this.rackSize = this.alpha.length*(this.maxTileSize+1);}
				else {this.rackSize = this.getHookWidth(this.alpha,40);}
				if (this.rackSize>this.availableWidth){
					this.hookWidth = this.hookMin.value;
					this.hookSize = this.minHookSize;
					this.rackSize= this.availableWidth - (2*this.hookMin.value);
				}
				else {
					if (this.rackSize+(2*this.hookMax.value)<=this.availableWidth){
						this.hookWidth = (this.availableWidth - this.rackSize)/2;
						this.hookSize = this.maxHookSize;
					}
					else {
						if (this.rackSize+(2*this.hookMin.value) < this.availableWidth){ //if the rack will fit somehow (the lowest value will fit
							this.hookSize = this.findRecursive((this.maxHookSize+this.minHookSize)/2,(this.maxHookSize-this.minHookSize)/2);
							this.hookWidth = (this.availableWidth - this.rackSize)/2;
							this.rackSize= this.availableWidth - (2*this.hookSize);
						}
						else {
							this.hookSize = this.minHookSize;
							this.hookWidth = this.hookMin.value;
							this.rackSize= this.availableWidth - (2*this.hookMin.value);
						}
					}

				}
			$(this.leftHook).css({'width':this.hookWidth+'px','min-width':this.hookWidth+'px','font-size':this.hookSize+'px','line-height':this.hookSize*0.7+'px','vertical-align':'middle'});
			$(this.rightHook).css({'width':this.hookWidth+'px','min-width':this.hookWidth+'px','font-size':this.hookSize+'px','line-height':this.hookSize*0.7+'px','vertical-align':'middle'});
	},
	newWord: function(data){
		let self = this;
		var tempob = {};
		this.display = Number(localStorage.gAlphaDisplay) || 0;
		$(this.container).removeClass(this.styles.correct);$(this.container).removeClass(this.styles.wrong);
		$(this.container).addClass(this.styles.unanswered)
		this.solutions={};
		$(this.leftHook).html("");
		$(this.rightHook).html("");
		if (this.answerCycle!=='undefined'){clearTimeout(this.answerCycle);}
		this.cycle=0;
		this.cycling=false;
		this.alpha = data.alpha;
		this.current=this.alpha;
		this.originalAlpha = data.alpha;
		this.keySort = Object.keys(data.solutions).sort();
		this.keySort.forEach(function(a){
			tempob[a]= data.solutions[a];
		});
		this.solutions = JSON.parse(JSON.stringify(tempob));
		this.splitHooks();
		//console.log('Process start:'+(new Date()).getTime());
		this.calcWidths(function(){
			self.rack.setTileValues(self.tileValues);
			self.rack.newAlpha(self.alpha,self.rackSize,self.display);
			self.rack.setDrag(true);
			$(self.container).append(self.leftHook,self.rack.output(),self.rightHook);
		});
		//console.log('Process End:'+(new Date()).getTime());
	},
	show: function(){
		$('#'+this.pare).append(this.container);
		this.initialized=true;
	},
	output: function(){
		return this.container;
	}
}
function QRack(data){
	//console.log("New Rack Created");
	//console.log(data);
	this.pare = data.pare;
	this.solutions = {};
	this.display = Number(localStorage.gAlphaDisplay);
	this.tileValues = Number(localStorage.gTileDisplay);
	this.initialized = false;
	this.maxTileSize = 40;
	this.maxHookSize = 24;
	this.minHookSize = 16;
	this.maxHookLetters = 6;
	this.cycle=0;
	this.cycleSpeed=2500;
	this.initUI();
	this.styles = {
			'correct':'highlightRowInv correct',
			'wrong':'redRowed incorrect',
			'unanswered':'blueRowed unanswered'
	};
}
