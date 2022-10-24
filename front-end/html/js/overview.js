XeraOverviewAccordionButton.prototype = {
	constructor: XeraOverviewAccordionButton,
	callAction:function(){
		this.action();
	},
	draw: function(){
		var that = this;
		this.accordionButton=document.createElement('button');
		this.accordionButton.id = this.id;
		$(this.accordionButton).addClass(this.className);
		$(this.accordionButton).css({'width':this.width,'min-width':this.minWidth,'max-width':this.maxWidth});
		$(this.accordionButton).on('click',function(){that.callAction()})
		if (this.imageTop!==false){
			this.topImage = document.createElement('span');
			$(this.topImage).html(this.imageTop);
			$(this.accordionButton).append(this.imageTop);
		}
		this.buttonText = document.createElement('span');
		$(this.buttonText).html(this.value);
		$(this.accordionButton).append(this.buttonText);
		$('#'+this.pare).append(this.accordionButton);
	}
}
function XeraOverviewAccordionButton(data){
	if (typeof data.pare!=='undefined'){
		if (typeof data.id!=='undefined'){
			this.id = data.id;
			typeof data.className!=='undefined' ? this.className = data.className : this.className = "xeraOverviewAccordionButton";
			typeof data.imageTop!=='undefined' ? this.imageTop = data.imageTop:this.imageTop = false;
			typeof data.width!=='undefined' ? this.width = data.width : this.width=50;
			typeof data.minWidth!=='undefined' ? this.minWidth = data.minWidth : this.minWidth=40;
			typeof data.maxWidth!=='undefined' ? this.maxWidth = data.maxWidth : this.maxWidth=60;
			typeof data.action!=='undefined' ? this.action = data.action ; this.action = function(){console.log("Accordion Button Clicked!");};
			typeof data.value!=='undefined' ? this.value = data.value : this.value = "Test";
		}
	}
}

XeraOverviewAccordion.prototype = {
	constructor: QuizAccordion,
	draw: function(){
	}
}
function XeraOverviewAccordion(data){
	if (typeof data.owner!=='undefined'){

	}
	else {
		appendDebugLog('No accordion owner assigned, aborting');
	}
}


