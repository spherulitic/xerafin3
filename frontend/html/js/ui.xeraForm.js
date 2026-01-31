XeraInput.prototype = {
	constructor: XeraInput,
	init: function(){
		this.content = document.createElement('div');
		$(this.content).addClass('row');
		this.value = '';
		this.isValid=false;
		this.draw();
	},
	getInputType: function(i){
		switch (i){
			case 'input': return 'input';break;
			case 'handle': return 'input';break;
			case 'textarea': return 'textarea';break;
			case 'password': return 'input';break;
			case 'passwordConfirm': return 'input';break;
			case 'checkbox': return 'input';break;
		}
	},
	val: function(){
		return $(this.inputBox).val();
	},
	updateFeedback:function(d){
		let x = document.createElement('span');
		$(x).css({'color':'red'})
		$(x).html(d);
		$(this.feedbackBox).append(x,"<BR>");
		$(this.feedbackBox).show(500);
	},
	setInputEvents: function(){
		let self=this;
		$(this.inputBox).on('focusin',function(e){
			self.testConditions();
			e.stopPropagation();
			$(self.labelBox).addClass('highlightRow');
			$(self.labelBox).css({'color':'black','border':'1px solid black'});
			$(self.inputBox).css({'padding':'0','background-color':'rgb(230,230,210)','color':'black'})
			if (self.data.helpText){
					self.instance.setHelpField(self.data.helpText);
			}
		});
		$(this.inputBox).on('focusout',function(e){
			$(self.labelBox).removeClass('highlightRow');
			$(self.labelBox).css({'color':'rgb(230,230,210)','border':'1px solid #555'});
			$(self.inputBox).css({'background-color':'white','color':'#555'});
			self.testConditions();
		});
		if (this.data.type =='checkbox') {
			$(this.inputBox).on('change',function(){
				self.testConditions();
			});
		}
		$(this.inputBox).on('keyup',function(e){
			self.testConditions();
		});
	},
	drawLabel: function(){
		this.labelBox = document.createElement('div');
		(this.data.type == 'checkbox') ? $(this.labelBox).addClass('col-xs-9') : $(this.labelBox).addClass('col-xs-5');
		$(this.labelBox).css({
			'text-align':'right',
			'box-sizing':'border-box',
			'border':'1px solid #555',
			'color':'rgb(230,230,210)',
			'border-radius':'0 0 0 0.6em',
		})
		if (this.data.type == 'checkbox') {$(this.labelBox).css({'font-size':'0.8em'});}
		let x = (this.data.isOptional) ? '[Optional] ' : '';
		$(this.labelBox).html(x+this.data.label+":");
		return this.labelBox;
	},
	testConditions: function(){
		this.value = this.val();
		if (this.data.isOptional){this.isValid = true;}
		else {
			if (this.data.validationType == 'passwordConfirm'){
				this.isValid = this.compare(this.instance.rows[this.data.valSource].value, this.value);
			}
			else if (this.data.validationType === 'mustCheck'){
				this.value = (this.inputBox.checked===true);
				this.isValid = this.value;

			}
			else {
				this.isValid = RegExp(this.validation).test(this.val());
			}
		}
		let x = this.data.confirmField;
		if ((typeof x!=='undefined')  && (typeof this.instance.rows[x]!=='undefined')){
			this.instance.rows[x].isValid = this.compare(this.instance.rows[x].value, this.value);
			this.instance.rows[x].updateStatus(this.instance.rows[x].isValid);
		}
		this.updateStatus(this.isValid);
		this.instance.submitReady();
	},
	updateStatus: function(state){
		let y='yellow';
		(this.isValid || this.data.isOptional) ? y='green;margin:auto;"><i class="fa fa-check"' : y= 'red;margin:auto;"><i class="fa fa-times"';
		$(this.vStatus).html('<span style="color:'+y+'></span>');
	},
	compare: function(a,b){
		return (a === b);
	},
	getConditions: function(type){
		switch(type){
			case 'handle': this.validation = "^[A-Za-z_-]{4,15}$";$(this.inputBox).prop({'maxlength':'15'});break;
			case 'password': this.validation = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})";break;
			case 'email': this.validation = "^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$";break;
			case 'alphabet': this.validation = "^[A-Za-z-]{1,20}$";$(this.inputBox).prop({'maxlength':'20'});
		}
	},
	drawInput: function(){
		let y = this.getInputType(this.data.type);
		this.inputBox = document.createElement(y);
		$(this.inputBox).css({'box-sizing':'border-box','padding-left':'10px!important'});
		if (y=='textarea'){
			let h;
			h = this.data.height || 50;
			$(this.inputBox).css({'height': h+'px'});
		}
		if ((y=='input') && (this.data.type==='password')){
			$(this.inputBox).prop('type','password');
		}
		if ((y=='input') && (this.data.type==='checkbox')){
			$(this.inputBox).prop('type','checkbox');
		}

		this.getConditions(this.data.validationType);
		(this.data.type == 'checkbox') ? $(this.inputBox).addClass('col-xs-1') : $(this.inputBox).addClass('col-xs-5');
		$(this.inputBox).css({'height':'auto'})
		this.setInputEvents();
		return this.inputBox;
	},
	drawStatus: function(){
		this.statusContainer = document.createElement('div');
		$(this.statusContainer).addClass('col-xs-1');
		this.vStatus = document.createElement('div');
		$(this.vStatus).addClass('metalBTwo');
		$(this.vStatus).css({
			'border':'1px solid black',
			'display':'inline-block',
			'color':'rgb(213,213,200)',
			'height':'30px',
			'width':'30px',
			'text-align':'center',
			'margin':'auto',
			'line-height':'30px',
			'vertical-align':'middle',
			'font-size':'1.1em'
		});
		$(this.statusContainer).append(this.vStatus);
		this.testConditions();
		return this.statusContainer;
	},
	drawInputFrame: function(){
		$(this.inputFrame).addClass('row col-xs-12');
		this.inputFrame = document.createElement('div');
		$(this.inputFrame).css({'width':'100%','font-size':'1.1em','margin-bottom':'1px','display':'inline-block'});
		$(this.inputFrame).append(this.drawLabel(),this.drawInput(),this.drawStatus());
		return this.inputFrame;
	},
	drawFeedbackBox: function(){
		this.feedbackBox = document.createElement('div');
		$(this.feedbackBox).addClass('row col-xs-12');
		$(this.feedbackBox).css({'padding-top':'0px!important','margin-top':'2px','font-size':'0.9em','vertical-align':'middle','text-align':'right'});
		$(this.feedbackBox).hide();
		return this.feedbackBox;
	},
	draw: function(){
		let self=this;
		$(this.content).append(this.drawInputFrame(), this.drawFeedbackBox());
	},
	output: function(){
		return this.content;
	}
}
function XeraInput(data={}){
	this.pare = data.pare;
	this.instance = data.instance;
	this.data = data.data || {};
	this.init();
}

