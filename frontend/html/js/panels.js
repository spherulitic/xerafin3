
// The column ids don't match their visual order. On wide screens
// switch_areas() (index.htm) moves #middleArea before #leftArea, so
// 'middleArea' renders as the left column and 'leftArea' as the middle one.
// The saved layout keeps the leftArea/middleArea/rightArea order either way.
var panelColumns = ['leftArea', 'middleArea', 'rightArea'];

function defaultPanelLayout(){
  return [[["4",true],["1_a",false]],[["0",false]],[["2",false],["3",false]]];
}

// Saved panel ids are stored without the 'pan_' DOM prefix. Older layouts can
// still contain aliases that used to map to the Basic Quiz panel.
function normalizePanelId(value){
  if (value===undefined || value===null) {return null;}
  var id = value.toString().replace(/^pan_/,'');
  if (id==='' || id==='undefined' || id==='null') {return null;}
  if (id==='20' || id==='1_e' || id==='1_f') {return '1_a';}
  return id;
}

// Reads, validates and normalises the three-column layout. Always returns
// three arrays of [id, isMinimized] pairs, so callers never see holes or junk.
function getPanelLayout(){
  var cols;
  try {
    cols = JSON.parse(localStorage.getItem('panelPositions'));
  } catch (e) {
    cols = null;
  }
  if (!Array.isArray(cols)) {cols = [];}
  cols.length = 3;
  var seen = {};
  for (var x=0;x<3;x++){
    if (!Array.isArray(cols[x])) {cols[x] = [];}
    var clean = [];
    for (var y=0;y<cols[x].length;y++){
      var entry = cols[x][y];
      if (!Array.isArray(entry)) {continue;}
      var id = normalizePanelId(entry[0]);
      if (!id || /_temp_/.test(id) || seen[id]) {continue;}
      seen[id] = true;
      clean.push([id, entry[1]===true || entry[1]==='true']);
    }
    cols[x] = clean;
  }
  return cols;
}

function savePanelLayout(cols){
  localStorage.setItem('panelPositions', JSON.stringify(cols));
}

// Seeds the default layout, or repairs a saved one that is unusable. A missing
// panel is never a reason to throw the whole layout away.
function loadPanelLayout(){
  if (localStorage.getItem('panelPositions')===null){
    xerafin.error.log.add('Panels config initialized as blank.','comment');
    savePanelLayout(defaultPanelLayout());
    return;
  }
  var cols = getPanelLayout();
  var total = 0;
  var hasOverview = false;
  for (var x=0;x<cols.length;x++){
    total += cols[x].length;
    for (var y=0;y<cols[x].length;y++){
      if (cols[x][y][0]==='0') {hasOverview = true;}
    }
  }
  if (total===0){
    savePanelLayout(defaultPanelLayout());
    return;
  }
  if (!hasOverview){
    // The overview can't be closed, so a layout without it is corrupt. Put it
    // back instead of resetting every other panel to the defaults.
    cols[1].splice(0,0,['0',false]);
    xerafin.error.log.add('Panels config repaired (overview missing).','comment');
  }
  savePanelLayout(cols);
}

function findPanel(panel){
  var panelList=getPanelLayout();
  for (var x=panelList.length-1;x>-1;x--){
    for (var y=panelList[x].length-1;y>-1;y--){
      if (panelList[x][y][0]===panel.toString()){
        return [x,y];
      }
    }
  }
  return false;
}

function clearPanel(panel){
  var x=findPanel(panel);
  if (!x) {return;}
  var cols=getPanelLayout();
  cols[x[0]].splice(x[1],1);
  savePanelLayout(cols);
}

function togglePanel(panel){
  var x=findPanel(panel);
  if (!x) {return;}
  var cols=getPanelLayout();
  cols[x[0]][x[1]][1]=!(cols[x[0]][x[1]][1]);
  savePanelLayout(cols);
}

// Game panels (Basic Quiz, Sloth, Invaders, Wall of Words, Preferences) share
// one slot. Returns the [column, index] of whichever one is saved, if any.
function findGamePanelSlot(ident){
  var cols=getPanelLayout();
  var re=new RegExp('^'+ident+'_');
  for (var x=0;x<cols.length;x++){
    for (var y=0;y<cols[x].length;y++){
      if (re.test(cols[x][y][0])) {return [x,y];}
    }
  }
  return null;
}

function removeGamePanels(cols, ident){
  var re=new RegExp('^'+ident+'_');
  for (var x=0;x<cols.length;x++){
    cols[x]=cols[x].filter(function(entry){return !re.test(entry[0]);});
  }
  return cols;
}

