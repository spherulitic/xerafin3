OverviewRow.prototype = {
	constructor: OverviewRow,
//------------------------------------------------------------------------------------------------------>
//For cardbox data functions, returns a time reference based on the timestamp received from the server

	getTimeDiff:function(a,b){
		let v=b-a;
		if (v<0) {v=-v;dist='+';} else {dist='-';}
		let x = v/1000;let res;let gap;
		if (x>=86400*30.6){gap = "Mths";res = Math.floor(x/(86400*30.6));}
		if (x<86400*30.6){gap = "Days";res = Math.floor(x/86400);}
		if (x<86400){gap = "Hours";res = Math.floor(x/3600);}
		if (x<3600){gap = "Mins";res = Math.floor(x/60);}
		if (x<60){gap = "s";res = Math.floor(x/60);}
		if (x===0){gap ="Ok";return gap;}
		return dist+""+res+" "+gap;
	},

//------------------------------------------------------------------------------------------------------>
//If this is a cardbox row, update the required spans and tell the overview that this has been done.

	updateCardboxValues:function(d){
		if (this.isCardbox) {
			$(this.cbxTotalSpan).html(d.totalCards);
			$(this.cbxDueSpan).html(d.totalDue);
			$(this.cbxTimeSpan).html(" ⏰ "+this.getTimeDiff(d.earliestDueDate*1000, Math.floor(new Date().getTime())));
		}
	},

//------------------------------------------------------------------------------------------------------>
//Init Spans for progress.
	initSpans:function(){
		this.completedSpan = document.createElement('span');
		$(this.completedSpan).addClass('cbxSpan');
		this.completedSpan.id = this.pare+"_comp_"+this.data.quizid;
		this.correctSpan = document.createElement('span');
		$(this.correctSpan).addClass('cbxSpan');
		this.correctSpan.id = this.pare+"_correct_"+this.data.quizid;
	},
//------------------------------------------------------------------------------------------------------>
// If Row is Cardbox, then it needs different spans.

	initCardboxSpans:function(){
		this.cbxTotalSpan = document.createElement('span');
		this.cbxDueSpan = document.createElement('span');
		this.cbxTimeSpan = document.createElement('span');
		$(this.cbxTotalSpan).addClass('cbxSpan');
		$(this.cbxDueSpan).addClass('cbxSpan');
		$(this.cbxTimeSpan).addClass('cbxSpan');
	},

//------------------------------------------------------------------------------------------------------>
	updateSpans: function(){
		if (!this.data.sub && !this.cardbox){
			$(this.completedSpan).html((this.data.quizsize-this.data.untried) + '/' + this.data.quizsize);
			$(this.correctSpan).html(this.data.correct+"/"+this.data.quizsize);
		}
	},

//------------------------------------------------------------------------------------------------------>
	update: function(d){
		if (typeof this.data.sub!=='undefined'){
			this.data.sub ? $(this.selector).addClass('blueRowed overviewItemSub') : $(this.selector).addClass('steelRowed');
		}
		else {
			//Because cardbox won't return a sub
			$(this.selector).addClass('steelRowed');
		}
		this.data=d;
		this.updateSpans();
	},
//------------------------------------------------------------------------------------------------------>
	setInfoContent: function (){
		let sub = 'Subscribed Quiz';
		if (this.isCardbox){
			$(this.info).append("Alphas: ",this.cbxTotalSpan," , Due: ",this.cbxDueSpan," , ",this.cbxTimeSpan);
		}
		else {
			if ((this.data.status === 'Active') || (this.data.status === 'Inactive')){
				if ((this.data.sub!=='undefined')){
					if (this.data.sub){
						$(this.info).append(sub);
					}
					else {
						$(this.info).append('Progress: ', this.completedSpan, " , Correct: ", this.correctSpan);
					}
				}
			}
			if (this.data.status === 'Completed'){
				$(this.info).append("Correct: ", this.correctSpan);
			}
		}
	},
//------------------------------------------------------------------------------------------------------>
	returnTileType:function(d){
		let x = new Tile({'size':24,'letter':d,'RGB':'140,176,48','textRGB':'26,26,26'});
		return x.output();
	},
//------------------------------------------------------------------------------------------------------>
	drawTypeIndicator:function(){
		let value="";
		let bgCol="steelRowed";
		let tooltip="";
		switch (true) {
			case (RegExp(/^Daily\s/g).test(this.data.quizname)) : value = 'D';bgCol='silverRowed';tooltip = 'Daily Quiz';break;
			case (RegExp(/\#([0-9]|[0-4][0-9]|[5][0-3])(..)20/g).test(this.data.quizname)) : value = 'W';bgCol='goldRowed';tooltip = 'Weekly Workout';break;
			case (RegExp(/^(Long Hots|Short Circuits|Bingo Bash)\s/g).test(this.data.quizname)) : value = 'M';bgCol='redRowed';tooltip = 'Monthly Marathon';break;
			case (RegExp(/^New\s/g).test(this.data.quizname)) : value = '🆕';tooltip = 'New Lexicon Words';break;
			case (RegExp(/Vowel\s/g).test(this.data.quizname)) : value = 'V';bgCol='blueRowed'; tooltip = 'High Vowel';break;
			case (RegExp(/by Probability\s/g).test(this.data.quizname)) : value = '<i class="fa fa-percent"></i>';bgCol='highlightRow'; tooltip = 'Probability';break;
			case this.data.quizid === -1 : value = '📦';tooltip = 'Cardbox';break;
			default: value = '❔';tooltip = 'Other Quiz';break;
		}
		let typeIndicator = document.createElement('div');
		$(typeIndicator).attr('title',tooltip);
		$(typeIndicator).addClass('overviewTypeIndicator '+bgCol);
		$(typeIndicator).html(value);
		return typeIndicator;
	},
	updateButtonStates: function(){
		if (typeof this.resetAll!=='undefined'){
			$(this.resetAll).prop('disabled',(this.data.untried===this.data.quizsize));
		}
		if (typeof this.resetWrong!=='undefined'){
			$(this.resetWrong).prop('disabled',this.data.incorrect===0);
		}
		if (typeof this.discard!=='undefined'){
			$(this.discard).prop('disabled', this.data.untried===0);
		}
		if (typeof this.addAll!=='undefined'){
			$(this.addAll).prop('disabled', (this.data.untried!==0));
		}
		if (typeof this.addWrong!=='undefined'){
			$(this.addWrong).prop('disabled', this.data.incorrect===0);
		}
	},
	disableButtons: function(){
		if (typeof this.resetAll!=='undefined'){
			$(this.resetAll).prop('disabled',true);
		}
		if (typeof this.resetWrong!=='undefined'){
			$(this.resetWrong).prop('disabled',true);
		}
		if (typeof this.discard!=='undefined'){
			$(this.discard).prop('disabled', true);
		}
		if (typeof this.addAll!=='undefined'){
			$(this.addAll).prop('disabled', true);
		}
		if (typeof this.addWrong!=='undefined'){
			$(this.addWrong).prop('disabled', true);
		}
	},
	drawResetAll: function (){
		let x = document.createElement('button');
		x.id = this.pare+"_rAll_"+this.data.quizid;
		$(x).addClass('silverRowed overviewListButton overviewAccordionButton');
		$(x).html("↻ Reset All");
		$(x).prop('disabled',(this.data.untried===this.data.quizsize));
		return x;
	},
	drawResetWrong: function (){
		let x = document.createElement('button');
		$(x).addClass('silverRowed overviewListButton overviewAccordionButton');
		$(x).html("↻ Reset Wrong");
		x.id = this.pare+"_rWrong_"+this.data.quizid;
		$(x).prop('disabled',this.data.incorrect===0);

		return x;
	},
	drawDiscard: function (){
		let x = document.createElement('button');
		$(x).addClass('silverRowed overviewListButton overviewAccordionButton');
		$(x).html("❌ Discard");
		x.id = this.pare+"_rDiscard_"+this.data.quizid;
		$(x).prop('disabled', this.data.untried===0);
		return x;
	},
	drawAddAll: function (){
		let x = document.createElement('button');
		$(x).addClass('silverRowed overviewListButton overviewAccordionButton');
		$(x).html("📦➕ All");
		x.id = this.pare+"_rDiscard_"+this.data.quizid;
		$(x).prop('disabled', this.data.untried!==0);
		$(x).attr('title','Adds all answers to Cardbox. Correct: Cardbox 1, Incorrect: Cardbox 0');
		return x;
	},
	drawAddWrong: function (){
		let x = document.createElement('button');
		$(x).addClass('silverRowed overviewListButton overviewAccordionButton');
		$(x).html("📦➕ Wrong");
		x.id = this.pare+"_rDiscard_"+this.data.quizid;
		$(x).prop('disabled', this.data.incorrect===0);
		$(x).attr('title','Adds all incorrect responses to Cardbox 0');
		return x;
	},
	drawGroupButtonRow:function(){
		let x = document.createElement('div');
		$(x).css({'width':'96%','margin':'auto'});
		if (this.hasResetWrong) {
			this.resetWrong = this.drawResetWrong();
			$(x).append(this.resetWrong);
		}
		if (this.hasResetAll) {
			this.resetAll = this.drawResetAll();
			$(x).append(this.resetAll);
		}
		if (this.hasDiscard) {
			this.discard = this.drawDiscard();
			$(x).append(this.discard);
		}
		if (this.hasCActions) {
			this.addAll = this.drawAddAll();
			$(x).append(this.addAll);
			this.addWrong = this.drawAddWrong();
			$(x).append(this.addWrong);
		}
		return x;
	},
	drawAccordion:function(){
		let x = document.createElement('div');
		if (this.hasReset || this.hasResetAll || this.hasDiscard) {
			$(x).append(this.drawGroupButtonRow());
		}
		$(x).addClass("overviewAccordion");
		$(x).hide();
		return x;
	},
	drawTypeGroup:function(){
		let x = document.createElement('div');
		$(x).addClass('overviewTypeGroup');
		$(x).append(this.drawTypeIndicator());
		return x;
	},
	drawInfoGroup:function(){
		let x = document.createElement('div');
		$(x).addClass('overviewInfoGroup');
		let header = document.createElement('div');
		$(header).addClass('overviewItemHeading');
		$(header).html(this.data.quizname);
		this.info = document.createElement('div');
		$(this.info).addClass('overviewItemInfoGroupInfo');
		this.isCardbox ? this.initCardboxSpans() : this.initSpans();
		this.setInfoContent();
		this.updateSpans();
		$(x).append(header,this.info);
		return x;
	},

//------------------------------------------------------------------------------------------------------>
// Manipulates the show/hide toggle upon the accordion.  Event does not require any reference outside
// of this object, but that may change if there something more involved happening inside of it.

	drawChevy:function(){
		let x = document.createElement('button');
		let that = this;
		$(x).addClass('silverRowed overviewListButton');
		$(x).html("▼");
			$(x).on('click',function(e){
				e.stopPropagation();
				if ($(x).html()==="▲") {
					$(x).html("▼");
					$(that.accordion).hide(300);
				}
				else {
					$(x).html("▲");
					$(that.accordion).show(300);
				}
			});
		return x;
	},

//------------------------------------------------------------------------------------------------------>
//Will eventually need to be altered once Cardbox widget is an object.  Creates button to open
//cardbox widget.

	drawCardboxLink:function(){
		let x = document.createElement('button');
		$(x).html("📄");
		$(x).addClass('silverRowed overviewListButton');
		$(x).on('click', function(e){
			e.stopPropagation();
			showCardboxStats();
		});
		return x;
	},

//------------------------------------------------------------------------------------------------------>

	drawOptGroup:function(){
		let x = document.createElement('div');
		$(x).addClass('overviewItemOptGroup');
		if (!this.isCardbox) {
			if (this.hasAccordion) {
				$(x).append(this.drawChevy());
			}
		}
		else {
			$(x).append(this.drawCardboxLink());
		}
		return x;
	},
	drawSelector:function(){
		this.selector = document.createElement('div');
		this.selector.id = this.pare+"_quiz_"+this.data.quizid;
		$(this.selector).addClass('overviewItem');
		if (typeof this.data.sub!=='undefined'){
			this.data.sub ? $(this.selector).addClass('blueRowed overviewItemSub') : $(this.selector).addClass('steelRowed');
		}
		else {
			//Because cardbox won't return a sub
			$(this.selector).addClass('steelRowed');
		}
		if (this.hasTypeGroup){
			$(this.selector).append(this.drawTypeGroup());
		}
		$(this.selector).append(this.drawInfoGroup(), this.drawOptGroup());
	},

	draw: function(){
		this.selectRegion = document.createElement('div');
		$(this.selectRegion).addClass('overviewWidget');
		this.isCardbox ? this.initCardboxSpans() : this.initSpans();
		this.drawSelector();
		$(this.selectRegion).append(this.selector);
		if (this.hasAccordion && !this.isCardbox) {
			this.accordion = this.drawAccordion();
			$(this.selectRegion).append(this.accordion);
		}
	},
	init: function(){
		this.draw();
	},
	output : function(){
		return this.selectRegion;
	}
}
function OverviewRow (data){
	this.id = Number(data.id);
	this.isCardbox = (this.id ==-1);
	this.pare = data.pare;
	this.data = data.data;
	typeof data.hasCActions!=='undefined' ? this.hasCActions = data.hasCActions : this.hasCActions = false;
	typeof data.hasResetWrong!=='undefined' ? this.hasResetWrong = data.hasResetWrong : this.hasResetWrong = true;
	typeof data.hasResetAll!=='undefined' ? this.hasResetAll = data.hasResetAll : this.hasResetAll = true;
	typeof data.hasDiscard!=='undefined' ? this.hasDiscard = data.hasDiscard : this.hasDiscard = true;
	typeof data.hasAccordion!=='undefined' ? this.hasAccordion = data.hasAccordion : this.hasAccordion = true;
	typeof data.hasTypeGroup!=='undefined' ? this.hasTypeGroup = data.hasTypeGroup : this.hasTypeGroup = true;
	typeof data.canHaveSubs!=='undefined' ? this.canHaveSubs = data.canHaveSubs : this.canhaveSubs = false;
	this.init();
}
