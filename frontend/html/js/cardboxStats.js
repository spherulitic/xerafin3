var cardboxStatsLatest = null;
var rescheduleStatsError = false;

// Rescheduled mode is a per-session choice; start each page load in the normal
// queue and let the Questions Due dropdown turn it on.
localStorage.cardboxRescheduled = 'false';

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
      ['a3a1b','div','','cardboxClearedUntil','a3a',''],
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
  gGenerateListBox ("periodDue",[["Due Now","dueNow"],["Next 24 Hrs","dueToday"], ["Next 7 Days","dueThisWeek"], ["Overdue","overdue"], ["Rescheduled","rescheduled"]], "periodTemp");
  if (typeof cardboxStatsPanel=='undefined'){cardboxStatsPanel="dueNow";}
  else {$('#periodDue').val(cardboxStatsPanel)};
  localStorage.cardboxRescheduled = (cardboxStatsPanel === 'rescheduled') ? 'true' : 'false';
  $("#periodDue").change(function() {
    cardboxStatsPanel = $ ( this ).val();
    localStorage.cardboxRescheduled = (cardboxStatsPanel === 'rescheduled') ? 'true' : 'false';
    showCardboxStats(1);
  });
  gGenerateTable(['Length','','Alphagrams','In Cardbox','%'], 'coverageContent', 'statTable', 'coverageTable','coverageBody');
  $('#cardboxTable, #coverageTable').css('visibility','hidden');
  $('#cardboxClearedUntil, #addQueue').css({
    'color':'#ddd',
    'background-color':'#000',
    'font-family':"'Montserrat', sans-serif",
    'font-variant':'small-caps',
    'font-size':'0.9em',
    'text-align':'left',
    'box-sizing':'border-box',
    'width':'100%',
    'margin-top':'5px',
    'padding':'0.1em 0.4em'
  });
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
  cardboxStatsLatest=stats;
  let cardboxTotal=0;
  let dueTotal=0;
  let dueValue=0;
  createCardboxStatsPanel();
  $('#cardboxUpdateTimeBox').html('...');
  document.getElementById('cardboxInfoScore').innerHTML = stats.score;
  document.getElementById('cardboxTableBody').innerHTML="";
  let arrayOfCardboxes = Object.keys(stats.totalCards).sort(function(a,b) {
      return parseInt(a) - parseInt(b); });
  let dueByCardbox = stats.dueByCardbox[cardboxStatsPanel] || {};
  if (arrayOfCardboxes.length>0){
    arrayOfCardboxes.forEach(function(cardbox) {
      if (cardbox in dueByCardbox){
      dueValue = dueByCardbox[cardbox];}
      else {dueValue = "";}
      gGenerateTableRow (
      ['cardboxNum'+cardbox,null,"cardboxTotal"+cardbox, "cardboxDue"+cardbox],
      [cardbox, "", stats.totalCards[cardbox], dueValue],
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
  displayCardboxClearedUntil(stats.clearedUntil);
  displayCardboxQueue(stats.queueLength);
  // Keep the reschedule pane's counts in sync if it is currently open.
  if (document.getElementById('reschedulePreview')) {
    rescheduleStatsError = false;
    renderRescheduleCardboxSelectors();
    updateReschedulePreview();
  }
}
function displayCardboxClearedUntil(value){
  if (typeof value === 'undefined' || value === null || !isFinite(Number(value))) {
    $('#cardboxClearedUntil').html('');
    return;
  }
  var clearedDate = new Date(Number(value) * 1000);
  $('#cardboxClearedUntil').html('Cardbox Cleared Until: '+gFormatDateForDisplay(clearedDate));
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
  // upload element needs a name to upload to a Flask service
  $('#wlistFile').attr('name', 'wlistFile');
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
    $('#manageBoxDiv').append('<div class="prefPar"><a onclick="downloadCardbox()">Download Cardbox Here</a></div>');


}
function manageListOfShame(){
  gCreateElemArray([
      ['a0','div','prefContent','shameDiv','manageParams',''],
      ['a1','div','shameDesc highlightRow','shameDesc','a0','Enter a list of alphagrams or words.<br>Each of these will be reset to cardbox 0. New words can be queued for later or added to cardbox 0 immediately.'],
      ['a2','div','shameWrap','shameWrap','a0',''],
      ['a2a','textArea','shameList','shameList','a2',''],
      ['a2b','div','shameModeWrap','shameModeWrap','a2',''],
      ['a2b1','input','','shameModeQueue','a2b',''],
      ['a2b1a','label','shameCbLabel','shameModeQueueLabel','a2b','Queue new words for later'],
      ['a2b2','div','','shameModeSpacer','a2b',''],
      ['a2b3','input','','shameModeAdd','a2b',''],
      ['a2b3a','label','shameCbLabel','shameModeAddLabel','a2b','Add new words to Cardbox 0 immediately'],
      ['a3','div','','prefBtnShameWrap','a0',''],
      ['a3a','button','btn btn-default btnPrefs shameButton','shameButton','a3','Submit']
    ]);
    $('#prefBtnShameWrap').css({'padding':'5px','border-bottom-left-radius':'5px','border-bottom-right-radius':'5px'});
    $('#prefBtnShameWrap').addClass('metalBThree');
    $('#shameList').prop('cols',40);
    $('#shameList').prop('rows',10);
    $('#shameList').css('textTransform','uppercase');
    $('#shameModeQueue').prop('type','radio');
    $('#shameModeQueue').prop('name','shameMode');
    $('#shameModeQueue').prop('value','0');
    $('#shameModeQueue').prop('checked',true);
    $('#shameModeQueueLabel').prop('for','shameModeQueue');
    $('#shameModeAdd').prop('type','radio');
    $('#shameModeAdd').prop('name','shameMode');
    $('#shameModeAdd').prop('value','1');
    $('#shameModeAddLabel').prop('for','shameModeAdd');
    $('#shameModeWrap').css({'text-align':'left','margin':'5px','font-family':'Montserrat, sans-serif'});
    $('#shameModeSpacer').css({'display':'inline-block','width':'15px'});
    $('#shameButton').click(function() { submitShameList($("#shameList").val()); });
}
function generateCardboxSettings(){
  var prefs=keycloak.tokenParsed.cardboxPrefs;
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

function downloadCardbox() {
// https://stackoverflow.com/questions/16086162/handle-file-download-from-ajax-post
  $.ajax({
    type: "POST",
    headers: {"Accept": "application/json", "Authorization": keycloak.token},
    url: 'downloadCardbox',
    xhrFields: { responseType: 'blob' },
    success: function(blob, status, xhr) {
      var filename = "";
      var disposition = xhr.getResponseHeader('Content-Disposition');
      alert("disposition: " + disposition);
      if (disposition && disposition.indexOf('attachment') !== -1) {
        filename = "cardbox.db";
      }
    if (typeof window.navigator.msSaveBlob !== 'undefined') {
      // IE workaround for HTML7007
      window.navigator.msSaveBlob(blob, filename);
    } else {
      var URL = window.URL || window.webkitURL;
      var downloadUrl = URL.createObjectURL(blob);
      if (filename) {
        var a = document.createElement("a");
        if (typeof a.download === 'undefined') {
        // Safari
        window.location.href = downloadUrl;
        } else {
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
        }
      } else { window.location.href = downloadUrl; }
    setTimeout(function () {URL.revokeObjectURL(downloadUrl); }, 100); // cleanup
    }
  }
   });
}

function manageCardboxExchange(value){
  $('#manageParams').html("");
  switch(Number(value)) {
    case 1:generateCardboxSettings();break;
    case 2:manageDatabaseFile();break;
    case 3:manageUploadList();break;
    case 4:manageListOfShame();break;
    case 5:manageListOfTriumph();break;
    case 6:manageReschedule();break;
    default:break;
  }
}
function manageCardbox(){
  var opt=[['Settings',1],['Database File',2],['Add Custom Word List',3],['List of Shame',4],['List of Triumph',5],['Reschedule',6]];
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
    formdata.append('cardbox', file, 'cardbox.db');
    $.ajax({
  type: 'POST',
  method: 'POST',
  url: 'uploadCardbox',
  headers: {"Accept": "application/json", "Authorization": keycloak.token},
  data: formdata,
  processData: false,
  contentType: false,
   success: cardboxUploadCallback,
   error: cardboxUploadError}); }
  }
}

function resetUploadButton() {
  $("#uploadButton").prop("disabled", false);
  $("#uploadButton").val("Upload");
}

function cardboxUploadCallback(response) {
  resetUploadButton();
  appendDebugLog("Cardbox upload response: " + JSON.stringify(response));
  if (response && response.status === "success") {
    gFloatingAlert("cardboxUploadAlert", 3000, "Cardbox File Management", "Cardbox Upload Complete!", 500);
  } else {
    var msg = (response && response.status === "Invalid Cardbox")
      ? "Upload failed: the selected file is not a valid cardbox."
      : "Upload failed: the server returned an unexpected response.";
    gFloatingAlert("cardboxUploadAlert", 8000, "Cardbox File Management", msg, 500);
  }
}

function cardboxUploadError(xhr) {
  resetUploadButton();
  var code = (xhr && xhr.status) ? xhr.status : "network";
  appendDebugLog("Cardbox upload failed: HTTP " + code);
  gFloatingAlert("cardboxUploadAlert", 8000, "Cardbox File Management", "Upload failed: server error (HTTP " + code + ").", 500);
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
  formdata.append('uploadFile', file, 'list.txt');
  $.ajax({ type: 'POST',
     method: 'POST',
     url: 'uploadNewWordList',
     headers: {"Accept": "application/json", "Authorization": keycloak.token},
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
  var addToCardbox = $('input[name=shameMode]:checked').val() === '1';
  var callbackEnd = function(response, responseStatus) {alert("Updating words complete."); };
  $.ajax({
     headers: {"Accept": "application/json", "Authorization": keycloak.token},
     type: "POST",
     url: "shameList",
     data: JSON.stringify({questions: shameArr, addToCardbox: addToCardbox}),
     success: callbackEnd,
     error: function(jqXHR, textStatus, errorThrown) { console.log("Error: " + textStatus); }
        });
}

function manageListOfTriumph(){
  gCreateElemArray([
      ['a0','div','prefContent','triumphDiv','manageParams',''],
      ['a1','div','shameDesc highlightRow','triumphDesc','a0','Enter a list of alphagrams or words.<br>Each of these that is in your cardbox and eligible for quizzing will be marked correct.'],
      ['a2','div','shameWrap','triumphWrap','a0',''],
      ['a2a','textArea','shameList','triumphList','a2',''],
      ['a3','div','','prefBtnShameWrap','a0',''],
      ['a3a','button','btn btn-default btnPrefs shameButton','triumphButton','a3','Submit']
    ]);
    $('#prefBtnShameWrap').css({'padding':'5px','border-bottom-left-radius':'5px','border-bottom-right-radius':'5px'});
    $('#prefBtnShameWrap').addClass('metalBThree');
    $('#triumphList').prop('cols',40);
    $('#triumphList').prop('rows',10);
    $('#triumphList').css('textTransform','uppercase');
    $('#triumphButton').click(function() { submitTriumphList($("#triumphList").val()); });
}

function submitTriumphList(text) {
  var triumphArr = text.replace(/[\r\n]+/g, " ").split(" ").filter((val) => val);
  var newArr = triumphArr.map(function(x, i, arr) { return toAlpha(x.toUpperCase().replace(/[^A-Z]/g, ""));});
  triumphArr = Array.from( new Set (newArr)); // remove duplicates
  fetchWithAuth("triumphList", {
     method: "POST",
     body: JSON.stringify({questions: triumphArr})
  }).then(function(response) {
     if (response.ok) {
       alert("Updating words complete.");
     } else {
       console.log("Error updating words: " + response.status);
       alert("Error updating words.");
     }
  }).catch(function(error) {
     console.log("Error: " + error);
     alert("Error updating words.");
  });
}

function manageReschedule(){
  gCreateElemArray([
      ['a0','div','prefContent','rescheduleDiv','manageParams',''],
      ['a1','div','prefHead','rescheduleHead','a0','Reschedule Overdue Words'],
      ['a2','div','prefPar','rescheduleRangePar','a0',''],
      ['a2a','span','','rescheduleRangeS1','a2','Take overdue words from cardbox '],
      ['a2b','span','','rescheduleMinWrap','a2',''],
      ['a2c','span','','rescheduleRangeS2','a2',' through '],
      ['a2d','span','','rescheduleMaxWrap','a2',''],
      ['a2e','span','','rescheduleRangeS3','a2','.'],
      ['a3','div','prefPar','rescheduleRatePar','a0',''],
      ['a3a','span','','rescheduleRateS1','a3','Make '],
      ['a3b','input','prefInput','rescheduleWordsInput','a3',''],
      ['a3c','span','','rescheduleRateS2','a3',' words come due per day.'],
      ['a4','div','redRowed','rescheduleWarning','a0','Rescheduled dates are permanent. This cannot be undone.'],
      ['a5','div','prefPar italNote','reschedulePreview','a0','Loading overdue words...'],
      ['a6','div','','rescheduleBtnWrap','a0',''],
      ['a6a','button','btn btn-default btnPrefs','rescheduleButton','a6','Reschedule']
  ]);
  $('#rescheduleWarning').css({'border-radius':'5px','border':'1px solid black','padding':'5px','margin':'5px','text-align':'center'});
  $('#rescheduleWordsInput').prop('type','number');
  $('#rescheduleWordsInput').attr({'min':1,'step':1,'placeholder':'words/day'});
  gSetInputSize('rescheduleWordsInput',6,6);
  $('#rescheduleMinWrap, #rescheduleMaxWrap').css('margin','0 2px');
  renderRescheduleCardboxSelectors();
  updateReschedulePreview();
  loadRescheduleStats();
  // Delegate on the wrappers: the selects are rebuilt after the stats load.
  $('#rescheduleMinWrap, #rescheduleMaxWrap').on('change','select',updateReschedulePreview);
  $('#rescheduleWordsInput').on('input change',updateReschedulePreview);
  $('#rescheduleButton').on('click',submitReschedule);
}

function rescheduleCardboxList(){
  var highest = 20;
  if (cardboxStatsLatest && cardboxStatsLatest.totalCards) {
    var boxes = Object.keys(cardboxStatsLatest.totalCards).map(function(cb){
      return parseInt(cb,10);
    }).filter(function(cb){return !isNaN(cb);});
    if (boxes.length > 0) {highest = Math.max.apply(null, boxes);}
  }
  var result = [];
  for (var cb=0; cb<=highest; cb++) {result.push(cb);}
  return result;
}

function renderRescheduleCardboxSelectors(){
  if (!document.getElementById('rescheduleMinWrap')) {return;}
  var prevMin = $('#rescheduleMin').val();
  var prevMax = $('#rescheduleMax').val();
  $('#rescheduleMin, #rescheduleMax').remove();
  var boxes = rescheduleCardboxList();
  var minOptions = [];
  var maxOptions = [['and up','']];
  boxes.forEach(function(cb){
    minOptions.push([String(cb), cb]);
    maxOptions.push([String(cb), cb]);
  });
  gGenerateListBox('rescheduleMin', minOptions, 'rescheduleMinWrap', '');
  gGenerateListBox('rescheduleMax', maxOptions, 'rescheduleMaxWrap', '');
  var minValue = (typeof prevMin !== 'undefined' && prevMin !== null && prevMin !== '') ? prevMin : 0;
  if ($('#rescheduleMin option[value="' + minValue + '"]').length === 0) {minValue = 0;}
  $('#rescheduleMin').val(String(minValue));
  var maxValue = (typeof prevMax !== 'undefined' && prevMax !== null) ? prevMax : '';
  if (maxValue !== '' && $('#rescheduleMax option[value="' + maxValue + '"]').length === 0) {maxValue = '';}
  $('#rescheduleMax').val(String(maxValue));
}

function rescheduleSelection(){
  var min = parseInt($('#rescheduleMin').val(),10);
  if (isNaN(min)) {min = 0;}
  var maxRaw = $('#rescheduleMax').val();
  var max = (maxRaw === '' || maxRaw === null || typeof maxRaw === 'undefined') ? null : parseInt(maxRaw,10);
  if (max !== null && isNaN(max)) {max = null;}
  var rate = Number($('#rescheduleWordsInput').val());
  var overdue = (cardboxStatsLatest && cardboxStatsLatest.dueByCardbox && cardboxStatsLatest.dueByCardbox.overdue) || {};
  var count = 0;
  Object.keys(overdue).forEach(function(cb){
    var box = parseInt(cb,10);
    if (!isNaN(box) && box >= min && (max === null || box <= max)) {
      count += Number(overdue[cb]) || 0;
    }
  });
  var validRate = isFinite(rate) && rate >= 1 && Math.floor(rate) === rate;
  var validRange = (max === null || max >= min);
  var valid = validRate && validRange && count > 0;
  return {min:min, max:max, rate:rate, count:count, validRate:validRate,
          validRange:validRange, valid:valid,
          days:(validRate && count > 0) ? Math.ceil(count/rate) : 0};
}

function updateReschedulePreview(){
  if (!document.getElementById('reschedulePreview')) {return;}
  var sel = rescheduleSelection();
  var text;
  if (!sel.validRange) {
    text = 'Choose an upper cardbox at or above the lower cardbox.';
  } else if (rescheduleStatsError) {
    text = 'Unable to load overdue words. Try again later.';
  } else if (cardboxStatsLatest === null) {
    text = 'Loading overdue words...';
  } else if (sel.count === 0) {
    text = 'No overdue words in the selected cardboxes.';
  } else if (!sel.validRate) {
    text = sel.count + ' overdue words selected. Enter a whole number of words per day.';
  } else {
    text = sel.count + ' overdue words selected. At ' + sel.rate + ' per day, these will be spread over about ' +
           sel.days + ' day' + (sel.days === 1 ? '' : 's') + '.';
  }
  $('#reschedulePreview').html(text);
  $('#rescheduleButton').prop('disabled', !sel.valid);
}

function loadRescheduleStats(){
  rescheduleStatsError = false;
  keycloak.updateToken(30).then(function(){
    $.ajax({type:"POST",
      url:"getCardboxStats",
      data:JSON.stringify({due:true}),
      headers:{"Accept":"application/json","Authorization":keycloak.token},
      success:function(response){
        cardboxStatsLatest = response[0];
        renderRescheduleCardboxSelectors();
        updateReschedulePreview();
      },
      error:function(jqXHR, textStatus, errorThrown){
        rescheduleStatsError = true;
        updateReschedulePreview();
        console.log('Error loading cardbox stats for reschedule: ' + textStatus + ' ' + errorThrown);
      }
    });
  }).catch(function(){
    rescheduleStatsError = true;
    updateReschedulePreview();
    console.log('Failed to refresh token for reschedule stats');
  });
}

function submitReschedule(){
  var sel = rescheduleSelection();
  if (!sel.valid) {
    updateReschedulePreview();
    return;
  }
  var rangeText = (sel.max === null) ? ('cardbox ' + sel.min + ' and up') : ('cardboxes ' + sel.min + ' through ' + sel.max);
  var message = 'Reschedule ' + sel.count + ' overdue words from ' + rangeText + ' at ' + sel.rate + ' per day?\n\n' +
                'These words will be spread over about ' + sel.days + ' day' + (sel.days === 1 ? '' : 's') +
                '. Rescheduled dates are permanent and cannot be undone.';
  if (!window.confirm(message)) {return;}
  var payload = {wordsPerDay:sel.rate, minCardbox:sel.min};
  if (sel.max !== null) {payload.maxCardbox = sel.max;}
  $('#rescheduleButton').prop('disabled', true).val('Rescheduling...');
  fetchWithAuth('rescheduleOverdue', {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(function(response){
    return response.json().catch(function(){return {};}).then(function(data){
      return {ok:response.ok, data:data};
    });
  }).then(function(result){
    if (!result.ok) {
      throw new Error(result.data && result.data.error ? result.data.error : 'Request failed');
    }
    gFloatingAlert('cardboxUploadAlert', 5000, 'Reschedule Overdue',
                   'Rescheduled ' + result.data.rescheduled + ' words.', 500);
    $('#rescheduleButton').prop('disabled', false).val('Reschedule');
    showCardboxStats(1);
  }).catch(function(error){
    $('#rescheduleButton').prop('disabled', false).val('Reschedule');
    alert('Error rescheduling words: ' + error.message);
  });
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
    newWordsAtOnce: $('#newWordsAtOnceInput').val(),
    reschedHrs: $('#reschedHrsInput').val(),
    cb0max: $('#cb0maxInput').val(),
    closet: $('#prefClosetInput').val(),
    schedVersion: $('#schedVersion').val()
  };
  appendDebugLog(d);
  $.ajax({
    type: "POST",
    url: "setCardboxPrefs",
    headers: {"Accept": "application/json", "Authorization": keycloak.token},
    data: JSON.stringify(d),
    success: function(response) {
      // update token with the new attributes
      keycloak.updateToken(-1).then(function() {
        gFloatingAlert("cardboxUploadAlert",3000,"Cardbox Settings", "Cardbox Settings Saved!",500);
      });
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
