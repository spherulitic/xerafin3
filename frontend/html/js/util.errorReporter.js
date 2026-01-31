ErrorReporter.prototype = {
	constructor: ErrorReporter,
	getOutput: function(){
		let self = this;
		var msgBox = document.createElement('div');
		var msgText = document.createElement('div');
		var retryButton = document.createElement('button');
		$(msgText).css({'display':'inline-block'});
		$(msgBox).append(msgText);
		if (this.attempts==this.retryMax+1){

			$(retryButton).css({'display':'inline-block','height':'16px','line-height':'0.9em',
			'font-variant':'small-caps','color':'#000','margin-left':'10px','padding':'0px 10px',
			'font-size':'0.9em','vertical-align':'middle'});
			$(retryButton).html('retry');
			$(retryButton).on('click',function(){
				self.clear();
				self.retryFunction();
			});
			$(msgBox).append(retryButton);
		}
		this.getDescription();
		if (this.displayOutput){
			if (this.showLoading) {
				this.outputMsg = this.retryMax>=this.attempts ? "<img src='"+this.loadingImagePath+"' style='height:0.8em'>" + this.msg:this.msg;
			}
			else {this.outputMsg = this.msg;}
			$(msgText).html(this.outputMsg);
			return msgBox;
		}
	},
	getDescription: function(){
		this.msg = '';
		if (this.code==0) {this.msg='No Internet Connection.';}
		if (this.code<400 && this.code!=0) {this.msg='Network Issue ['+code+']';}
		if (this.code>=400 && this.code!=502) {this.msg='Server Error ['+code+']';}
		if (this.code==502) {this.msg='Internet Connection Error.';}
		if (this.retryMax>=this.attempts){this.msg +=" Retrying ("+this.attempts+")...";}
		if (this.debugLog){appendDebugLog(this.msg);}
		if (this.console){console.log(this.msg);}
	},
	isDone: function(){
		return (this.retryMax+1<this.attempts);
	},
	clear: function(){
		if (this.checkTimer!=='undefined'){clearTimeout(this.checkTimer);}
		this.attempts = 0;
		this.oldCode = -1
		this.code = -1;
		this.msg = '';
		this.outputMsg = '';
		$(this.retryButton).hide();
	},
	update: function(code){
		this.oldCode = this.code;
		this.code = code;
		if (this.oldCode = this.code){this.attempts=0;}
		//console.log("Code:"+this.code+", Update Fired:"+this.attempts);
		if (this.checkTimer!=='undefined'){clearTimeout(this.checkTimer);}
		if (!this.isDone()){
			this.attempts=this.attempts+1;
			this.getDescription();
			this.checkTimer= setTimeout(this.retryFunction.bind(this),this.retryFreq);
		}
	}
}
function ErrorReporter(data){
	this.outputMsg = '';
	this.loadingImagePath = 'images/ajaxLoad.gif';
	this.showLoading = data.showLoading || true;
	this.displayOutput = data.displayOutput || false;
	this.retryMax = data.retryMax || 10;
	this.retryFunction = data.retryFunction || function(){};
	this.retryFreq = data.retryFreq || 500;
	this.console = data.console || false;
	this.debugLog = data.debugLog || true;
	this.clear();
}