// Inserts into the DOM and the saved layout at the same column/index.
function insertPanelAt(panelSuffix, slot, newPanel){
  var cols=getPanelLayout();
  var colIndex=slot[0];
  var $col=$('#'+panelColumns[colIndex]);
  var children=($col.length>0) ? $col.children() : $();
  var ind=slot[1];
  if (typeof ind!=='number' || isNaN(ind) || ind<0) {ind=0;}
  ind=Math.min(ind, cols[colIndex].length, children.length);
  if ($col.length>0){
    if (ind===0) {$col.prepend(newPanel);}
    else {children.eq(ind-1).after(newPanel);}
  }
  cols[colIndex].splice(ind,0,[panelSuffix.toString(),false]);
  savePanelLayout(cols);
}

function addPanel(panel,column,ind){
  var colValue=getPanelValue(column);
  var cols=getPanelLayout();
  if (colValue<0) {colValue=0;}
  if (typeof ind!=='number' || isNaN(ind)) {ind=0;}
  if (ind===-1 || ind>cols[colValue].length) {ind=cols[colValue].length;}
  if (ind<0) {ind=0;}
  cols[colValue].splice(ind,0,[panel.toString(),false]);
  savePanelLayout(cols);
}

function getPanelName(value){
  return panelColumns[value];
}

function getPanelValue(value){
  return panelColumns.indexOf(value);
}

function panelFunctionLookup(panel){
  switch (panel){
  case '0': initXeraOverview();break;
    case '1_a': initBQ(); break;
    case '1_b': initSloth(); break;
    case '1_c': initInvaders(); break;
    case '1_d': initUserPrefs(); break;
    case '1_e': initBQ(); break;
    case '1_f': initBQ(); break;
    case '1_g': initWordWall(); break;
    case '2': startChat(); break;
    case '3': initLeaderboard(); break;
    case '4': showCardboxStats(); break;
    case '5': showAlphaStats(""); break;
    case '6': showGameStats(); break;
  case '7': showProfile(); break;
  case '8': createWordInfoPanel(); break;
  case '20': initBQ(); break;
    case '100': initTournamentStandings(); break;
    case '500': initOldManageUsers(); break;
  case '501': initDebug();break;
  case '502': initManageUsers(); break;



  }
}
function createPlaceholderDivs(panelList){
  var temps;
  var colName;
  //need to put in dummy divs as placeholders, then check for them and delete when populating the real ones
  for (var x=0;x<3;x++){
    for (var y=0;y<panelList[x].length;y++){
      colName=getPanelName(x);
      temps = document.createElement('br');
      temps.id = colName+"_temp_"+y;
      $("#"+colName).append(temps);
    }
  }
}
function populatePanelsFromArray(){
//NOTE: This method does not call generatePanel below directly, it calls the functions
//required to start the panel which, after ajax calls, variable inits, etc... call generatePanel.
//If nextTarget and nextMinim exist, they override some of the values set from those scripts,
//clearing those two localStorage variables on closure (so that they don't fire again without being
//reinitialized.)
  var panelList=getPanelLayout();
  //special edge case to init chat if not in existing list
  var colStateArray = new Array();
  //These 2 loops have to be separate (thread/race conditions between generatePanel & AjaX calls)
  for (var x=0;x<3;x++){
    var targetPanel=getPanelName(x);
    for (var y=0;y<panelList[x].length;y++){
      var temp = [panelList[x][y][0].toString(),panelList[x][y][1].toString(),targetPanel,y];
      colStateArray.push(temp);
    }
  }
  createPlaceholderDivs(panelList);
  localStorage.setItem('panelStateArray', JSON.stringify(colStateArray));
  for (var x=0;x<3;x++){
    for (var y=0;y<panelList[x].length;y++){
      panelFunctionLookup(panelList[x][y][0].toString());
    }
  }
}

function getPanelInStorageQueue(panel){
  if (typeof localStorage.panelStateArray==='undefined'){return false;}
  var storageQueue=JSON.parse(localStorage.panelStateArray);
  for (var y=0;y<storageQueue.length;y++){
    if (storageQueue[y][0] == panel) {
      var result=[storageQueue[y][0],storageQueue[y][1],storageQueue[y][2],storageQueue[y][3],y];
      return result;
    }
  }
  return false;
}

function removePanelInStorageQueue(panel){
  var storageQueue=JSON.parse(localStorage.panelStateArray);
  var ind=getPanelInStorageQueue(panel);
  storageQueue.splice(ind[4],1);
  if (storageQueue.length==0){
    if (findPanel(2)==false){startChat();}
    localStorage.removeItem('panelStateArray');
  }
  else {localStorage.panelStateArray=JSON.stringify(storageQueue);
  }
}

