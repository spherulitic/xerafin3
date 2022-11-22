function showCardboxStats (value) {
  if (typeof cardboxTimeout!=='undefined'){clearTimeout(cardboxTimeout);}
  if (value!==2) {cardboxTimeout = setTimeout(function(){showCardboxStats()}, 300000);}
  if (typeof value=='undefined'){value=1;}
  switch (value) {
    case 1: d = {due:true};break;
    case 2: d = {coverage:true};break;
  }
  // once the chat service is written, if there's long polling, this refresh
  // might be better suited there.
  keycloak.updateToken(30).then(function() {
  $.ajax({type: "POST",
    url: "getCardboxStats",
    data: JSON.stringify(d),
    headers: {"Accept": "application/json", "Authorization": keycloak.token},
    beforeSend: function(){$("#heading_text_pan_4").html('Cardbox <img src="images/ajaxLoad.gif" style="height:0.8em">');},
    success:  function(response,responseStatus){
        $("#heading_text_pan_4").html("Cardbox");
        //console.log("Cardbox Data: "+JSON.stringify(response));
        switch (value) {
          case 1: displayCardboxDue(response,responseStatus);break;
          case 2: displayCardboxCoverage(response,responseStatus);break;
        }
    },
    error: function(jqXHR, textStatus, errorThrown) {
    console.log("Error getting cardbox stats, status = " + textStatus + " error: " + errorThrown);
    }
  });
  }).catch(function() { console.log('Failed to refresh token'); });
}
function refreshCardboxInfo() {
  if ($('#dueTab').hasClass('active')){showCardboxStats(1)}
  else if ($('#coverageTab').hasClass('active')){showCardboxStats(2)};
}

function createCardboxStatsPanel() {
  if (typeof localStorage.cardboxCurrent=='undefined'){localStorage.setItem('cardboxCurrent','0');}
  if (typeof localStorage.cardboxSent=='undefined'){localStorage.setItem('cardboxSent','false');}
  if (!document.getElementById("pan_4")) {
  panelData = {  "contentClass" : "panelContentDefault",
          "title": "Cardbox",
          "minimizeObject": "cardboxTabWrapper",
          "tooltip": ""
        };
  generatePanel(4,panelData,"middleArea", refreshCardboxInfo, hideCardboxStats);
  $("#content_pan_4").css("visibility","hidden");
  gCreateElemArray([
      ['a0','div','','cardboxInfoWrapper','content_pan_4', ''],
      ['a1','div','cardboxScoreInfo','cardboxScoreInfo','a0',''],
      ['a1a','div','cardboxScoreChild','cBScoreDiv','a1','Cardbox Value<br>'],
      ['a1a1','span','','cardboxInfoScore','a1a',''],
      ['a1b','div','cardboxScoreChild','cBQToday','a1','Questions Today<br>'],
      ['a1b1','span','','cardboxInfoQToday','a1b',''],
      ['a1c','div','cardboxScoreChild','cBDiffDiv','a1','Cardbox Movement<br>'],
      ['a1c1','span','','cardboxInfoDiff','a1c',''],
      ['a2_','div','','cardboxTabWrapper','content_pan_4',''],
      ['a2','ul','nav nav-pills nav-justified','cardboxTab','a2_',''],
      ['a2a','li','active','dueTab','a2','<a data-toggle="tab" href="#dueContent">Questions Due</a>'],
      ['a2b','li','','coverageTab','a2','<a data-toggle="tab" href="#coverageContent">Coverage</a>'],
      ['a2c','li','','manageTab','a2','<a data-toggle="tab" href="#manageContent">Manage</a>'],
      ['a3','div','tab-content','','a2_',''],
      ['a3a','div','tab-pane fade in active','dueContent','a3',''],
      ['a3a1','div','','dueRegion','a3a',''],
      ['a3a2','div','','addQueue','a3a',''],
      ['a3b','div','tab-pane fade','coverageContent','a3',''],
      ['a3c','div','tab-pane fade','manageContent','a3',''],
      ['a4','div','updateTime','cardboxUpdateTimeBox','a2_','']
    ]);

  appendDebugLog(localStorage.qCardboxStartScore+" "+localStorage.qCardboxDiff+" "+localStorage.qCardboxQAnswered);
  $('#dueTab').click(function(){showCardboxStats(1)});
  $('#coverageTab').click(function(){showCardboxStats(2)});
  $('#manageTab').click(function(){manageCardbox()});
  //var levelText = document.createElement('div');
  //levelText.id = "levelText";
  //document.getElementById('cntent_pan_4').appendChild(levelText);
  $("#content_pan_4").css('visibility','visible');

  /** List Box Initialisation **/
  $('#periodDue').css('width','90%');
  var periodTemp = document.createElement('div');
  periodTemp.id = "periodTemp";
  gGenerateTable(['Cardbox','','Total', periodTemp], 'dueRegion', 'statTable cardboxTable', 'cardboxTable','cardboxTableBody');
  gGenerateListBox ("periodDue",[["Due Now","dueNow"],["Next 24 Hrs","dueToday"], ["Next 7 Days","dueThisWeek"], ["Overdue","overdue"]], "periodTemp");
  if (typeof cardboxStatsPanel=='undefined'){cardboxStatsPanel="dueNow";}
  else {$('#periodDue').val(cardboxStatsPanel)};
  $("#periodDue").change(function() {
    cardboxStatsPanel = $ ( this ).val();
    showCardboxStats(1);
  });
  gGenerateTable(['Length','','Alphagrams','In Cardbox','%'], 'coverageContent', 'statTable', 'coverageTable','coverageBody');
  $('#cardboxTable, #coverageTable').css('visibility','hidden');
  $('#addQueue').css({'color':'#ddd','background-color':'#000','font-variant':'small-caps','width':'100%','font-size':'0.85em','margin-top':'5px'});
  document.getElementById('cardboxInfoScore').innerHTML=localStorage.qCardboxStartScore;
  document.getElementById('cardboxInfoDiff').innerHTML=localStorage.qCardboxDiff;
  document.getElementById('cardboxInfoQToday').innerHTML=localStorage.qCardboxQAnswered;
  }
}

