//tourneyPath="HOOD20170209/HOODRIVER";
//tourneyPath='http://event.scrabbleplayers.org/2018/nasc/build/tsh/2018-nasc-s';
//tourneyPath='http://media.wgvc.com/tsh/2018-08-10-NiagaraFallsON-CSW';
//tourneyPath='https://www.centrestar.co.uk/tsh/BMSC19';
//tourneyPath='https://www.centrestar.co.uk/tsh/retford2018mon';
//tourneyPath='https://www.centrestar.co.uk/tsh/retford2018sun';
//tourneyPath="https://centrestar.co.uk/tsh/ukopen2018";
//tourneyPath="https://centrestar.co.uk/tsh/18IlfordFeb";
//tourneyPath="https://events.xerafin.net/testevent2";
tourneyPath="https://events.xerafin.net/LOCO2019";
//tourneyPath="https://event.scrabbleplayers.org/2017/nasc/build/tsh/2017-nasc-sa"
//tourneyPath="https://www.centrestar.co.uk/tsh/18SpringmatchMay";
//tourneyPath="http://event.poslfit.com/2018/malta/me/build";
//pathExtension="/tsh/";
pathExtension="/html/";

function initTournamentStandings(){
	if (typeof localStorage.tournamentDivisionList=='undefined'){localStorage.setItem("tournamentDivisionList","0");}
	if (typeof localStorage.tournamentRoundList=='undefined'){localStorage.setItem("tournamentRoundList","Latest");}
	if (typeof localStorage.tournamentViewList=='undefined'){localStorage.setItem("tournamentViewList","0");}
	if (typeof localStorage.tournamentRefreshRate=='undefined'){localStorage.setItem("tournamentRefreshRate","10000");}
	if (typeof localStorage.tournamentLastUpdate=='undefined'){localStorage.setItem("tournamentLastUpdate","0");}
	if (typeof localStorage.tournamentLastLocal=='undefined'){localStorage.setItem("tournamentLastLocal","0");}
	if (typeof localStorage.tournamentLastLocal=='undefined'){localStorage.setItem("tournamentNextRound","0");}
	localStorage.tournamentRefreshRate=10000;
	localStorage.tournamentRoundList='Latest';
	localStorage.tournamentDivisionList=0;
	localStorage.tournamentViewList=0;
	localStorage.tournamentLastUpdate=0;
	localStorage.tournamentNextRound=0
	localStorage.tournamentLastLocal=new Date().getTime();
	tournamentTimeout = setTimeout(function(){refreshLiveTournament();}, Number(localStorage.tournamentRefreshRate));
	getLiveTournament();
}

function normalizeTournamentData (data){
	data = data.contents.replace("newt=","");
	var x = data.replace(/undefined/gi, "[]");
			x = x.replace(/;/gi,"");
			var output = new Object (JSON.parse(x));
			delete output.esb;
			delete output.profile;
			delete output.config._termdict;
			showLiveTournament(output);
}
function switchTournamentPlName(name){
	name=name.split(",");
	var newName= name[1]+" "+name[0];
	return newName;
}
function getLiveTournament(proxyNum) {
	if (typeof(proxyNum)==='undefined'){proxyNum=0;}
	if ($('#roundsList').length!==0){
		$("#roundsList").val(localStorage.tournamentRoundList);
	}

	//,,'https://crossorigin.me/','https://cors-anywhere.herokuapp.com/'
	var proxy = ['/PHP/proxy.php?url='];
	var destination;
	if (tourneyPath.search("http")!==-1){
		destination = proxy[proxyNum] + tourneyPath + pathExtension +"tourney.js";
		appendDebugLog(destination);
	}
	else {
		destination = tourneyPath+pathExtension+"tourney.js";
	}
	$.ajax({
		type: "GET",
        url: destination,
		beforeSend: function(){$("#heading_text_pan_100").html('Tournaments <img src="images/ajaxLoad.gif" style="height:0.8em">');},
        success: function(response, responseStatus) {
			$("#heading_text_pan_100").html('Tournaments');
			normalizeTournamentData(response);
		},
        error: function(jqXHR, textStatus, errorThrown) {
			$("#heading_text_pan_100").html('Tournaments');
			appendDebugLog("Error, status = " + textStatus + " error: " + errorThrown);
			getLiveTournament((proxyNum+1)%(proxy.length-1));
        }
    });
}