function generatePanel(ident, data, targ, refresher, closure){
  var panelSuffix, queueData, gameSlot = null;
  if (typeof data.variant==='undefined'){
    panelSuffix = ident;
    queueData=getPanelInStorageQueue(panelSuffix.toString());
  }
  else {
    panelSuffix = ident+'_'+data.variant;
    queueData=getPanelInStorageQueue(panelSuffix.toString());
    if (!queueData){
      // This game isn't in the saved layout. If another game panel is open,
      // remember its slot so the new game lands exactly where the old one was.
      gameSlot = findGamePanelSlot(ident);
    }
  }
  var buttonStyle="grey metalBOne";
  if (typeof data.style=='undefined'){
    data.style='Dark';
    buttonStyle="grey metalBOne";

  }
    var newPanel = document.createElement('div');
    newPanel.id = 'pan_'+panelSuffix;
    newPanel.className += ' well well-sm panelStyle'+data.style;
    newPanel.style.marginBottom = '10px';

    var panelHeader = document.createElement("div");
    panelHeader.id = 'header_pan_'+panelSuffix;
    $('#header_pan_'+ident).css({"width":"100%"});
    panelHeader.style.display='flex';
    panelHeader.style.flexDirection='row';
    panelHeader.style.flexWrap="nowrap";

    var btnGroup = document.createElement("div");
    btnGroup.id = 'btnGroup_pan_'+panelSuffix;
    btnGroup.className += ' btn-group btn-group-sm';
    $('#btnGroup_pan_'+ident).css({"vertical-align":"middle","padding":"0px","margin":"0px","white-space":"nowrap","flex":"0 0"});

    if (typeof data.closeButton==='undefined') {
    data.closeButton=true;
    var closeButton = document.createElement('button');
    closeButton.id = 'close_button_pan_'+panelSuffix;
    closeButton.className += ' btn btn-grey btn-sm metalBOne';
    $(closeButton).css('flex','0 0');
    $(closeButton).html('<span class="glyphicon glyphicon-remove" style="vertical-align:middle"></span>');
    }

    if (typeof data.refreshButton==='undefined') {
    data.refreshButton=true;
    var refreshButton = document.createElement('button');
    refreshButton.id = 'refresh_button_pan_'+panelSuffix;
    refreshButton.className += ' btn btn-'+buttonStyle;
    $(refreshButton).html('<span class="glyphicon glyphicon-refresh" style="vertical-align:middle"></span>');
    btnGroup.appendChild(refreshButton);
    refreshButton.onclick = refresher;
    }

    var helpButton = document.createElement('button');
    helpButton.id = 'help_button_pan_'+panelSuffix;
    helpButton.className += ' btn btn-'+buttonStyle;
    $(helpButton).html('<span class="glyphicon glyphicon-question-sign" style="vertical-align:middle"></span>');

    var minimizeButton = document.createElement('button');
    minimizeButton.id = 'minim_button_pan_'+panelSuffix;
    minimizeButton.className += ' btn btn-'+buttonStyle;

    if ((typeof queueData!=='boolean') && (queueData[1]=="true")) {
      var minimcont='<span class="glyphicon glyphicon-chevron-down" style="vertical-align:middle"></span>';}
    else
      {var minimcont='<span class="glyphicon glyphicon-chevron-up" style="vertical-align:middle"></span>';}
    $(minimizeButton).html(minimcont);

    var headingText = document.createElement('div');
    headingText.id = 'heading_text_pan_'+panelSuffix;
    headingText.className += ' panelHeader'+data.style+' dragMe noselect steelRowed';
    $(headingText).css('flex','1 0');
    $(headingText).html(data.title);

    btnGroup.appendChild(helpButton);
    btnGroup.appendChild(minimizeButton);
    $(panelHeader).append(btnGroup, headingText);
    if ((data.closeButton)==true){
      closeButton.onclick = function(){
        closure();
        clearPanel(panelSuffix);
      }
      panelHeader.appendChild(closeButton);
    }
    newPanel.appendChild(panelHeader);

    var panelContent = document.createElement('div');
    panelContent.id = 'content_pan_'+panelSuffix;
    panelContent.className = " "+data.contentClass;
    newPanel.appendChild(panelContent);

    var fireOnce=once(function () {
    if ((typeof queueData!=='boolean') && (queueData[1]=="true")) {
      if (typeof data.minimizeObject!=='undefined'){
        $('#'+data.minimizeObject).ready(function () {
          $('#'+data.minimizeObject).hide();
        });
      }
      else {
        $('#content_pan_'+panelSuffix).hide();
      }
    }
    });

    $(newPanel).ready(function(){fireOnce()});

    $(document).ready(function(){
      $("#help_button_pan_"+panelSuffix).tooltip({title: data.tooltip, placement : "bottom", html : true, container : "#pan_"+panelSuffix, trigger : "click"});

      $('#minim_button_pan_'+panelSuffix).click(function(){
        togglePanel(panelSuffix);
        if (typeof data.minimizeObject!=='undefined'){
          $('#'+data.minimizeObject).slideToggle(400)
        }
        else {
          $('#content_pan_'+panelSuffix).slideToggle(400)
        };
        $('#minim_button_pan_'+panelSuffix+'> span').toggleClass("glyphicon-chevron-down");
        $('#minim_button_pan_'+panelSuffix+'> span').toggleClass("glyphicon-chevron-up");
        });
    });
    //Panel hiding from memory on refresh
    //DOMNodeInserted events are to be deprecated at some point (once people stop using IE, most likely :p)
    //and we need to learn more about Mutation Handlers in general .
    if (typeof queueData=='boolean') {
      if (gameSlot){
        var cols = getPanelLayout();
        removeGamePanels(cols, ident);
        savePanelLayout(cols);
        $('[id^=pan_'+ident+'_]').each(function(){ $(this).remove(); });
        insertPanelAt(panelSuffix, gameSlot, newPanel);
      }
      else {
        $('#'+targ).prepend(newPanel);
        addPanel(panelSuffix, targ, 0);
      }
    }
    else {
      $('#'+queueData[2]+"_temp_"+queueData[3]).after(newPanel);
      $('#'+queueData[2]+"_temp_"+queueData[3]).remove();
      removePanelInStorageQueue(panelSuffix);
    }
}
//Imported from index.