function cardboxHighlightAction(row, state){
  $('[id^=cardboxNum],[id^=cardboxTotal],[id^=cardboxDue]').each(function(){
    $(this).removeClass("highlightRow");
  });
  $("#cardboxNum"+row).addClass("highlightRow");
  $("#cardboxTotal"+row).addClass("highlightRow");
  $("#cardboxDue"+row).addClass("highlightRow");
  if (state) {
    localStorage.cardboxSent='true'
  };
}

function displayCardboxDue (response, responseStatus) {
  let stats=response[0];
  let cardboxTotal=0;
  let dueTotal=0;
  let dueValue=0;
  createCardboxStatsPanel();
  $('#cardboxUpdateTimeBox').html('...');
  document.getElementById('cardboxTableBody').innerHTML="";
  let arrayOfCardboxes = Object.keys(stats.totalCards).sort(function(a,b) {
      return parseInt(a) - parseInt(b); });
  if (arrayOfCardboxes.length>0){
    arrayOfCardboxes.forEach(function(cardbox) {
      if (cardbox in eval('stats.dueByCardbox.'+cardboxStatsPanel)){
      dueValue = eval('stats.dueByCardbox.'+cardboxStatsPanel+'["' + cardbox + '"]');}
      else {dueValue = "";}
      gGenerateTableRow (
      ['cardboxNum'+cardbox,null,"cardboxTotal"+cardbox, "cardboxDue"+cardbox],
      [cardbox, "", eval('stats.totalCards["' + cardbox + '"]'), dueValue],
      "cardboxTableBody", "cardboxDueRow"+cardbox);
      cardboxTotal+= Number($('#cardboxTotal'+cardbox).html());
      dueTotal+=Number($('#cardboxDue'+cardbox).html());
      $('#cardboxNum'+cardbox+',#cardboxTotal'+cardbox+',#cardboxDue'+cardbox).on("click",function(){
        localStorage.cardboxCurrent=cardbox;
        localStorage.selectedQuizName = 'Cardbox';
        overview.setCurrentQuizid(-1);
        cardboxHighlightAction(cardbox, true);
        overview.go('MY'); // <----------
      });
    });
  }
  else {
    //Something went wrong, most likely with the userid from the session being unretrievable.
  }
  gGenerateTableRow ([null,null,null,null],['Total','',cardboxTotal,dueTotal],"cardboxTableBody","cardboxDueFoot");
  cardboxHighlightAction(localStorage.cardboxCurrent, false);
  $('#cardboxUpdateTimeBox').html(gReturnUpdateTime());
  $('#cardboxTable').css('visibility','visible');
  displayCardboxQueue(stats.queueLength);
}
function displayCardboxQueue(value){
  $('#addQueue').html('Number of Alphagrams In Add Queue: '+value);
}
function displayCardboxCoverage(response,responseStatus){
  var cover=response[0].coverage;
  var alphaTotal=0;
  var availTotal=0;
  var leng; var values;
  createCardboxStatsPanel();
  $('#cardboxUpdateTimeBox').html('...');
  document.getElementById('coverageBody').innerHTML="";
  var arrayOfLengths = Object.keys(cover).sort(function(a,b) {
      return parseInt(a) - parseInt(b); });
  console.log(arrayOfLengths);
  for (var x=0;x<arrayOfLengths.length;x++){
    values= cover[arrayOfLengths[x]];
    leng = arrayOfLengths[x];
    alphaTotal+= values.cardbox;
    availTotal+= values.total;
  gGenerateTableRow(
  ['lengthNum'+leng,null,'availNum'+leng,'inNum'+leng,'percent'+leng],
  [leng,"", values.total, values.cardbox, values.percent+"%"],
  "coverageBody","cardboxCoverRow"+leng);
  };
  console.log(response[0]);
  gGenerateTableRow ([null,null,null,null],['Total','',availTotal,alphaTotal,(((alphaTotal/availTotal)*100).toFixed(2))+'%'],"coverageBody","coverageFoot");
  $('#coverageTable').css('visibility','visible');
  $('#cardboxUpdateTimeBox').html(gReturnUpdateTime());
}
function manageUploadList(){
  gCreateElemArray([
      ['a0','div','prefContent','manageBoxDiv','manageParams', ''],
      ['a1','div','prefPar','uploadCustomWordList','a0',''],
      ['a1a','div','prefHead','uploadCustomHead','a1','Upload Custom Word List'],
      ['a1b','div','manageCardboxDiv','uploadCustomText','a1',''],
      ['a1b1','p','managePar','uploadCustomTextP1','a1b','Upload a .txt file with one alphagram or word per line.'],
      ['a1b2','p','manageCardboxPar','uploadCustomTextP2','a1b','These words will be added to your cardbox ahead of the default study list.'],
      ['a1b3','div','manageCardboxGroupWrap highlightRow','manageGroup1','a1b',''],
      ['a1b3_1','div','manageSpacer','spacerDiv1','a1b3',''],
      ['a1b3a','input','uploadBox','wlistFile','a1b3_1',''],
      ['a1b3_2','div','manageSpacer','spacerDiv2','a1b3',''],
      ['a1b3b','button','btn btn-default','listUploadButton','a1b3_2','Upload']
  ]);
  $('#manageGroup1').css({'border-radius':'5px','border':'1px solid black','padding':'5px','margin-left':'5px','margin-right':'5px'});

  $('#wlistFile').prop('type','file');
    $('#wlistFile').prop('accept','.txt');
  $('#listUploadButton').on('click', function(){uploadNewWordList();});
}
function manageDatabaseFile(){
  gCreateElemArray([
      ['a0','div','prefContent','manageBoxDiv','manageParams', ''],
      ['a2','div','prefPar','uploadCustomWordList','a0',''],
      ['a2a','div','prefHead','uploadCardboxHead','a2','Upload Cardbox<br>'],
      ['a2b','div','manageCardboxDiv','uploadCardboxText','a2',''],
      ['a2b1','div','','','a2b','Replace your cardbox with your Collins Zyzzyva anagrams.db file.<br>'],
      ['a2b2','div','redRowed','uploadCardboxTextImp','a2b','When we say replace - we mean it!  This will not add to what you already have here. This action will overwrite/obliterate/nuke the existing Xerafin cardbox on your account.'],
      ['a2b4','div','','','a2b','If you are OK with the above, then please feel free to continue.<br><br>'],
      ['a2b3','div','manageCardboxGroupWrap highlightRow','manageGroup2','a2b',''],
      ['a2b3_1','div','manageSpacer','spacerDiv3','a2b3',''],
      ['a2b3a','input','uploadBox','cboxFile','a2b3_1',''],
      ['a2b3_2','div','manageSpacer','spacerDiv4','a2b3',''],
      ['a2b3b','button','btn btn-default uploadButton','uploadButton','a2b3_2','Upload']
    ]);
    $('#manageGroup2').css({'border-radius':'5px','border':'1px solid black','padding':'5px','margin-left':'5px','margin-right':'5px'});
    $('#uploadCardboxTextImp').css({'border-radius':'5px','border':'1px solid black','padding':'5px','margin':'5px'});
    $('#cboxFile').prop('type','file');
    $('#cboxFile').prop('accept','.db');
    $('#uploadButton').on('click', function(){uploadCardbox();});
    if (URLExists('cardboxes/' + userid + '.db')) {
      $('#manageBoxDiv').append('<div class="prefPar"><a href="cardboxes/' + userid + '.db">Download Cardbox Here</a> <br> (Right Click and Save As...)</div>');
        } else {
      $('#manageBoxDiv').append('<div class="prefPar"><a href="downloadCardbox.py">Download Cardbox Here</a> <br> (Right Click and Save As...)</div>');
        }

}
function manageListOfShame(){
  gCreateElemArray([
      ['a0','div','prefContent','shameDiv','manageParams',''],
      ['a1','div','shameDesc highlightRow','shameDesc','a0','Enter a list of alphagrams or words.<br>Each of these will be reset to cardbox 0 or queued to be added to your cardbox.'],
      ['a2','div','shameWrap','shameWrap','a0',''],
      ['a2a','textArea','shameList','shameList','a2',''],
      ['a3','div','','prefBtnShameWrap','a0',''],
      ['a3a','button','btn btn-default btnPrefs shameButton','shameButton','a3','Submit']
    ]);
    $('#prefBtnShameWrap').css({'padding':'5px','border-bottom-left-radius':'5px','border-bottom-right-radius':'5px'});
    $('#prefBtnShameWrap').addClass('metalBThree');
    $('#shameList').prop('cols',40);
    $('#shameList').prop('rows',10);
    $('#shameList').css('textTransform','uppercase');
    $('#shameButton').click(function() { submitShameList($("#shameList").val()); });
}
function generateCardboxSettings(response,responseStatus){
  var prefs=response[0];
  gCreateElemArray([
      ['a0','div','pre-scrollable','prefContent','manageParams',''],
      ['a1','div','prefContent','prefCardboxDiv','a0',''],
      ['a1Head','div','prefHead','prefCardboxHead','a1','Scheduling'],
      ['a1a','div','prefPar','prefScheduleType','a1',''],
      ['a1a1','span','','prefScheduleS1','a1a','Schedule words using the '],
      ['a1a2','span','','prefScheduleS2','a1a',' scheduling method.'],
      ['a2a','div','prefContent','prefCBBehaviourDiv','a0',''],
      ['a2Head','div','prefHead','prefCardboxHead','a2a','Behaviour'],
      ['a2a1','div','prefPar','prefCloset','a2a',''],
      ['a2a1a','span','','prefClosetS1','a2a1','Xerafin will give you words that are due in order from cardbox 0 through cardbox '],
      ['a2a2','div','prefPar','prefClosetStatus','a2a',''],
      ['a2a2a','span','','prefClosetStatusS1','a2a2','Then it will give you words scheduled in the near future. For each hour you work ahead, it will give you 10 words which are overdue in cardbox '],
      ['a2a2b','span','','prefClosetValue','a2a2',parseInt(prefs.closet)+1],
      ['a2a2c','span','','prefClosetStatusS2','a2a2',' or higher.'],
      ['a2a3','div','prefPar','prefNewWords','a2a',''],
      ['a2a3a','span','','prefNewWordsS1','a2a3','After '],
      ['a2a3b','input','prefInput','reschedHrsInput','a2a3',''],
      ['a2a3c','span','','prefNewWordsS2','a2a3',' hours, it will add '],
      ['a2a3d','input','prefInput','newWordsAtOnceInput','a2a3',''],
      ['a2a3e','span','','prefNewWordsS3','a2a3',' words for each additional hour you work ahead, as long as cardbox 0 has fewer than '],
      ['a2a3f','input','prefInput','cb0maxInput','a2a3',''],
      ['a2a3g','span','','prefNewWordsS4','a2a3',' questions in it.'],
      ['a3','div','','prefBtnDBFileWrap','manageParams',''],
      ['a3a','button','btn btn-default btnPrefs','prefSaveButton','a3','Save']
  ]);
  $('#prefBtnDBFileWrap').css({'border':'1px solid black','border-bottom-left-radius':'5px','border-bottom-right-radius':'5px'});
  $('#prefBtnDBFileWrap').addClass('metalBThree');
  $('#reschedHrsInput').val(prefs.reschedHrs);
  $('#newWordsAtOnceInput').val(prefs.newWordsAtOnce);
  $('#cb0maxInput').val(prefs.cb0max);
  gSetInputSize('reschedHrsInput',3,3);
  gSetInputSize('newWordsAtOnceInput',3,3);
  gSetInputSize('cb0maxInput',4,4);
  generateSchedInfo(prefs.schedVersion);
  var opt=new Array();
  for (var x=1;x<21;x++) {opt.push([x.toString(),x]);}
  gGenerateListBox("prefClosetInput",opt,'prefCloset','');
  $('#prefClosetInput').val(Number(prefs.closet));
  $('#prefClosetInput').on('change',function(e){prefsChangeCloset(this.value);});
  gGenerateListBox("schedVersion",[["Original",0],["Modified",1],["Forgiving",2],["Intense",3]],"prefScheduleType","");
  $('#schedVersion').val(prefs.schedVersion);
  $('#schedVersion').insertAfter($('#prefScheduleS1'));
  $('#schedVersion').on('change',function(e){
    $('#schedTable').remove();
    $('#schedComment').remove();
    generateSchedInfo(Number($('#schedVersion').val()));
  });
  $('#prefSaveButton').on('click',function(){setPrefs();});

}
function manageCardboxSettings(){
  var d = { userid: userid };
  $.ajax({
    type: "POST",
    url: "getUserPrefs.py",
    data: JSON.stringify(d),
    success: generateCardboxSettings,
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("Error retrieving user prefs. Status: " + textStatus + "  Error: " + errorThrown);
    }
  });

}
function manageCardboxExchange(value){
  $('#manageParams').html("");
  switch(Number(value)) {
    case 1:manageCardboxSettings();break;
    case 2:manageDatabaseFile();break;
    case 3:manageUploadList();break;
    case 4:manageListOfShame();break;
    default:break;
  }
}
function manageCardbox(){
  var opt=[['Settings',1],['Database File',2],['Add Custom Word List',3],['List of Shame',4]];
  $('#manageContent').html("");
  gCreateElemArray([
      ['a0','div','manageCardboxDrop steelRowed','manageDropdown','manageContent',''],
      ['a1','div','','manageParams','manageContent','Test']
    ]);
    $('#manageDropdown').css({'width':'100%','padding':'3px','margin-bottom':'0px','border-top-left-radius':'10px','border-top-right-radius':'10px','border':'1px solid black','border-bottom':'1px solid black'});
    $('#manageParams').css({'width':'100%','padding':'3px','margin-bottom':'5px','border-bottom-left-radius':'10px','border-bottom-right-radius':'10px','border':'1px solid black','border-top':'0px solid black'});
    $('#manageParams').addClass('steelRowed');
    gGenerateListBox("manageOptions",opt,'manageDropdown','');
    $('#manageOptions').css({'width':'90%','margin':'auto 0','margin-bottom':'0px','font-size':'1.1em','font-variant':'small-caps'});
    $('#manageOptions').children().css({'text-align':'center','width':'100%','font-size':'0.9em','height':'1em'});
    $('#manageOptions').val(1);manageCardboxExchange($('#manageOptions').val());
    $('#manageOptions').on('change',function(e){manageCardboxExchange($('#manageOptions').val());});

  }