function hideLiveTournament() {
	clearTimeout(tournamentTimeout);
	$('#pan_100').remove();

}

function refreshLiveTournament() {
	if (typeof tournamentTimeout!=='undefined'){clearTimeout(tournamentTimeout);}
	//tournamentTimeout = setTimeout(function(){refreshLiveTournament()}, Number(localStorage.tournamentRefreshRate));
	getLiveTournament();
}

function showLiveTournament(data){
	appendDebugLog(data);
	if (!document.getElementById("pan_100")) {
		var panelData = {
			"title": "Tournaments",
			"tooltip": "<p>Experimental tsh integration</p>",
			"contentClass" : "panelContentDefault"
		};
		var divBoxOptions=new Array();
		var roundBoxOptions=[["Loading...","Latest"]];
		var viewBoxOptions=new Array();
		var test;
		generatePanel(100,panelData,"leftArea",refreshLiveTournament,hideLiveTournament);
		gCreateElemArray([
			['a','div','tournamentContent','tournamentWrapper','content_pan_100',''],
			['a1','div','tournamentHeading','tournamentHeading','a',''],
			['a1a','div','tournamentTitle highlightRow correct','tournamentTitle','a1',data.config.event_name],
			['a1b','div','tournamentInfoLayer','tournamentInfoLayer','a1',''],
			['a1b1','div','tournamentInfoCell tournamentDate','tournamentDate','a1b',data.config.event_date],
			['a1b2','div','tournamentInfoCell tournamentRatingType','tournamentRatingType','a1b',data.config.rating_system],
			['a1b3','div','tournamentInfoCell tournamentDivision','tournamentDivision','a1b','Div '+data.divisions[localStorage.tournamentDivisionList].name],
			['a1b4','div','tournamentInfoCell tournamentRounds','tournamentRounds','a1b','Rds:'+data.config.max_rounds],
			['a2','div','well well-sm pre-scrollable tournamentTableWrap','tournamentTableWrap','a',''],
			['a3','div','tournamentFooter metalBOne','tournamentFooter','a',''],
			['a3a','div','tournamentWidgetRow steelRowed','tournamentWidgetRow','a3',''],
			['a3b','div','tournamentSource','tournamentSource','a3','Data extracted from tsh, written by John Chew.<br>Detailed stats available from tsh&nbsp;<a href="'+tourneyPath+pathExtension+'index.html" target="_blank">Here</a>'],
			['a3c','div','updateTime','tournamentLastUpdate','a3','']
		]);
		gGenerateListBox ("viewsList", [["Standings",0],["Results",1]],"tournamentWidgetRow");
		$("#viewsList").val(Number(localStorage.tournamentViewList));
		for (var y=0;y<data.divisions.length;y++){
			test = typeof data.divisions[y].maxrp;
			if (test =='undefined'){
				data["divisions"][y]["maxrp"]=data["divisions"][y]["maxr"];
			}
		}
		if (data.divisions.length>1){
			for (var x=0;x<data.divisions.length;x++){
				appendDebugLog("Triggered");
				divBoxOptions.push(["Division "+data.divisions[x].name,x]);
			}
			gGenerateListBox ("divisionsList", divBoxOptions, "tournamentWidgetRow");
			$("#divisionsList").val(localStorage.tournamentDivisionList);
		}
		gGenerateListBox ("roundsList", roundBoxOptions, "tournamentWidgetRow");
		$("#roundsList").val(localStorage.tournamentRoundList);
		if (Number(localStorage.tournamentViewList)===0){
			gGenerateTable(["Rank","","Name","W - L","Spread"], "tournamentTableWrap", "tournamentTable", "standingsTable", "standings");
		}
		$("#roundsList").prop("disabled", true);
		if (Number(localStorage.tournamentViewList)===1){
			gGenerateTable(["","","","","","",""], "tournamentTableWrap", "resultsTable", "resultsTable", "results");
		}
		getTournamentView(data,localStorage.tournamentViewList);
	}
	appendDebugLog(data);
	setTournamentTimers(data);
}
function setTournamentTimers(data) {
	var x; var y; var z;
	x=false;
	for (y=0;y<Object.keys(data.divisions).length;y++){
		z=getLastUpdateTime(data.divisions[y].players);
		if (z==true){x=z;}
	}
	clearTimeout(tournamentTimeout);
	//only set a new timer if tournament is not over
	if (!(checkTournamentComplete(data))){
		if (x==false){
			localStorage.tournamentRefreshRate=Math.min(Number(localStorage.tournamentRefreshRate)+5000+getRandomInt(3000),300000);
		}
		else {
			localStorage.tournamentRefreshRate=5000+getRandomInt(3000);
		}
		appendDebugLog("New update rate:"+(Number(localStorage.tournamentRefreshRate)/1000)+" seconds");
		//seeing as this means that data has been updated, might as well show it from here
		$(tournamentLastUpdate).html(gReturnUpdateTime());
		tournamentTimeout = setTimeout(function(){refreshLiveTournament();}, Number(localStorage.tournamentRefreshRate));
	}
	else {
		$(tournamentLastUpdate).html("This tournament has ended.");
	}
	updateTournament(data,x);
}


