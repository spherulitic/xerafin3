MyQuizzesContainer.prototype = {
  constructor: MyQuizzesContainer,
  init: function(){
    this.cont = document.createElement('div');
    this.cont.id = this.id;
    $(this.cont).addClass('well well-sm pre-scrollable noselect overviewList');
    $('#'+this.cont.id).css({'padding':'10px 0px 10px 0px !important','margin-bottom':'20px !important'});
  },
  show: function(){
    $('#'+this.pare).append(this.cont);
  }
}
function MyQuizzesContainer(data){
  if (typeof data.id!=='undefined') {
    this.id = data.id;
    if (typeof data.pare!=='undefined'){
      this.pare = data.pare;
      this.init();
    }
    else {
      console.log("MyQuizzesContainer requires a parent to attach to");
    }
  }
  else {
    console.log("MyQuizzesContainer requires an ID");
  }
}

XeraOverviewManager.prototype = {
  constructor: XeraOverviewManager,
//------------------------------------------------------------------------------------------------------>

  initUI: function(){
    //let watchFilter = !(userid == "10106924779084089");
    let watchFilter = true;
    overviewUI = new XeraPanelUI({id:"overviewUI", title:"Overview", targetPanel:0,'disableWatch':watchFilter});

//OVERVIEW UPSTREAM ACTIONS
    overviewAH = new XeraActionHandler({
      'name':'Overview',
      'bgColor':'darkGreen',
      'disable':watchFilter
    });
    overviewAH.add('UPD_CBX',{'action': "overview.fetchCardboxSummary", 'watch':true});
    overviewAH.add('SET_CBX_RDY',{'action': "overview.setCbxReady", 'watch':true});
    overviewAH.add('GET_LEX_VAL',{'action': "overview.lexiconGetValues", 'watch':true});
    overviewAH.add('SET_LEX_CUR',{'action': "overview.lexiconSetCurrent", 'watch':true});
    overviewAH.add('GO',{'action': "overview.go",'watch':true});

  //Generic Quiz Row Actions
    overviewAH.add('QID_RST_ALL',{'action': "overview.resetAll",'watch':true});
    overviewAH.add('QID_RST_WNG',{'action': "overview.resetWrong",'watch':true});
    overviewAH.add('QID_DISCARD',{'action': "overview.discard",'watch':true});
    overviewAH.add('QID_ADD_ALL',{'action': "overview.addCardboxAll",'watch':true});
    overviewAH.add('QID_ADD_WRONG',{'action': "overview.addCardboxWrong",'watch':true});


  //My Quizzes Tab Specific calls
    overviewAH.add('MY_SELECTION',{'action': "overview.mySelectionList", 'watch':true});
    overviewAH.add('MY_UPDATE_SELECTIONS',{'action': "overview.setMySelectionRow", 'watch':true});
    overviewAH.add('MY_SET_GO_NAME',{'action': "overview.mySetGoName",'watch':true});

  //Search Tab specific calls
    overviewAH.add('SEARCH_GET_RESULTS',{'action': "overview.updateQuizSearch",'watch':true});
    overviewAH.add('SEARCH_SELECTION',{'action': "overview.searchSelectionList",'watch':true});
    overviewAH.add('SEARCH_SET_GO_NAME',{'action': "overview.searchSetGoName",'watch':true});
    overviewAH.add('SEARCH_ADD',{'action': "overview.searchAdd",'watch':true});

  //Any Go Action:  Context passed into function
    overviewAH.add('SET_GO_ACTION',{'action': "overview.setGoAction",'watch':true});
    //overviewAH.list();

  //Subscription Specific Action
    overviewAH.add('SUB_UPDATE',{'action': "overview.fetchData",'watch':true});

//OVERVIEW WIDGET INSTANCES

    overviewUI.addChild({
      'child':new XeraLexiconSelector({'id':'overviewLex','pare':'overviewUI'}),
      'name': 'currentLex',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new XeraTabGenerator({'id':'overviewTabs','pare':'overviewUI','titles':['My Quizzes', 'Search','Subscribe']}),
      'name': 'overviewTabs',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new OverviewSearch({'id':'overviewSearch', 'pare':'overviewTabs_1'}),
      'name': 'overviewSearch',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new MyQuizzesContainer({'id':'overviewListGroup','pare':'overviewTabs_0'}),
      'name': 'overviewListGroup',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new OverviewList({
        'id':'currentList',
        'pare':'overviewListGroup',
        'heading':'Current Quiz',
        'showNumRows':false,
        'multiple':false,
        'hasDiscard':false,
        'canHoldCardbox':true,
        'context':'MY'
      }),
      'name': 'currentList',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new OverviewList({
        'id':'activeList',
        'pare':'overviewListGroup',
        'heading':'Active Quizzes',
        'multiple':false,
        'hasDiscard':true,
        'canHoldCardbox':true,
        'hasSubs': false,
        'countSubs':true,
        'context':'MY'
      }),
      'name': 'activeList',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new OverviewList({
        'id':'completedList',
        'pare':'overviewListGroup',
        'heading':'Recently Completed',
        'canHoldCardbox':false,
        'isSelectable':false,
        'multiple':false,
        'hasDiscard':false,
        'hasCActions':true,
        'context':'MY'
      }),
      'name': 'completedList',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new OverviewGoRegion({
        'id':'overviewGo',
        'pare':'overviewTabs_0',
        'multiples':false,
        'context':'MY'}),
      'name': 'overviewCurrentGo',
      'actionHandler': 'overviewAH'
    });

    overviewUI.addChild({
      'child':new OverviewList({
        'id':'searchList',
        'pare':'overviewTabs_1',
        'heading':'Search Results',
        'canHoldCardbox':false,
        'clearDivs':true,
        'hasDiscard':false,
        'hasPlaceholder':true,
        'hasTransitions': true,
        'hasSharedParent': false,
        'hasSubs': false,
        'context':'SEARCH'
      }),
      'name': 'searchList',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new OverviewGoRegion({
        'id':'overviewSearchGo',
        'pare':'overviewTabs_1',
        'multiples':true,
        'context':'SEARCH'}),
      'name': 'overviewSearchGo',
      'actionHandler': 'overviewAH'
    });
    overviewUI.addChild({
      'child':new SubscriptionList({
        'pare':'overviewTabs_2'
      }),
      'name': 'overviewSubscriptions',
      'actionHandler': 'overviewAH'
    });

//OVERVIEW DOWNSTREAM ACTIONS

    overviewUI.addChildListeners([
// ROOT OVERVIEW LISTENERS
      ['TABS_SWITCH',{'action': "overviewUI.childUI['overviewTabs'].externShowTabContent",'watch':true}],
      ["SET_LEX_VAL", {'action': "overviewUI.childUI['currentLex'].redraw",'watch':true}],
      ["UPD_LEX_VAL", {'action': "overviewUI.childUI['currentLex'].change",'watch':true}],

// MY QUIZZES TAB LISTENERS
      ["MY_GO_APPS", {'action': "overviewUI.childUI['overviewCurrentGo'].setGoApps", 'watch':true}],
      ["MY_GO_SET_DEFAULT", {'action': "overviewUI.childUI['overviewCurrentGo'].setDefault", 'watch':true}],
      ["MY_GO_UPDATE", {'action': "overviewUI.childUI['overviewCurrentGo'].setButtonStates", 'watch':true}],
      ["MY_GO_DEACTIVATE", {'action': "overviewUI.childUI['overviewCurrentGo'].freeze", 'watch':true}],
// MY QUIZZES LIST SPECIFIC LISTENERS
  //CURRENT
      ["LST_UPD_CUR", {'action': "overviewUI.childUI['currentList'].updateData",'watch':true}],
      ["CUR_SET_SELECTION_VALUE", {'action': "overviewUI.childUI['currentList'].setSelection",'watch':true}],
      ["CBX_UPD_CUR",{'action': "overviewUI.childUI['currentList'].updateCardboxValues",'watch':true}],
  //ACTIVE
      ["LST_UPD_ACT", {'action': "overviewUI.childUI['activeList'].updateData",'watch':true}],
      ["ACT_SET_SELECTION_VALUE", {'action': "overviewUI.childUI['activeList'].setSelection",'watch':true}],
      ["CBX_UPD_ACT",{'action': "overviewUI.childUI['activeList'].updateCardboxValues",'watch':true}],
  //COMPLETED
      ["LST_UPD_COM", {'action': "overviewUI.childUI['completedList'].updateData",'watch':true}],
      ["COM_UPDATE_BUTTON_STATES", {'action': "overviewUI.childUI['completedList'].updateButtonStates",'watch':true}],
      ["COM_DISABLE_BUTTON_STATES", {'action': "overviewUI.childUI['completedList'].disableButtons",'watch':true}],
// SEARCH TAB LISTENERS
      ["LST_UPD_SRH", {'action': "overviewUI.childUI['searchList'].updateData",'watch':true}],
      ["SEARCH_GO_APPS", {'action': "overviewUI.childUI['overviewSearchGo'].setGoApps", 'watch':true}],
      ["SEARCH_GO_SET_DEFAULT", {'action': "overviewUI.childUI['overviewSearchGo'].setDefault", 'watch':true}],
      ["SEARCH_GO_DEACTIVATE", {'action': "overviewUI.childUI['overviewSearchGo'].deactivate",'watch':true}],
      ['SEARCH_GO_UPDATE',{'action': "overviewUI.childUI['overviewSearchGo'].setButtonStates",'watch':true}],
      ["SEARCH_TOGGLE_SEARCH", {'action': "overviewUI.childUI['overviewSearch'].toggleSearch", 'watch':true}],
      ["SEARCH_CLEAR_SELECTION", {'action': "overviewUI.childUI['searchList'].clearSelection", 'watch':true}],
      ["SEARCH_EMPTY", {'action': "overviewUI.childUI['searchList'].clearAll", 'watch':true}],

    ]);
  },

//------------------------------------------------------------------------------------------------------>
// Launches given app, populating it with given id, quizname.

  launchApp:function(id, name, app){
    var self = this;
    let x = new Function('d',self.activeApps[app][1]+'(d)');
    if (id!==undefined) {this.setCurrentQuizid(id);}
    else {this.setCurrentQuizid(-1);}
    this.stSrc.currentQuizName = name;
    xerafin.storage.write();
    x({'quizid' : id, 'quizname' : name});
    if (Number(id===-1)) {this.fetchCardboxSummary(true);}
    if (app===0) {
      //if (isMobile()){
      //  $([document.documentElement, document.body]).animate({
        //      scrollTop: Math.max($("#pan_1_a").offset().top-60,0)
        //  }, 2000);
      //}
    }
  },

//------------------------------------------------------------------------------------------------------>
// Updates Storage with current quiz and refreshes my quizzes lists
  setCurrentQuizid:function(id){
    this.data.currentQuiz = id;
    if (id==undefined){this.data.currentQuiz=-1;}
    this.stSrc.currentQuiz = this.data.currentQuiz;
    xerafin.storage.write();
    this.mySelectionList([id]);
    //this.fetchData();
  },

//------------------------------------------------------------------------------------------------------>
// Repopulates the selected My Quizzes ID value and updates 'GO' button statuses

  mySelectionList:function(value){
    this.data.mySelection = value;
    this.setMySelectionRow(this.data.mySelection[0]);
    overviewUI.update('MY_GO_UPDATE',1);
  },

//------------------------------------------------------------------------------------------------------>

  mySetGoName:function(name='Cardbox'){
    this.data.myGoName = name;
  },

//------------------------------------------------------------------------------------------------------>
// Repopulates the selected search ID array and updates 'GO' button statuses

  searchSelectionList:function(value){
    this.data.searchSelection = value;
    overviewUI.update('SEARCH_GO_UPDATE',this.data.searchSelection.length);
  },

//------------------------------------------------------------------------------------------------------>
// Sets go name to pass to an app, should it be required.

  searchSetGoName:function(name='Cardbox'){
    this.data.searchGoName = name;
  },

//------------------------------------------------------------------------------------------------------>
// Sets which app should be fired up when start selected on a given go region (context) and remembers
// this value on refresh.

  setGoAction:function(data){
    switch (data.context) {
      case 'MY' : this.data.myGoAction = data.value; break;
      case 'SEARCH': this.data.searchGoAction = data.value; break;

    }
    this.stSrc.defaultActivity=data.value;
    xerafin.storage.write();
  },

//------------------------------------------------------------------------------------------------------>
//Populates both go regions with available Apps and sets the default value based on Local Storage
//Part of the initialization process, should only be called once

  setGoApps:function(){
    //Send List of Available Apps
    overviewUI.update('MY_GO_APPS',this.activeApps);
    overviewUI.update('SEARCH_GO_APPS',this.activeApps);
    //Send Default Values for selected App
    overviewUI.update('MY_GO_SET_DEFAULT', this.stSrc.defaultActivity);
    overviewUI.update('SEARCH_GO_SET_DEFAULT', this.stSrc.defaultActivity);
  },

//------------------------------------------------------------------------------------------------------>
//Highlight the appropriate row across 2 list regions.
//Points to a function in each list that checks for the existence of the sent key and highlights it.
//Will do this another way later.

  setMySelectionRow:function(value){
    if (this.listsReady!=='undefined'){clearTimeout(this.listsReady);}
    if (overviewUI.childUI['activeList'].initialized && overviewUI.childUI['currentList'].initialized){
      overviewUI.update('CUR_SET_SELECTION_VALUE',value);
      overviewUI.update('ACT_SET_SELECTION_VALUE',value);
    }
    else {this.listsReady = setTimeout(XeraOverviewManager.prototype.setMySelectionRow.bind(this,value),30);}
  },

//------------------------------------------------------------------------------------------------------>
//Check intersection of selection with supplied list.  Remove those already with bookmarks and activate.
  activateQuizzes:function(v,list){
    if (!Array.isArray(v)){v = [v];}
    let a = new Set(v);
    let b = new Set([...Object.keys(list)]);
    let filtered = new Set([...b].filter(x => a.has(Number(x)) && !list[Number(x)].bookmarked));
    if (filtered.size>0){
      let res = [...filtered].map(Number);
      this.data.writeList.activateQuizzes(res);
      gFloatingAlert("addedQuizzes",2000,"My Quizzes", filtered.size+" quiz"+(filtered.size>1 ? "zes":"")+" activated.",500);
    }

  },

//------------------------------------------------------------------------------------------------------>

  searchGo:function(){
    if (typeof this.writeReady!=='undefined') {clearTimeout(this.writeReady);}
    if (this.data.writeList.initialized){
      var self=this;
      this.setGoButtons(false);
      if (Number(this.data.searchSelection[0])!==-1) {
        this.activateQuizzes(this.data.searchSelection, this.data.searchList.quizList);
      }
      this.resetWritePoll(function(){
        overviewUI.update("SEARCH_GO_DEACTIVATE",false);
        self.setCurrentQuizid(Number(self.data.searchSelection[0]));
        self.launchApp(self.data.searchSelection[0],self.data.searchGoName, self.data.searchGoAction);
        self.fetchData(function(){self.setMySelectionRow(self.data.searchSelection[0]);});
        overviewUI.update('TABS_SWITCH',0);
        overviewUI.update("SEARCH_CLEAR_SELECTION");

      });
    }
    else {this.writeReady = setTimeout(XeraOverviewManager.prototype.go.bind(this),30);}
  },

  myGo:function(){
    overviewUI.update("MY_GO_DEACTIVATE",true);
    if (typeof this.writeReady!=='undefined') {clearTimeout(this.writeReady);}
    if (this.data.writeList.initialized){
      var self=this;
      this.setGoButtons(false);
      if (Number(this.data.mySelection[0])!==-1){
        this.activateQuizzes(this.data.mySelection[0], this.data.activeList.quizList);
      }
      this.resetWritePoll(function(){
        self.setCurrentQuizid(Number(self.data.mySelection[0]));
        self.launchApp(self.data.mySelection[0],self.data.myGoName, self.data.myGoAction);
        self.fetchData(function(){
          self.setMySelectionRow(self.data.mySelection[0]);
        });
      });
    }
    else {this.writeReady = setTimeout(XeraOverviewManager.prototype.go.bind(this),30);}
  },

//------------------------------------------------------------------------------------------------------>
//This will add multiple quizzes to the overview
  searchAdd:function(){
    if (typeof this.writeReady!=='undefined') {clearTimeout(this.writeReady);}
    if (this.data.writeList.initialized){
      var self=this;
      this.setGoButtons(false);
      this.activateQuizzes(this.data.searchSelection, this.data.searchList.quizList);
      this.resetWritePoll(function(){
        self.fetchData();
        overviewUI.update("SEARCH_CLEAR_SELECTION");
      });
    }
    else {this.writeReady = setTimeout(XeraOverviewManager.prototype.go.bind(this),30);}
  },

//------------------------------------------------------------------------------------------------------>
//Created a switchboard until I figure out all the specifics to unify myGo and searchGo

  go:function(context){
    switch(context){
      case 'MY' : this.myGo();
      case 'SEARCH' : this.searchGo();
    }
  },

//------------------------------------------------------------------------------------------------------>
// Function to toggle buttons and anything else that might come in handy along the way.  Like an overlapping,
// transparent div to prevent other clicks in the lists.

  setGoButtons:function(bool){
    if (bool) {
      overviewUI.update('MY_GO_UPDATE',this.data.mySelection.length);
      overviewUI.update('SEARCH_GO_UPDATE',this.data.searchSelection.length);
    }
    else {
      overviewUI.update('MY_GO_DEACTIVATE',true);
      overviewUI.update('SEARCH_GO_DEACTIVATE',true);
    }
  },

//------------------------------------------------------------------------------------------------------>
//New handling method for Server I/O using callback functions.  After a write is sent.  No point in
//updating until the write has completed.  At which point a function passed as an argument is called to
//continue.

  resetWritePoll:function(callback=function(){}){
    if (typeof this.readReady!=='undefined') {clearTimeout(this.readReady);}
    if (this.data.writeList.initialized){
      this.data.writeList.fetched = true;
      callback();
    }
    else {this.readReady = setTimeout(XeraOverviewManager.prototype.resetWritePoll.bind(this,callback),30);}
  },

//------------------------------------------------------------------------------------------------------>
  lexiconGetValues:function(){
    if (this.lexiconGet!=='undefined'){clearTimeout(this.lexiconGet);}
    this.data.lexicon.initialized = false;
    let self=this;
    $.ajax({
      url:'getUserLexicons',
      type: "POST",
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      success: function(response,responseStatus){
        if (typeof self.data.lexicon==='undefined'){self.data.lexicon={};}
        let defaultLex = response.filter(function(e) { return e.default == 1; })[0];
        self.lexiconSetCurrent(defaultLex.lexicon.toUpperCase()+'-'+defaultLex.version);
        overviewUI.update('SET_LEX_VAL',response);
      }
    });
  },
  lexiconSetCurrent:function(value){
    let y = (typeof(this.data.lexicon.lexicon)!=='undefined');
    let x = value.split('-');
    this.data.lexicon.lexicon = x[0];
    this.data.lexicon.version = x[1];
    xerafin.error.log.add('Current Lexicon','comment');
    xerafin.error.log.add(this.data.lexicon,'JSON');
    overviewUI.update('UPD_LEX_VAL',value);
    if (y) {

        this.fetchData(function(){
      });
      overviewUI.update("SEARCH_CLEAR_SELECTION");
      overviewUI.update("SEARCH_EMPTY");
    }
    this.data.lexicon.initialized = true;
    //do a redraw of quizlists
  },
  resetAll:function(x){
    var self=this;
    this.data.writeList.resetQuiz(x, "resetall");
    this.data.writeList.fetched = false;
    this.setGoButtons(false);
    this.resetWritePoll(function(){
      self.fetchData();
    });
  },
  resetWrong:function(x){
    let self=this;
    this.data.writeList.resetQuiz(x, "resetwrong");
    this.data.writeList.fetched = false;
    this.setGoButtons(false);
    this.resetWritePoll(function(){
      self.fetchData();
    });
  },
  discard:function(x){
    let self=this;
    this.data.writeList.discardBookmark(x);
    this.data.writeList.fetched = false;
    this.setGoButtons(false);
    this.resetWritePoll(function(){
      self.fetchData(function(){
        self.setCurrentQuizid(-1);
        //self.mySelectionList(self.data.currentQuiz);
        self.setMySelectionRow([-1]);

      });
    });
  },
  addCardboxWrong:function(x){
    let self=this;
    this.setGoButtons(false);
    overviewUI.update("COM_DISABLE_BUTTON_STATES");
    this.data.writeList.addQuizToCardbox(x,'wrong', function(d){
      self.addCardboxResponse(d);
    });
  },
  addCardboxAll:function(x){
    let self=this;
    this.setGoButtons(false);
    this.data.writeList.addQuizToCardbox(x,'all',function(d){
      self.addCardboxResponse(d);
    });
  },
  addCardboxResponse:function(d){
    this.setGoButtons(true);
    this.fetchCardboxSummary();
    overviewUI.update("COM_UPDATE_BUTTON_STATES");
    let content;
    let header = this.data.completedList.quizList[d.quizid].quizname;
    switch (d.action){
      case "all": content = d.numAdded + " alphagram"+((d.numAdded===0||d.numAdded>1) ? "s":"")+" added to cardboxes 0 & 1."; break;
      case "wrong": content = d.numAdded + " incorrect answer"+((d.numAdded===0||d.numAdded>1) ? "s":"")+" added to cardbox 0.";break;
    }
    gFloatingAlert("addedQuizzes",2500,header, content ,1000);
  },
  updateOverview:function(){
    this.data.currentList.refreshQuizList({'searchType': 'quizid','quizid': this.data.currentQuiz});
    overviewUI.childUI['currentList'].initialized = false;
    this.data.currentList.fetched = false;
    this.fetchQuizList('CUR');
  },
  updateOverviewAll:function(){
    overviewUI.childUI['activeList'].initialized = false;
    overviewUI.childUI['currentList'].initialized = false;
    overviewUI.childUI['completedList'].initialized = false;
    this.fetchQuizList('CUR');
    this.fetchQuizList('ACT');
    this.fetchQuizList('COM');
  },
  updateQuizSearch:function(d){
    d.lexicon = this.data.lexicon.lexicon;
    d.version = this.data.lexicon.version;
    xerafin.error.log.add(d,'JSON');
    this.data.searchList.refreshQuizList(d);
    this.data.searchList.fetched = false;
    this.fetchQuizList('SRH');
  },
  filterActiveQuizList: function(){
    //Delete current quiz from activeList
    if (typeof this.data.activeList.quizList[this.data.currentQuiz]!=='undefined'){
      delete this.data.activeList.quizList[this.data.currentQuiz];
    }
  },
  dataFetchedLoop:function(){
    if (typeof this.drawReady!=='undefined') {clearTimeout(this.drawReady);}
    if (this.checkFetchedStates()){

    }
    else {this.drawReady = setTimeout(XeraOverviewManager.prototype.populate.bind(this),30);}
  },
  checkCurrentQuizStatus:function(){
    let self=this;
    xerafin.error.log.add("Current Quiz ID: "+this.data.currentQuiz,'comment');
    if (this.data.currentQuiz ==undefined) {this.setCurrentQuizid(-1);}
    if (Number(this.data.currentQuiz)!==-1){
      if (this.data.currentList.quizList[this.data.currentQuiz].untried === 0){
        this.setCurrentQuizid(-1);
        this.setFetchedStatus();
        this.resetWritePoll(function(){
          self.fetchData(function(){
          });
        });
      }
    }
  },

//------------------------------------------------------------------------------------------------------>
//Check a given quizlist type has been initialized and set fetch flag.  Cycles through on a timeout until
//ready.

  fetchQuizList:function(type){
    var obj;
    var that=this;
    switch(type){
        case 'CUR': obj='currentList'; break;
        case 'ACT': obj= 'activeList'; break;
        case 'COM' : obj = 'completedList';break;
        case 'SRH' : obj = 'searchList';break;

      }
    if (typeof this.quizListWait[type]!=='undefined') {clearTimeout(this.quizListWait[type]);}
    // if specified quizList is being initialized, wait for it to free up
    if (!this.data[obj].initialized){
      this.quizListWait[type] = setTimeout(XeraOverviewManager.prototype.fetchQuizList.bind(this,type),100);
    }
    else {
      this.data[obj].fetched = true;
      if (obj==='activeList'){
        this.filterActiveQuizList();
        overviewUI.childUI.searchList.injectUpdate(this.data.activeList.quizList);
      }

      if (obj==='currentList'  && Number(this.data.currentQuiz)!==-1){
        overviewUI.childUI.searchList.injectUpdate(this.data.currentList.quizList);
        this.checkCurrentQuizStatus();
      }
      if (obj==='completedList'){
        overviewUI.childUI.searchList.injectUpdate(this.data.completedList.quizList);
      }
      if (obj==='searchList'){
        overviewUI.update('LST_UPD_SRH',this.data.searchList.quizList);
        overviewUI.update('SEARCH_TOGGLE_SEARCH',true);
      }
      overviewUI.update('LST_UPD_'+type,this.data[obj].quizList);
      this.setMySelectionRow([this.data.currentQuiz]);
    }
  },

//------------------------------------------------------------------------------------------------------>

  setCbxReady:function(){
    this.cbxReady=true;
  },
  fetchCardboxSummary:function(){
    this.cbxReady = false;
    if (typeof this.cardboxFetchTimer!=='undefined') {clearTimeout(this.cardboxFetchTimer);}
    var that=this;
    $.ajax({
      url:'getCardboxStats',
      data: JSON.stringify({'overview':true, 'earliest':true}),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      context:this,
      type: "POST",
      success: function(response,responseStatus){
        that.cardboxFetchTimer=setTimeout(XeraOverviewManager.prototype.fetchCardboxSummary.bind(this),120000);
        overviewUI.update('CBX_UPD_ACT',response[0]);
        overviewUI.update('CBX_UPD_CUR',response[0]);
        that.setCbxReady();
      },
    });
  },
  debugStates: function(type){
    console.log(type+' States:');
    console.log('Current:'+this.data.currentList[type]);
    console.log('Active:'+this.data.activeList[type]);
    console.log('Completed:'+this.data.completedList[type]);
    console.log('Search:'+this.data.searchList[type]);
    console.log('Write:'+this.data.writeList[type]);
    console.log('Cardbox:'+this.cbxReady);
    console.log('----------------------------');
  },

  checkInitStates: function(){
    let x = (this.data.currentList.initialized
    && this.data.writeList.initialized
    && this.data.activeList.initialized
    && this.data.searchList.initialized
    && this.data.completedList.initialized
    && this.data.lexicon.initialized
    );
    return x;
  },
//------------------------------------------------------------------------------------------------------>
//checkInitStates only confirms that the quizzes have initialized.  At startup, none of these lists
//contain data.

  checkFetchedStates: function(){
    var x = (this.data.currentList.fetched
      && this.data.writeList.fetched
      && this.data.activeList.fetched
      && this.data.searchList.fetched
      && this.data.completedList.fetched
      && this.cbxReady);
    return x;
  },

//------------------------------------------------------------------------------------------------------>

  setFetchedStatus: function(){
    this.data.currentList.fetched = false;
    this.data.activeList.fetched = false;
    this.data.completedList.fetched = false;
  },

//------------------------------------------------------------------------------------------------------>

  refreshQuizLists: function(){
    this.data.currentList.refreshQuizList({'searchType': 'quizid', 'quizid': this.data.currentQuiz,'lexicon': this.data.lexicon.lexicon, 'version': this.data.lexicon.value});
    this.data.activeList.refreshQuizList({'searchType': 'myQuizzes','lexicon': this.data.lexicon.lexicon, 'version': this.data.lexicon.value});
    this.data.completedList.refreshQuizList({'searchType': 'completed','lexicon': this.data.lexicon.lexicon, 'version': this.data.lexicon.value});
    this.data.writeList.refreshQuizList({'searchType': 'emptyList'});
    this.setFetchedStatus();
  },
  populate: function(){
    if (typeof this.drawReady!=='undefined') {clearTimeout(this.drawReady);}
    if (this.checkFetchedStates()){
      this.filterActiveQuizList();
      overviewUI.childUI.currentLex.show();
      overviewUI.childUI.overviewTabs.show();
      overviewUI.childUI.overviewListGroup.show();
      overviewUI.childUI.currentList.show();
      overviewUI.childUI.activeList.show();
      overviewUI.childUI.completedList.show();
      overviewUI.childUI.overviewCurrentGo.show();
      overviewUI.childUI.overviewSearch.show();
      overviewUI.childUI.searchList.show();
      overviewUI.childUI.overviewSearchGo.show();
      overviewUI.childUI.overviewSubscriptions.show();
      this.setCurrentQuizid(this.data.currentQuiz);

    }
    else {this.drawReady = setTimeout(XeraOverviewManager.prototype.populate.bind(this),30);}
  },


//------------------------------------------------------------------------------------------------------>
//New function to populate at start
  fetchData:function(after=function(){}){
    if (typeof this.initReady!=='undefined') {clearTimeout(this.initReady);}
    overviewUI.update("MY_GO_DEACTIVATE",true);
    if (this.checkInitStates()){
      if (typeof this.fetchLoop!=='undefined') {clearTimeout(this.fetchLoop);}
      this.refreshQuizLists();
      this.fetchCardboxSummary();
      this.updateOverviewAll();
      after();
      //overviewUI.update("MY_GO_DEACTIVATE",false);
      this.setGoButtons(true);
      this.fetchLoop = setTimeout(XeraOverviewManager.prototype.fetchData.bind(this),600000);
    }
    else {this.initReady = setTimeout(XeraOverviewManager.prototype.fetchData.bind(this),30);}
  },
//------------------------------------------------------------------------------------------------------>
//Initializes all quizLists in the data object with empty lists

  initQuizLists: function(){
    let quizStrings = ['current','active','completed','search','write'];
    let states = [false,false,false,true,true];
    let self=this;
    quizStrings.forEach(function(elem,i){
      self.data[elem+'List'] = new QuizList({'searchType':'emptyList'});
      self.data[elem+'List'].fetched = states[i];
    });

  },
//------------------------------------------------------------------------------------------------------>
  initLexicon: function(){
    if (typeof this.lexReady!=='undefined') {clearTimeout(this.lexReady);}
    if (this.data.lexicon.initialized) {
      xerafin.error.log.add('Default Lexicon Set','comment');
      xerafin.error.log.add(this.data.lexicon,'JSON');
      this.setGoApps();
      this.setGoAction({'context':'SEARCH','value':this.stSrc.defaultActivity});
      this.setGoAction({'context':'MY','value':this.stSrc.defaultActivity});
      this.initQuizLists();
      let self=this;
      this.fetchData(function(){self.populate()});
    }
    else {
      {this.lexReady = setTimeout(XeraOverviewManager.prototype.initLexicon.bind(this),30);}
    }
  },
//------------------------------------------------------------------------------------------------------>

  init: function(){
    //Eventually part of a 'deeper' object initialized by reading in JSON
    this.activeApps = xerafin.config.activeApps;
    //List of fetched statuses
    this.quizListWait = {};
    this.initUI();
    this.mySelectionList(this.data.mySelection[0]);
    this.lexiconGetValues();
    this.initLexicon();
  }

//------------------------------------------------------------------------------------------------------>
}
function XeraOverviewManager(data){
  this.stSrc = xerafin.storage.data.overview;
  //this.listSource = data.listSource || xerafin.io.overviewLists;
  this.data = {};
  this.data.lexicon = {};
  this.data.lexicon.initialized = false;
  this.data.mySelection = [this.stSrc.currentQuiz];
  this.data.currentQuiz = this.stSrc.currentQuiz;
  this.data.selectedQuizName = this.stSrc.currentQuizName;
  this.data.searchSelection = []
  this.init();
}
function initXeraOverview(){
  overview = new XeraOverviewManager({});
}