function getExtension(filename) {
    var parts = filename.split('.');
    return parts[parts.length - 1];
}


function uploadCardbox() {
  var fileList = document.getElementById('cboxFile').files;
  if (fileList.length == 0) {
    alert("Please select a cardbox file to upload"); }
  else {
    var file = fileList[0];
  var x = getExtension(file.name);
  appendDebugLog(file);
  if (x!=='db'){ gFloatingAlert("cardboxUploadAlert",8000,"Cardbox File Management", "Invalid File Extension:  File should end with '.db'",500);}
  else {
    $( "#uploadButton" ).prop("disabled", true);
    $( "#uploadButton" ).val("Uploading...");
    var formdata = new FormData();
    formdata.append(userid, file, 'cardbox.db');
    $.ajax({
  type: 'POST',
  url: 'uploadCardbox.py',
  data: formdata,
  processData: false,
  contentType: false,
   success: cardboxUploadCallback}); }
  }
}

function cardboxUploadCallback(response, responseStatus) {
  $( "#uploadButton" ).prop("disabled", false);
  $( "#uploadButton" ).val("Upload");
  appendDebugLog("Cardbox upload script status is " + response.status);
  gFloatingAlert("cardboxUploadAlert",3000,"Cardbox File Management", "Cardbox Upload Complete!",500);
}