function updateTournament(data, updated){
//Decide if there's anything new worth showing from an AUTOMATIc refresh
//If there's been an update refresh the view
	appendDebugLog("Update Flag: "+updated);
	if (localStorage.tournamentRoundList=='Latest'){
		if (updated==false){
	//If there hasn't, but the round has been completed, the tournament is not over and 5 minutes have passed, set a flag to show the pairings for the next round
			if ((checkRoundComplete(data, (data.divisions[Number(localStorage.tournamentDivisionList)].maxrp), Number(localStorage.tournamentDivisionList)))
			&& (getLastUpdateDiff(data)>300))
			{
				localStorage.tournamentNextRound=1;
				getTournamentView(data,localStorage.tournamentViewList);
			}
	//Otherwise, don't set the flag
			else {
				localStorage.tournamentNextRound=0;
				getTournamentView(data,localStorage.tournamentViewList);
			}
		}
		else {
			localStorage.tournamentNextRound=0;
			getTournamentView(data,localStorage.tournamentViewList);
		}
	}
}
//otherwise, do nothing, let the change events on the listboxes do the work on a concluded tourney.

function updateListBoxes(data){

	$("#viewsList").change(function() {
		appendDebugLog("View List change fired!");
		$('#tournamentTableWrap').empty();
		localStorage.tournamentViewList = $("#viewsList").val();
		if (Number(localStorage.tournamentViewList)===0){
			gGenerateTable(["Rank","","Name","W - L","Spread"], "tournamentTableWrap", "tournamentTable", "standingsTable", "standings");}
		else {
			gGenerateTable(["","","","","","",""], "tournamentTableWrap", "resultsTable", "resultsTable", "results");
		}
		getTournamentView(data,localStorage.tournamentViewList);
	});
	$("#divisionsList").change(function() {
		appendDebugLog("Div List change fired!");
		localStorage.tournamentDivisionList = $ ("#divisionsList").val();
		$('#tournamentDivision').html("Div "+data.divisions[localStorage.tournamentDivisionList].name);
		getTournamentView(data,localStorage.tournamentViewList);
	});
	$("#roundsList").change(function() {
	appendDebugLog("Round List change fired!");
		localStorage.tournamentRoundList = $ ("#roundsList").val();
		getTournamentView(data,localStorage.tournamentViewList);
	});
}
function updateRoundsListBox(data, rounds){
	roundBoxOptions=[];
	var x;
	appendDebugLog("Rounds passed to listbox update:"+rounds);
	if (rounds>0){
		for (x=1;x<rounds;x++){
			roundBoxOptions.push(["Round "+(x),x]);
		}
	}
	if (!(checkTournamentComplete(data))){
		if (rounds > 0){roundBoxOptions.push(['Round '+(x), 'Latest']);}
		else {roundBoxOptions.push(['Prelude', 'Latest']);}
		$(tournamentLastUpdate).html(gReturnUpdateTime());
	}

	else {roundBoxOptions.push(['Round '+data.config.max_rounds,data.config.max_rounds]);
		if (localStorage.tournamentRoundList=='Latest'){localStorage.tournamentRoundList=data.config.max_rounds;}
	}
	repopulateListBox("roundsList",roundBoxOptions,localStorage.tournamentRoundList);
}

