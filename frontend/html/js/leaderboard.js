
function initLeaderboard(){
	if (typeof localStorage.defaultRankGroup=='undefined'){localStorage.setItem('defaultRankGroup','1');}
	if (typeof localStorage.defaultRankType=='undefined'){localStorage.setItem('defaultRankType','1');}
	if (typeof localStorage.defaultRankPeriod=='undefined'){localStorage.setItem('defaultRankPeriod','1');}
	if (typeof localStorage.defaultAwardSort=='undefined'){localStorage.setItem('defaultAwardSort','1');}
	if (typeof localStorage.defaultAwardPeriod=='undefined'){localStorage.setItem('defaultAwardPeriod','0');}
	if (typeof localStorage.awardRankType=='undefined'){localStorage.setItem('awardRankType','1');}
	if (typeof localStorage.lbPagPlusMinus=='undefined'){localStorage.setItem('lbPagPlusMinus','5');}
	if (typeof localStorage.lbPagNumResults=='undefined'){localStorage.setItem('lbPagNumResults','10');};
	showLeaderboardHeader();
	leaderboardExchange();
}
function resetLBTypes (value){
	var content = new Array();
	$('#lbFilters').empty();
	switch (Number(value)){
		case 1:
			content[0]=["rankList",[["Leaderboard",1],["My Rank",2]],"lbFilters","",localStorage.defaultRankType,"localStorage.defaultRankType"];
			content[1]=["periodList", [["Today",1], ["This Week",3], ["This Month",5], ["This Year",6], ["All-Time",9], ["Yesterday",2], ["Last Week",4], ["Last Month",7],  ["Last Year",8] ],
			"lbFilters", "",localStorage.defaultRankPeriod,"localStorage.defaultRankPeriod"];
		break;
		case 2:
			content[0]=["rankAwardList",[["Leaderboard",1],["My Rank",2]],"lbFilters","",localStorage.awardRankType,"localStorage.awardRankType"];
			content[1]=["methodList",[["Highest Awards",1],["Most Awards",2]],"lbFilters","",localStorage.defaultAwardSort,"localStorage.defaultAwardSort"];
			var awardPeriodArray = function(){
					var x=[["All Time",0]];
					var currDate=new Date();
					var p = currDate.getTime();
					var q = currDate.getTimezoneOffset();
					var z = Number(p) - (24*60*60*1000) + (6*60*1000) - ((240-Number(q))*1000*60);
					console.log(z);
					var newDate = new Date(z);
					var tim = newDate.getFullYear();
					console.log(tim);
					for (var y=tim;y>=2018;y--){
						x.push([y,y]);
					}
					return x;
			}
			content[2]=["periodAwardList",awardPeriodArray(),"lbFilters","",localStorage.defaultAwardPeriod,"localStorage.defaultAwardPeriod"];
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
		if (index==0){
			$("#"+elem[0]).css({'border-top-right-radius':'2px','border-bottom-right-radius':'2px'})
		}
		else if (index==content.length-1) {
			$("#"+elem[0]).css({'border-top-left-radius':'2px','border-bottom-left-radius':'2px'});
		}
		else {
			$("#"+elem[0]).css({'border-radius':'0px'});
		}
		$("#"+elem[0]).children().css({
			'font-variant':'small-caps',
			'font-size':'0.9em',
			'background-color':'rgba(247,247,223,0.9)',
			'color':'rgba(26,26,26,1)',
			'width':(90/content.length)+'%',
			'margin':'auto 0',
			'margin-bottom':'0px'
		});
		$("#"+elem[0]).change(function() {
					eval(elem[5]+"="+$(this).val());
					lbPagin.currentPage=1;
					leaderboardExchange();
		});
	});


}
function showLeaderboardHeader () {
	if (!document.getElementById("pan_3")) {
		panelData = {"contentClass" : "lbContent",
					"title": "Rankings",
					"tooltip": "<p style='text-align:left'>Leaderboard will update automatically every 5 minutes.  Using the Refresh button will also reset this timer.</p><p style='text-align:left'>No known bugs at present</p>"
					};
		generatePanel(3,panelData,"middleArea", initLeaderboard, hideLeaderboard);

		/** List Box Initialisation **/
		var lbTypes = document.createElement('div');
		lbTypes.id = "lbTypes";
		lbTypes.className+=" steelRowed";
		$('#content_pan_3').append(lbTypes);
		$('#lbTypes').css({'width':'100%','padding':'3px','margin-bottom':'0px','border-top-left-radius':'10px','border-top-right-radius':'10px','border':'1px solid black','border-bottom':'1px solid black'});
		var lbFilters = document.createElement('div');
		lbFilters.id = 'lbFilters';
		lbFilters.className+=" highlightRow";
		$('#content_pan_3').append(lbFilters);

		$('#lbFilters').css({'width':'100%','padding':'3px','margin-bottom':'5px','border-bottom-left-radius':'10px','border-bottom-right-radius':'10px','border':'1px solid black','border-top':'0px solid black'});
		resetLBTypes(localStorage.defaultRankGroup);
		gGenerateListBox ("typeList", [["Questions Answered",1],["Awards",2]], "lbTypes","");
		$('#typeList').val(localStorage.defaultRankGroup);
		$("#typeList").change(function() {
			localStorage.defaultRankGroup = $ ( this ).val();
			lbPagin.currentPage=1;
			resetLBTypes($ ( this ).val());
			leaderboardExchange();

		});
		$('#typeList').css({'width':'90%','margin':'auto 0','margin-bottom':'0px','font-size':'1.1em','font-variant':'small-caps'});
		$('#typeList').children().css({'text-align':'center','width':'100%','font-size':'0.9em','height':'1em'});
		$('#content_pan_3').css({'width':'100%'});

		var lbRows = document.createElement('div');
		lbRows.id = "lbRows";
		lbRows.className+=" noselect";

		var lbAwardBlurb = document.createElement('div');
		lbAwardBlurb.id = "lbAwardBlurb";
		$(lbAwardBlurb).addClass('metalBTwo noselect');
		var lbPaginContainer = document.createElement('div');
		lbPaginContainer.id ="lbPaginContainer";
		$(lbAwardBlurb).css({'border-bottom-left-radius':'10px','border-bottom-right-radius':'10px','border':'1px solid black','color':'rgba(213,213,210,1)','font-size':'0.6em','font-family':'lato,san-serif'});
		$(lbPaginContainer).css({'width':'100%'});
		var lbUpdateTimeBox= document.createElement('div');
		lbUpdateTimeBox.id='lbUpdateTimeBox';
		lbUpdateTimeBox.className+=' updateTime';
		$("#content_pan_3").append(lbRows,lbPaginContainer,lbAwardBlurb, lbUpdateTimeBox);
		lbPagin = new Paginator({
			'pare':'lbPaginContainer',
			'totalResults':0,
			'action':leaderboardExchange,
			'plusMinus':Number(localStorage.lbPagPlusMinus),
			'numResults':Number(localStorage.lbPagNumResults)
		});
	}
}
function leaderboardExchange (){
		clearTimeout(leaderboardTimeout);
		var view;
		switch (Number(localStorage.defaultRankGroup)){
			case 1: view = "QA";
					data = {'type':localStorage.defaultRankType,'period':localStorage.defaultRankPeriod};
					break;
			case 2: view = "AW";
					data = {'type':localStorage.awardRankType, 'order' : localStorage.defaultAwardSort, 'period' : localStorage.defaultAwardPeriod};
					break;
		}
		getRankingsData(view,data);
}
function getRankingsData(view, data){
	var periodType=["today","yesterday","thisWeek","lastWeek","thisMonth","thisYear","lastMonth","lastYear","eternity"];
	var d = {
		'userid':userid,
		'pageNumber':lbPagin.currentPage,
		'view':view
	};
	lbPagin.numResType = Number(data.type)-1;
	switch (Number(data.type)){
		case 1: d.pageSize = lbPagin.numResults;
				localStorage.lbPagNumResults = lbPagin.numResults;
				break;
		case 2: d.showMe=true;
				d.pageSize = 2 * lbPagin.plusMinus;
				localStorage.lbPagPlusMinus = lbPagin.plusMinus;
				break;
	}
	switch (view){
		case 'QA' :
			leaderboardTimeout = setTimeout(function(){leaderboardExchange();}, 300000);
			d.timeframe = periodType[Number(data.period)-1];
			break;
		case 'AW' :
			d.year = Number(data.period);
			switch(Number(data.order)){
				case 1: d.type = 'top';break;
				case 2: d.type = 'most';break;
			}
			break;
	}
	$.ajax({
		type: "POST",
		url: "/PHP/questionsAnswered.php",
		data: JSON.stringify(d),
		beforeSend: function(){
						$("#heading_text_pan_3").html('Rankings <img src="images/ajaxLoad.gif" style="height:0.8em">');
		},
		success: function(response, responseStatus){
			$("#heading_text_pan_3").html("Rankings");
				switch(view){
					case 'QA' : showLeaderboardData(JSON.parse(response),Number(data.period));break;
					case 'AW' : showAwardData(JSON.parse(response));break;
				}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			$("#heading_text_pan_3").html("Rankings");
			console.log("Error getting leaderboard stats, status = " + textStatus + " error: " + errorThrown);
		}
	});

}

