function gGenerateTable(headers, pare, classNames, identTable, identBody){
	var theTable = document.createElement('table');
	var theHeading = document.createElement('thead');
	var theRow = document.createElement('tr');
	var theBody = document.createElement('tbody');
	var theCols = new Array();
	theTable.id = identTable;
	theBody.id = identBody;
	for (var x=0; x<headers.length;x++){
		theCols[x]=document.createElement('th');
		if (typeof headers[x] === 'object'){theCols[x].appendChild(headers[x]);}
		else {theCols[x].innerHTML= headers[x];}
		theRow.appendChild(theCols[x]);
	}
	$(theHeading).append(theRow);
	$(theTable).append(theHeading);
	$(theTable).append(theBody);
	$('#'+pare).append(theTable);
	document.getElementById(identTable).className=" "+classNames;
}

function gGenerateTableRow (colIds, values, pare, rowId){
	var theRow = document.createElement('tr');
	var theCols = new Array();
	theRow.id = rowId;
	for (var x=0;x<values.length;x++){
		theCols[x]=document.createElement('td');
		if (values[x]=== null){values[x]="0";}
		if (typeof values[x] === 'object'){theCols[x].appendChild(values[x]);}
		else {theCols[x].innerHTML= values[x];}
		if (typeof colIds[x]!=='null'){
			theCols[x].id=colIds[x];
		}
		$(theRow).append(theCols[x]);
	}
	$('#'+pare).append(theRow);
}

function gFloatingAlert (ident, duration, heading, content, effTime){
	var floatAlert = document.createElement('div');
	var floatHeading = document.createElement('div');
	var floatContent = document.createElement('div');
	floatAlert.id = ident;
	floatAlert.className+=' floatAlert';
	floatHeading.id = ident+'Heading';
	floatHeading.className+=' floatHeading';
	$(floatHeading).html(heading);
	floatContent.id = ident+'Content';
	floatContent.className+=' floatContent';
	$(floatContent).html(content);
	$(floatAlert).append(floatHeading,floatContent);
	$('body').append(floatAlert);
	$(floatAlert).effect("slide",{direction:"left"},effTime).delay(duration).fadeTo(effTime,0, function(){$(floatAlert).remove();});
}

function gGenerateListBox (ident, content, pare, classes){
	var listBox = document.createElement('select');
	listBox.id = ident;
	if (typeof classes!=='undefined'){listBox.className+=" "+classes;}
	listOption = new Array();
	for (var x=0;x<content.length;x++){
		listOption[x] = document.createElement("option");
		listOption[x].text = content[x][0];
		listOption[x].value = content[x][1];
		listBox.add(listOption[x]);
	}
	$("#"+pare).append(listBox);
}

function gUpdateCardboxScores(data, attempts){
	if (typeof attempts=='undefined'){attempts=0;}
	localStorage.qCardboxStartScore = data.startScore;
	localStorage.qCardboxScore = data.score;
	localStorage.qCardboxQAnswered = data.qAnswered;
	var movement = Number(data.score)-Number(data.startScore);
	localStorage.qCardboxDiff = String(movement > 0 ? "+" : "")+String(movement);
	if ($('#cardboxScoreInfo').length!==0){
		$('#cardboxInfoDiff').html(localStorage.qCardboxDiff);
		$('#cardboxInfoQToday').html(Number(data.qAnswered));
		$('#cardboxInfoScore').html(Number(data.score));
	}
	else {
		if (attempts<3){setTimeout(function(){gUpdateCardboxScores(data,(attempts+1));},1000);}
	}
}

function gCheckMilestones(answered) {
	//(function(){var d=document,j=d.getElementById('__cornify_nodes'),k=null;var files=['https://cornify.com/js/cornify.js','https://cornify.com/js/cornify_run.js'];if(j){cornify_add();}else{k=d.createElement('div');k.id='__cornify_nodes';d.getElementsByTagName('body')[0].appendChild(k);for(var l=0;l<files.length;l++){j=d.createElement('script');j.src=files[l];k.appendChild(j);}}})();
    let ranges = [[50, 49, 501], [100, 501, 1001], [200, 1001, 50000], [500,1001,100000]];
    for (let i = 0; i < ranges.length; i++) {
		if ((answered % (ranges[i][0]) == 0) && (answered > ranges[i][1]) && (answered < ranges[i][2])) {
			if (typeof(localStorage.gSound)=='undefined'){
				isMobile()? localStorage.setItem('gSound', '1'):localStorage.setItem('gSound', '0');
			}
			if (Number(localStorage.gSound)===0){
				var x= new Audio ("audio/thePling.mp3").play();
			}
			if ($("#cBQTodayDiv").length!==0){
				$( "#cBQTodayDiv" ).toggleClass( "animOne", 1500).toggleClass( "animOne", 1500);
			}
		}
	}
}
function gNetworkErrorReport (code, target){
    if (code<400) {$(target).html('Network Error. Please Check your connection settings and reload panel.')};
    if (code>=400) {$(target).html('Server Error ['+code+'].  Please reload panel.')};
    if (code==502) {$(target).html('Connection Error.  Please reconnect to internet and reload panel.')};
}

function gReturnUpdateTime() {
	var newDate = new Date();
	return "Last Updated "+ (newDate.getHours() < 10 ? "0" : "")+newDate.getHours() + ":" + (newDate.getMinutes() < 10 ? "0" : "") + newDate.getMinutes() + ':' + (newDate.getSeconds() < 10 ? "0" : "") + newDate.getSeconds();
}

function gReturnTime(nDate){
	var newDate=new Date(nDate);
	return (newDate.getHours() < 10 ? "0" : "")+newDate.getHours() + ":" + (newDate.getMinutes() < 10 ? "0" : "") + newDate.getMinutes() + ':' + (newDate.getSeconds() < 10 ? "0" : "") + newDate.getSeconds();
}

function gCreateElemArray(par){
    for (var x=0;x<par.length;x++){
        eval("var "+par[x][0]+"= document.createElement('"+par[x][1]+"')");
        eval(par[x][0]+".className = ' '+par[x][2]");
        eval(par[x][0]+".id = '"+par[x][3]+"'");
        eval(par[x][0]+".innerHTML= '"+par[x][5]+"'");
        eval(par[x][4]+".appendChild("+par[x][0]+")");
    }
}

function gFormatDateForDisplay(d) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return d.getDate() + " " + months[d.getMonth()] + " '" + d.getFullYear().toString().substr(2,2) + " " + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
}

function gGetPlayerPhoto (url,ident,replaced){
	var image=new Image();
	image.src=url;
	image.id=ident;
	$(image).on("error",function (e){
		image.style.visibility='hidden';
		image.src=replaced;
		image.style.visibility='visible';
	});
	return image;
}

function gSetInputSize(obj,length,size){
	$('#'+obj).attr('maxlength',length);
	$('#'+obj).attr('size',size);
}
