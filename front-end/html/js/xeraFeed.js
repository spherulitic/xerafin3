XeraFeedPlayerView.prototype = {
	constructor: XeraFeedPlayerView,
	init: function(){

	}
}
function XeraFeedPlayerView(data){
	typeof data.pare!=='undefined'? this.pare = data.pare : this.pare = "tournamentWrapper";
	this.plData = data.plData;
	this.story = data.story;
	if (typeof data.lastQuery!=='undefined'){this.lastView = data.lastQuery};
	this.init();
}

XeraFeedPanelUI.prototype = {
	changeValues: function(value){
		switch(value){
			case "type": this.currentView = $("#feedTypeList").val();
			case "division": this.currentDiv = Number($("#feedDivisionList").val());
			case "round": this.currentRound = Number($("#feedRoundList").val());
			case "sort": this.currentESort = Number($("#feedEntrantSortList").val());
			case "class": this.currentClass = $("#feedEntrantClassList").val();
			case "player": this.currentPlayer = Number($("#feedPlayerList").val())
		}
	},
	resetFeedTypes: function(){
		var x;var current;
		$('#tournamentSecFiltersDiv').empty();
		var content = new Array();
		var that=this;
		if (this.staticData.players.length>1){
			x = new Array();
			this.staticData.players.forEach(function(elem,index){
				x.push(['Division '+that.staticData.divisions[index].name,index]);
			});
			content.push (["feedDivisionList", x, "tournamentSecFiltersDiv", "",this.currentDiv,"division"]);
		}
		switch (this.currentView){
			case 'ST':
			case 'RE':
				var y = new Array();
				var z = new Array();
				for (x=0;x<this.staticData.roundsPlayed[0];x++){
					y.push(['Round '+(x+1),x+1]);
				}
				if (Math.min.apply(null,this.staticData.roundsPlayed)<this.staticData.config.max_rounds){
					y.push(['Latest',0]);
					this.currentRound=0;
				}
				else {this.currentRound = x;}
				content.push (["feedRoundList", y, "tournamentSecFiltersDiv","",this.currentRound,"round"]);
				break;
			case 'EN':
				if (typeof this.staticData.divisions[this.currentDiv].classes !=='undefined'){
					var cl = new Array();
					for (x=1;x<=this.staticData.divisions[this.currentDiv].classes;x++){
						cl.push (['Class '+ String.fromCharCode(64+x), String.fromCharCode(64+x)]);
					}
					cl.push (['All Classes',"-1"]);
					content.push(['feedEntrantClassList',cl,'tournamentSecFiltersDiv',"",this.currentClass,"class"]);
				}
				y = [['By Name',0],['By Rating',1]];
				content.push (["feedEntrantSortList", y, "tournamentSecFiltersDiv","",this.currentESort,"sort"]);
				break;
			case 'PL':
				var playerIndex = new Array();
				if (typeof this.staticData.players[this.currentDiv]!=='undefined'){
					var pl = this.staticData.players[this.currentDiv].slice(0);
					pl=pl.sort(function(a,b){
						if (a['name']===b['name']) {return a['rat'] < b['rat'] ? 1 : -1;}
						return (a['name'] < b['name']) ? -1 : 1;
					});
					pl.forEach(function(player,index){
						playerIndex.push([player.name,player.id]);
					});
				};
				content.push (['feedPlayerList', playerIndex, 'tournamentSecFiltersDiv','',this.currentPlayer,"player"]);
				break;
		}
		content.forEach(function(elem,index){
			gGenerateListBox (elem[0], elem[1], elem[2], elem[3]);
			$("#"+elem[0]).val(elem[4]);
			$("#"+elem[0]).css({
				'font-variant':'small-caps',
				'font-size':'0.9em',
				'background-color':'rgba(247,247,223,0.9)',
				'color':'rgba(26,26,26,1)',
				'width':(90/content.length)+'%',
				'margin':'auto 0',
				'margin-bottom':'0px'
			});
			$('#'+elem[0]).change(function(){
				that.changeValues(elem[5]);
				that.resetFeedTypes();
				that.sendQuery();

			});
			if (index===0 && content.length>1){
					$("#"+elem[0]).css({'border-top-right-radius':'2px','border-bottom-right-radius':'2px'});
			}
			else if ((index==content.length-1) && content.length>1) {
				$("#"+elem[0]).css({'border-top-left-radius':'2px','border-bottom-left-radius':'2px'});
			}
			else {
				if (content.length!==1){
					$("#"+elem[0]).css({'border-radius':'2px'});
				}
			}
		});
	},
	init: function(){
	if (!document.getElementById('pan_'+this.id)) {
		var panelData = {
			"title": this.title,
			"tooltip": "<p>This is Version 2 of the tsh feed viewer, rolled out on March 3rd 2019.  Please inform us of any errors that you experience.</p>",
			"contentClass" : "panelContentDefault"
		}
		generatePanel(this.id,panelData,this.defaultCol,this.refreshFunc,this.closeFunc);
		gCreateElemArray([
			['a','div','tournamentCont','tournamentWrapper','content_pan_'+this.id,''],
			['a1','div','tournamentHeading metalBOne','tournamentHeading','a',''],
			['a2','div','tournamentParap','tournamentParap','a',''],
			['a3','div','tournamentSelectors','tournamentSelectors','a',''],
			['a3a','div','tournamentMainFilterDiv steelRowed','tournamentMainFilterDiv','a3',''],
			['a3b','div','tournamentSecFiltersDiv highlightRow','tournamentSecFiltersDiv','a3',''],
			['a4','div','tournamentView pre-scrollable','tournamentView','a',''],
			['a5','div','tournamentFooter','tournamentFooter','a','']
		]);
		$('#tournamentHeading').css({'border-radius':'10px 10px 0 0','width':'100%','color':'rgba(213,213,210,1)','padding':'3px','border':'1px solid black','border-bottom':'0','margin-bottom':'0px','font-size':'1.2em','font-variant':'small-caps','font-family':'Lato, sans-serif'});
		$('#tournamentParap').css({'background-color':'rgba(0,0,0,1)','border':'1px solid black','border-bottom':'0','font-variant':'small-caps','font-size':'0.8em','font-family':'Montserrat,sans-serif','width':'100%','color':'rgba(213,213,210,1)','text-align':'center'})
		$('#tournamentMainFilterDiv').css({'width':'100%','padding':'3px','margin-bottom':'0px','border':'1px solid black','border-bottom':'1px solid black'});
		$('#tournamentSecFiltersDiv').css({'width':'100%','padding':'3px','margin-bottom':'0px','border':'1px solid black','border-top':'0','border-radius':'0 0 10px 10px'});
	}
	else {
		console.log('XeraFeed Init Error:  Panel already exists.');
		appendDebugLog('XeraFeed Init Error:  Panel already exists.');
		}
	},
	showEntrants: function(){
		$('#tournamentView').empty();
		var x;
		var that=this;
		var play = this.staticData.players[this.currentDiv].slice(0);
		x = this.currentClass;
		if (x!=="-1"){
			play=play.filter(function(value){
				return value['class'] == x;
			});
		}
		if (typeof this.currentESort!=='undefined'){
			x = Number(this.currentESort);
			if (x==1){
				play=play.sort(function(a,b){
					if (a['rat']===b['rat']) {return a['name'] < b['name'] ? -1 : 1;}
					return (a['rat'] > b['rat']) ? -1 : 1;
				});
			}
			if (x==0){
				play=play.sort(function(a,b){
					if (a['name']===b['name']) {return a['rat'] < b['rat'] ? 1 : -1;}
					return (a['name'] < b['name']) ? -1 : 1;
				});
			}
		}
		var view = document.createElement('div');
		$(view).css({'min-width':'200px!important','text-align':'center','margin':'auto','display':'table','margin-top':'10px'});
		play.forEach(function(player, index){
				var z = document.createElement('div');
				z.id='xeraFeedPlayerRoster'+that.currentDiv+"_"+player.id;
				$(z).css({'margin-top':'3px','display':'table-row','height':'24px!important'});
				$(z).prop('division-link',that.currentDiv);
				$(z).prop('player-link',player.id);
				$(z).css({'width':'100%'});
				var picBorder = document.createElement('div');
				$(picBorder).css({'overflow':'hidden','height':'24px','width':'24px','margin':'auto','border-radius':'10px 0 0 10px','box-shadow': '0px 0px 3px #666, 0px 0px 3px #666, 0px 0px 3px #666'});
				var pic=document.createElement('img');
				$(pic).css({'width':'24px','border':'inherit','border-collapse':'collapse','border-radius':'10px 0 0 10px'});
				pic.src = player.photo;
				var a = document.createElement('div');
				var b = document.createElement('div');
				var c = document.createElement('div');
				$(b).html(player.name);
				$(c).html(player.rat);
				$(a).css({'text-align':'right','display':'table-cell'});
				$(b).css({'color':'rgba(213,213,210,1)','padding-left':'5px','padding-right':'5px','font-variant':'small-caps','vertical-align':'middle','text-align':'left','display':'table-cell'});
				$(c).css({'color':'rgba(213,213,210,1)','padding-left':'5px','padding-right':'5px','font-variant':'small-caps','vertical-align':'middle','text-align':'center','display':'table-cell'});
				$(picBorder).append(pic);
				$(a).append(picBorder);
				$(z).append(a,b);
				if ((typeof player.class!=='undefined') && (that.currentClass=="-1")){
					var d = document.createElement('div');
					$(d).css({'color':'rgba(213,213,210,1)','padding-left':'5px','padding-right':'5px','font-variant':'small-caps','vertical-align':'middle','text-align':'left','display':'table-cell'});
					$(d).html(player.class);
					$(z).append(d);
				}
				$(z).append(c);
				$(z).click(function(){
					that.getPlayerQuery(Number($(this).prop("player-link")), Number($(this).prop("division-link")));
				});
				$(view).append(z);
				x++;
		});
		$('#tournamentView').append(view);
	},
	displayOrder: function(value){
		var orderVal;
		switch (value){
			case 0: orderVal="---";break;
			case 1: orderVal="1st";break;
			case 2: orderVal="2nd";break;
			case 3: orderVal="-D-";break;
			default: orderVal="-?-";break;
		}
		return orderVal;
	},
	showPlayer:function(){
		var that=this;
		$('#tournamentView').empty();
		$('#tournamentView').css({'max-width':'100%!important'});
		$('#tournamentView').append('<b>'+this.staticData.players[this.currentDiv][Number(this.data.id)-1].name+'</b><br>');
		var resultContainer = document.createElement('div');
		$(resultContainer).addClass('xeraFeedPlayerResCont');
		var resultTable = document.createElement('div');
		var resultRow;
		var orderVal;

		$(resultTable).addClass('xeraFeedPlayerRes');
		if (this.data.results!=='undefined'){
			for (var x = this.data.results.length; x > 0 ; x--){
				if (this.data.results[x-1].result.opp !== 0){
					var opp = this.staticData.players[this.currentDiv][Number(this.data.results[x-1].result.opp)-1];
					var oppName = opp.name;
					var oppPhoto = opp.photo;
					var where = this.displayOrder(this.data.results[x-1].result.order)
					if (this.data.results[x-1].result.tab!=='0'){
					where +="@"+this.data.results[x-1].result.tab;
					if ((Number(this.data.results[x-1].result.for) == 0) && (Number(this.data.results[x-1].result.aga == 0))){
						var result = "...";
					}
					else {var result = this.data.results[x-1].result.for+" : "+this.data.results[x-1].result.aga;}
					}
				}
				else {
					var oppName = "Bye";
					var oppPhoto = "images/unknown_player.gif";
					var where = "---";
					var result = this.data.results[x-1].result.for+" : "+this.data.results[x-1].result.aga;
				}
				var ratChange = this.data.results[x-1].rating-this.staticData.players[this.currentDiv][Number(this.data.id)-1].rat
				var ratOutp;
				if (ratChange>0) {ratOutp = "(<span class='glyphicon glyphicon-arrow-up' style='color:green'></span>"+Math.abs(ratChange)+")";}
				if (ratChange<0) {ratOutp = "(<span class='glyphicon glyphicon-arrow-down' style='color:firebrick'></span>"+Math.abs(ratChange)+")";}
				if (ratChange===0) {ratOutp = "";}
				resultReg = document.createElement('div');
				resultRow = document.createElement('div');
				$(resultRow).addClass('resRow noselect');
				var resTest = this.data.results[x-1].result.for - this.data.results[x-1].result.aga;
				var winRec = this.data.results[x-1].win + "-" + this.data.results[x-1].loss +" ("+ this.data.results[x-1].spread+")";
				var columnDivs = new Array();
				var columnInfo = [
					"Round "+x,
					"<div style='width:36px;display:inline-block;vertical-align:top;'><img src='"+oppPhoto+"'></div><div style='width:42px;margin-left:3px;text-align:center;display:inline-block;'>"+where+"<br><span style='font-size:1.3em;font-weight:bold;'>#"+this.data.results[x-1].result.opp+"</span></div>",
					"<div style='line-height:14px;'>"+oppName+"</div>",
					result,
					this.data.results[x-1].rank+getOrdinal(this.data.results[x-1].rank)+" place",
					winRec.replace(/\.5/g,'½'),
					this.data.results[x-1].rating + ratOutp

				];
				columnInfo.forEach(function(elem,index){
					columnDivs[index] = document.createElement('div');
					if (index === 3){
						if (resTest > 0) {$(columnDivs[index]).addClass('xeraFeedWinHighlight');}
						if (resTest < 0) {$(columnDivs[index]).addClass('xeraFeedLossHighlight');}
						if (resTest == 0) {$(columnDivs[index]).addClass('xeraFeedDrawHighlight');}
					}
					$(columnDivs[index]).html(columnInfo[index]);
					$(resultReg).append(columnDivs[index]);
				});
				$(resultRow).append(resultReg);
				$(resultTable).append(resultRow);
			}
		}

		$(resultContainer).append(resultTable);
		$('#tournamentView').append(resultContainer);
		//$('#tournamentView').append("<span style='color:white;background-color:transparent;overflow-x:hidden;word-break:break-all;word-wrap:break-word;text-overflow:hidden;'>"+JSON.stringify(this.data)+"</span>");
/*
		this.data.results.forEach(function(row,index){


				var columnInfo = [];
				var oppImg = document.createElement('img');
				oppValue = document.createElement('td');
				orderValue = document.createElement('td');
				forValue = document.createElement('td');
				scoreBreak= document.createElement('td');
				agaValue = document.createElement('td');
				if (row.result.opp!==0) {
					oppImg.src = opp.photo;
					$(oppValue).html("#"+row.result.opp+" "+opp.name);
				}
				else {
					oppImg.src = "../images/unknown_player.png";
					$(oppValue).html('Bye');
				}

				$(orderValue).html(orderVal);
				$(forValue).html(row.result.for);
				$(scoreBreak).html(":");
				$(agaValue).html(row.result.aga);
				if (row.result.for - row.result.aga > 0) {$(resultRow).css({'background-color':'rgba(128,192,48,1)'});}
		});
	*/
	},
	showResults:function(){
		$('#tournamentView').empty();
		$('#tournamentView').css({'max-width':'100%!important'});
		$('#tournamentView').append("<span style='color:white;background-color:transparent;overflow-x:hidden;word-break:break-all;word-wrap:break-word;'>"+JSON.stringify(this.data)+"</span>");
	},
	showStandings:function(){
		$('#tournamentView').empty();
		$('#tournamentView').css({'max-width':'100%!important'});
		$('#tournamentView').append("<span style='color:white;background-color:transparent;overflow-x:hidden;word-wrap:break-word;word-break:break-all;'>"+JSON.stringify(this.data)+"</span>");
	},

	getPlayerQuery: function(player,div){
		this.currentDiv = div;
		this.currentPlayer = player;
		this.currentView='PL';
		$('#feedTypeList').val(this.currentView);
		this.resetFeedTypes();
		this.dataSource.sendQuery({'view':'PL', 'player': Number(player), 'division': div});
	},
	setDataSource: function(val){
		this.dataSource = val;
	},
	sendQuery: function(){
		var data= {};
		switch(this.currentView){
			case 'CO': data = {'view':'CO'};break;
			case 'RE': data = {'view':'RE', 'round':this.currentRound-1, 'division': this.currentDiv};break;
			case 'PL': data = {'view':'PL', 'player':this.currentPlayer, 'division': this.currentDiv};break;
			case 'ST': data = {'view':'ST', 'round':this.currentRound-1, 'division': this.currentDiv};break;
		}
		$("#heading_text_pan_"+this.id).html(this.title+' <img src="images/ajaxLoad.gif" style="height:0.8em">');
		if (this.currentView!=='EN'){this.dataSource.sendQuery(data);}
		else {
			this.showEntrants();
			$("#heading_text_pan_"+this.id).html(this.title);

		}
	},
	populateHeader: function(){
		$('#tournamentHeading').html(this.staticData.config.event_name);
		$('#tournamentParap').html(
		"<span style='font-weight:bold;'>"+this.staticData.config.event_date+"</span>  Rounds:  <span style='font-weight:bold;'>"+this.staticData.config.max_rounds+"</span>  Ratings:  <span style='font-weight:bold;'>"+this.staticData.config.rating_system.toUpperCase()+"</span")
		$('#tournamentMainFilterDiv').empty();
		$('#tournamentSecFiltersDiv').empty();
		gGenerateListBox ("feedTypeList", [["Player Lists","EN"],["Players","PL"],["Results","RE"],["Standings","ST"]], "tournamentMainFilterDiv","");
		$('#feedTypeList').val(this.currentView);
		$('#feedTypeList').css({'width':'90%','margin':'auto 0','margin-bottom':'0px','font-size':'1.1em','font-variant':'small-caps'});
		$('#feedTypeList').children().css({'text-align':'center','width':'100%','font-size':'0.9em','height':'1em'});
		var that = this;
		$("#feedTypeList").change(function() {
			that.changeValues('type');
			that.resetFeedTypes($(this).val());
			that.sendQuery({'view':$(this).val()});
		});
		this.resetFeedTypes(this.currentView);
		this.sendQuery({'view':this.currentView});
	},
	populate: function(){
		this.dataSource.sendQuery({'view':'CO'});
	},
	checkStaticData: function(){
		clearTimeout(this.staticTimeout);
		if (typeof this.staticData!=='undefined'){
			this.populateHeader();
		}
		else {this.staticTimeout=setTimeout(XeraFeedPanelUI.prototype.checkStaticData.bind(this),75);}
	},
	update: function(data){
		$("#heading_text_pan_"+this.id).html(this.title);
		switch(data.view){
			case 'CO': this.staticData = data.data;this.checkStaticData();break;
			case 'PL': this.data = data.data;this.showPlayer();break;
			case 'RE': this.data = data.data;this.showResults();break;
			case 'ST': this.data = data.data;this.showStandings();break;

		}
		console.log(data);
	},
	resetParams :function(){
		this.currentDiv = 0;
		this.currentRound = -1;
		this.currentESort = 1;
		this.currentClass = "-1";
		this.currentView = "EN";
		this.currentPlayer = 1;
	}
}
function XeraFeedPanelUI(data){
	typeof data.id!=='undefined' ? this.id = data.id : this.id = "100";
	typeof data.title!=='undefined' ? this.title = data.title : this.title = "XeraFeed";
	typeof data.defaultCol!=='undefined' ? this.defaultCol = data.defaultCol : this.defaultCol = 'leftArea';
	this.refreshFunc = data.refreshFunc;
	this.closeFunc = data.closeFunc;
	this.resetParams();
	this.init();
}

