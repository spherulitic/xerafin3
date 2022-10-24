SlothHome.prototype = {
	constructor: SlothHome,
	init: function(){
		this.leaderboard = new SlothLeaderboard();
		this.stats = new SlothStats();
		this.draw();
	},
	toAlpha: function(s){
		return s.split('').sort().join('');
	},
	adjust: function(d){
		let x = new Date(d);
		this.updateSpans(Math.floor(x/(60*60*1000*24)), x.getHours()-1, x.getMinutes(), x.getSeconds(), x.getMilliseconds());
		this.result = x;
	},
	setQuestion: function(q){
		$(this.alphaInput).val(q);
	},
	setAlphaInfo: function(msg){
		$(this.alphaInfo).html(msg);
	},

	drawAlphaButtons: function(){
		let x = document.createElement('div');
		let z = "slothAlphaButton silverRowed";
		$(x).addClass('slothAlphaButtonWrap');
		this.randomButton = document.createElement('button');
		$(this.randomButton).addClass(z);
		$(this.randomButton).html("Random Bingo");
		let self=this;
		$(this.randomButton).on('click',function(){
			self.lockInputs(true);
			self.action("HOME_GET_RANDOM");
		});
		this.firstButton = document.createElement('button');
		$(this.firstButton).addClass(z);
		$(this.firstButton).html("First 📦 Bingo");
		$(this.firstButton).on('click',function(){
			self.lockInputs(true);
			self.action("HOME_GET_FIRST");
		});
		this.bonusButton = document.createElement('button');
		$(this.bonusButton).addClass(z);
		$(this.bonusButton).html("Next 📦 Bingo");
		$(this.bonusButton).on('click',function(){
			self.lockInputs(true);
			self.action("HOME_GET_NEXT");
		});
		$(x).append(this.firstButton,this.bonusButton,this.randomButton,);
		return x;
	},
	lockStart: function(boo){
		$(this.initButton).prop('disabled',boo);
	},
	lockInputs: function(boo){
		$(this.alphaInput).prop('disabled',boo);
		$(this.firstButton).prop('disabled',boo);
		$(this.bonusButton).prop('disabled',boo);
		$(this.randomButton).prop('disabled',boo);
		$(this.initButton).prop('disabled',boo);
	},
	drawAlphaInputRegion: function(){
		let x = document.createElement('div');
		$(x).css({
			'width':'58%',
			'display':'inline-block',
			'vertical-align':'top'
		})
		this.alphaInput = document.createElement('input');
		$(this.alphaInput).css({
			'background-color':'rgba(0,0,0,0.8)',
			'border-radius':'10px',
			'border':'1px solid black',
			'color':'rgb(230,230,210)',
			'appearance':'none',
			'webkit-appearance':'none',
			'font-family':'Montserrat,sans-serif',
			'font-size':'1.5em',
			'margin-top':'0px','margin-bottom':'5px',
			'height':'50px',
			'width':'98%',
			'text-align':'center',
			'text-transform':'uppercase',
			'display':'inline-block',
			'outline':'none'
		});
		$(this.alphaInput).addClass('nodrag noselect');
		$(this.alphaInput).prop({'maxlength':15});
		$(this.alphaInput).prop({'title':'Enter any alphagram from 4-15 letters long here!'});
		let self=this;
		$(this.alphaInput).on('keypress',function(e){
			if (e.which =='32'  ||  e.which=='13') {
				e.preventDefault()
				let y = self.toAlpha($(self.alphaInput).val().toUpperCase())
				$(self.alphaInput).val(y);
				self.action("HOME_GET_CUSTOM",y);
				$(this.alphaInput).focus();
			}
		});
		//$(this.alphaInput).on('blur',function(e){
		//	console.log("BLURRED");
		//	console.log(e);
		//	self.action("HOME_GET_CUSTOM",$(self.alphaInput).val());
		//});

		this.alphaInfo = document.createElement('div');
		$(this.alphaInfo).css({
			'background-color':'rgba(140,176,48,0.7)',
			'border-radius':'0.2em',
			'border':'1px solid black',
			'color':'black',
			'font-family':'Montserrat,sans-serif',
			'font-size':'1em',
			'height':'25px',
			'font-weight':'bold',
			'line-height':'25px',
			'text-align':'center',
			'vertical-align':'middle',
			'width':'98%',
			'margin':'auto',
			'display':'inline-block'
		});
		$(this.alphaInfo).addClass('nodrag noselect');
		$(this.alphaInfo).html('...');
		$(x).append(this.alphaInput,this.alphaInfo);
		return x;
	},
	drawAlphaRegion: function(){
		this.alphaRegion = document.createElement('div');
		$(this.alphaRegion).css({
			'width':'95%',
			'margin':'auto',
			'background-color':'rgba(26,26,26,0.3)',
			'text-align':'left',
			'padding-bottom':'5px',
			'border-bottom':'1px solid black'
		});

		$(this.alphaRegion).append(this.drawAlphaInputRegion(),this.drawAlphaButtons());
		return this.alphaRegion;
	},
	drawInitRegion: function(){
		this.initRegion = document.createElement('div');
		$(this.initRegion).css({
			'margin-top':'5px',
			'margin-bottom':'5px',
			'text-align':'center'
		});
		this.initButton = document.createElement('button');
		$(this.initButton).addClass('slothStartButton');
		$(this.initButton).addClass('silverRowed');
		$(this.initButton).html("Start");
		let self=this;
		$(this.initButton).on('click',function(){
			self.action('HOME_START');
		});
		$(this.initRegion).append(this.initButton);
		return this.initRegion;
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).css({});
		$(this.content).append(
			this.drawAlphaRegion(),
			this.leaderboard.output(),
			this.drawInitRegion(),
			this.stats.output()
		);
	},
	output: function (){
		return this.content;
	},
}
function SlothHome(data={}){
	this.init();
}
