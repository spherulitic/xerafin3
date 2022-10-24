function initChatGlobals() {
	mostRecent = new Date().getTime() - 86400000; // One Day Ago
	chatQueue = [ ];
	CHAT_QUEUE_MAX_LENGTH = 150;
	lastReadRow = 0;
}
function startChat () {
	if (!document.getElementById("pan_2")) {
		initChatGlobals();
		panelData = {
					"contentClass" : "panelContentDefault",
					"title": "Chat",
					"minimizeObject": "chatRegion",
					"closeButton": false,
					"refreshButton" : false,
					"tooltip": "<p>Something helpful will go here.</p>"
					};
		generatePanel(2,panelData,"rightArea");
		var linkNote = document.createElement("div");
			linkNote.id = "linkNote";
			linkNote.className+= " linkNote";
			linkNote.innerHTML="To keep track of the latest changes and report any problems, please visit our page on Facebook <a href='https://www.facebook.com/groups/xerafin/' target='_blank'>[link]</a>";
		var userDisplayArea = document.createElement("div");
			userDisplayArea.id = "userDisplayArea";
			userDisplayArea.className+= " chatActiveUsers";
		var chatDisplayBox = document.createElement("div");
			chatDisplayBox.id = "chatDisplayBox";
			chatDisplayBox.className+=' well well-sm pre-scrollable';
			chatDisplayBox.style.maxWidth='100%';
		var chatInputBox = document.createElement('div');
			chatInputBox.className+=' input-group';
			chatInputBox.style.margin = '10px 0px 10px 0px';
		var chatInputAddon = document.createElement('span');
			chatInputAddon.className += 'input-group-addon primary steelRowed';
			chatInputAddon.innerHTML = '<i class="glyphicon glyphicon-comment" style="color:#fff;"></i>';
		var chatBox = document.createElement("input");
				/*chatBox.type = "text";*/
			chatBox.className+=' form-control chatInput';
			chatBox.id = "chatBox";
			chatBox.style.background='inherit';
		var chatRegion = document.createElement("div");
			chatRegion.id='chatRegion';
		var chatDisplayTable = document.createElement("div");
			chatDisplayTable.id = 'chatTable';
			chatDisplayTable.classname += ' chatTable';
		var chatServerTime = document.createElement("div");
			chatServerTime.id = 'chatServerTime';
			chatServerTime.className+=' updateTime';
		$(chatInputBox).append(chatInputAddon, chatBox);
		$('#content_pan_2').append(linkNote,userDisplayArea,chatRegion,chatServerTime);
		$('#chatRegion').append(chatInputBox, chatDisplayBox);
		$('#chatDisplayBox').append(chatDisplayTable);
		//$('#chatBox').on( 'keydown keyup paste',function(e) {
		//	$('#chatBox').find('br, button').remove();
		//	$('#chatBox').find('div, span, script, table, tr, td, th, tbody, thead, tfoot').replaceWith(function() { return $(this).contents(); });
		//	$('#chatBox').find('img').css('height','25px');
		//});
		chatBox.addEventListener("keypress", function(e) {
        if (e.which === 13 && $(this).val().trim()) {
           var chatContent = parseEmoji($(this).val());
           //console.log(chatContent);
           submitChat(chatContent, false);
           $(this).val("");
        } });
		$('#chatBox').keypress("m",function(e) {
			if(e.ctrlKey)
			$(this).val("");
		});
	}
	getInitChats();
	getLoggedInUsers();
}

function getLoggedInUsers() {
  $.ajax({type: "GET",
          url: "getLoggedInUsers.py",
          success: displayLoggedInUsers,
          error: function(jqXHR, textStatus, errorThrown) {
          console.log("Error getting users, status = " + textStatus + " error: " + errorThrown);
          } } );
 }

function getActiveUserDimensions (pRW,pW,uLL,aRows,mRows,mPW){
        var result = {};
        if ((uLL*pW > pRW) && (pW>mPW)) {
                var x=getActiveUserDimensions(pRW,pW-1,uLL,aRows,mRows,mPW);
                result = {rows: x.rows, picWidth: x.picWidth};
                }
        else {
                if ((aRows<mRows) && (uLL*pW > pRW*aRows)){
                        var x=getActiveUserDimensions(pRW,pW,uLL,aRows+1,mRows,mPW);
                        result = {rows: x.rows, picWidth: x.picWidth};
                }
                else {result = {rows: aRows, picWidth: pW};}
        }
        return result;
}