function showAwardData(data){
	//$('#lbRows').html(JSON.stringify(data));
	var users = data.users;
	if ((users > 0) && (typeof lbPagin !=='undefined')) {lbPagin.update({'totalResults':users});}
	$('#lbRows').html('');
	 if (data.rankings){
	 var z;
	 var userImage = new Array();
	 for (var temp=0;temp<data.rankings.length;temp++) {
		userImage[temp]=gGetPlayerPhoto(data.rankings[temp].photo,"lbImg"+temp,"images/unknown_player.gif");
		userImage[temp].title=data.rankings[temp].name;
		userImage[temp].style.padding="0";
	 }
	 var mainContent=new Array();
	 console.log(data.rankings);
	 for (var temp=0;temp<data.rankings.length;temp++) {
		if (typeof data.rankings[temp].countryId !=='undefined') {
			if (Number(data.rankings[temp].countryId)!==0){
				mainContent[temp] = data.rankings[temp].name+" <img src='images/flags/"+
				country.byId[Number(data.rankings[temp].countryId)-1].short.toLowerCase()+".png' style='height:12px!important;margin-left:3px;padding:0;'><span style='font-size:0.6em;font-weight:300;margin-left:2px;'>"+country.byId[Number(data.rankings[temp].countryId)-1].short+"</span>"
			}
			else {mainContent[temp]=data.rankings[temp].name;}
		}
		else {mainContent[temp]=data.rankings[temp].name;}
	}
	 var content;
	 var columnInfo;
	 var col = new Array();
	 var head = document.createElement('div');
	 head.className+=' lbDiv';
	 $('#lbRows').append(head);
	 var awardImage=['emerald.png','sapphire.png','gold.png','silver.png','bronze.png','sigma.png'];
	 var awardDesc=['1st Place awards for questions answered','Top 1% in questions answered (min. 101 users)',
	 'Top 5% in questions answered (min. 21 users)','Top 12.5% in questions answered (min. 9 users)',
	 'Top 25% in questions answered (min. 5 users)','Total Awards'];


	for (var y=0;y<10;y++){
			col[y] = document.createElement("div");
			if (y<3){col[y].className+=' lbDivchild';$(col[y]).html("&nbsp;");}
			if (y===1){$(col[y]).css({'width':'1px!important','min-width':'1px!important','max-width':'1px!important'});}
			if (y==3){col[y].className+=' lbUserName';$(col[y]).css({'background-color':'rgba(0,0,0,0)'});$(col[y]).html("&nbsp;");}

			if ((y>3)&&(y<10)) {
				col[y].className+=' lbAwardHead';
				$(col[y]).html("<img src='images/icons/"+awardImage[y-4]+"' style='height:15px;width:15px;margin:auto;' title='"+awardDesc[y-4]+"'>");}
			$(head).append(col[y]);
	}
	for (var x=0;x<data.rankings.length;x++) {
		var row = [];
		content=data.rankings[x];
		columnInfo=[content.rank,"",userImage[x],mainContent[x],content.values.emerald,content.values.sapphire,
		content.values.gold,content.values.silver,content.values.bronze,content.values.total];
		row[x] = document.createElement('div');

		row[x].className+=' lbDiv';
		row[x].id = 'lbdiv'+x;
		$(row[x]).css('opacity','0');
		$('#lbRows').append(row[x]);
		var col = new Array();
		for (var y=0;y<columnInfo.length;y++){
			col[y] = document.createElement("div");
			if (y<3) {col[y].className+=' lbDivchild';}
			else if (y==3){col[y].className+=' lbUserName';}
			else {col[y].className+=' lbRankchild';}
			if (y!==2) {
				if (y<3){col[y].innerHTML = columnInfo[y];}
				else {
					if (columnInfo[y]=="0"){columnInfo[y]="-";}
					col[y].innerHTML ="<div>"+columnInfo[y]+"</div>";
				}
			}
			else {col[y].appendChild(columnInfo[y]);}
			row[x].appendChild(col[y]);
			if (y===0) {
				col[y].className+=' steelRowed lbRank';
				col[y].innerHTML=columnInfo[0]+"<sup>"+(getOrdinal(columnInfo[0]))+"</sup>";
				if (columnInfo[0]>9){$(col[y]).css({'font-size':'0.9em'});}
				if (columnInfo[0]>99){$(col[y]).css({'font-size':'0.8em'});}
				if (columnInfo[0]>999){$(col[y]).css({'font-size':'0.75em'});}
			}
			else {
				if (y>2){
					if (typeof(content.isMe)!=='undefined'){
						col[y].className+=" highlightRow";
						$(col[y]).css({'color':'rgba(26,26,26,1)'});
					}
				}
			}
			if (y===1){$(col[y]).css({'width':'1px','min-width':'1px','max-width':'1px'});}
		}

	}
	var fadeDelay;
	data.rankings.length>0 ? fadeDelay=Math.min(Math.floor(1600/data.rankings.length),200) : fadeDelay = 200;
	for (var x=data.rankings.length-1;x>=0;x--) {

		$("#lbdiv"+x).delay(fadeDelay*(data.rankings.length-x)).fadeTo(1000,1);
	}
	}

	$('#lbAwardBlurb').html('');
	$('#lbUpdateTimeBox').html("Last Updated: "+gReturnTime(data.lastUpdate*1000));
}

