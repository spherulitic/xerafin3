SlothInputs.prototype = {
	constructor: SlothInputs,
	init:function(){
		this.draw();
		this.setEvents();
	},
	draw: function(){
		this.content=document.createElement('div');
		$(this.content).addClass('slothAnswerRegion');
		this.input = document.createElement('input');
		$(this.input).addClass('quizAnswerBox');
		$(this.input).css({'width':'50%','background-color':'rgba(230,230,210,0.9)!important','box-shadow':'0 0 0px','margin-top':'5px','border-radius':'0'});
		this.end = document.createElement('button');
		$(this.end).html('End Game');
		let self=this;
		$(this.end).on('click',function(){
			self.action("INPUT_END");
		});
		$(this.end).prop('title','Ends game, reveals answers and adjusts cardbox');
		$(this.end).addClass('slothStartButton silverRowed');
		$(this.end).css({'width':'20%', 'border-radius':'0 0.6em 0.6em 0'});
		this.abort = document.createElement('button');
		$(this.abort).addClass('slothStartButton silverRowed');
		$(this.abort).css({'width':'20%', 'border-radius':'0.6em 0 0 0.6em'});
		$(this.abort).html('Abort');
		$(this.abort).on('click',function(){
			self.action("INPUT_ABORT");
		});
		$(this.abort).prop('title','Ends game without revealing answers or adjusting cardbox.  Aborting does not count towards questions answered.');
		$(this.content).append(this.abort,this.input,this.end);
	},
	disableTextInput: function(boo){
		$(this.input).prop('disabled',boo);
	},
	focusInput:function(){
		$(this.input).focus();
	},
	blurInput:function(){
		$(this.input).blur();
	},
	clearFlashes:function(){
		$(this.input).removeClass(this.styles.typoInput);
		$(this.input).removeClass(this.styles.correctInput);
		$(this.input).removeClass(this.styles.wrongInput);
		$(this.input).removeClass(this.styles.duplicateInput);
	},
	clearInput:function(){
		$(this.input).val("");
	},
	toggleVis: function(boo){
		boo ? $(this.content).show() : $(this.content).hide();
	},
	duplicateAnswer: function(){
		$(this.input).addClass(this.styles.duplicateInput,400);
		setTimeout(SlothInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	wrongAnswer: function(){
		$(this.input).addClass(this.styles.wrongInput,400);
		setTimeout(SlothInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	correctAnswer: function(){
		$(this.input).addClass(this.styles.correctInput,400);
		setTimeout(SlothInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	typoAnswer: function(){
		$(this.input).addClass(this.styles.typoInput,400);
		setTimeout(SlothInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	setEvents: function(){
		let self=this;
		$(this.input).on('keypress',function(e){
			if (e.which === 13) {
				e.preventDefault();
				self.validateInput();
			}
		});
		if (!isMobile()){
			$(this.input).on('keypress',function(e){
				if (e.which==32){
					e.preventDefault();
					self.validateInput();
				}
			});
		}
	},
	validateInput: function(){
		let x = $(this.input).val().toUpperCase();
		this.action('INPUT_CHECK_ANSWER', x.trim());
	},
	output: function(){
		return this.content;
	},
}

function SlothInputs(){
	this.styles = {
		'defaultInput' : '',
		'correctInput' : '',
		'wrongInput' : 'flashWrong',
		'duplicateInput' : 'flashDuplicate',
		'typoInput' : 'flashTypo'
	}
	this.init();
}