function initXeraFeed(id){
	if (typeof id==='undefined'){
		if (typeof localStorage.xeraFeedLastTournament !=='undefined'){
			id = Number(localStorage.xeraFeedLastTournament);
		}
		else {
			id = 1;
			localStorage.setItem("xeraFeedLastTournament","1");
			console.log('Xerafeed Init Error: No tournament id specified. Default test Data loaded');
		}
	}
	localStorage.xeraFeedLastTournament=id;
	if (typeof xeraFed!=='undefined'){
			if (Number(xeraFed.tournamentId) !== Number(id)){
				delete xeraFed.staticData;
				delete xeraFeedViewer.staticData;
				xeraFed.switchTournament({'tournamentId':Number(id)});
				xeraFeedViewer.resetParams();
				xeraFeedViewer.populate();
			}
	}
	else {
		xeraFeedViewer = new XeraFeedPanelUI({
			'refreshFunc' : xeraFeedRefresh,
			'closeFunc' : xeraFeedClose
		})
		xeraFed = new XeraFeed({
		'tournamentId': Number(id),
		'dataTarget': xeraFeedViewer
		});
		xeraFeedViewer.setDataSource(xeraFed);
		xeraFeedViewer.populate();
	}
}
function xeraFeedRefresh(){
}
function xeraFeedClose(){
	$('#pan_'+xeraFeedViewer.id).remove();
	delete xeraFed;
	delete xeraFeedViewer;
}
