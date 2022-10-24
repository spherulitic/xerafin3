XeraOverviewList.prototype = {
	constructor: XeraOverviewList,
	getTimeDiff:function(a,b){
		var v=b-a;
		if (v<0) {v=-v;dist='+';} else {dist='-';}
		var x = v/1000;var res;var gap;
		if (x>=86400*30.6){gap = "Mths";res = Math.floor(x/(86400*30.6));}
		if (x<86400*30.6){gap = "Days";res = Math.floor(x/86400);}
		if (x<86400){gap = "Hours";res = Math.floor(x/3600);}
		if (x<3600){gap = "Mins";res = Math.floor(x/60);}
		if (x<60){gap = "s";res = Math.floor(x/60);}
		if (x===0){gap ="Ok";return gap;}
		return dist+""+res+" "+gap;
	},
	updateCurrentQuiz: function(data){
		this.drawListRowGroup('Current Quiz',data,'Current');
		this.updateSelectedQuiz(data.quizid);
	},
	updateActiveQuiz: function(data){
		if (Object.keys(data).length>0){
			this.drawListRowGroup('Active Quizzes',data,'Active');
		}
		else {$('#overviewActive').hide();}
	},
	updateCompletedQuiz: function(data){
		if (Object.keys(data).length>0){
			this.drawListRowGroup('Recently Completed',data,'Complete');
		}
		else {$('#overviewCompleted').hide();}
	},
	highlightListRow: function(quizid){
		if (typeof quizid!=='undefined'){
			var that=this;
			this.selectedQuiz = quizid;
			$('[id^='+this.id+'_quiz_]').removeClass('highlightRow overviewListHighlight');
			if (typeof this.list!=='undefined'){
				Object.entries(this.list).forEach(function([index,value]){
					if (typeof that.list[index].list!=='undefined'){
						Object.entries(that.list[index].list.elems).forEach(function([i,v]){
							if (Number(i) === Number(quizid)) {
								$(that.list[index].list.elems[i].selector).addClass('highlightRow overviewListHighlight');
							}
						});
					}
				});
			}
		}
	},
	updateSelectedQuiz: function(quizid){
		//console.log(quizid);
		this.highlightListRow(quizid);
	},
	updateCardboxValues: function(data){
		$(this.cbxTotalSpan).html(data.totalCards);
		$(this.cbxDueSpan).html(data.totalDue);
		$(this.cbxTimeSpan).html(" ⏰ "+this.getTimeDiff(data.earliestDueDate*1000, Math.floor(new Date().getTime())));
		this.action('SET_CBX_RDY');
	},
	drawTypeIndicator:function(data){
		var value="";
		var tooltip="";
		switch (true) {
			case (RegExp(/^Daily\s/g).test(data.quizname)) : value = '📆';tooltip = 'Daily Quiz';break;
			case (RegExp(/^New\s/g).test(data.quizname)) : value = '🆕';tooltip = 'New Lexicon Words';break;
			case data.quizid === -1 : value = '📦';tooltip = 'Cardbox';break;
			default: value = '❔';tooltip = 'Other Quiz';break;
		}
		var typeIndicator = document.createElement('div');
		$(typeIndicator).attr('title',tooltip);
		$(typeIndicator).addClass('overviewTypeIndicator steelRowed');
		$(typeIndicator).html(value);
		return typeIndicator;
	},
	drawCompletedData:function(data){
		//completed stat is defunct in this case, no point including it
		//just need to show result
		var info = document.createElement('div');
		var correctSpan = document.createElement('span');
		$(correctSpan).addClass('cbxSpan');
		correctSpan.id = this.id+"_correct_"+data.quizid;
		$(info).append(" Correct: ", correctSpan);
		$(correctSpan).html(data.correct+"/"+data.quizsize);
		return info;
	},
	drawCardboxDataInfo:function(){
		var info = document.createElement('div');
		$(info).append("Alphas:",this.cbxTotalSpan," Due:",this.cbxDueSpan,this.cbxTimeSpan);
		return info;
	},
	drawCardboxDataAction:function(){
		var boxButton = document.createElement('button');
		$(boxButton).html("📄");
		$(boxButton).addClass('silverRowed overviewListButton');
		$(boxButton).on('click', function(e){
			e.stopPropagation();
			showCardboxStats();
		});
		return boxButton;
	},
	updateActiveData:function(data){
		$('#'+this.id+"_comp_"+data.quizid).html((data.quizsize-data.untried)+'/'+data.quizsize);
		$('#'+this.id+"_correct_"+data.quizid).html(data.correct+"/"+data.quizsize);
	},
	updateCompletedData:function(data){
		$('#'+this.id+"_correct_"+data.quizid).html(data.correct+"/"+data.quizsize);
	},
	drawActiveData:function(data){
		var info = document.createElement('div');
		var completedSpan = document.createElement('span');
		$(completedSpan).addClass('cbxSpan');
		completedSpan.id = this.id+"_comp_"+data.quizid;
		var correctSpan = document.createElement('span');
		$(correctSpan).addClass('cbxSpan');
		correctSpan.id = this.id+"_correct_"+data.quizid;
		$(info).append('Progress: ', completedSpan, " Correct: ", correctSpan);
		$(completedSpan).html((data.quizsize-data.untried)+'/'+data.quizsize);
		$(correctSpan).html(data.correct+"/"+data.quizsize);
		return info;
	},
	drawListRow:function(data){
		var that = this;
		var x = {};
		x.selectRegion = document.createElement('div');
		x.selector = document.createElement('div');
		x.selector.id = this.id+"_quiz_"+data.quizid;
		$(x.selector).addClass('overviewItem steelRowed');
		x.value = data.quizid;
		if (data.status==='Completed') {x.value = -2;}
		x.quizid = data.quizid;
		x.name = data.quizname;
		var typeGroup = document.createElement('div');
		$(typeGroup).addClass('overviewTypeGroup');
		var infoGroup = document.createElement('div');
		$(infoGroup).addClass ('overviewInfoGroup');
		var optGroup = document.createElement('div');
		$(optGroup).addClass ('overviewItemOptGroup');
		var header = document.createElement('div');
		$(header).addClass('overviewItemHeading');
		var info = document.createElement('div');
		$(info).addClass('overviewItemInfoGroupInfo');
		$(header).html(data.quizname);
		if (data.quizid===-1){
			$(info).append(this.drawCardboxDataInfo());
			$(optGroup).append(this.drawCardboxDataAction());
		}
		else {
			//quizList.resetQuiz(elem.quizid, "resetwrong")
			x.accordion = document.createElement('div');
			$(x.accordion).addClass("overviewAccordion");
			x.buttonGroup = document.createElement('div');
			$(x.buttonGroup).css({'width':'90%','margin':'auto'});
			x.resetAll = document.createElement('button');
			x.resetAll.id = this.id+"_rAll_"+data.quizid;
			$(x.resetAll).addClass('silverRowed overviewListButton overviewAccordionButton');
			$(x.resetAll).html("↻ Reset All");
			x.resetWrong = document.createElement('button');
			$(x.resetWrong).addClass('silverRowed overviewListButton overviewAccordionButton');
			$(x.resetWrong).html("↻ Reset Wrong");
			x.resetWrong.id = this.id+"_rWrong_"+data.quizid;
			x.discard = document.createElement('button');
			$(x.discard).addClass('silverRowed overviewListButton overviewAccordionButton');
			$(x.discard).html("❌ Discard");
			x.discard.id = this.id+"_rDiscard_"+data.quizid;
			$(x.resetAll).click(function(e){
				e.stopPropagation();
				if (confirm("This will reset all progress for the quiz "+data.quizname)){
					that.action("QID_RST_ALL", data.quizid);
				}
			});
			$(x.resetWrong).click(function(e){
				e.stopPropagation();
				if (confirm("This will remove all wrong answers from the quiz "+data.quizname)){
					that.action("QID_RST_WNG", data.quizid);
				}
			});
			$(x.discard).click(function(e){
				e.stopPropagation();
				if (confirm("This will remove the quiz "+data.quizname+" from your quizzes.")){
					//that.action("QID_RST_WNG", data.quizid);
				}
			});
			$(x.resetWrong).prop('disabled',data.incorrect===0);
			$(x.resetAll).prop('disabled',data.untried===0);
			$(x.buttonGroup).append(x.resetWrong, x.resetAll, x.discard);
			$(x.accordion).append(x.buttonGroup);
			var chevyDiv = document.createElement('button');
			$(chevyDiv).addClass('silverRowed overviewListButton');
			$(chevyDiv).html("▼");
			$(x.accordion).hide();
			$(chevyDiv).on('click',function(e){
				e.stopPropagation();
				if ($(chevyDiv).html()==="▲") {
					$(chevyDiv).html("▼");
					$(x.accordion).hide(300);
				}
				else {
					$(chevyDiv).html("▲");
					$(x.accordion).show(300);
				}
			});
			$(optGroup).append(chevyDiv);

			if (data.status === 'Active'){$(info).append(this.drawActiveData(data));}
			if (data.status === 'Completed'){$(info).append(this.drawCompletedData(data));}
		}
		$(typeGroup).append(this.drawTypeIndicator(data));
		$(infoGroup).append(header,info);
		$(x.selector).append(typeGroup,infoGroup,optGroup);
		$(x.selectRegion).append(x.selector);
		if (data.quizid!==-1){
			$(x.selectRegion).append(x.accordion);
		}
		return x;
	},
	createGroupDivs: function(id, title){
		this.list[id].title = document.createElement('div');
		$(this.list[id].title).addClass('overviewGroupHeader metalBOne');
		$(this.list[id].title).html(title);
		this.list[id].list = document.createElement('div');
		this.list[id].list.id = id+"_list";
		$(this.list[id].container).append(this.list[id].title,this.list[id].list);
	},
	drawListRowGroup: function(title,data,id){
		var that=this;
		if (typeof this.list[id].list === 'undefined') {
			this.createGroupDivs(id,title)
			this.list[id].list.elems = new Array();
		};
		if (Object.keys(this.list[id].list.elems).length>0){
			var x = Object.keys(this.list[id].list.elems);
			x.forEach(function(row,index){
				if (typeof data[row]==='undefined'){
					//console.log('Div content');
					//console.log(that.list[id].list.elems[row]);
					$(that.list[id].list.elems[row].selectRegion).remove();
					delete that.list[id].list.elems[row];
				}
			});
		}
		Object.entries(data).forEach(function([index,value]){
			if (typeof that.list[id].list.elems[data[index].quizid]!=='undefined'){
				if (index!=='-1'){
					if (data[data[index].quizid].status  === 'Active') {that.updateActiveData(data[index]);}
					if (data[data[index].quizid].status  === 'Completed') {that.updateCompletedData(data[index]);}
				}
			}
			else {
				that.list[id].list.elems[data[index].quizid] = that.drawListRow(data[index]);

			}
			$(that.list[id].list.elems[data[index].quizid].resetAll).prop('disabled',data[index].untried===data[index].quizsize);
			$(that.list[id].list.elems[data[index].quizid].resetWrong).prop('disabled',data[index].incorrect===0);
		});
		var y = false;
		var z;
		Object.entries(this.list[id].list.elems).forEach(function([index,row]){
			if (row.quizid!==-1) {$(that.list[id].list).append(row.selectRegion);}
			else {y = true;z = row.selectRegion}
			$(row.selector).on('click',function(){
				that.action('UPD_SEL_QID', row.quizid);
				that.action('UPD_GO_VAL',row.value);
				that.action('UPD_GO_NAME', row.name);
			});
		});
		if (y) {$(that.list[id].list).prepend(z);}
		Object.entries(this.list[id].list.elems).length > 0 ? $(this.list[id].title).show() :$(this.list[id].title).hide();
		$(this.list[id].container).show();
	},
	initNewListRegion:function(name){
		this.list[name] = {};
		this.list[name].container = document.createElement('div');
		this.list[name].container.id = this.id + name;
	},
	init:function(){
		this.list = {};
		this.content=document.createElement('div');
		this.content.id = this.id;
		this.cbxTotalSpan = document.createElement('span');
		$(this.cbxTotalSpan).addClass('cbxSpan');
		this.cbxDueSpan = document.createElement('span');
		$(this.cbxDueSpan).addClass('cbxSpan');
		this.cbxTimeSpan = document.createElement('span');
		$(this.cbxTimeSpan).addClass('cbxSpan');
		this.initNewListRegion('Current');
		this.initNewListRegion('Active');
		this.initNewListRegion('Complete');
		$(this.content).addClass(this.className);
		$(this.content).addClass('well well-sm pre-scrollable noselect');
		$(this.content).append(this.list['Current'].container, this.list['Active'].container, this.list['Complete'].container);
	},
	show:function(){
		$('#'+this.pare).append(this.content);
	},
	progressbar:function(){
		//work in progress, ripped from sloth
		var progress = Math.round((slothScore/totalScore)*100) + '%';
		$('#progressBar').attr('aria-valuenow', progress).css('width',progress);
		$('#progressLabel').html(progress);
		$('#progressBar').attr('role','progressbar');
		$('#progressBar').attr('aria-valuenow', '0%').css('width','0%');
	}
}
function XeraOverviewList(data = {}){
	if (typeof data.id!=='undefined') {
		this.id = data.id;
		if (typeof data.pare!=='undefined') {
			this.pare = data.pare;
			this.className = "overviewList";
			this.init();
		}
		else {appendDebugLog ("XeraOverviewList Error : no parent DOM object defined!");}
	}
	else {appendDebugLog("XeraOverlistList Error : no id defined!");}
}