<!------------------------------------------------------------------------------------------------------------->

    function getPanelMinimizeStatus (value){
      if ($('#minim_button_'+value+' > span').hasClass("glyphicon-chevron-down")){return true;}
      else {return false;}
    }
<!------------------------------------------------------------------------------------------------------------->
    function writePanelStatus(panelArray){
      var oldLayout=getPanelLayout();
      var newPanelArray=[[],[],[]];
      var domIds={};
      for (var x=0;x<3;x++){
        var ids=panelArray[x] || [];
        for (var y=0;y<ids.length;y++){
          var id=normalizePanelId(ids[y]);
          if (!id || /_temp_/.test(id)) {continue;}
          newPanelArray[x].push([id, getPanelMinimizeStatus(ids[y])]);
          domIds[id]=true;
        }
      }
      // Panels that are configured but haven't loaded yet (cardbox and
      // alphagram stats arrive after an ajax call) must survive a drag. A
      // panel that moved columns is already in domIds and stays moved.
      for (var x=0;x<3;x++){
        for (var z=0;z<oldLayout[x].length;z++){
          var existing=oldLayout[x][z][0];
          if (!domIds[existing]){
            var at=Math.min(z, newPanelArray[x].length);
            newPanelArray[x].splice(at,0,[existing, oldLayout[x][z][1]]);
            domIds[existing]=true;
          }
        }
      }
      savePanelLayout(newPanelArray);
      appendDebugLog("Panel configuration:"+localStorage.panelPositions);
    }
<!------------------------------------------------------------------------------------------------------------->
function generatePanels(){

  $('#logProgress').html("Populating user interface");
  if (true){
    fetchWithAuth("contentLogged.html", {method: "GET"})
    .then(response => {
       if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
          return response.text(); })
    .then(responseData => {

    // NB panel positions is an array which contains three arrays -- one per column
    //  with each element in the column array is an array: [panel_id, isCollapsed]

      loadPanelLayout();
      appendDebugLog("Content Populated Successfully");
      $('#pageContent').append(responseData);
      $('#mainLayer').css('opacity','0');
      populatePanelsFromArray();
      switch_areas();
      $( function() {
        $('#middleArea, #leftArea, #rightArea').sortable({
           connectWith:'#middleArea, #leftArea, #rightArea',
           dropOnEmpty: true,
           handle: '.dragMe',
           placeholder: "panelPlaceholder",
           scrollSensitivity: 5,
           distance: 10,
           revert: 200,
           change: function(event, ui) {
             ui.placeholder.css({visibility: 'visible'});
           },
           start: function (event, ui) {
             ui.item.toggleClass("panelPlaceholder");
             ui.placeholder.height(50);
             if (isMobile()===false) {
               var placeholderHeight = ui.item.outerHeight();
               ui.placeholder.height(placeholderHeight + 10);
             }
           },
           stop: function (event, ui) {
             ui.item.toggleClass("panelPlaceholder");
             var x= [$( "#leftArea" ).sortable( "toArray" ),$( "#middleArea" ).sortable( "toArray" ), $( "#rightArea" ).sortable( "toArray" )];
             writePanelStatus(x);
           },
           tolerance:'touch'
        });
      });
      $('#logProgress').html("Finalising user interface");
      generateNav();
    })
    .catch(error => {
       console.error("Error loading context:", error);
       appendDebugLog("<b>Something went wrong whilst loading content!</b>");
    });
  }
}