function uploadNewWordList() {
  $("#listUploadButton").prop("disabled", true);
  $("#listUploadButton").val("Uploading...");
  var file = document.getElementById('wlistFile').files[0];
  var x = getExtension(file.name);
  appendDebugLog(file);
  if (x!=='txt'){ gFloatingAlert("cardboxUploadAlert",8000,"Cardbox File Management", "Invalid File Extension:  File should end with '.txt'",500);
  $('#listUploadButton').prop('disabled', false);
  }
  else {
  var formdata = new FormData();
  formdata.append(userid, file, 'list.txt');
  $.ajax({ type: 'POST',
     url: 'uploadNewWordList.py',
          data: formdata,
          processData: false,
          contentType: false,
          success: function(response, responseStatus) {
    $('#listUploadButton').prop('disabled', false);
                $('#listUploadButton').val('Success');
        gFloatingAlert("wordlistUploadAlert",3000,"Cardbox File Management", "New Wordlist Uploaded!",500);
          appendDebugLog("Word List Upload Status: " + response); }});
  }
}

function submitShameList(text) {
  var shameArr = text.replace(/[\r\n]+/g, " ").split(" ").filter((val) => val);
  var newArr = shameArr.map(function(x, i, arr) { return toAlpha(x.toUpperCase().replace(/[^A-Z]/g, ""));});
  shameArr = Array.from( new Set (newArr)); // remove duplicates
  var callback = function(response, responseStatus) { console.log(response); };
  var callbackEnd = function(response, responseStatus) { console.log(response);
                           alert("Updating words complete."); };
  for (var i=0;i<shameArr.length;i++) {
     if (shameArr[i].length<4) continue;
     var d = { user: userid, question: shameArr[i]};
     $.ajax({
        type: "POST",
        url: "shameWord.py",
        data: JSON.stringify(d),
        success: (i==shameArr.length-1 ? callbackEnd : callback),
        error: function(jqXHR, textStatus, errorThrown) { console.log("Error: " + textStatus); }
        });

  }
}