function displayUserArray (userList) {
   $('#userDisplayArea').html("");
   var activeUserContainer = document.createElement('div');
   var activeUserHeading = document.createElement('div');
   var userDisplayTable = document.createElement("table");
   var userDisplayTableBody = document.createElement("tbody");
   $('#userDisplayArea').append(activeUserHeading);
   activeUserHeading.className+= " activeUserHeading";
   activeUserHeading.id= "activeUserHeading";
   var widths=getActiveUserDimensions ($('#activeUserHeading').width(),50,userList.length,1,3,30);
   activeUserHeading.innerHTML = "<span class='userNumber'>"+userList.length+'</span> active users';
   userDisplayTable.className+= " chatActiveUsers";
   activeUserContainer.className+= " chatActiveUsersContainer";
   if (userList.length!==0){
       var maxPics = Math.ceil(($('#activeUserHeading').width()-(widths.picWidth-1))/widths.picWidth);
       if (usersArray.length<=(maxPics*widths.rows)){maxPics=Math.ceil(usersArray.length/widths.rows);}
       var userRow= [];
       for (var z=0;z<(widths.rows);z++) {
        userRow[z] = document.createElement("tr");
        userRow[z].id= 'userRow';
        userRow[z].style.width = Math.min(widths.picWidth*userList.length,$('#activeUserHeading').width()-(widths.picWidth+1));
        userDisplayTableBody.appendChild(userRow[z]);
        for (var y=z*maxPics;(y<usersArray.length) && (y<((z+1)*maxPics));y++) {
            var userCell = document.createElement("td");
            if ((y==(maxPics*widths.rows)-1) && (usersArray.length>(maxPics*widths.rows))){
              userCell.style.background="#45CCCC";
              userCell.style.width=widths.picWidth+'px';
              userCell.innerHTML="+"+(usersArray.length-y);
              userCell.style.fontSize='1.1em';
              userCell.style.textAlign='center';
            }
            else {
                userCell.style.width=widths.picWidth+'px';
                userCell.textAlign = 'left';
                var userPic = gGetPlayerPhoto(userList[y].photo,"activeUserImg"+z,"images/unknown_player.gif");
                userPic.className+=' activePic';
                userPic.style.height=widths.picWidth+'px';
                userPic.title = userList[y].name;
                userCell.appendChild(userPic);
            }
            userRow[z].appendChild(userCell);
        }
       }
    }
	$(userDisplayTable).append(userDisplayTableBody);
    activeUserContainer.appendChild(userDisplayTable);
    userDisplayArea.appendChild(activeUserContainer);
}
function displayLoggedInUsers(response, responseStatus) {
   //console.log("Logged in users:");
   if (response) {usersArray = response[0];}
   //console.log(response);
   displayUserArray(usersArray);
}

function getInitChats () {
  var d = { mostRecent: mostRecent, userid: userid } ;
  $.ajax({type: "POST",
         url: "getChatsInit.py",
        data: JSON.stringify(d),
     success: displayChats,
       error: function(jqXHR, textStatus, errorThrown) {
           console.log("Error: chats could not be updated.");
// disabled until chat is reimplemented
//           setTimeout(updateChats, 3000);
       } } );
}

function updateChats () {
  var d = { userid: userid, rownum: lastReadRow } ;
  getLoggedInUsers();
  $.ajax({type: "POST",
         url: "getChats.py",
        data: JSON.stringify(d),
     success: displayChats,
       error: function(jqXHR, textStatus, errorThrown) {
           console.log("Error: chats could not be updated.");
           setTimeout(updateChats, 5000); } } );
}

function createPicCol (data, ident, pare){
	var theCol = document.createElement("div");
	var picWrap = document.createElement("div");
	var pic = document.createElement("img");
	var chatDateUnder = document.createElement("div");
	var chatDate = new Date(data.chatDate);
	var metalStyle = ['One', 'Two', 'Three'];
	theCol.id=ident;
	theCol.className+=' chatInfoCol';
	picWrap.className+=' chatInfoWrapper';
	picWrap.className+=' metalB'+metalStyle[getRandomInt(3)];
	pic.className+=' chatPic';
	pic.title = data.name;
	pic.src = data.photo;
    if (parseInt(data.chatUser)===0) {pic.className+=' chatPicBroadcastX';}
	chatDateUnder.className+=' chatDateUnder';
	chatDateUnder.innerHTML = chatDate.getHours() + ':' + (chatDate.getMinutes() < 10 ? '0' : '') + chatDate.getMinutes();
	chatDateUnder.title = chatDate.getHours() + ':' + (chatDate.getMinutes() < 10 ? '0' : '') + chatDate.getMinutes() + ':' + (chatDate.getSeconds() < 10 ? '0' : '') + chatDate.getSeconds();
	$(picWrap).append(pic,chatDateUnder);
	$(theCol).append(picWrap);
	$('#'+pare).append(theCol);
}

function createChatCol (data, ident, pare){
	var theCol = document.createElement('div');
	var chatWrapper = document.createElement('div');
	var nameDiv = document.createElement('div');
	var chatDiv = document.createElement('div');
	nameDiv.className+=' chatTextName';
	chatDiv.className+=' chatTextCol';
	theCol.id=ident;
	theCol.className+=' chatTextColWrapper';
	$('#'+pare).append(theCol);
	chatWrapper.className+=' chatTextWrapper';
	if (parseInt(data.chatUser)==userid){nameDiv.className+=' chatTextNameMe';chatWrapper.style.cssFloat='left';}
	else {chatWrapper.style.cssFloat='right';}
	$(theCol).append(chatWrapper);
	nameDiv.innerHTML=data.name;
	chatDiv.innerHTML=data.chatText;
	$(chatWrapper).append(nameDiv,chatDiv);
}