XeraOverview.prototype = {
	constructor: XeraOverview,
	init:function(){
		this.cardboxDue="?";
		this.cardboxTotal="?";
		this.quizList = new QuizList();
		this.fetchCardboxSummary();
		this.fetchQuizList();
	},
	initTimers:function(){
	},
	updateCardboxSummary:function(){
		$('#overviewCbDue').html(this.cardboxDue);
		$('#overviewCbTotal').html(this.cardboxTotal);
	},
	updateOverview:function(){
		this.currentQuiz = this.selectedQuiz;
		this.quizList.refreshQuizList();
		this.fetchQuizList();
	},
	updateSelected:function(val){
		this.selectedQuiz = val;
		this.updateOverview();
	},
	highlightQuizRow:function(){
		$("[id^=quizRow_]").removeClass('highlightRow');
		$("[id^=quizRow_]").addClass('steelRowed');
		$("#quizRow_"+this.selectedQuiz).addClass('highlightRow');
	},
	drawCardboxRow: function(){
		var that=this;
		var cbDiv=document.createElement('div');
		cbDiv.id="quizRow_-1";
		$(cbDiv).css({'width':'100%','font-family':'Montserrat ,sans-serif','font-weight':'400','border-radius':'0.3em','border':'1px solid black','width':'98%','padding':'3px','margin':'3px','background-color':'rgba(128,164,48,0.95)','color':'black','margin':'auto','text-align':'left','margin-bottom':'5px'});
		var header = document.createElement('div');
		var data = document.createElement('div');
		$(header).css({'font-size':'1.1em','width':'50%','font-variant':'small-caps'});
		$(header).html('Cardbox');
		$(data).css({'width':'50%','font-size':'0.7em','text-align':'left','text-overflow':'ellipsis','overflow':'hidden'});
		$(data).html('Questions: <span id="overviewCbTotal">'+this.cardboxTotal+'</span> Due: <span id="overviewCbDue">'+this.cardboxDue+"</span>");
		$(cbDiv).append(header,data);
		$('#content_pan_0').append(cbDiv);
		$('#'+cbDiv.id).prop("quizid",-1);
			$('#'+cbDiv.id).click(function(e){
				that.selectedQuiz=$(cbDiv).prop("quizid");
				that.highlightQuizRow();
			});
	},
	fetchQuizList:function(){
			clearTimeout(this.quizListWait);
			if (!this.quizList.initialized){
				this.quizListWait = setTimeout(XeraOverview.prototype.fetchQuizList.bind(this),250);
			}
			else {
				//console.log(this.quizList.quizList);
				$("#content_pan_0").empty();
				this.drawOverview();
			}
	},
	drawQuizAccordionButton(data){
	},

	drawQuizAccordion(id){
		var quizAccordion=document.createElement('div');
		$(quizAccordion).css({'width':'100%'});

		quizAccordion.id = "quizAccordion_"+id;

	},
	drawQuizRow: function(data){
		if (data.quizid==-1){
			this.drawCardboxRow();
		}
		else {
			var quizDiv = document.createElement('div');
			var infoGroup = document.createElement('div');
			var optGroup = document.createElement('div');
			var header = document.createElement('div');
			var info = document.createElement('div');
			var that=this;
			$(quizDiv).css({'display':'inline-table','width':'100%','font-family':'Montserrat,sans-serif','font-weight':'400','border-radius':'0.5em','border':'1px solid black','width':'98%','padding':'3px','margin':'3px','color':'black','margin':'auto','text-align':'left','margin-bottom':'5px'});
			$(infoGroup).css({'display':'table-cell','width':'60%'});
			$(optGroup).css({'display':'table-cell','width':'39%','border-left':'2px solid rgba(175,175,175,0.4)','padding-left':'2px'});
			$(header).css({'width':'100%','font-size':'1.1em','font-variant':'small-caps'});
			$(info).css({'width':'100%','font-size':'0.7em','text-align':'left','text-overflow':'ellipsis','overflow':'hidden'});
			quizDiv.id = "quizRow_"+data.quizid;
			$(header).html(data.quizname);
			$(info).html('Progress: '+(data.quizsize-data.untried)+'/'+data.quizsize+" Correct: "+(data.correct)+"/"+data.quizsize);
			$(infoGroup).append(header,info);

			if (data.untried!==data.quizsize){
				var resetOption=document.createElement('div');
				var resetAllButton = document.createElement('button');
				$(resetAllButton).addClass('btn btn-default silverRowed');
				$(resetAllButton).css({'width':'33%','display':'table-cell','font-variant':'small-caps','font-size':'0.7em','line-height':'1em','margin':'0px','padding':'2px','vertical-align':'top'});
				$(resetAllButton).html('🔄<br>Reset<br>All');
				$(resetOption).append(resetAllButton);
				$(optGroup).append(resetOption);
			};
			if (data.incorrect>0){
				var resetWrongOption=document.createElement('div');
				var resetWrongButton = document.createElement('button');
				$(resetWrongButton).addClass('btn btn-default silverRowed');
				$(resetWrongButton).css({'width':'33%','display':'table-cell','font-variant':'small-caps','font-size':'0.7em','line-height':'1em','margin':'0px','padding':'2px','vertical-align':'top'});
				$(resetWrongButton).html('🔄<br>Reset<br>Wrong');
				$(resetWrongOption).append(resetWrongButton);
				$(optGroup).append(resetWrongOption);
			}

			$(quizDiv).append(infoGroup,optGroup);
			$('#content_pan_0').append(quizDiv);
			$('#'+quizDiv.id).prop("quizid",data.quizid);
			$('#'+quizDiv.id).click(function(e){
				that.selectedQuiz=$(quizDiv).prop("quizid");
				that.highlightQuizRow();
			});
		}
	},
	findQuizData:function(id){
		for (var i=0; i < this.quizList.quizList.length; i++){
			if (this.quizList.quizList[i].quizid == id) return this.quizList.quizList[i];
		}
		return false;
	},
	drawOverview: function(){
		var currentHeader = document.createElement('div');
		$(currentHeader).css({'text-align':'left','font-size':'0.9em','font-variant':'small-caps','color':'rgba(240,240,213,1)'});
		$(currentHeader).html('Current Quiz');
		$('#content_pan_0').append(currentHeader);
		var that=this;
		var x = this.findQuizData(this.currentQuiz);
		if (x!==false){
			this.drawQuizRow(x);
		}
		var activeHeader = document.createElement('div');
		$(activeHeader).css({'margin-top':'10px','text-align':'left','font-size':'0.9em','font-variant':'small-caps','color':'rgba(240,240,213,1)'});
		$(activeHeader).html('Active Quizzes')
		$('#content_pan_0').append(activeHeader);
		this.quizList.quizList.forEach(function(row){
			console.log(row);
			if (row.quizid!==that.currentQuiz){
				that.drawQuizRow(row);
			}
		});
		var actionDiv = document.createElement('div');
		$(actionDiv).css({'border':'1px solid black','margin-top':'10px','padding':'2px'});
		$(actionDiv).addClass('steelRowed');
		var openInLabel = document.createElement('div');
		$(openInLabel).css({'margin-right':'5px','font-size':'0.9em','font-variant':'small-caps','display':'inline-block','color':'black','text-align':'right'})
		$(openInLabel).html("Open In:");
		var goButton = document.createElement('button');
		$(goButton).html('Go!');
		$(goButton).addClass('btn btn-default');
		$(goButton).css({'margin':'0 5px 0 0','width':'20%','height':'24px','padding':'0px','vertical-align':'middle'});
		this.highlightQuizRow();
		this.actionValues = [['Basic Quiz', startQuiz],['Cardbox Invaders',initInvaders], ['Wall of Words',initWordWall]];
		var list = new Array();
		this.actionValues.forEach(function(row,index){
			list.push([row[0],index]);
		});
		gGenerateListBox("overviewOpenIn",list,"content_pan_0",'');
		$('#overviewOpenIn').css({'width':'50%','font-variant':'small-caps','margin-top':'2px'});
		$('#overviewOpenIn').val(this.actionValue);
		$('#overviewOpenIn').on('change',function(e){console.log($(this).val);that.actionValue = $(this).val();});
		$(actionDiv).append(openInLabel,goButton);
		$('#content_pan_0').append(actionDiv);
		$('#overviewOpenIn').insertBefore(goButton);
		$(goButton).click(function(){
			var x = that.actionValues[that.actionValue][1];
			x({quizid : that.selectedQuiz});
			//that.updateOverview();
		});

	},
	tempCardboxValueGen: function(data){
		console.log(data);
		this.cardboxTotal=data.totalCards;
		this.cardboxDue=data.totalDue;
		//this.cardboxTotal = Object.values(data.totalCards).reduce(function(acc, val) { return acc + val; }, 0);
		//this.cardboxDue = Object.values(data.totalDue).reduce(function(acc, val) { return acc + val; }, 0);
		console.log("Total Alphagrams: " + this.cardboxTotal + " Due:" + this.cardboxDue);
	},
	fetchCardboxSummary:function(){
		clearTimeout(this.cardboxFetchTimer);
		var that=this;
		$.ajax({
			url:'getCardboxStats',
			data: JSON.stringify({overview:true}),
			context:this,
			type: "POST",
			success: function(response,responseStatus){
				that.cardboxFetchTimer=setTimeout(XeraOverview.prototype.fetchCardboxSummary.bind(this),60000);
				that.tempCardboxValueGen(response[0]);
				that.updateCardboxSummary();
			},
		});
	}
}
function XeraOverview(data){
	if (typeof data.currentQuiz!=='undefined'){
		this.currentQuiz=data.currentQuiz;
		this.selectedQuiz = data.currentQuiz;
	} else {this.currentQuiz=5;this.selectedQuiz=5;}
	this.actionValue=2;
	this.init();
}
function initXeraOverview(){
	if (!document.getElementById("pan_0")) {
		panelData = {
			"contentClass" : "panelContentDefault",
			"title": "Overview",
			"minimizeObject": "content_pan_0",
			"closeButton": false,
			"refreshButton" : false,
			"tooltip": "<p>Something helpful will go here.</p>"
		};
		generatePanel(0,panelData,"leftArea");
		overview = new XeraOverview({});
	}
}