function writeSchedInfo(schedInfo){
  var timeframe = new Array();
  timeframe = ['hrs','days','wks','mths','yrs'];
  gGenerateTable(['#','Range','#','Range'], 'prefScheduleType', 'userSearch prefTable', 'schedTable', 'schedContent');
  var y;
  var z = Math.ceil(schedInfo[0].length/2);
  for (var x=0;x<z;x++){
    if (x+z==schedInfo[0].length-1){y="+";} else {y="";}
    if (x<z-1){
      gGenerateTableRow (['cardboxSchedNumber'+x,'cardboxSchedRange'+x],
            [x, schedInfo[0][x][0]+' - '+schedInfo[0][x][1]+' '+timeframe[schedInfo[0][x][2]],
            x+z+y, schedInfo[0][x+z][0]+' - '+schedInfo[0][x+z][1]+' '+timeframe[schedInfo[0][x+z][2]]],
            'schedTable', "cardboxSchedRow"+x);
    }
    else {
      if (isOdd(schedInfo[0].length)==true){
        gGenerateTableRow (['cardboxSchedNumber'+x,'cardboxSchedRange'+x],
            [x, schedInfo[0][x][0]+' - '+schedInfo[0][x][1]+' '+ timeframe[schedInfo[0][x][2]],"",""]
            ,'schedTable', "cardboxSchedRow"+x)
      }
      else {
        gGenerateTableRow (['cardboxSchedNumber'+x,'cardboxSchedRange'+x],
            [x, schedInfo[0][x][0]+' - '+schedInfo[0][x][1]+' '+timeframe[schedInfo[0][x][2]],
            x+z+y, schedInfo[0][x+z][0]+' - '+schedInfo[0][x+z][1]+' '+timeframe[schedInfo[0][x+z][2]]],
            'schedTable', "cardboxSchedRow"+x);
      }
    }
  }
  $('#prefScheduleType').append($('#schedTable'));
  var comment = document.createElement('div');
  comment.id = 'schedComment';
  comment.className+=" italNote";
  console.log(schedInfo[1]);
  $(comment).html(schedInfo[1]);
  $('#prefScheduleType').append(comment);
}
function generateSchedInfo(sched){
  let schedule = [
        [[12,37,0],[3,5,1],[5,9,1],[11,17,1],[16,26,1],[27,41,1],[50,70,1],[80,110,1],[130,170,1],[300,360,1],[430,530,1]],
        [[5,12,0],[1,2,1],[3,6,1],[7,14,1],[14,28,1],[30,60,1],[60,105,1],[120,210,1],[240,360,1],[430,530,1]],
        [[12,37,0],[3,5,1],[5,9,1],[11,17,1],[16,26,1],[27,41,1],[50,70,1],[80,110,1],[130,170,1],[300,360,1],[430,530,1]],
        [[12,37,0],[1,3,1],[2,8,1],[6,14,1],[12,22,1],[19,31,1],[27,45,1],[40,68,1], [62,94,1], [86,134,1], [120,190,1],[170,250,1],[215,365,1]]
        ];

  let infoMessage = [
    'All alphagrams answered incorrectly using this schedule return to cardbox 0.',
    'Alphagrams answered incorrectly using this schedule that are residing in cardbox 8 or above return to cardbox 2 instead of cardbox 0.'
  ];
  switch (sched) {
    case 0: writeSchedInfo([schedule[0],infoMessage[0]]);break;
    case 1: writeSchedInfo([schedule[1],infoMessage[1]]);break;
    case 2: writeSchedInfo([schedule[2],infoMessage[1]]);break;
    case 3: writeSchedInfo([schedule[3],infoMessage[1]]);break;
  }

}

function setPrefs() {
  var d = {
    user: userid,
    newWordsAtOnce: $('#newWordsAtOnceInput').val(),
    reschedHrs: $('#reschedHrsInput').val(),
    cb0max: $('#cb0maxInput').val(),
    closet: $('#prefClosetInput').val(),
    schedVersion: $('#schedVersion').val()
  };
  appendDebugLog(d);
  $.ajax({
    type: "POST",
    url: "setUserPrefs.py",
    data: JSON.stringify(d),
    success: function(response) {
      if (response.status == "success") {
        gFloatingAlert("cardboxUploadAlert",3000,"Cardbox Settings", "Cardbox Settings Saved!",500);
      }
      else alert("Error setting user prefs: " + response.status);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("Error setting user prefs. Status: " + textStatus + "  Error: " + errorThrown);
      alert("Error setting user prefs: " + errorThrown);
    }
  });
}

function prefsChangeCloset(c) {
 $('#prefClosetValue').html(parseInt(c)+1);
}


function hideCardboxStats() {
  clearTimeout(cardboxTimeout);
  $('#pan_4').remove();
}
