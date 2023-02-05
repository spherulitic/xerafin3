function initUserPrefs() {
  var d = {userid: userid, action: ['GTN','LEX']};
  $.ajax({
    type: "POST",
    url: "PHP/userPrefs.php",
    data: JSON.stringify(d),
    success: showUserPrefs,
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("Error retrieving user prefs. Status: " + textStatus + "  Error: " + errorThrown);
    }
  });
}
function updateEnabledLexList() {
  var d = {userid: userid, action: ['LEX']};
  $.ajax({
    type: "POST",
    url: "PHP/userPrefs.php",
    data: JSON.stringify(d),
    success: function(response,responseStatus){
      var inputs = JSON.parse(response);
      createLexiconEnabled(inputs.lexes);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("Error retrieving user prefs. Status: " + textStatus + "  Error: " + errorThrown);
    }
  });
}
function displayLexiconData(data){
  var title = document.createElement('div');
  $(title).html(" <img src='images/flags/"+country.byId[Number(data.language)-1].short.toLowerCase()+".png' style='height:20px;line-height:20px;important;margin:0;margin-right:2px;padding-bottom:3px;vertical-align:middle'> "+data.name);
  $(title).css({'height':'20px','width':'100%','text-align':'center','font-size':'1.2em','line-height':'20px','font-weight':'bold','vertical-align':'middle'});
  var releaseDate = document.createElement('div');
  $(releaseDate).html("Release: "+data.release);
  $(releaseDate).css({'width':'50%','display':'inline-block','text-align':'center'});
  var activeDate = document.createElement('div');
  $(activeDate).html("Active: "+data.active);
  $(activeDate).css({'width':'50%','display':'inline-block','text-align':'center'});
  var dates = document.createElement('div')
  $(dates).append(releaseDate, activeDate);
  var license = document.createElement('div');
  $(license).css({'font-size':'0.6em','padding-top':'3px','margin-bottom':'3px','padding-bottom':'3px','text-align':'center'});
  $(license).html(data.license);
  var info = document.createElement('div');
  $(info).html(data.info);
  $(info).css({'font-size':'0.9em','text-align':'center','width':'100%','padding-top':'3px','border-top':'1px solid black'});
  $('#lexBlurb').append(title, dates,info,license);
  $('#lexUpdateInfo').effect("slide",{direction:"left"},1000);
}
function fetchLexiconData(data){
  var d = {'lex':data};
  $.ajax({
    type: "POST",
    url: "PHP/fetchLexiconData.php",
    data: JSON.stringify(d),
    success: function(response,responseStatus){
      displayLexiconData(JSON.parse(response));
    }
  })
}
function updateLexicon(data){
  console.log(data);
  $.ajax({
    type: "POST",
    url: "convertLexiconVersion.py",
    beforeSend: function(){
      $("#heading_text_pan_1_d").html('Preferences <img src="images/ajaxLoad.gif" style="height:0.8em">');
      overlay=new Overlay({opacity:0.4});
      gFloatingAlert("LexiconUpdateAlert",10000,"Lexicon Update", "Updating Cardbox, this may take a while.  Please Wait",500);
      },
    data: JSON.stringify(data),
    success: function(response,responseStatus){
      if (response.status == "success") {
        $("#heading_text_pan_1_d").html("Preferences");
        $('#prefLexiconEnabled').empty();
        gFloatingAlert("LexiconUpdateAlert",5000,"Lexicon Update", "Lexicon Updated to "+data.lexicon.toUpperCase()+" "+data.version,500);
        updateEnabledLexList();
        overlay.clear();
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      $("#heading_text_pan_1_d").html("Preferences");
      gFloatingAlert("LexiconUpdateAlert",5000,"Lexicon Update", "An error occured whilst attempting to update to "+data.lexicon.toUpperCase()+" "+data.version,500);
      console.log("Error retrieving user prefs. Status: " + textStatus + "  Error: " + errorThrown);
      overlay.clear();
    }
  });
}
function generateLexUpdateAccordion(data){
  $('#lexUpdateInfo').remove();
  var accordionDiv = document.createElement('div');
  var warning = document.createElement('div');
  var opts = document.createElement('div');
  var optslab = document.createElement('div');
  var optData = document.createElement('div');
  $(optData).addClass("noselect");
  optData.id = "lexBlurb";
  fetchLexiconData(data.lex+data.version);
  var updateButton = document.createElement('button');
  accordionDiv.id = "lexUpdateInfo";
  $(accordionDiv).css({'font-family':'Lato, sans-serif','width':'100%','background-color':'rgba(240,240,240,0.6)','border':'1px solid black','border-radius':'0 10px 10px 0','font-size':'0.8em','text-align':'left','padding':'2px 0px'});
  $(accordionDiv).insertAfter($('#lexEnabled'+data.row));
  $(accordionDiv).hide();
  $(warning).addClass('redRowed noselect');
  $(warning).css({"border-radius":"5px","border":"1px solid black","margin":"3px","margin-bottom":"0px","padding":"5px",'font-size':'0.8em'});
  $(warning).html("After updating, uploading a cardbox from an earlier version may cause issues if your cardbox contains words omitted from the new version.  You will need to specify that you are using an older version when uploading then update it here.  Once a lexicon version is officially used in tournaments, uploads and existing cardboxes are automatically updated.")
  $(optslab).html("Cardbox Actions");
  $(optslab).addClass("noselect");
  $(optslab).css({'text-align':'center','margin':'auto 0','width':'100%'});
  $(opts).css({'padding':'5px','border-radius':'5px','border':'1px solid black','margin':'3px'});
  $(updateButton).html("Confirm");
  $(updateButton).click(function(){
    updateLexicon({
      'lexicon':data.lex.toLowerCase(),
      'version':data.version,
      'action':$('#lexUpdateOpts').val(),
      'userid':userid
    });
    appendDebugLog("Lex Update Values: "+data.lex.toLowerCase()+" "+data.version+" "+$('#lexUpdateOpts').val()+" "+userid);
  });
  $(opts).append(optslab);
  var optsAction = document.createElement('div');
  $(optsAction).css({'margin':0,'text-align':'center'});
  $(opts).addClass('highlightRow');
  optsAction.id = "lexUpdateOptions";
  $(opts).append(optsAction);
  $(accordionDiv).append(optData,opts,warning);
  gGenerateListBox("lexUpdateOpts",[['Add/move changes to cardbox 0','add'],['Add/move changes to cardbox queue','queue'],['Do nothing','none']],"lexUpdateOptions",'');
  $('#lexUpdateOpts').css({'max-width':'60%'});
  $('#lexUpdateOpts').val('none');
  $('#lexUpdateOpts').insertAfter($(this).parent().eq(0));
  $(updateButton).insertAfter($('#lexUpdateOpts'));
}
function createLexiconEnabled(content){
  console.log(content);
  $('#lexUpdateInfo').remove();
  if (content.length>0){
    var fakeRow = document.createElement('div');
    $(fakeRow).addClass('lexChild');
    var row = document.createElement('div');
    $(row).addClass('lexRow');
    var lex = document.createElement('div');
    var version = document.createElement('div');
    var defaultLex = document.createElement('div');
    var updateVer = document.createElement('div');
    var updateBtnCol = document.createElement('div');
    $(defaultLex).html("Default");
    $(defaultLex).addClass('lexCell noselect');
    $(lex).html("Lexicon");
    $(lex).addClass('lexCell noselect');
    $(version).html("Version");
    $(version).addClass('lexCell noselect');
    $(updateVer).html("Latest");
    $(updateVer).addClass('lexCell lexCellRightBorder noselect');
    $(updateBtnCol).html();
    $(updateBtnCol).addClass('lexCell noselect');
    $(row).append(defaultLex,lex,version,updateVer,updateBtnCol);
    $(fakeRow).append(row);
    $('#prefLexiconEnabled').append(fakeRow);
    content.forEach(function(elem,index){
      fakeRow = document.createElement('div');
      fakeRow.id = "lexEnabled"+(index+1);
      row = document.createElement('div');
      $(fakeRow).addClass('lexChild');
      $(row).addClass('lexRow');
      lex = document.createElement('div');
      version = document.createElement('div');
      defaultLex = document.createElement('div');
      updateVer = document.createElement('div');
      updateBtnCol = document.createElement('div');
      $(defaultLex).addClass('lexCell noselect');
    $(lex).addClass('lexCell noselect');
    $(version).addClass('lexCell noselect');
    $(updateVer).addClass('lexCell noselect');
    $(updateBtnCol).addClass('lexCell noselect');
      $(lex).html(elem.lexicon);
      $(version).html(elem.version);
      if (elem.update.toString()!==elem.version.toString()) {
        $(updateVer).html(elem.update);
        var updateButton = document.createElement('button');
        $(updateButton).html("Update");
        $(updateButton).prop("lex",elem.lexicon);
        $(updateButton).prop("version",elem.update);
        $(updateButton).prop("row",index+1);
        $(updateButton).click(
          function(){
            generateLexUpdateAccordion({lex:$(this).prop("lex"), version:$(this).prop('version'), row: $(this).prop('row')});
          });
        $(updateButton).addClass("btn btn-default");
        $(updateBtnCol).append(updateButton);
      }
      else {$(updateBtnCol).html(" - ");$(updateVer).html(elem.version);}
      elem.default!=='undefined' ? $(defaultLex).html("<span style='color:green'>&#x2714;</span>"): $(defaultLex).html(" - ");
      $(row).append(defaultLex,lex,version, updateVer, updateBtnCol);
      $(fakeRow).append(row);
      $('#prefLexiconEnabled').append(fakeRow);
    });
  }
}

function showUserPrefs(response, responseStatus) {
  appendDebugLog(response[0]);
  var inputs = JSON.parse(response);
  console.log(inputs);
  var nation = inputs.nation;
  var lexes = inputs.lexes;
  if (!document.getElementById("pan_1_d")) {
    panelData = {
          "contentClass" : "panelContentDefault",
          "title": "Preferences",
          "style": "Dark",
          "variant": "d",
          "closeButton": false,
          "refreshButton" : false,
          "tooltip": ""
          };
    generatePanel(1,panelData,"leftArea");
    gCreateElemArray([
      ['a0','div','','prefDiv','content_pan_1_d',''],
      ['a1','ul','nav nav-pills nav-justified','prefTabs','a0',''],
      ['a1b','li','active','prefAppearanceTab','a1','<a data-toggle="tab" href="#prefAppearanceDiv">Appearance</a>'],
      ['a1d','li','','prefLexiconTab','a1','<a data-toggle="tab" href="#prefLexiconDiv">Lexicons</a>'],
      ['a1c','li','','prefGameSettingTab','a1','<a data-toggle="tab" href="#prefOtherDiv">Other</a>'],
      ['a2','div','tab-content well well-sm pre-scrollable prefContent steelRowed','prefContent','a0',''],
      ['a2b','div','tab-pane fade in active','prefAppearanceDiv','a2',''],
      ['a2bHead','div','prefHead','prefAppHead','a2b','Appearance'],
      ['a2b1','div','prefPar','prefAlphaArrange','a2b',''],
      ['a2b1a','span','','prefAlphaArrangeS1','a2b1','All quiz alphagrams will be arranged '],
      ['a2b2','div','prefPar','prefAlphaDisplay','a2b',''],
      ['a2b2a','span','','prefAlphaDisplayS1','a2b2','Alphagrams are to be displayed as '],
      ['a2b4','div','prefPar','prefTileDisplay','a2b',''],
      ['a2b4a','span','','prefTileDisplayS1','a2b4','Show tile values '],
      ['a2b3','div','prefPar','prefWordwallTheme','a2b',''],
      ['a2b3a','span','','prefWordwallThemeS1','a2b3','Wordwalls Theme: '],
      ['a2b5','div','prefPar','prefBehaviour','a2b',''],
      ['a2b5a','span','','prefBehaviourS1','a2b5','Device is: '],
      ['a2c','div','tab-pane fade','prefOtherDiv','a2',''],
      ['a2c1','div','prefHead','prefOtherHead','a2c','Other'],
      ['a2c3','div','prefPar','prefSlothSubalphas','a2c',''],
      ['a2c3a','span','','prefSlothSubsS1','a2c3','In Sloth, quiz on '],
      ['a2c4','div','prefPar','prefSoundExtra','a2c',''],
      ['a2c4a','span','','prefSoundExtraS1','a2c4','Additional Sound Effects '],
      ['a2c5','div','prefPar','prefShowSol','a2c',''],
      ['a2c5a','span','','prefShowSolS1','a2c5','Show Num Solutions in Basic Quiz '],
      ['a2c6','div','prefPar','prefNation','a2c',''],
      ['a2c6a','span','','prefNationS1','a2c6','My Nationality:'],
      ['a2c7', 'div', 'prefPar', 'prefImage', 'a2c', ''],
      ['a2c7a', 'span', '', 'prefImage1', 'a2c7', 'Upload Pic:'],
      ['a2c7b','div','manageProfileImageWrap','manageGroup2','a2c7',''],
      ['a2c7b1','div','manageSpacer','spacerDiv3','a2c7b',''],
      ['a2c7b1a','input','uploadBox','profileFile','a2c7b1',''],
      ['a2c7b2','div','manageSpacer','spacerDiv4','a2c7b',''],
      ['a2c7b2a','button','btn btn-default','profileButton','a2c7b2','Submit'],
      ['a2d1','div','tab-pane fade','prefLexiconDiv','a2',''],
      ['a2d1a','div','prefHead','prefLexiconHead1','a2d1','Enabled Lexicons'],
      ['a2d1b','div','prefTable','prefLexiconEnabled','a2d1','']
      //['a2d1c','div','prefHead','prefLexiconHead2','a2d1','Available Lexicons'],
      //['a2d1d','div','prefTable','prefLexiconAvail','a2d1','']
    ]);
    createLexiconEnabled(lexes);
    if (typeof(localStorage.gSound)=='undefined'){
      isMobile()? localStorage.setItem('gSound', '1'):localStorage.setItem('gSound', '0')
    };
    if (typeof(localStorage.showAnswersQuiz)=='undefined'){localStorage.setItem('showAnswersQuiz', '1')};
    gGenerateListBox("prefAlphaArrangeSelect",[['Alphabetically',0],['Vowels First',1],['Consonants First',2],['Randomly',3]],"prefAlphaArrange","");
    $('#prefAlphaArrangeSelect').insertAfter($(this).parent().eq(0));
    $('#prefAlphaArrangeSelect').val(Number(localStorage.gAlphaSortInput));
    $('#prefAlphaArrangeSelect').on('change',function () {localStorage.gAlphaSortInput = $('#prefAlphaArrangeSelect').val();});
    $('#prefSaveButton').on('click',function(){setPrefs();});
    gGenerateListBox("slothSetup",[['All Subanagrams',0],['Some Subanagrams',1]],"prefSlothSubalphas",'');
    $('#slothSetup').insertAfter($('#prefSlothSubsS1'));
    $('#slothSetup').val(Number(localStorage.gSlothPref));
    $('#slothSetup').on('change',function(e){localStorage.gSlothPref = $('#slothSetup').val();});
    gGenerateListBox("alphaDisplay",[['Tiles',0],['Capital Letters',1]],"prefAlphaDisplay","");
    $('#alphaDisplay').insertAfter($('#prefAlphaDisplayS1'));
    $('#alphaDisplay').val(Number(localStorage.gAlphaDisplay));
    $('#alphaDisplay').on('change',function(e){localStorage.gAlphaDisplay = $('#alphaDisplay').val();});
    gGenerateListBox("tileDisplay",[['Yes',1],['No',0]],"prefTileDisplay","");
    $('#tileDisplay').insertAfter($('#prefTileDisplayS1'));
    $('#tileDisplay').val(Number(localStorage.gTileDisplay));
    $('#tileDisplay').on('change',function(e){localStorage.gTileDisplay = $('#tileDisplay').val();});
    gGenerateListBox("extraSounds",[['On',0],['Off',1]],"prefSoundExtra",'');
    $('#extraSounds').insertAfter($('#prefSoundExtraS1'));
    $('#extraSounds').val(Number(localStorage.gSound));
    $('#extraSounds').on('change',function(e){localStorage.gSound = $('#extraSounds').val();});
    gGenerateListBox("showSolutions",[['Yes',1],['No',0]],"prefShowSol",'');
    $('#showSolutions').insertAfter($('#prefShowSolS1'));
    $('#showSolutions').val(Number(localStorage.showAnswersQuiz));
    $('#showSolutions').on('change',function(e){localStorage.showAnswersQuiz = $('#showSolutions').val();});
    gGenerateListBox("behaviour",[['Desktop/Laptop',0],['Mobile/Tablet',1]],"prefBehaviour",'');
    $('#behaviour').insertAfter($('#prefBehaviourS1'));
    $('#behaviour').val(Number(localStorage.deviceType));
    $('#behaviour').on('change',function(e){localStorage.deviceType = $('#behaviour').val();});
    gGenerateListBox("wordwallTheme",[['Dark',0],['Light',1]],"prefWordwallTheme",'');
    $('#wordwallTheme').insertAfter($('prefWordwallThemeS1'));
    $('#wordwallTheme').val(Number(localStorage.gWordwallTheme));
    $('#wordwallTheme').on('change',function(e){localStorage.gWordwallTheme = $('#wordwallTheme').val();});
    var cListArray=new Array();
    cListArray = [['Unknown',0]]
    for (var x=0;x<country.byName.length;x++){
      cListArray.push([country.byName[x].name,country.byName[x].id]);
    }
    gGenerateListBox("nationList",cListArray,'prefNation','');
    $('#nationList').insertAfter($('#prefNationS1'));
    $('#nationList').val(nation);
    $('#nationList').on('change',function(e){
      var d={userid: userid, nation: $('#nationList').val(), action: ['STN']}
      $.ajax({
        type: "POST",
        url: "PHP/userPrefs.php",
        data: JSON.stringify(d),
        error: function(jqXHR, textStatus, errorThrown) {
          console.log("Error retrieving user prefs. Status: " + textStatus + "  Error: " + errorThrown);
        }
      });
    });

   // file upload box here
    $('#profileFile').prop('type','file');
    $('#profileFile').prop('accept','image/*');
    $('#profileButton').on('click', function(){uploadProfileImage();});
  }
} // end showUserPrefs

function uploadProfileImage() {
  $("#profileButton").prop("disabled", true);
  $("#profileButton").val("Uploading...");
  var file = document.getElementById('profileFile').files[0];
  var formdata = new FormData();
  formdata.append("userid", userid);
  formdata.append("file", file);
  $.ajax({ type: 'POST',
     url: 'uploadProfileImage.py',
          data: formdata,
          processData: false,
          contentType: false,
          success: function(response, responseStatus) {
                      $('#profileButton').prop('disabled', false);
                      $('#profileButton').val('Success');
                      gFloatingAlert("profileAlert",3000,"Profile Image", "Profile Image Uploaded!",500);
          }});
}