XeraForm.prototype = {
	constructor:XeraForm,
	renderCaptcha: function(){
		let c = document.createElement('div');
		//$(c).addClass('col-xs-12');
		$(c).css({'width':'99%'});
		this.captchaBox = document.createElement('div');
		//$(this.captchaBox).css({'width':'99%','text-align':'right'});
		this.captchaFeedback = document.createElement('div');
		//$(this.captchaFeedback).addClass('pull-right');
		$(this.captchaFeedback).css({'width':'99%','min-width':'99%','text-align':'right'});
		let x =	grecaptcha.render(this.captchaBox, this.captcha.settings);
		$(c).append(this.captchaBox,this.captchaFeedback);
		$(this.inputSide).append(c);

	},
	setHelpField: function(d){
		$(this.fieldHelpBox).html(d);
	},
	submitReady: function(){
		let r = true;
		if (this.rows!=='undefined' || this.rows.length===0){
			Object.entries(this.rows).forEach(function([i,v]){
				if (!v.isValid){r = false;}
			});
		}
		else {r = false;}
		$(this.submitButton).prop({'disabled':((r===true) ? false:true)});
		if ($(this.submitButton).prop('disabled')) {
			$(this.submitButton).addClass('metalBOne');
			$(this.submitButton).removeClass('highlightRow');
		}
		else {
			$(this.submitButton).removeClass('metalBOne');
			$(this.submitButton).addClass('highlightRow');
		}
	},
	clearFeedback: function(){
		let self = this;
		Object.keys(this.rows).forEach(function(i){
			if (i!=='captcha'){
				$(self.rows[i].feedbackBox).html("");
				$(self.rows[i].feedbackBox).hide(100);
			}
		});
		$(self.captchaFeedback).html("");
		$(self.captchaFeedback).hide(100);
	},
	draw:function(){
		let self=this;
		this.content=document.createElement('div');
		$(this.content).addClass('container-fluid');
		$(this.content).css({'padding':'0px'});
		this.formHelpBox = document.createElement('div');
		$(this.formHelpBox).addClass('col-xs-12 highlightRow');
		$(this.formHelpBox).css({'padding':'0px 15px','margin-bottom':'10px','font-size':'1em','font-style':'italic', 'border-radius':'0.6em','color':'black'});
		$(this.formHelpBox).html(this.formHelp);
	    this.formRegion = document.createElement('div');
		$(this.formRegion).addClass('col-xs-12 row');
		this.fieldHelpBox = document.createElement('div');
		$(this.fieldHelpBox).addClass('col-xs-12 col-md-4 col-lg-5 metalBOne');
		$(this.fieldHelpBox).css({'padding-top':'10px','padding-bottom':'10px','font-family':'Lato,sans serif','line-height':'1.2em','border-radius':'0.6em','color':'rgb(230,230,213)','padding':'0px!important','font-size':'0.8em'})
		this.inputSide = document.createElement('div');
		$(this.inputSide).addClass('col-xs-12 col-md-8 col-lg-7 metalBOne');
		$(this.inputSide).css({'box-sizing':'border-box'});
		this.fields.forEach(function(v,i){
			self.rows[v.ref] = new XeraInput({
				data: v,
				pare: self.content,
				instance: self
			});
			$(self.inputSide).append(self.rows[v.ref].output());
		});
		this.submitButton = document.createElement('button');
		$(this.submitButton).html(this.submit.html);
		$(this.submitButton).addClass('pull-right overviewListButton loginButton');
		$(this.submitButton).css({'height':'40px','width':'25%','font-size':'1.2em','color':'black'});
		$(this.submitButton).prop('disabled',true);
		$(this.submitButton).on('click',function(){self.send();});
		this.submitRegion = document.createElement('div');
		$(this.submitRegion).addClass('col-xs-12');
		$(this.inputSide).append(this.submitRegion);
		$(this.formRegion).append(this.inputSide, this.fieldHelpBox);
		$(this.content).append(this.formHelpBox, this.formRegion);
		if (typeof this.captcha!=='undefined'){
			this.renderCaptcha();
		}
		$(this.submitRegion).append(this.submitButton);
		$(this.inputSide).append(this.submitRegion);
	},
	buildJSON: function(){
		let x = new Object();
		if (this.rows!=='undefined' || this.rows.length===0){
			Object.entries(this.rows).forEach(function([i,v]){
				x[i] = v.value;
			});
		}
		if (typeof this.captcha!=='undefined') {
			x['captcha'] = grecaptcha.getResponse();
		}
		this.sendData = x;
	},
	send:function(){
		if (this.failTimeout!=='undefined'){clearTimeout(this.failTimeout);}
		let self=this;
		$(this.fieldHelpBox).html('');
		this.clearFeedback();
		this.buildJSON();
		//console.log(this.sendData);
		$.ajax({
			type: "POST",
			data: JSON.stringify(this.sendData),
			url: this.submit.url,
			success: function(response,responseStatus){
				grecaptcha.reset();

				let x = JSON.parse(response);
				self.submit.after(x);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert("PHP Error!");
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
				self.failTimeout = setTimeout(XeraForm.prototype.send.bind(self),1000);
			}
		})
	},
	output:function(){
		return this.content;
	},
	init:function(){
		this.rows = {};
		this.draw();
	}
}
function XeraForm (data={}){
	this.pare = data.pare;
	this.fields = data.fields;
	this.formHelp= data.formHelp || null;
	if (typeof data.captcha!=='undefined') {
		this.captcha = data.captcha;
	}
	this.submit = data.submit;
	this.submit.after = data.submit.after || function(){};
	this.init();
}