function repopulateListBox(ident,values,current){
	listOption = new Array();
	$("#"+ident).empty();
	for (var x=0;x<values.length;x++){
		listOption[x] = document.createElement("option");
		listOption[x].text = values[x][0];
		listOption[x].value = values[x][1];
		document.getElementById(ident).add(listOption[x]);
	}
	$("#"+ident).val(current);
}


function getTournamentView(data,viewNumber){
	var round=localStorage.tournamentRoundList;
	appendDebugLog("Local Storage Round "+round);
	$("#viewsList,#divisionsList,#roundsList").off("change");
	if (round=="Latest") {
		appendDebugLog("Latest Fired");
		round=data.divisions[Number(localStorage.tournamentDivisionList)].maxrp+1+Number(localStorage.tournamentNextRound);
		updateRoundsListBox(data, round);
	}
	else {
		appendDebugLog("Not Latest Fired ");
		updateRoundsListBox(data, Number(data.divisions[Number(localStorage.tournamentDivisionList)].maxrp)+1+Number(localStorage.tournamentNextRound));
	}
	updateListBoxes(data);
	$('#roundsList').prop('disabled',false);
	switch (Number(viewNumber)){
		case 0: displayTournamentTable(data,localStorage.tournamentDivisionList,round);break;
		case 1: displayResultsTable(data,localStorage.tournamentDivisionList,round);break;
	}
}


function getLastUpdateDiff(data){
var x = Math.floor(Number((new Date().getTime())/1000)) - Number(localStorage.tournamentLastLocal);
	appendDebugLog("Since last change:"+x+"s");
	 return x;
}
function getLastUpdateTime(players){
	var lastUpdate;
	var maxVal;
	var x;
	var maxTemp=Number(localStorage.tournamentLastUpdate);
	for (x=1;x<players.length-1;x++){
		maxVal=Math.max(players[x].etc.time)
		if (maxVal>Number(localStorage.tournamentLastUpdate)){
			maxTemp=maxVal;
		}
	}
	if (maxTemp>Number(localStorage.tournamentLastUpdate)){
		localStorage.tournamentLastLocal= Math.floor(Number(new Date().getTime())/1000);
		localStorage.tournamentLastUpdate=maxTemp;
		return true;
	}
	else {
		return false;
	}
}

