QInputs.prototype = {
	constructor: QInputs,
	initUI : function(){
		this.correctButton = document.createElement('button');
		this.nextButton = document.createElement('button');
		this.wrongButton = document.createElement('button');
		this.answerNumber = document.createElement('div');
		$(this.answerNumber).addClass('quizAnswerNumber noselect');
		this.answerSpan = document.createElement('span');
		this.totalSpan = document.createElement('span');
		$(this.answerNumber).append('Answers: ',this.answerSpan,"/",this.totalSpan);
		this.answerContainer = document.createElement('div');
		$(this.answerContainer).addClass('quizAnswerContain');
		this.answerInput = document.createElement('input');
		$(this.answerInput).addClass('quizAnswerBox');
		this.container = document.createElement('div');
		$(this.container).addClass('quizAnswerRegion noselect');
		$(this.correctButton).addClass(this.styles.correctButton);
		$(this.correctButton).html('<span class="glyphicon glyphicon-ok"></span>');
		$(this.nextButton).addClass(this.styles.nextButton);
		$(this.nextButton).html('<span class="glyphicon glyphicon-arrow-right"></span>');
		$(this.wrongButton).addClass(this.styles.wrongButton);
		$(this.wrongButton).html('<span class="glyphicon glyphicon-remove"></span>');
		$(this.answerInput).addClass(this.styles.defaultInput);
		$(this.answerContainer).append(this.answerNumber,this.answerInput);
		$(this.container).append(this.correctButton,this.nextButton,this.wrongButton,this.answerContainer);
	},
	disableButtonInput: function(boo){
		$(this.correctButton).prop('disabled', boo);
		$(this.wrongButton).prop('disabled', boo);
		$(this.nextButton).prop('disabled', boo);
		if (boo === false){this.toggleDisable=false;}
	},
	disableTextInput: function(boo){
		$(this.answerInput).prop('disabled',boo);
	},

	clearToggle: function(){
		$(this.wrongButton).prop('disabled', false);
		$(this.correctButton).prop('disabled', false);
		this.toggleDisable=false;
	},
	setToggleDisable: function(b){
		if (b){
			//if correct, disable the wrong button.  When request is done processing, it will be released by the parent app.
			$(this.wrongButton).prop('disabled', true);
		}
		else {
			//if wrong, disable the correct button. When request is done processing, it will be released by the parent app.
			$(this.correctButton).prop('disabled', true);
		}
		this.toggleDisable = true;
	},
	setState : function(n){
		switch(n) {
			case 0 : //In progress
				$(this.correctButton).show();
				$(this.wrongButton).show();
				$(this.nextButton).hide();
			break;
			case 1 : //completed, correct
				$(this.wrongButton).show();
				$(this.nextButton).show();
				$(this.nextButton).css('float', 'left');
				$(this.correctButton).hide();
				this.setToggleDisable(true);
				$(this.answerInput).val("");
			break;
			case 2 : //completed, incorrect
				$(this.wrongButton).hide();
				$(this.nextButton).show();
				$(this.nextButton).css('float', 'right');
				$(this.correctButton).show();
				this.setToggleDisable(false);
			break;
			case 3 : //no solution.. broken
				$(this.correctButton).hide();
				$(this.nextButton).show();
				$(this.nextButton).css('float','left');
				$(this.wrongButton).prop('disabled',true);
			break;
		}
		this.state = n;
	},
	focusInput:function(){
		$(this.answerInput).focus();
	},
	clearFlashes:function(){
		$(this.answerInput).removeClass(this.styles.typoInput);
		$(this.answerInput).removeClass(this.styles.correctInput);
		$(this.answerInput).removeClass(this.styles.wrongInput);
		$(this.answerInput).removeClass(this.styles.duplicateInput);

	},
	clearInput:function(){
		$(this.answerInput).val("");
	},
	duplicateAnswer: function(){
		$(this.answerInput).addClass(this.styles.duplicateInput,400);
		setTimeout(QInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	wrongAnswer: function(){
		$(this.answerInput).addClass(this.styles.wrongInput,400);
		setTimeout(QInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	correctAnswer: function(){
		$(this.answerInput).addClass(this.styles.correctInput,400);
		setTimeout(QInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	typoAnswer: function(){
		$(this.answerInput).addClass(this.styles.typoInput,400);
		setTimeout(QInputs.prototype.clearFlashes.bind(this),600);
		this.clearInput();
	},
	validateInput: function(){
		this.action('INP_CHK_ANS',$(this.answerInput).val().toUpperCase());
	},
	lockInputs: function(){
		this.disableButtonInput(true);
		this.disableTextInput(true);
	},
	unlockInputs: function(){
		this.disableButtonInput(false);
		this.disableTextInput(false);
	},
	setCorrect: function(){
		this.action('INP_MRK_COR');
		this.setState(1);
		if (!isMobile()){$(this.answerInput).focus();}
	},
	setWrong: function(){
		this.action('INP_MRK_WNG');
		this.setState(2);
		if (!isMobile()){$(this.answerInput).focus();}
	},
	setHunh: function(){
		this.action('INP_MRK_HUH');
		this.setState(3);
		if (!isMobile()){$(this.answerInput).focus();}
	},
	setEvents : function(){
		let that = this;
		$(this.correctButton).on('click',function(){
			that.setCorrect();
		});
		$(this.wrongButton).on('click',function(){
			that.setWrong();
		});
		$(this.nextButton).on('click',function(){
			that.validateInput();
		});
		$(this.answerInput).on('keypress',function(e){
			if (e.which === 13) {
				that.validateInput();
			}
		});
		if (!isMobile()){
			$(this.answerInput).on('keypress',function(e){
				if (e.which==32){
					e.preventDefault();
					that.validateInput();
				}
				if (e.which==92){
					e.preventDefault();
						switch(that.state){
							case 0: that.setCorrect();break;
							case 1: that.validateInput();break;
							case 2: if (!that.toggleDisable){that.setCorrect();};break;
						}
				}
				if (e.which==47){
					e.preventDefault();
						if (!that.toggleDisable){
							switch(that.state){
							case 0: that.setWrong();break;
							case 1: if (!that.toggleDisable){that.setWrong();};break;
							case 2: that.validateInput();break;
						}
					}
				}
			});
		}
	},
	updateProgress: function(){
		$(this.answerSpan).html(this.answered);
		$(this.totalSpan).html(this.totalAnswers);
	},
	updateAnswers: function(n){
		this.answered = n;
		this.updateProgress();

	},
	newQuestion: function(data){
		this.answered = 0;
		this.alpha = data.alpha;
		this.totalAnswers = data.answers;
		this.showAnswers = data.showAnswers;
		(this.showAnswers) ? $(this.answerNumber).css({'color':'rgba(0,0,0,1)'}):$(this.answerNumber).css({'color':'rgba(26,26,26,0)'});
		this.resetInputs;
		this.updateProgress();

	},
	resetInputs : function(){
		this.setState(0);
		this.disableButtonInput(false);
		this.disableTextInput(false);
		this.clearInput();
		if (!isMobile()){$(this.answerInput).focus();}
	},
	show: function(){
		$('#'+this.pare).append(this.container);
	},
	init: function(){
		this.initUI();
		this.setEvents();
		this.setState(this.state);

	}

}
function QInputs(data){
	this.styles = {
		'correctButton': 'quizButton quizButtonCorrect highlightRow',
		'wrongButton': 'quizButton quizButtonIncorrect redRowed',
		'nextButton': 'quizButton quizButtonNext blueRowed',
		'defaultInput' : '',
		'correctInput' : '',
		'wrongInput' : 'flashWrong',
		'duplicateInput' : 'flashDuplicate',
		'typoInput' : 'flashTypo'
	}
	this.pare = data.pare;
	this.state = 0;
	this.init();
}
