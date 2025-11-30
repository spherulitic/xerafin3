SlothQuiz.prototype = {
  constructor: SlothQuiz,
  generateWordList: function(){
    let x = new Array();
    Object.values(this.questions).forEach(function(v){
      v.data.words.forEach(item => x.push(item));
    })
    x.sort((a , b) => a.length < b.length || (a.length == b.length && a < b) ? -1 : a.length > b.length || (a.length == b.length && a > b) ? 1 : 0 );
    this.minLength = x[0].length;
    this.maxLength = this.question.length;
    let self=this;
    x.forEach(function(v){
      self.words.add(v);
      self.wordsRemaining.add(v);
      self.totalScore+=Math.pow(v.length,2);
    });
    this.totalWords = this.words.size;
  },
  toAlpha: function(s){
    return s.split('').sort().join('');
  },
  isComplete: function(){
    return (this.score === this.totalScore);
  },
  detectTypo: function(s){
    let x = Array.from(this.question);
    let c = Array.from(s);
    let st = false;
    if (s.length>=this.minLength && s.length<=this.maxLength) {
      c.forEach(v => x.indexOf(v)!==-1 ? delete x[x.indexOf(v)] : st = true);
    }
    else {return true;}
    return st;
  },

  checkWord: function(s){
    if (this.words.has(s)){
      if (this.wordsRemaining.has(s)){
        this.wordsRemaining.delete(s);
        this.questions[this.toAlpha(s)].submitAnswer(s);
        this.score+=Math.pow(s.length,2);
        this.attempts++;
        this.correct++;
        //correct
        return 1;
      }
      else {
        //duplicate
        return 2;
      }
    }
    else {
      if (this.detectTypo(s)){
        //typo
        return 3;
      }
      else {
        //mark wrong
        this.attempts++;
        return 0;
      }
    }
  },
  end: function(){
    let self=this;
    Object.entries(this.questions).forEach(function([i,v]){
      let x=true;
      v.setEndState();
      if ((v.endState===3) || (v.endState===4)) {x=false;}
      else {v.submitQuestion(x);}
    });

  },
  init: function(){
    let self=this;
    Object.entries(this.data).forEach(function([i,v]){
      self.questions[v.alpha] = new SlothQuestion(v);
    });
    this.correct = 0;
    this.generateWordList();
  }
}
function SlothQuiz(d,q){
  this.data = d;
  this.question = q;
  this.totalScore = 0;
  this.score = 0;
  this.attempts = 0;
  this.questions = new Object();
  this.words = new Set();
  this.wordsRemaining = new Set();
  this.init();
}
SlothQuestion.prototype = {
  constructor: SlothQuestion,
  init: function(){
    this.addDone = true;
    this.unanswered = new Set(this.data.words);
    this.words = new Set(this.data.words);
    this.isComplete = false;
    //console.log(this.data);
  },
  submitAnswer: function(s){
    if (this.unanswered.has(s)){
      this.unanswered.delete(s);
    }
    if (this.unanswered.size === 0){
      this.isComplete = true;
    }
  },
  addToCardbox: function(){
    if (this.addDone) {
      this.addDone = false;
      let self=this;
      $.ajax({
        type: "POST",
        data: JSON.stringify({user: userid, question: this.data.alpha}),
        headers: {"Accept": "application/json", "Authorization": keycloak.token},
        url: "addQuestionToCardbox.py",
        success: function(response,responseStatus){
          self.addDone=true;
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.log("Error adding " + alpha + ", status = " + textStatus + " error: " + errorThrown);
        }
      });
    }
    else {
      //add 100ms wait to try again
    }
  },
  setEndState: function(){
    // Identifies status of question.
    // 0: Question is complete, not in cardbox
    // 1: Question is complete, in cardbox, due now
    // 2: Question is complete, in cardbox, not due
    // 3: Question is incomplete, in cardbox, question is unanswered
    // 4: Question is incomplete, not in cardbox, question is unanswered
    // 5: Question is incomplete, in cardbox,is partially answered
    // 6: Question is incomplete, not in cardbox, partially answered
    let cb = $.isEmptyObject(this.data.auxInfo) ? false:true;
    let x = (this.data.auxInfo.difficulty!==4);
    //console.log (this.data.alpha+" "+this.data.auxInfo.difficulty);
    this.endState =
      (this.unanswered.size === 0) ?
        ((cb) ?
          (x ? 1 : 2)
          : 0)
        : ((this.unanswered.size === this.words.size) ?
          ((cb) ? 3 : 4) :
          (cb) ? 5 : 6);
    //console.log(this.data.alpha+": "+this.endState);
  },
  submitQuestion: function(i){
    let x;
    if ($.isEmptyObject(this.data.auxInfo)){
      x = -2;
    }
    else {
      x = this.data.auxInfo.difficulty===4 ? -2 : this.data.auxInfo.cardbox;
    }
    let d = {
      'question': this.data.alpha,
      'correct': this.isComplete,
      'cardbox': x,
      'incrementQ': i
    };
    $.ajax({
    type: "POST",
    data: JSON.stringify(d),
    headers: {"Accept": "application/json", "Authorization": keycloak.token},
    url: "submitQuestion",
    success: function(response) {
      if (i){
        gUpdateCardboxScores (response);
        gCheckMilestones(response.qAnswered);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("Error getting bingo, status = " + textStatus + " error: " + errorThrown);
        }
  });
  },
}
function SlothQuestion(data){
  this.data = data;
  this.init();
}

SlothTools.prototype = {
  constructor: SlothTools,
  init: function(){
    this.draw();
  },
  toggleVis:function(boo){
    boo ? $(this.content).show() : $(this.content).hide();
  },
  drawBackButton: function(){
    this.backButton = document.createElement('button');
    $(this.backButton).html('Back to Selection Screen');
    $(this.backButton).addClass('slothStartButton silverRowed');
    let self = this;
    $(this.backButton).on('click',function(){
      self.action('TOOLS_RETURN');
    });
    return this.backButton;
  },
  draw: function(){
    this.content=document.createElement('div');
    $(this.content).addClass('slothAnswerRegion');
    $(this.content).append(this.drawBackButton());
  },
  output: function(){
    return this.content;
  }
}
function SlothTools(data={}){
  this.init();
}

Sloth.prototype = {
  constructor: Sloth,
  initUI: function(){
    slothUI = new XeraPanelUI({'id':"slothUI", 'title':"Subword Sloth", 'targetPanel':"1", 'variant':"b",'disableWatch':false, 'tooltip':'<p style="text-align:left">Click on the alphagram or one of the buttons available to select a different alphagram. All alphagrams between 4 and 15 letters are valid.</p><p style="text-align:left">Abort: Quit sloth without providing answers or altering cardbox.  Questions answered will not be affected.</p><p style="text-align:left">End Game: Ends sloth, adjusts cardbox accordingly and adds to questions answered where at least a partial answer was provided.</p>'});
    //put call to initiate checking loop here
    this.checkIsPanel();
    //-----------
    slothAH = new XeraActionHandler({
      'name':'Sloth',
      'bgColor': 'Red',
      'disable':false
    });
    this.home = document.createElement('div');
    this.home.id = 'slothHome';
    this.gameRegion = document.createElement('div');
    this.gameRegion.id = 'slothGame';
    this.alphaRegion = document.createElement('div');
    this.alphaRegion.id = 'slothAlpha';
    $(this.alphaRegion).addClass('slothAlphaWrap');
    $(this.gameRegion).append(this.alphaRegion);
    $('#content_pan_1_b').css({
      'background-image':"url('../images/slothBackground.png')",
      'background-size': '100% auto',
      'background-repeat':'no-repeat',
      'background-position':'top',
    });
    $('#content_pan_1_b').append(this.home, this.gameRegion);

    slothUI.addChild({
      'child':new SlothHome({'id':'SHome','pare':'slothGame'}),
      'name': 'SHome',
      'actionHandler': 'slothAH'
    });
    slothUI.addChild({
      'child':new SlothTimer({'id':'STimer','pare':'Home'}),
      'name': 'STimer',
      'actionHandler': 'slothAH'
    });
    slothUI.addChild({
      'child':new SlothInputs({'id':'SInputs','pare':'slothGame'}),
      'name': 'SInputs',
      'actionHandler': 'slothAH'
    });
    slothUI.addChild({
      'child':new SlothBar({'id':'SBar','pare':'slothGame'}),
      'name': 'SBar',
      'actionHandler': 'slothAH'
    });
    slothUI.addChild({
      'child':new SlothBoard({'id':'SBoard','pare':'slothGame'}),
      'name': 'SBoard',
      'actionHandler': 'slothAH'
    });
    slothUI.addChild({
      'child':new SlothTools({'id':'STools','pare':'slothGame'}),
      'name': 'STools',
      'actionHandler': 'slothAH'
    });
    slothUI.addChild({
      'child':new QRack({'id':'SRack','pare':'slothAlpha'}),
      'name': 'SRack',
      'actionHandler': 'slothAH'
    });
    slothUI.addChildListeners([
      ["ALP_NEW_ALP", {'action': "slothUI.childUI['SRack'].newWord", watch:true}],
      ["BAR_UPD_BAR", {'action': "slothUI.childUI['SBar'].update", watch:false}],
      ["BAR_RST_BAR", {'action': "slothUI.childUI['SBar'].reset", watch:true}],
      ["BAR_GET_PROGRESS", {'action': "slothUI.childUI['SBar'].getProgress", watch:true}],
      ["BRD_ADD_WORD", {'action': "slothUI.childUI['SBoard'].showAdded", watch:true}],
      ["BRD_POP_TBL", {'action': "slothUI.childUI['SBoard'].populate", watch:true}],
      ["BRD_SHOW_WORD", {'action': "slothUI.childUI['SBoard'].showWord", watch:true}],
      ["BRD_SHOW_DUP", {'action': "slothUI.childUI['SBoard'].showDup", watch:true}],
      ["BRD_MARK_MISSED", {'action':"slothUI.childUI['SBoard'].showMissed", watch:true}],
      ["BRD_END_GAME", {'action':"slothUI.childUI['SBoard'].endGame", watch:true}],
      ["HOME_UPDATE", {'action': "slothUI.childUI['SHome'].setQuestion", watch:true}],
      ["HOME_UPDATE_STATS", {'action': "slothUI.childUI['SHome'].stats.update", watch:true}],
      ["HOME_LOCK", {'action': "slothUI.childUI['SHome'].lockInputs", watch:true}],
      ["HOME_LOCK_START", {'action': "slothUI.childUI['SHome'].lockStart", watch:true}],
      ["HOME_SET_INFO", {'action': "slothUI.childUI['SHome'].setAlphaInfo", watch:true}],
      ["HOME_SET_RANKINGS",{'action': "slothUI.childUI['SHome'].leaderboard.update", watch:true}],
      ["INP_SET_FOCUS", {'action': "slothUI.childUI['SInputs'].focusInput", watch:false}],
      ["INP_BLUR_FOCUS", {'action': "slothUI.childUI['SInputs'].blurInput", watch:true}],
      ["INP_CORRECT", {'action': "slothUI.childUI['SInputs'].correctAnswer", watch:false}],
      ["INP_WRONG", {'action': "slothUI.childUI['SInputs'].wrongAnswer", watch:false}],
      ["INP_TYPO", {'action': "slothUI.childUI['SInputs'].typoAnswer", watch:false}],
      ["INP_DUP", {'action': "slothUI.childUI['SInputs'].duplicateAnswer", watch:false}],
      ["INP_TOGGLE", {'action': "slothUI.childUI['SInputs'].toggleVis", watch:true}],
      ["TOOLS_TOGGLE", {'action': "slothUI.childUI['STools'].toggleVis", watch:true}],
      ["TIMER_START", {'action': "slothUI.childUI['STimer'].start", watch:true}],
      ["TIMER_RESET", {'action': "slothUI.childUI['STimer'].reset", watch:true}],
      ["TIMER_FINAL", {'action': "slothUI.childUI['STimer'].adjust", watch:true}],
      ["TIMER_END", {'action': "slothUI.childUI['STimer'].stop", watch:true}]
    ]);
    slothAH.add('BOARD_ADD_WORD',{'action': "sloth.addWord", 'watch':true});
    slothAH.add('INPUT_END',{'action': "sloth.stop", 'watch':true});
    slothAH.add('INPUT_ABORT',{'action': "sloth.abort", 'watch':true});
    slothAH.add('INPUT_CHECK_ANSWER',{'action': "sloth.checkAnswer", 'watch':false});
    slothAH.add('HOME_START',{'action': "sloth.setStart", 'watch':true});
    slothAH.add('HOME_GET_RANDOM',{'action': "sloth.getRandomBingo", 'watch':true});
    slothAH.add('HOME_GET_NEXT',{'action': "sloth.getNextBingo", 'watch':true});
    slothAH.add('HOME_GET_FIRST',{'action': "sloth.getFirstBingo", 'watch':true});
    slothAH.add('HOME_GET_CUSTOM',{'action': "sloth.getCustomBingo", 'watch':true});
    slothAH.add('TOOLS_RETURN',{'action': "sloth.back", 'watch':true});
  },
  start: function(){
    this.inProgress = true;
    slothUI.update("BRD_POP_TBL", this.questions.words);
    slothUI.update("BAR_RST_BAR",this.questions.totalScore);
    slothUI.update("ALP_NEW_ALP",{
      'alpha':this.question,
      'solutions':[this.question],
      'display':Number(localStorage.gAlphaDisplay)
    });
    $(this.home).hide();
    $(this.gameRegion).fadeTo(200,1);
    slothUI.update("TOOLS_TOGGLE",false);
    slothUI.update("INP_TOGGLE",true);
    slothUI.update("INP_SET_FOCUS");
    slothUI.update("TIMER_START");
  },
  endProgress: function(){
    slothUI.update("TIMER_END");
    slothUI.update("INP_SET_BLUR");
    slothUI.update("INP_TOGGLE", false);
    slothUI.update("TOOLS_TOGGLE",true);
    this.inProgress = false;
  },
  evalEndGame: function(){
    slothUI.update("BRD_END_GAME",this.questions);
  },
  checkIsPanel: function(){
    if (this.isPanel!=='undefined') {clearTimeout(this.isPanel);}
    if (!$('#pan_1_b').length) {
      delete sloth;
      //delete slothUI;
      delete slothAH;
    }
    else {
      this.isPanel = setTimeout(Sloth.prototype.checkIsPanel.bind(this),250);
    }
  },
  addWord: function(w){
    this.questions.questions[w].addToCardbox();
    slothUI.update("BRD_ADD_WORD",w);
    //console.log("ADD: "+w);
  },
  stop: function(){
    this.serverWriteComplete();
    this.endProgress();
    this.questions.end();
    this.evalEndGame();
    //Run evals
  },
  abort: function(){
    this.serverWriteAbort();
    this.endProgress();
    //don't run evals
  },
  back: function(){
    $(this.home).show();
    $(this.gameRegion).hide();
    this.getStats();
    this.populateStats();
    slothUI.update("BAR_RST_BAR",this.questions.totalScore);
    this.getCustomBingo(this.question);
  },
  checkAnswer: function(s){
    let x=this.questions.checkWord(s);
    switch (x){
      case 0: slothUI.update('INP_WRONG');break;
      case 1: slothUI.update('INP_CORRECT');
          slothUI.update('BAR_UPD_BAR',this.questions.score);
          slothUI.update('BRD_SHOW_WORD',s);
          if (this.questions.isComplete()) {
            this.stop();
          }
          break;
      case 2: slothUI.update('INP_DUP');
          slothUI.update('BRD_SHOW_DUP',s);
          break;
      case 3: slothUI.update('INP_TYPO');break;
    }
  },
  serverGetStats : function(){
    this.statsReady = false;
    let self=this;
    $.ajax({
      type: "POST",
      data: JSON.stringify({'action':'GET_STATS', 'user': userid, 'lexicon':this.lexicon}),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "/PHP/slothQuery.php",
      success: function(response,responseStatus){
        let x = JSON.parse(response);
        self.statsReady= true;
        self.userStats = x;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        xerafin.error.log.add("slothQuery.php, "+jqXHR.status,'error');
      }
    });
  },
  serverWriteActive: function(){
    this.writeDone = false;
    let self=this;
    $.ajax({
      type: "POST",
      data: JSON.stringify({
        'action':'WRITE_ACTIVE',
        'user': userid,
        'alpha':this.question,
        'lexicon':this.lexicon
      }),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "/PHP/slothQuery.php",
      success: function(response,responseStatus){
        let x = JSON.parse(response);
        self.writeDone= true;
        self.token = x.token;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        xerafin.error.log.add("slothQuery.php, "+jqXHR.status,'error');
      }
    });
  },
  serverWriteAbort: function(){
    this.writeDone = false;
    let self=this;
    $.ajax({
      type: "POST",
      data: JSON.stringify({
        'action':'ABORT_ACTIVE',
        'user': userid,
        'alpha':this.question,
        'token':this.token
      }),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "/PHP/slothQuery.php",
      success: function(response,responseStatus){
        self.writeDone= true;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        xerafin.error.log.add("slothQuery.php, "+jqXHR.status,'error');
      }
    });
  },
  serverWriteComplete: function(){
    this.completeDone = false;
    let a = (this.questions.correct/this.questions.attempts)*100;
    let c = slothUI.childUI['SBar'].getProgress();
    let self=this;
    $.ajax({
      type: "POST",
      data: JSON.stringify({
        'action':'WRITE_COMPLETED',
        'user': userid,
        'alpha':this.question,
        'token':this.token,
        'accuracy':a,
        'correct': c,
        'lexicon':this.lexicon
      }),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "/PHP/slothQuery.php",
      success: function(response,responseStatus){
        //Returns time and rank
        let x = JSON.parse(response);
        console.log(x);
        slothUI.update("TIMER_FINAL",x.time);
        self.completeDone= true;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        xerafin.error.log.add("slothQuery.php, "+jqXHR.status,'error');
      }
    });
  },
  serverGetRankings: function(){
    let d = JSON.stringify({ 'alpha': this.question });
    fetchWithAuth('getSlothRankings', { method: "POST", body: d })
    .then(response => {
          if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
    })
    .then(rankings => { slothUI.update('HOME_SET_RANKINGS', rankings); })
    .catch(error => {
          console.error("Error getting sloth rankings: ", error);
          xerafin.error.log.add(`sloth rankings, ${error.message}`, 'error');
    });
  },
  getStats: function(){
    this.statsReady = false;
    this.serverGetStats();
  },
  setStart: function(){
    this.writeDone = false;
    this.start();
    this.serverWriteActive();
    //note, lock the give up button until write active returns the token.

  },
  populate: function(){
    this.questions = new SlothQuiz(this.data,this.question);
    slothUI.update("HOME_SET_INFO","Sloth contains "+this.questions.words.size+" words");
    slothUI.childUI['SRack'].styles.unanswered = "correct slothAlpha";
    slothUI.childUI['SRack'].show();
    $(this.gameRegion).append(slothUI.childUI['STimer'].output());
    $(this.gameRegion).append(slothUI.childUI['SBar'].output());
    if (isMobile()) {$(this.gameRegion).append(slothUI.childUI['SInputs'].output());}
    $(this.gameRegion).append(slothUI.childUI['SBoard'].output());
    if (!isMobile()) {$(this.gameRegion).append(slothUI.childUI['SInputs'].output());}
    $(this.gameRegion).append(slothUI.childUI['STools'].output());
    $(this.gameRegion).hide();
    $('#QRackContainer').addClass('slothAlphaContainer');

  },
  populateStats: function(){
    if (typeof this.drawReady!=='undefined') {clearTimeout(this.drawReady);}
    if (this.statsReady){
      slothUI.update('HOME_UPDATE_STATS', this.userStats);
    }
    else {this.drawReady = setTimeout(Sloth.prototype.populateStats.bind(this),100);}
  },
  populateHome: function(){
    $(this.home).append(slothUI.childUI['SHome'].output());
    this.getStats();
    this.populateStats();
    $(this.home).show();
  },
  populateUI: function(){
    this.populateHome();
  },
  cardboxStatsChecks: function (){
    //This needs looking at.  Maybe better served by a function within cardboxStats once it's rewritten.
    if (Number(localStorage.cardboxCurrent)!==this.data[this.data.length-1].auxInfo.cardbox){
      localStorage.cardboxSent='false';
      localStorage.cardboxCurrent=this.data[this.data.length-1].auxInfo.cardbox;
      if ($('#pan_4').length>0){
        cardboxHighlightAction(this.data[this.data.length-1].auxInfo.cardbox, false);
        showCardboxStats();
      }
    }
  },
  init: function(q){
    if (typeof q!=='undefined') {this.getCustomBingo(q);}
    this.statsReady = false;
    this.fetchQuestion();
    this.initUI();
    this.populateHome();

  },
  toAlpha: function(s){
    return s.split('').sort().join('');
  },
  getCustomBingo: function(q){
    let y = q.toUpperCase();
    let x = this.toAlpha(y);
    if (q.length>3  && q.length<16) {
      slothUI.update("HOME_LOCK_START",false);
      this.question = x;
      this.testQuestion(x);
    }
    else {
      slothUI.update("HOME_LOCK_START",true);
      if (q.length<4) {
        slothUI.update("HOME_SET_INFO","Alphagram is too short.");

      }
      if (q.length>15) {slothUI.update("HOME_SET_INFO","Alphagram is too long.");}
    }
  },
  testQuestion: function(q){
    slothUI.update("HOME_LOCK",true);
    fetchWithAuth('returnValidAlphas', { method: "POST",
               body: JSON.stringify({'alphas': [q]}) })
    .then(response => {
      if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
      return response.json();
    })
    .then(response => {
       slothUI.update("HOME_LOCK",false);
       if(response.includes(q)) {
         this.fetchQuestion();
       } else {
         if (q.length < 7) {
            slothUI.update("HOME_SET_INFO","Alphagram is invalid.  Unable to Sloth");
            slothUI.update("HOME_LOCK_START",true);
         } else { this.fetchQuestion(); }
       }
      })
    .catch(error => {
        console.log("Error testing alpha " + q + ": " + error.message);
        this.testQuestion(q);
     });
  },
  getFirstBingo: function(){
    let self=this;
    let d;
    if (localStorage.cardboxSent=='false'){
      d = { };
    }
    else {
      d = {cardbox: localStorage.cardboxCurrent};
    }
    $.ajax({type: "POST",
      data: JSON.stringify(d),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "newQuiz",
      success: function(response,responseStatus){
        self.getNextBingo();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        self.getFirstBingo();
        console.log("Error resetting locks, status = " + textStatus + " error: " + errorThrown);
      }
    });
  },
  getRandomBingo: function(){
    let self=this;
    let d;
    if (localStorage.cardboxSent=='false'){
      d = { user: userid };
    }
    else {
      d = {user:userid, cardbox: localStorage.cardboxCurrent};
    }
    $.ajax({type: "POST",
      data: JSON.stringify(d),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "getRandomBingo.py",
      success: function(response,responseStatus){
        self.question = response.alpha;
        self.fetchQuestion();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error getting bingo, status = " + textStatus + " error: " + errorThrown);
      }
    });
  },
  getNextBingo: async function() {
    try {
        const d = localStorage.cardboxSent !== 'false'
            ? { cardbox: localStorage.cardboxCurrent }
            : {};

        const response = await fetchWithAuth('getNextBingo', {
            method: 'POST',
            body: JSON.stringify(d)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const {result, e} = await response.json(); // Destructure directly
        this.question = result.alpha;
        console.log("Got Sloth question ", this.question);
        this.fetchQuestion();

    } catch (error) {
        console.error("Error getting bingo:", error);
    }
},
  getSlothData: function() {
    this.serverGetRankings();
    let d = { user: userid, alpha: this.question, getAllWords: localStorage.gSlothPref };

    fetchWithAuth("getSlothData", {
        method: "POST",
        body: JSON.stringify(d)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(response => {
        this.data = response.result;
        if (this.data.length === 0) {
            // Notify user that question is invalid
            (this.lastQuestion !== null) ? this.question = this.lastQuestion : this.question = null;
            this.fetchQuestion();
        } else {
            this.lastQuestion = this.question;
            slothUI.update("HOME_LOCK", false);
            slothUI.update('HOME_UPDATE', this.question);
            this.cardboxStatsChecks();
            this.populate();
        }
    })
    .catch(error => {
        console.log("Error: " + error.message);
    });
},
  resetLocks: function(){
    let self=this;
    let d;
    if (localStorage.cardboxSent=='false'){
      d = { };
    }
    else {
      d = {cardbox: localStorage.cardboxCurrent};
    }
    $.ajax({type: "POST",
      data: JSON.stringify(d),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "newQuiz",
      success: function(response,responseStatus){
        xerafin.error.log.add("Sloth: Question locks reset","HTTP");
      },
      error: function(jqXHR, textStatus, errorThrown) {
        self.getFirstBingo();
        xerafin.error.log.add("Sloth: Question locks reset failed","error");
        console.log("Error resetting locks, status = " + textStatus + " error: " + errorThrown);
      }
    });
  },
  fetchQuestion: function(){
    if (this.question!==null){
      this.getSlothData();
    }
    else {
      this.getNextBingo();
    }
  },
  output: function(){
    return this.content;
  }
}
function Sloth(question,lex){
  this.headings =  ['','','Twos','Threes','Fours','Fives','Sixes','Sevens','Eights','Nines','Tens','Elevens','Twelves','Thirteens','Fourteens','Fifteens'];
  this.columns = [0,0,15,10,7,7,6,6,5,5,4,4,3,3,2,2];
  this.inProgress = false;
  this.question = question || null;
  //Where lexicon is concerned, this is going to get complicated later on.
  //Sloth chat output will either have to be multiple channels, or filter according to lexicons a user has in the chat socket
  //currently, if the overview does not load and populate data before Sloth panel loads, using overview.data.lexicon.current will break
  //All of this sort of data in V2 will need to reside in a higher object than panel level.
  //So for now, if no lexicon specified, csw 19 is the default.
  this.lexicon = lex || "CSW19";
  this.lastQuestion = null;
  $('#content_pan_1_b').html('');
  this.init();
}

function initSloth(q,lex){
  console.log("initSloth - todo issue #21");
  if (typeof sloth!=='undefined'){
    if (!sloth.inProgress) {
      if (sloth.question!==q){sloth = new Sloth(q,lex);}
    }
  else {
      if (typeof q!=='undefined'){
        sloth = new Sloth(q,lex);
      }
   }
  }
  else {
   sloth = new Sloth(q,lex);
   sloth.output();
  }
}