function displayTournamentTable (data, divBoxValue, roundBoxValue){
	appendDebugLog ("Division:"+divBoxValue+" Round:"+roundBoxValue)
	var elem = data.divisions[divBoxValue];
	var imgA=new Array();
	var standingsData = sortTournamentRound (populateTournamentRound(data, roundBoxValue, divBoxValue));
	standingsData.forEach(function(standingsRow,index){
		imgA[index]=gGetPlayerPhoto(tourneyPath+pathExtension+elem.players[standingsRow[0]].photo,"playerImgA"+index,"images/unknown_player.gif");
	});
	$("#standings").empty();
	standingsData.forEach(function(playerRow,index){
		gGenerateTableRow(
			["playerRank"+index,"playerPic"+index,"playerName"+index,"playerWL"+index,"playerSpread"+index],
			[(index+1)+getOrdinal(index+1),imgA[index],switchTournamentPlName(elem.players[playerRow[0]].name),playerRow[1]+"-"+playerRow[2],playerRow[3]],
			"standings", "standingsRow");
		for (var row in Object.keys(data.config.prize_bands)){
			if (row==divBoxValue){
				if (typeof data.config.prize_bands[data.divisions[divBoxValue].name] !=='undefined') {
					data.config.prize_bands[data.divisions[divBoxValue].name].forEach(function(value){
						if (value==index+1) {
							$('#playerRank'+index+',#playerName'+index+',#playerSpread'+index+',#playerWL'+index).addClass('highlightRow');
						}
					});
				}
			}
		}
	});
	gGenerateTableRow(["rankFooter","b","nameFooter","d","e"], ["","","","",""], "standings", "standingsRow");
}
function displayResultsTable (data,divBoxValue, roundBoxValue){
	appendDebugLog("Round passed to display results:"+roundBoxValue);
	if (roundBoxValue===0){
		$("#results").empty();
		//$("#results").html("This tournament has not started yet");
	}
	else {
	var elem = data.divisions[divBoxValue];
	appendDebugLog("Round sent:"+roundBoxValue);
	var resultsData = sortResultsRound(populateResultsRound(data, roundBoxValue-1, divBoxValue));
	var nameTempA,nameTempB,resultTemp;
	var imgA = new Array();
	var imgB = new Array();
	resultsData.forEach(function(resultsRow,index){
		imgA[index]=gGetPlayerPhoto(tourneyPath+pathExtension+elem.players[resultsRow[0]].photo,"playerImgA"+index,"images/unknown_player.gif");
		imgB[index]=gGetPlayerPhoto(tourneyPath+pathExtension+elem.players[resultsRow[3]].photo,"playerImgB"+index,"images/unknown_player.gif");
	});
	$("#results").empty();
	resultsData.forEach(function(resultsRow,index){
		//appendDebugLog(resultsRow);
		if (resultsRow[0]==0){nameTempA = "Bye";}
		else {nameTempA = switchTournamentPlName(elem.players[resultsRow[0]].name);}
		if (resultsRow[3]==0){nameTempB= "Bye";}
		else {nameTempB = switchTournamentPlName(elem.players[resultsRow[3]].name)}
		if ((resultsRow[2]===0) && (resultsRow[5]===0)) {resultTemp = ['',"Vs",''];}
		else {resultTemp=[resultsRow[2],"-",resultsRow[5]];}
		gGenerateTableRow(
			["playerNameA"+index,"playerPicA"+index,"resultLeft"+index,"resultMiddle"+index,"resultRight"+index,"playerPicB"+index,"playerNameB"+index],
			[nameTempA,imgA[index],resultTemp[0],resultTemp[1],resultTemp[2],imgB[index],nameTempB],
			"results", "resultsRow"+index);
		if ((Number(resultTemp[0])!==0)||(Number(resultTemp[2])!==0)){
			$("#playerNameA"+index+",#resultLeft"+index+",#resultMiddle"+index+",#resultRight"+index+",#playerNameB"+index).addClass('metalBOne resHighlight');
		}
	});
	}
	//gGenerateTableRow(["rankFooter","b","nameFooter","d","e"], ["","","","","","",""], "results", "resultsRow");
}
function populateResultsRound (data, roundNum, division) {
	//appendDebugLog("Population:"+data+" Round: "+roundNum+" Division: "+division);
	var roundPlayers=new Array();
	var summary= new Array();
	var summaryLeft = new Array();
	var summaryRight = new Array();
	var sumTemp = new Array();
	var divisShort = data.divisions[division];
	var oppTemp;
	var dupFlag = false;
	var tempRank;
	for (x=1;(x<divisShort.players.length);x++){
		dupFlag=false;

			try {tempRank=divisShort.players[x].etc.rrank[roundNum-1];}
				catch (e) {tempRank=divisShort.players.length;}
			summaryLeft=[divisShort.players[x].id,tempRank, getPlayerScoreFor(data,divisShort.players[x].id,roundNum,division)];
			oppTemp=divisShort.players[x].pairings[Number(roundNum)];
			//appendDebugLog("X:"+x+" oppTemp:"+oppTemp);
			if (Number(oppTemp)===0){summaryRight=[0,divisShort.players.length,0]}
			else {
				try {tempRank=divisShort.players[oppTemp].etc.rrank[roundNum-1];}
				catch (e) {tempRank=divisShort.players.length;
				//	appendDebugLog("TempRank:"+tempRank);
				}
				summaryRight=[divisShort.players[oppTemp].id,tempRank, getPlayerScoreFor(data,divisShort.players[oppTemp].id,roundNum,division)];}
			if (typeof divisShort.players[x].etc.p12[Number(roundNum)]==='undefined'||typeof divisShort.players[x].etc.p12[Number(roundNum)]==='null'){
				if (summaryLeft[0]<=summaryRight[0]) {sumTemp=summaryLeft.concat(summaryRight);}
				else {sumTemp=summaryRight.concat(summaryLeft);}
			}
			else if(divisShort.players[x].etc.p12[Number(roundNum)]===1){
				sumTemp=summaryLeft.concat(summaryRight);
			}
			else {sumTemp=summaryRight.concat(summaryLeft)};
			if (summary.length!==0){
				for (var y=0;y<summary.length;y++){
					if ((summary[y][0] == sumTemp[0]) && (sumTemp[0]!==0)) {dupFlag=true;}
				}
			}
		if (dupFlag==false){summary.push(sumTemp);}
	}
	//appendDebugLog(summary);
	return summary;
}
function sortTournamentRound (standingsData) {
	standingsData.sort(function (x, y) { return y[1] - x[1] || y[3] - x[3] || y[0] - x[0]; });
	return standingsData;
}