function hideLeaderboard() {
	clearTimeout(leaderboardTimeout);
	lbPagin.delete;
	$('#pan_3').remove();
}
function getMedalRank(rank,max){
	var percentile = [0,0.002,0.01,0.05,0.125,0.25];
	var result = 0;
	if (rank===1){return 0;}
	else {
		for (var x=percentile.length;x>0;x--){
			if (rank<Math.ceil(percentile[x]*max)+1){result = x;}
		}
		if (result === 0){return percentile.length;}

		else {return result;}
	}
}
function showLeaderboardData(data,periodVal) {
	var users = data.users;
	if ((users > 0) && (typeof lbPagin !=='undefined')) {lbPagin.update({'totalResults':users});}
	var standings = data.standings;
	var myrank = data.myRank;
	var period = data.period;
	var curStyle = 0;
	var rankStyles =[[" highlightRow"," "],[" redRowed"," "],[" blueRowed"," "],[" goldRowed", " "],[" steelRowed", " "],[" bronzeRowed", " "],[" metalBOne", " "]];
	$('#lbRows').html('');
	var z;
	var userImage = new Array();
	var mainContent = new Array();
	for (var temp=0;temp<standings.length;temp++) {
		userImage[temp]=gGetPlayerPhoto(standings[temp].photo,"lbImg"+temp,"images/unknown_player.gif");
		userImage[temp].title=standings[temp].name;
		userImage[temp].style.padding="0";
	}
	for (var temp=0;temp<standings.length;temp++) {
		if (Number(standings[temp].countryId)!==0){
			mainContent[temp] = standings[temp].name+" <img src='images/flags/"+
			country.byId[Number(standings[temp].countryId)-1].short.toLowerCase()+".png' style='height:12px!important;margin-left:3px;padding:0;'><span style='font-size:0.6em;font-weight:300;margin-left:2px;'>"+country.byId[Number(standings[temp].countryId)-1].short+"</span>"
		}
		 else {mainContent[temp]=standings[temp].name;}
	}
	for (var x=0;x<standings.length;x++) {
		var row = [];
		row[x] = document.createElement('div');
		row[x].className+=' lbDiv';
		row[x].id = 'lbdiv'+x;
		$(row[x]).css('opacity','0');
		$('#lbRows').append(row[x]);
		var col= [];
		curStyle=getMedalRank(standings[x].rank,users);
		var columnInfo = [standings[x].rank+"<sup>"+getOrdinal(standings[x].rank)+"</sup>", "",
		userImage[x], mainContent[x], standings[x].answered];
		for (var y=1;y<6;y++){
			col[y] = document.createElement("div");
			if (y!==4) {col[y].className+=' lbDivchild';}
			else {col[y].className+=' lbUserName';}
			if (y!==3){col[y].innerHTML = columnInfo[y-1];}
			else {col[y].appendChild(columnInfo[y-1]);}
			row[x].appendChild(col[y]);
			if (y===1) {
				col[y].className+=' steelRowed lbRank';
				if (standings[x].rank>9){$(col[y]).css({'font-size':'0.9em'});}
				if (standings[x].rank>99){$(col[y]).css({'font-size':'0.8em'});}
				if (standings[x].rank>999){$(col[y]).css({'font-size':'0.75em'});}


			}
			else {
				col[y].className+=rankStyles[curStyle][1];
				if (y>3){
					if (y==5){
							col[y].innerHTML = "<div>"+columnInfo[y-1]+"</div>";
					}
					if (typeof standings[x].isMe!=='undefined'){
						col[y].className+=" highlightRow";
						$(col[y]).css({'color':'rgba(26,26,26,1)'});
					}
				}
			}
			if (y==2) {
				col[y].className+=rankStyles[curStyle][0]+" lbAwardSlot";
				if (periodVal == 9){$(col[y]).css({'width':'0px'});}
			}
		}
	}
	var fadeDelay;
	standings.length>0 ? fadeDelay=Math.min(Math.floor(1600/standings.length),200) : fadeDelay = 200;
	for (x=standings.length-1;x>=0;x--) {
		$("#lbdiv"+x).delay(fadeDelay*(standings.length-x)).fadeTo(1000,1);
	}
	var tense='';
	var denom=0;
	plural='point';
	var periodType=["today","yesterday","thisWeek","lastWeek","thisMonth","thisYear","lastMonth","lastYear","eternity"];
	switch(Number(periodVal)) {
		case 1:case 2: denom=1;plural='point';break;
		case 3: case 4: denom=3;plural='points';break;
		case 5: case 7: denom=5;plural='points';break;
		case 6: case 8: denom=30;plural='points';break;
	}
	switch (Number(periodVal)) {
		case 2: case 4: case 7: case 8: tense='were';break;
		case 3: case 1: case 6: case 5: tense='are';break;
	}
	var medalText;
	Number(periodVal)==9 ? medalText = "":medalText="Award slots for this period "+tense+" worth <span style='color:rgba(120,190,48,1);font-size:1.2em'>"+denom+"</span> "+plural+".  See 'Awards' rankings for current standings.";
	$('#lbAwardBlurb').html(medalText);
	$('#lbUpdateTimeBox').html(gReturnUpdateTime());
}
