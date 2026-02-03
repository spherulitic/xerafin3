function initBQ(data={
    'quizid':xerafin.storage.data.overview.currentQuizId,
    'quizname':xerafin.storage.data.overview.currentName
    }){
  if (typeof basicQuiz==='undefined'  || $('#pan_1_a').length===0) {
    basicQuiz = new BasicQuiz(data);
  }
  else { basicQuiz.setQuiz(data);}
}

BasicQuiz.prototype = {
  constructor:BasicQuiz,
  initUI:function(){
    let watchFilter=true;
    //let watchFilter = !(userid == "10106924779084089");
    console.log("watchFilter :"+watchFilter);
    basicQuizUI = new XeraPanelUI({'id':"basicQuizUI", 'title':"Basic Quiz", 'targetPanel':"1", 'variant':"a",'disableWatch':watchFilter});
    basicQuizAH = new XeraActionHandler({
      'name':'Basic Quiz',
      'bgColor': 'Blue',
      'disable':watchFilter
    });
    this.checkIsPanel();
    this.mainRegion = document.createElement('div');
    this.mainRegion.id = 'BQMainRegion';
    $(this.mainRegion).hide();
    this.infoRegion = document.createElement('div');
    this.infoRegion.id = 'QStatusRegion';
    $('#content_pan_1_a').css({'padding-top':'0px'});
    $('#content_pan_1_a').append(this.infoRegion,this.mainRegion,this.debugWin);
    basicQuizAH.add('INP_CHK_ANS',{'action': "basicQuiz.checkAnswer", 'watch':true});
    basicQuizAH.add('INP_CHK_RET',{'action': "basicQuiz.checkQuestionState", 'watch':true});
    basicQuizAH.add('INP_MRK_COR',{'action': "basicQuiz.markCorrect", 'watch':true});
    basicQuizAH.add('INP_MRK_WNG',{'action': "basicQuiz.markWrong", 'watch':true});
    basicQuizAH.add('INP_MRK_HUH',{'action': "basicQuiz.markHuh", 'watch':true});
    basicQuizAH.add('INF_CBX_NXT',{'action': "basicQuiz.setQuiz", 'watch':true});
    basicQuizAH.add('BUT_UPD_CTR',{'action': "basicQuiz.resetCounters", 'watch':true});
    basicQuizAH.add('BUT_SHF_ALP',{'action': "basicQuiz.shuffle", 'watch':true});
    basicQuizAH.add('BUT_REV_ALP',{'action': "basicQuiz.revert", 'watch':true});
    basicQuizAH.add('BUT_TOG_TAB',{'action': "basicQuiz.toggleTable",'watch':true});
    basicQuizAH.add('BUT_SKP_QST',{'action': "basicQuiz.skipQuestion",'watch':true});
    basicQuizAH.add('BUT_SHW_HNT',{'action': "basicQuiz.showHints",'watch':true});
    basicQuizAH.add('BUT_FOC_INP',{'action': "basicQuiz.focusInput",'watch':true});
    basicQuizAH.add('BUT_UND_QST',{'action': "basicQuiz.undoAnswer",'watch':true});

    //basicQuizAH.list();
    basicQuizUI.addChild({
      'child':new QStatus({'id':'QStatus','pare':'QStatusRegion'}),
      'name': 'QStatus',
      'actionHandler': 'basicQuizAH'
    });
    basicQuizUI.addChild({
      'child':new QRack({'id':'QRack','pare':'BQMainRegion'}),
      'name': 'QRack',
      'actionHandler': 'basicQuizAH'
    });
    basicQuizUI.addChild({
      'child':new QInputs({'id':'BQInput','pare':'BQMainRegion'}),
      'name': 'QInputs',
      'actionHandler': 'basicQuizAH'
    });
    basicQuizUI.addChild({
      'child':new QInfo({'id':'QInfo','pare':'BQMainRegion'}),
      'name': 'QInfo',
      'actionHandler': 'basicQuizAH'
    });
    basicQuizUI.addChild({
      'child':new QButtonBank({'id':'QButtonBank','pare':'BQMainRegion'}),
      'name': 'QButtonBank',
      'actionHandler': 'basicQuizAH'
    });
    basicQuizUI.addChild({
      'child':new QAnswers({'id':'QAnswers','pare':'BQMainRegion'}),
      'name': 'QAnswers',
      'actionHandler': 'basicQuizAH'
    });
    //basicQuizUI.addChild({
    //  'child':new PanelDebug({'id':'BQPanelDebug','pare':'content_pan_1_a'}),
    //  'name': 'BQPanelDebug',
    //  'actionHandler': 'basicQuizAH'
    //})
    basicQuizUI.addChildListeners([
      ["INP_NEW_QST", {'action': "basicQuizUI.childUI['QInputs'].newQuestion", watch:true}],
      ["INP_DUP_ANS", {'action': "basicQuizUI.childUI['QInputs'].duplicateAnswer", watch:true}],
      ["INP_WNG_ANS", {'action': "basicQuizUI.childUI['QInputs'].wrongAnswer", watch:true}],
      ["INP_COR_ANS", {'action': "basicQuizUI.childUI['QInputs'].correctAnswer", watch:true}],
      ["INP_TYP_ANS", {'action': "basicQuizUI.childUI['QInputs'].typoAnswer", watch:true}],
      ["INP_UPD_NUM", {'action': "basicQuizUI.childUI['QInputs'].updateAnswers", watch:true}],
      ["INP_UPD_STA", {'action': "basicQuizUI.childUI['QInputs'].setState", watch:true}],
      ["INP_RST_STA", {'action': "basicQuizUI.childUI['QInputs'].resetInputs", watch:true}],
      ["INP_LOK_STA", {'action': "basicQuizUI.childUI['QInputs'].lockInputs", watch:true}],
      ["INP_UNL_STA", {'action': "basicQuizUI.childUI['QInputs'].unlockInputs", watch:true}],
      ["INP_RET_FOC", {'action': "basicQuizUI.childUI['QInputs'].focusInput", watch:true}],
      ["INP_CLR_TGL", {'action': "basicQuizUI.childUI['QInputs'].clearToggle", watch:true}],
      ["TBL_POP_NEW", {'action': "basicQuizUI.childUI['QAnswers'].start", watch:true}],
      ["TBL_SHW_ROW", {'action': "basicQuizUI.childUI['QAnswers'].displayRow", watch:true}],
      ["TBL_HGL_DUP", {'action': "basicQuizUI.childUI['QAnswers'].highlightDuplicate", watch:true}],
      ["TBL_APP_WNG", {'action': "basicQuizUI.childUI['QAnswers'].appendWrong", watch:true}],
      ["TBL_POP_RST", {'action': "basicQuizUI.childUI['QAnswers'].displayRest", watch:true}],
      ["TBL_SHW_HNT", {'action': "basicQuizUI.childUI['QAnswers'].showHints", watch:true}],
      ["STA_UPD_SRC", {'action': "basicQuizUI.childUI['QStatus'].updateSource", watch:true}],
      ["STA_SET_LOA", {'action': "basicQuizUI.childUI['QStatus'].setLoading", watch:true}],
      ["STA_SET_CST", {'action': "basicQuizUI.childUI['QStatus'].setCustom", watch:true}],
      ["ALP_NEW_ALP", {'action': "basicQuizUI.childUI['QRack'].newWord", watch:true}],
      ["ALP_CYC_FLG", {'action': "basicQuizUI.childUI['QRack'].cycleFlag", watch:true}],
      ["ALP_SHF_ALP", {'action': "basicQuizUI.childUI['QRack'].shuffleAlpha",watch:true}],
      ["ALP_REV_ALP", {'action': "basicQuizUI.childUI['QRack'].revertAlpha",watch:true}],
      //["DBG_REF_DAT", {'action': "basicQuizUI.childUI['BQPanelDebug'].update", watch:true}],
      ["INF_NEW_QST", {'action': "basicQuizUI.childUI['QInfo'].initNew", watch:true}],
      ["INF_UPD_QST", {'action': "basicQuizUI.childUI['QInfo'].update", watch:true}],
      ["INF_TOG_VIE", {'action': "basicQuizUI.childUI['QInfo'].toggleView",watch:true}],
      ["INF_UPD_CTR", {'action': "basicQuizUI.childUI['QInfo'].checkQuestion",watch:true}],
      ["BUT_INI_STA", {'action': "basicQuizUI.childUI['QButtonBank'].start",watch:true}],
      ["BUT_INI_END", {'action': "basicQuizUI.childUI['QButtonBank'].end",watch:true}],
      ["BUT_DIS_HNT", {'action': "basicQuizUI.childUI['QButtonBank'].disableHint",watch:true}],
      ["BUT_UND_QST", {'action': "basicQuizUI.childUI['QButtonBank'].setUndo",watch:true}],

    ]);
  },
  shuffle:function(){
    basicQuizUI.update('ALP_SHF_ALP');
  },
  revert:function(){
    basicQuizUI.update('ALP_REV_ALP');
  },
  undoAnswer:function(){
    this.undo=true;
    this.undoTemp = this.quiz.questions[0];
    this.quiz.questions[0] = this.quiz.lastQuestion;
    this.quiz.questions[0].complete = false;
    this.quiz.questions[0].wrongGuess= false;
    this.quiz.questions[0].firstSubmit= true;
    this.quiz.questions[0].submitted= false;
    this.quiz.questions[0].unanswered = Object.keys(this.quiz.questions[0].words);
    this.populateUI();
  },
  resetCounters:function(){
    basicQuizUI.update('INF_UPD_CTR');
  },
  checkIsPanel: function(){
    if (this.isPanel!=='undefined') {clearTimeout(this.isPanel);}
    if (!$('#pan_1_a').length) {
      delete basicQuiz;
      delete basicQuizUI;
      delete basicQuizAH;
    }
    else {
      this.isPanel = setTimeout(Sloth.prototype.checkIsPanel.bind(this),250);
    }
  },
  toggleTable:function(){
    basicQuizUI.update('INF_TOG_VIE');
    basicQuizUI.update('INF_UPD_QST',this.quiz.questions[0]);
  },
  skipQuestion: function(){
    this.quiz.skipQuestion(this.quiz.questions[0].alpha);
    basicQuizUI.update('BUT_INI_END');
    this.quiz.refreshQuestions();
    this.initQuestion();
  },
  focusInput:function(){
    basicQuizUI.update('INP_RET_FOC');
  },
  showHints:function(){
    this.hints++;
    (this.hints>this.quiz.questions[0].alpha.length-2) ? basicQuizUI.update('BUT_DIS_HNT'):basicQuizUI.update('TBL_SHW_HNT');
  },
  nextQuestion: function(){
    basicQuizUI.update('INP_LOK_STA');
    if (this.undo)
    {
      this.quiz.lastQuestion=null;
      //console.log(this.quiz.questions[0]);
      //console.log(this.undoTemp);
      this.quiz.questions[0] = this.undoTemp;
      this.undo = false;
      if (this.quiz.questions[0].submitted) {
        this.quiz.stash(this.quiz.questions[0].alpha);
        this.quiz.refreshQuestions();
        this.initQuestion();
      }
      else {
        this.populateUI();
      }
    }
    else {
      this.quiz.stash(this.quiz.questions[0].alpha);
      this.quiz.refreshQuestions();
      this.initQuestion();
    }
  },
  checkNetworkError: function(){
    if (this.quiz.questions.length===1 && this.quiz.questions[0].hasHTTPError){
      //appendDebugLog("HTTP ERROR Question Object: "+this.quiz.questions[0].hasHTTPError);
      if (!this.hasHTTPError){
        basicQuizUI.update('STA_SET_CST',"Connection Error Whilst Sending Answer");
        this.hasHTTPError = true;
      }
      return true;
    }
    if (this.quiz.questionsLoaded==-1 && this.quiz.hasHTTPError){
      //appendDebugLog("HTTP ERROR Quiz Object: "+this.quiz.hasHTTPError);
      if (!this.hasHTTPError){
        basicQuizUI.update('STA_SET_CST',"Connection Error Fetching Next Question");
        this.hasHTTPError = true;
      }
      return true;
    }
    return false;
  },
  updateCheck: function(){
    if (typeof this.updatedTimer!=='undefined'){clearTimeout(this.updatedTimer);}
    if (this.checkInitStates() && this.quiz.questions.length===1  && this.quiz.questions[0].readyToSubmit  && (this.quizid!==-1 || overview.data.currentList.fetched)) {
      basicQuizUI.update('STA_UPD_SRC',{'id':this.quizid,'eof':this.quiz.eof}); //Status object needs a rewrite
      basicQuizUI.update('INF_UPD_QST',this.quiz.questions[0]);
      //enable all inputs
      basicQuizUI.update('INP_UNL_STA');
    }
    else {
      if (this.checkNetworkError()){
        // disable all inputs
        basicQuizUI.update('INP_LOK_STA');
        //
      }
      this.updatedTimer = setTimeout(BasicQuiz.prototype.updateCheck.bind(this),100);
    }
  },
  markCorrect: function(){
    this.quiz.questions[0].unanswered = [];
    this.quiz.questions[0].wrongGuess = false;
    this.quiz.questions[0].markCorrect();
    basicQuizUI.update('BUT_INI_END',this.quiz.questions[0]);
    basicQuizUI.update('TBL_POP_RST',0);
    basicQuizUI.update('INP_UPD_STA',1);
    basicQuizUI.update('ALP_CYC_FLG',true);
    this.updateCheck();
    //this.populateDebug(this.quiz.questions[0]);
  },
  markWrong: function(){
    this.quiz.questions[0].unanswered = [];
    this.quiz.questions[0].wrongGuess = true;
    this.quiz.questions[0].markWrong();
    basicQuizUI.update('BUT_INI_END',this.quiz.questions[0]);
    basicQuizUI.update('TBL_POP_RST',1);
    basicQuizUI.update('INP_UPD_STA',2);
    basicQuizUI.update('ALP_CYC_FLG',false);
    this.updateCheck();
    //this.populateDebug(this.quiz.questions[0]);
  },
  markHuh: function(){  //if amount of answers is null or generally anything screwballed
    this.quiz.questions[0].unanswered = [];
    this.quiz.questions[0].wrongGuess = false;
    this.quiz.questions[0].markCorrect();
    basicQuizUI.update('BUT_INI_END',this.quiz.questions[0]);
    basicQuizUI.update('INP_UPD_STA',3);
    this.updateCheck();
    //this.populateDebug(this.quiz.questions[0]);
  },
  checkInitStates : function(){
    let y = this.checkNetworkError();
    let x = (this.quiz.initialized && (!y));
    if (!y){this.hasHTTPError=false;}
    return x;
  },
  populateDebug: function(x){
    if (typeof this.debugReady!=='undefined') {clearTimeout(this.debugReady);}
    if ((this.checkInitStates()) && (this.quiz.questions.length===1)  &&  (this.quiz.questions[0].readyToSubmit)  && (this.quizid!==-1 || overview.data.currentList.fetched)) {
      basicQuizUI.update('DBG_REF_DAT',x);
    }
    else {
      this.debugReady = setTimeout(BasicQuiz.prototype.populateDebug.bind(this,x),500);
    }
  },
  populateQuestion : function(){
    this.hints=0;
    let that = this;
    if (typeof this.drawReady!=='undefined') {clearTimeout(this.drawReady);}
    if (this.checkInitStates() && this.quiz.questions.length===1  && this.quiz.questions[0].readyToSubmit) {
      //this.populateDebug(this.quiz.questions[0]);
      //basicQuizUI.childUI.BQPanelDebug.show();
      basicQuizUI.childUI.QRack.show();
      basicQuizUI.childUI.QInputs.show();
      basicQuizUI.childUI.QInfo.show();
      basicQuizUI.childUI.QButtonBank.show();
      basicQuizUI.childUI.QAnswers.show();
      $(this.mainRegion).show();
      basicQuizUI.update('BUT_INI_STA',this.quiz.questions[0]);
      basicQuizUI.update('INP_NEW_QST',{
        'answers':this.quiz.questions[0].answers.length,
        'alpha':this.quiz.questions[0].alpha,
        'showAnswers':(Number(localStorage.showAnswersQuiz)==true)
      });
      basicQuizUI.update("ALP_NEW_ALP",{
        'alpha':this.quiz.questions[0].displayAlpha,
        'solutions':this.quiz.questions[0].words,
        'display':Number(localStorage.gAlphaDisplay)
      });
      basicQuizUI.update("INF_NEW_QST",this.quiz.questions[0]);
      basicQuizUI.update('TBL_POP_NEW',this.quiz.questions[0].words);
      //console.log(this.undo);
      //console.log(this.quiz.lastQuestion);
      basicQuizUI.update("BUT_UND_QST", (this.undo || this.quiz.lastQuestion===null));
      basicQuizUI.update("INP_RST_STA");
      if (this.quiz.questions[0].answers.length==0) {this.markHuh();}

    }
    else {
      if (this.quiz.eof) {
        basicQuizUI.update('STA_UPD_SRC',{'id':this.quizid,'eof':this.quiz.eof});
      }
      else {
        this.drawReady = setTimeout(BasicQuiz.prototype.populateQuestion.bind(this),30);
      }
    }
  },
  checkAnswer: function(answer){
    if (!(this.quiz.questions[0].unanswered.length===0)){
      //toggle ui buttons and mark as wrong if input is blank
      if (answer.length===0){
        this.markWrong();
        basicQuizUI.update('INP_UPD_STA',2);
      }
      else {
      //if input not blank, submitAnswer and move to handling function based on return
        switch (this.quiz.questions[0].submitAnswer(answer)){
          case 0: this.handleWrongAnswer(answer);break;
          case 1: this.handleCorrectAnswer(answer);break;
          case 2: this.handleDuplicateAnswer(answer);break;
          case -1: this.handleTypoAnswer(answer);break;
        }
        //after which if all questions answered, toggle ui buttons
        if (this.quiz.questions[0].unanswered.length===0){
          // insertion for Chris May's request requires new option qEndOnAllCorrect
          // if (Number(localStorage.qEndOnAllCorrect)==false)){
          // need to add the variable in local storage and make a checkbox
          //
          basicQuizUI.update('BUT_INI_END',this.quiz.questions[0]);
          if (this.quiz.questions[0].wrongGuess) {
            basicQuizUI.update('ALP_CYC_FLG',0);
            basicQuizUI.update('INP_UPD_STA',2);
            basicQuizUI.update('TBL_POP_RST',1);
          }
          else {
            basicQuizUI.update('ALP_CYC_FLG',1);
            basicQuizUI.update('INP_UPD_STA',1);
            basicQuizUI.update('TBL_POP_RST',0);
          }
          this.updateCheck();
          // only applies to qEndOnAllCorrect being true
          // }
          // else {
          //     this.handleWrongAnswer(answer);
          //     basicQuizUI.update('ALP_CYC_FLG',0);
          //     basicQuizUI.update('INP_UPD_STA',2);
          //    basicQuizUI.update('TBL_POP_RST',1);
          // }

        }
      }
    }
    else {
      this.nextQuestion();
    }
  },
  handleDuplicateAnswer:function(answer){
    basicQuizUI.update('INP_DUP_ANS',answer);
    basicQuizUI.update('TBL_HGL_DUP',answer);
  },
  handleWrongAnswer:function(answer){
    basicQuizUI.update('INP_WNG_ANS',answer);
    basicQuizUI.update('TBL_APP_WNG',answer);
  },
  handleTypoAnswer:function(answer){
    basicQuizUI.update('INP_TYP_ANS',answer);
  },
  handleCorrectAnswer:function(answer){
    basicQuizUI.update('INP_COR_ANS',answer);
    basicQuizUI.update('INP_UPD_NUM',this.quiz.questions[0].answers.length - this.quiz.questions[0].unanswered.length);
    basicQuizUI.update('TBL_SHW_ROW',[answer,0])
  },
  initQuestion:function(){
    basicQuizUI.childUI.QStatus.show();
    if (typeof this.drawReady!=='undefined') {clearTimeout(this.drawReady);}
    if (this.checkInitStates()){
      basicQuizUI.update('STA_SET_LOA');
      this.quiz.loadQuestions(1);
      this.populateUI();
    }
    else {
      this.drawReady = setTimeout(BasicQuiz.prototype.initQuestion.bind(this),20);
    }
  },
  populateUI: function(){
    if (typeof this.drawReady!=='undefined') {clearTimeout(this.drawReady);}
    if (this.checkInitStates()){
      basicQuizUI.update('STA_UPD_SRC',{'id':this.quizid,'eof':this.quiz.eof});
      //basicQuizUI.update('STA_SET_CST',"Populating Question...");
      this.populateQuestion();
    }
    else {
      this.drawReady = setTimeout(BasicQuiz.prototype.populateUI.bind(this),30);
    }
  },
  setQuiz: function(data){
    typeof data.quizid!=="undefined"? this.quizid = Number(data.quizid) : this.quizid = -1;
    this.isCardbox = (this.quizid===-1);
    this.quizname = data.quizname || "Cardbox";
    if (basicQuizUI.childUI['QInputs']!=='undefined') {basicQuizUI.update("INP_LOK_STA");}
    this.quiz=new Quiz(true, this.isCardbox, false, this.quizid);
    this.initQuestion();

  },
  init: function(data){
    this.undo=false;
    this.hasHTTPError = false;
    this.hints=0;
    this.initUI();
    $(this.mainRegion).addClass('quizContent');
    this.setQuiz(data);
  }
  //submitStrict=true, isCardbox=true, blankQuiz=false, quizid=-1
}
function BasicQuiz(data){
  if (typeof localStorage.qQPanelOpen==='undefined') {!isMobile() ? localStorage.qQPanelOpen = 1:localStorage.qQPanelOpen = 0;}
  this.optionsUI = {
    'listWords':true,
  }
  //console.log(data);
  this.init(data);
}