function sortResultsRound (resultsData) {
	resultsData.sort(function (x,y) {return Math.min(x[1],x[4])- Math.min(y[1],y[4]);});
	return resultsData;
}

function populateTournamentRound (data,roundNum, division) {
	var summary = new Array();
	var divisShort = data.divisions[division];
	var winRecord = 0;
	for (var x=1;x<divisShort.players.length;x++){
		winRecord = sumPlayerWinLoss(data, x, roundNum, division);
		summary[x]=[divisShort.players[x].id, winRecord[0], winRecord[1], sumPlayerSpread(data, x, roundNum,division)];
	}
	return summary;
}

function getPlayerScoreFor (data,ident,roundNum,division){
	var x=data.divisions[division];
	var y=x.players[Number(ident)].scores[Number(roundNum)];
	if (ident===0){return 0;}
	if (isNaN(Number(y))){return 0;}
	else return x.players[Number(ident)].scores[Number(roundNum)];
}

function getPlayerScoreAgainst (data,ident,roundNum,division){
	var x=data.divisions[division];
	var y=x.players[Number(ident)].pairings[Number(roundNum)];
	var z;
	//appendDebugLog(y);
	if (y===0){return 0;}
	try {z=isNaN(Number(x.players[y].scores[Number(roundNum)]));}
	catch (e){return 0;}
	if (isNaN(Number(x.players[y].scores[Number(roundNum)]))) {return 0;}
	else {return (Number(x.players[y].scores[Number(roundNum)]));}
}

function getGameSpread (data,ident,roundNum,division){
	return getPlayerScoreFor(data, ident, roundNum, division)-getPlayerScoreAgainst (data,ident,roundNum,division)
}

function sumPlayerScoreFor (data,ident,roundNum,division){
	var score = 0;
	for (var x=0;x<roundNum;x++){
		score+=getPlayerScoreFor(data, ident, x, division);
		//appendDebugLog("For:"+score);
	}
	return score;
}

function sumPlayerScoreAgainst (data,ident,roundNum,division){
	var score = 0;
	for (var x=0;x<roundNum;x++){
		score+=getPlayerScoreAgainst(data, ident, x, division);
		//appendDebugLog("Ag:"+score);
	}
	return score;
}

function sumPlayerSpread (data,ident,roundNum,division){
	return sumPlayerScoreFor(data,ident,roundNum,division)-sumPlayerScoreAgainst(data,ident,roundNum,division);
}
function testDraw (data,id,roundNum,division){
	if ((getPlayerScoreFor(data,id,roundNum,division)===0) && (getPlayerScoreAgainst(data,id,roundNum,division)===0)){return false;}
	else {return true;}
}
function sumPlayerWinLoss (data,id,roundNum, division){
	var results=[0,0];
	for (var x=0;x<roundNum;x++){
		var y=getGameSpread(data,id,x,division);
		if (y>0){results[0]++;}
		if (y===0){
			if (testDraw(data,id,x,division)===true)
			{results[0]+=0.5;results[1]+=0.5;}
		}
		if (y<0){results[1]++;}
	}
	return results;
}

function checkRoundComplete(data, roundNum, division){
	var returnVal=true;
	data.divisions[division].players.forEach(function(row,index){
		if (index>0){
			if (((getPlayerScoreFor(data,index,roundNum, division)==0) && (getPlayerScoreAgainst(data,index,roundNum,division)==0)) && (returnVal==true)){
				returnVal = false;
			}
		}
	});
	return returnVal;
}

function checkTournamentComplete(data){
	var returnVal=true;
	data.divisions.forEach(function(row,index){
		returnVal=checkRoundComplete(data, Number(row.maxr), index);
	});
	return returnVal;
}