function createXeraCol (data, ident, pare){
	var theCol = document.createElement('div');
	var xeraBroadcast = document.createElement('div');
	var xeraOuter = document.createElement('div');
	xeraOuter.className+=' chatXeraBroadcastOuter';
	theCol.className+=' chatTextColWrapperTwo';
	theCol.id = ident;
	$("#"+pare).append(theCol);

	xeraBroadcast.className+=' chatXeraBroadcastInner Absolute-Center';
	xeraBroadcast.innerHTML=data.chatText;
	$(xeraOuter).append(xeraBroadcast);
	$(theCol).append(xeraOuter);
}

function createChatRow (data, ident, pare){
	var theRow = document.createElement('div');
	theRow.id = ident;
	theRow.className+=' chatRow';
	$('#'+pare).append(theRow);
	createPicCol (data, 'chatImg'+data.chatDate+"_"+getRandomInt(1000000), theRow.id);
	if (parseInt(data.chatUser) >10) {
		createChatCol(data, "chat"+data.chatDate+"_"+getRandomInt(1000000), ident);
	}
	else {
		createXeraCol(data, "chatXera"+data.chatDate+"_"+getRandomInt(1000000), ident);
	}
}

function displayChats (response, responseStatus) {
	var newChats = response[0];
	var expiredChats = [ ];
	var serverTime = new Date (response[2]*1000);
	var timeOutput;
	try {timeOutput=serverTime.toLocaleTimeString('en-GB', {hour: "numeric", minute: "numeric", timeZone: "America/New_York"});}
	catch (e){timeOutput = "GMT-6";}
	$('#chatServerTime').html("Server Time:"+ timeOutput);
	lastReadRow = response[1];

	//console.log(JSON.stringify(response));
	document.getElementById('chatTable').innerHTML="";
	$('#chatDisplayBox').css('border', '1px solid #000');
	for (var x=0; x<newChats.length;x++) {
		if (newChats[x].expire)
		expiredChats.push(newChats[x]);
		else
		chatQueue.push(newChats[x]);
     // the DB query orders these ascending by time stamp
     mostRecent = newChats[x].chatDate;
	}
	var y = chatQueue.length;
	for (var x=CHAT_QUEUE_MAX_LENGTH;x<y;x++)
		chatQueue.shift();
//////////////
chatQueueLoop:
//////////////
	for (x=chatQueue.length-1;x>=0;x--) {
		// has this been expired?
		for(var i=0;i<expiredChats.length;i++) {
			if (chatQueue[x].chatDate == expiredChats[i].chatDate &&
				chatQueue[x].chatUser == expiredChats[i].chatUser) {
				delete chatQueue[x];
				continue chatQueueLoop;
			}
		}
		createChatRow (chatQueue[x], 'chatRow'+chatQueue[x].chatDate+'_'+getRandomInt(1000000), 'chatTable');
	}
	chatQueue = chatQueue.filter(function (e){return e;}); // remove deleted values from the array
	updateChats();
}

function submitChat(message, isSystemGenerated, systemUserid) {
	if (typeof systemUserid=="undefined"){systemUserid=0;}
   d = { chatText: message, userid: userid, chatTime: new Date().getTime() };
   if (isSystemGenerated) d.userid = systemUserid;
   //console.log ("sending chat:");
   //console.log(JSON.stringify(d));
   if (d.userid===0) { // system generated chat sent by Xerafin user
     $.ajax({type: "POST",
              url: "expireLastMilestoneChat.py",
            data: JSON.stringify({userid: userid}),
         success: function(response, responseStatus) {
              console.log("Last milestone chat expired " + response);
              submitChat2(d);
              },
          error: function(jqXHR, textStatus, errorThrown) {
              console.log("Error: milestone chat could not be expired.");
              submitChat2(d);}
			});
   } else if (d.userid==2) {
	$.ajax({type: "POST",
              url: "expireLastInvaderChat.py",
		success: function(response, responseStatus) {
			console.log("Last invader chat expired " + response);
			submitChat2(d);
        },
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Error: invader chat could not be expired.");
			submitChat2(d);
		}
	});
   }
	else submitChat2(d);
    }

function submitChat2(d) {
   $.ajax({type: "POST",
            url: "submitChat.py",
           data: JSON.stringify(d),
        success: function (response, responseStatus) {
           console.log(JSON.stringify(response)); },
          error: function(jqXHR, textStatus, errorThrown) {
           console.log("Error: chat could not be submitted"); } });
 }
