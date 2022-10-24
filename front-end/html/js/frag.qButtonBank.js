QButtonBank.prototype = {
	constructor: QButtonBank,
	createButtonRow:function(data){
		let that=this;
		let totalWeight = data.weight.reduce(function(total,num){return total+num;});
		let row = document.createElement('div');
		data.data.forEach(function(a,b){
			let x = document.createElement('div');
			let y = document.createElement('button');
			$(x).addClass('quizSubButtonBox');
			let z = (100*data.weight[b])/totalWeight;
			$(x).css({'width':z+'%','min-width':z+'%'})
			$(y).addClass('quizSubButton silverRowed noselect');
			$(y).css({'width':'100%'});
			$(y).attr('title',a.title);
			$(y).html(a.content);
			$(y).on('click',a.func);
			$(y).on('click',function(){if (!isMobile()){that.action('BUT_FOC_INP');}});
			$(x).append(y);
			$(row).append(x);
		})
		return(row);
	},
	setButtonData:function(){
		var that=this;
		this.buttonData = [
			{
				'content':'<i class="fas fa-random"></i>',
				'func': function(){that.action('BUT_SHF_ALP');},
				'title': 'Shuffle tiles randomly'
			},
			{
				'content':'<i class="fas fa-undo-alt"></i>',
				'func': function(){that.action('BUT_REV_ALP');},
				'title': 'Revert Tiles'
			},
			{
				'content':'<i class="fas fa-step-forward"></i>',
				'func': function(){that.action('BUT_SKP_QST');},
				'title': 'Skip Question'
			},
			{
				'content':'<i class="fas fa-bars"></i>&nbsp;<i class="fas fa-caret-'+((Number(localStorage.qQPanelOpen)==true)? "up":"down")+'"></i>',
				'func': function(e){
					if (typeof localStorage.qQPanelOpen==='undefined'){localStorage.qQPanelOpen = (isMobile()? 0 : 1);}
					typeof this.state!=='undefined' ? this.state=!this.state:this.state = !(Number(localStorage.qQPanelOpen)==true);
					if (this.state) {
						$(this).html('<i class="fas fa-bars"></i>&nbsp;<i class="fas fa-caret-up"></i>');
						$(that.advanced).slideDown(300);
					}
					else {
						$(this).html('<i class="fas fa-bars"></i>&nbsp;<i class="fas fa-caret-down"></i>');
						$(that.advanced).slideUp(300);
					}
					localStorage.qQPanelOpen=Number(this.state);
				},
				'title': 'More options...'
			},
			{
				'content':'<img src="images/sloth.png" style="width:28px;height:28px;margin:auto auto;padding:0px;">',
				'func': function(){initSloth(that.data.alpha,overview.data.lexicon.current);},
				'title': 'Try this word in Subword Sloth'
			},
			{
				'content':'<i class="fas fa-step-backward"></i>',
				'func': function(){that.action('BUT_UND_QST')},
				'title': 'Undo Previous Question'
			},
			{
				'content':'<i class="far fa-lightbulb"></i>',
				'func': function(){that.action('BUT_SHW_HNT');},
				'title': 'Get Hint'
			},
			{
				'content':'<span style="font-variant:small-caps;font-size:0.8em;line-height:0;">123</span><i class="fas fa-eraser"></i>',
				'func': function(){
					if (confirm("Are you sure that you want to reset your questions answered, movement & correct counters?")){
					localStorage.qQCounter = 0;
					localStorage.qQAlpha = 0;
					localStorage.qQCorrect = 0;
					that.action('BUT_UPD_CTR');
					}
				},
				'title': 'Clear Counters'
			},
			{
				'content':'<i class="fas fa-info-circle"></i><span style="font-variant:small-caps;font-size:0.5em;line-height:0;">alpha</span>',
				'func': function(){showAlphaStats(that.data.alpha);},
				'title': 'Show Alphagram Info'
			}

		]
	},
	initUI:function(){
		let that=this;
		this.container = document.createElement('div');
		$(this.container).addClass('quizButtonRow');
		let firstRow = !(isMobile()) ? {'data':[this.buttonData[0],this.buttonData[1],this.buttonData[2],this.buttonData[8],this.buttonData[3]], 'weight':[1,1,1,1,1]}
		: {'data':[this.buttonData[0],this.buttonData[1],this.buttonData[2],this.buttonData[3]], 'weight':[1,1,1,1]};
		this.firstRow = this.createButtonRow(firstRow);
		this.advanced = document.createElement('div');
		$(this.advanced).addClass('quizAdvancedBox');
		let secondRow = {'data':[this.buttonData[4],this.buttonData[5],this.buttonData[6],this.buttonData[7]], 'weight':[1,1,1,1]}
		this.secondRow = this.createButtonRow(secondRow);
		$(this.advanced).append(this.secondRow);
		if (isMobile()) {
			let thirdRow = {'data':[this.buttonData[8]],'weight':[2,1,1]};
			this.thirdRow = this.createButtonRow(thirdRow);
			$(this.thirdRow).addClass('quizAdvancedBreak');
			$(this.advanced).append(this.thirdRow);
		}
		$(this.container).append(this.firstRow,this.advanced);
		if (isMobile()){$(this.container).find('button').css({'height':'44px','margin-top':'5px','margin-bottom':'5px','font-size':'1.0em'});}
		(Number(localStorage.qQPanelOpen)==true) ? $(this.advanced).show():$(this.advanced).hide();

	},
	toggleButtons:function(state){
		$(this.firstRow).find('div>button').filter(':eq(0), :eq(1), :eq(2)').prop('disabled',state);
		$(this.secondRow).find('div>button').filter(':eq(2)').prop('disabled',state);
	},
	start:function(data){
		this.data = data;
		this.toggleButtons(false);
		$(this.secondRow).find('div>button').filter(':eq(0)').prop('disabled',(this.data.alpha.length<5));
		$(this.thirdRow).find('div>button').filter(':eq(1)').prop('disabled',Number(this.data.quizid)===-1);
		$(this.secondRow).find('div>button').filter(':eq(2)').prop('disabled',(this.data.alpha.length===2));
	},
	end:function(data){
		this.data = data;
		this.toggleButtons(true);
	},
	disableHint:function(){
		$(this.secondRow).find('div>button').filter(':eq(2)').prop('disabled',true);
	},
	setUndo:function(b){
		$(this.secondRow).find('div>button').filter(':eq(1)').prop('disabled',b);
	},
	show:function(){
		$('#'+this.pare).append(this.container);
	},
	update:function(data){

	}
}
function QButtonBank(data){
	this.pare = data.pare;
	this.setButtonData();
	this.initUI();
}
