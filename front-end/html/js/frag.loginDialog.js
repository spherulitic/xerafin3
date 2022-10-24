LoginDialog.prototype = {
	constructor:LoginDialog,
	init:function(){
		this.draw();
	},
	drawMethods: function(i,value,total){
		this.loginButton[i]=document.createElement('button');
		let x = document.createElement('div');
		$(this.loginButton[i]).addClass('silverRowed overviewListButton loginButton');
		$(this.loginButton[i]).css({'width':Math.min(99/total,30)+'%'});
		$(this.loginButton[i]).css({'margin':'0','height':'40px'});
		this.loginButton[i].title ='Log in using '+value.name;
		$(x).css({
			'vertical-align':'middle',
			'font-size':'25px',
			'line-height':'25px',
			'margin':'auto',
			'padding':'0px',
			'background-color':
			'transparent','color':'#333',
			'width':'1em',
			'height':'1em',
			'border-radius':'2px'
		});
		switch (Number(i)){
			case 0: break;
			case 1: $(x).css({'background-color':'transparent','color':'#3b5998'});break;
			case 3: $(x).css({'background-color':'transparent','color':'#db4437',});break;
			case 2: $(x).css({'background-color':'#7289d9','color':'transparent'});break;
			case 4: $(x).css({'background-color':'transparent','color':'#1DA1F2'});break;

		}
		$(x).html('<i class="'+value.content+'"></i>');
		$(this.loginButton[i]).append(x);
		return this.loginButton[i];
	},

	addMethods: function(){
		let self=this;
		this.loginButton= new Object();
		this.loginButtons = document.createElement('div');
		//AJAX CALL
		let response = {
		//	0:{'name':'eMail Address & Password','isImg':false,'content':'fa fa-key'},
			1:{'name':'Facebook','isImg':false,'content':'fab fa-facebook-square'},
		//	2:{'name':'Discord','isImg':false,'content':'fab fa-discord'},
		//	3:{'name':'Google','isImg':false,'content':'fab fa-google'},
		//	4:{'name':'Twitter','isImg':false,'content':'fab fa-twitter'},
		};
		let x = Object.keys(response).length;
		Object.entries(response).forEach(function([i,v]){
			$(self.loginButtons).append(self.drawMethods(Number(i),v, x));
		});
		return this.loginButtons;
	},
	drawLoginMessages:function(){
		this.loginMessage1 = document.createElement('div');
		this.loginMessage2 = document.createElement('div');
		this.loginMessage3 = document.createElement('div');
		this.logProgress = document.createElement('div');
		this.adminNote = document.createElement('div');
		$(this.loginMessage1,this.loginMessage2,this.loginMessage3,this.logProgress,this.adminNote).addClass('logProgress');
		$(this.loginMessage1).css({'color':'red'});
		let x = document.createElement('div');
		$(x).append(this.loginMessage1,this.loginMessage2,this.loginMessage3,this.logProgress,this.adminNote);
		return x;
	},
	addDialog: function(){
		this.passwordDialog = document.createElement('div');
		this.uEmail = document.createElement('div');
		this.uEmailLabel = document.createElement('div');
		this.uEmailInput = document.createElement('input');
		$(this.uEmail).append(this.uEmailLabel,this.uEmailInput);
		this.uPword = document.createElement('div');
		this.uPwordLabel = document.createElement('div');
		this.uPwordInput = document.createElement('input');
		$(this.uPword).append(this.uPwordLabel, this.uPwordInput);
		$(this.uEmailLabel).html('eMail:');
		$(this.uEmailLabel).addClass('loginLabel noselect');
		$(this.uPwordLabel).html('Password:');
		$(this.uPwordLabel).addClass('loginLabel noselect');
		$(this.uPwordInput).prop('type','password');
		$(this.uPwordInput).addClass('loginInput');
		$(this.uEmailInput).addClass('loginInput');
		$(this.uEmail).addClass('loginRow');
		$(this.uPword).addClass('loginRow');
		this.submitRegion = document.createElement('div');
		$(this.submitRegion).css({'width':'100%','display':'inline-block','text-align':'right','margin':'auto','margin-right':'0px'});
		this.forgotPass=document.createElement('button');
		$(this.forgotPass).addClass('silverRowed overviewListButton loginButton');
		$(this.forgotPass).css({'width':'40%'});
		$(this.forgotPass).css({'margin':'auto','margin-top':'5px'});
		$(this.forgotPass).html('Reset Password');
		this.sendPass=document.createElement('button');
		$(this.sendPass).addClass('silverRowed overviewListButton loginButton');
		$(this.sendPass).css({'width':'40%'});
		$(this.sendPass).css({'margin-top':'5px','margin-right':'0px'});
		$(this.sendPass).html('Log In');
		this.keyImage = document.createElement('div');
		$(this.keyImage).addClass('loginKey');
		$(this.passwordDialog).css({
			'width':'calc(90% - 40px)',
			'padding':'1%',
			'display':'inline-block',
			'font-variant':'normal',
			'margin':'auto'
		});
		$(this.submitRegion).append(this.forgotPass, this.sendPass);
		$(this.keyImage).html('<i class="fa fa-key"></i>');
		$(this.passwordDialog).append(this.uEmail,this.uPword,this.submitRegion);
		this.pwordOutput = document.createElement('div');
		$(this.pwordOutput).addClass('metalBOne');
		$(this.pwordOutput).css({'width':'100%','margin':'auto','margin-bottom':'5px','border-bottom':'1px solid rgb(230,230,210)','display':'inline-block'});
		$(this.pwordOutput).append(this.keyImage,this.passwordDialog);
		return this.pwordOutput;
	},
	drawLoginDialog:function(){
		let t = document.createElement('div');
		$(t).css({'width':'100%','border-bottom':'1px solid rgb(230,230,210)','color':'rgb(230,230,210)','font-variant':'small-caps','font-size':'0.8em','text-align':'left'});
		$(t).html('Login');
		let x = document.createElement('div');
		$(x).css({'width':'100%','text-align':'center'});
		let y = document.createElement('div');
		$(y).css({'width':'100%','margin-bottom':'5px'});
		let z = document.createElement('img');
		$(z).css({'height':'80px'});
		$(z).attr('src','images/xerafinNew.png');
		let w = document.createElement('div');
		let v = Math.floor((Math.random()*(xerafin.config.slogans.length)));
		$(w).html("<span style='font-size:1.2em'>&#147;</span>"+xerafin.config.slogans[v]+"<span style='font-size:1.2em'>&#148;</span>");
		$(w).css({'font-size':'0.9em','font-family':'Lato, sans-serif','color':'rgb(230,230,210)','font-variant':'small-caps'});
		$(y).append(z,w);
		$(x).append(y,t,this.addDialog(),this.addMethods(),this.drawLoginMessages());
		return x;
	},
	draw: function(){
		this.content=document.createElement('div');
		$(this.content).append(this.drawLoginDialog());
	},
	output: function(){
		return this.content;
	}
}
function LoginDialog(data={}){
	this.methods = data.methods || {}
	this.init();
}
