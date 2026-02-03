function initWordWall(
quizinfo = {
  'quizid': xerafin.storage.data.overview.currentQuiz,
  'quizname': xerafin.storage.data.overview.currentQuizName
})
{
 /// parameter from Overview is an object
  console.log(quizinfo);
  // in case a quiz was underway
  stopScrollTimer();
  resetHookWidthsQuiz();

  // create panel

  if (!document.getElementById("pan_1_g")) {
    var panel_data = {
       contentClass: "panelContentDefault",
       title: "Wall of Words",
       minimizeObject: "content_pan_1_g",
       variant: "g",
       closeButton: false,
       refreshButton: false,
       tooltip: "REFILL refills the grid. DISCARD marks unanswered questions wrong and refills the grid."
    };
    generatePanel(1,panel_data,"leftArea");
  }

  // create wordwall object
  let x=true;
  if(typeof wordwall=='undefined') {
    wordwall = new Wordwall();
  }
  else if(wordwall.gameState=='inactive') {
    wordwall.gameState = 'menu';
  }
  else if(wordwall.gameState=='active') {
    if (wordwall.quizid!==quizinfo.quizid){
      x = confirm("A new quiz has been sent to Wall of Words.  Abort current quiz?")
      if (x) {
        $('#content_pan_1_g').empty();
        wordwall = new Wordwall();
      }
    }
    else {
      //do nothing, everything is as it's supposed to be
    }
  }
  if (!((wordwall.quizid===quizinfo.quizid) && (wordwall.gameState=='active')) && (x==true))
  {
    let startAnimation = false;
    if(!document.getElementById('wordwallCanvas')) {
      wordwall.generateDOM();
      wordwall.initEvents();
      startAnimation = true;
    }
    wordwall.main(quizinfo);
  // this has to happen after inits in main and it can only happen once
    if (startAnimation) requestAnimationFrame(function(now) { wordwall.animationLoop(now, now);});
  }
} // end initWordWall

Wordwall.prototype = {
  constructor: Wordwall,
  generateDOM:function() {
     gCreateElemArray([
        ['a', 'div', 'quizContent invWrapper wordWrapper', 'wordwallWrapper', 'content_pan_1_g', ''],
        ['a1', 'div', 'canvasWrapper', 'wordwallCanvasWrapper', 'a', ''],
         ['a1a', 'canvas', 'invCanvas canvas', 'wordwallCanvas', 'a1', ''],
        ['a1b', 'canvas', 'invCanvas canvas', 'bgCanvas', 'a1', ''],
       ]);
      this.answerArea.addDOM('wordwallWrapper');
      this.answerArea.setButtonText("Refill", "🗑️");
  }, // end generateDOM
  initEvents: function() {
    var self = this;
    var canvas = document.getElementById("wordwallCanvas");
    canvas.tabIndex = '1';  // required to make it focusable, so it can catch keydown events

    canvas.onclick = function (e) {
              switch(self.gameState) {
        case "menu":
           document.getElementById("wordwallCanvas").focus();
     self.menu.click(e);
     break;
        case "active":
           if (!self.discardConfirmDialog.enabled) { self.canvasClick(e);  }
     else if (self.discardConfirmDialog.enabled) { self.discardConfirmDialog.click(e); }
     break;
        case "inactive":
           self.gameover.click(e);
     break;
        }
    };
    canvas.addEventListener('mousemove', function(e) {
          switch(self.gameState) {
      case "menu":
        self.menu.mouseover(e);
        break;
      case "active":
             if (self.discardConfirmDialog.enabled) {
         switch(self.discardConfirmDialog.eventOver(self.getPosition(e))) {
           case "OK":
       self.discardConfirmDialog.okColor = "chocolate";
       self.discardConfirmDialog.cancelColor = "grey";
       break;
     case "Cancel":
       self.discardConfirmDialog.okColor = "grey";
       self.discardConfirmDialog.cancelColor = "chocolate";
       break;
     default:
       self.discardConfirmDialog.okColor = "grey";
       self.discardConfirmDialog.cancelColor = "grey";
       break;
     }
       } else { switch(self.quitButton.eventOver(self.getPosition(e))) {
                  case "Quit":
        self.quitButton.color = "chocolate";
        break;
      default:
        self.quitButton.color = "grey";
        break;
         }
       } // end if discardConfirmDialog ... else ...
       break;
       case "inactive":
         switch(self.gameover.eventOver(self.getPosition(e))) {
           case "OK":
       self.gameover.okcolor = "chocolate";
       break;
     default:
       self.gameover.okcolor = "grey";
       break;
     } // end switch on eventOver
       break;
       } // end switch on gameState
       });

    canvas.removeEventListener('keydown', wallKeydownListener);
    canvas.addEventListener('keydown', wallKeydownListener);

  var box = document.getElementById("answerBox");
  box.addEventListener('keydown', function(e) {
    if(e.ctrlKey) { $(this).val(""); }
    else if (e.keyCode == 13 || e.keyCode == 32)
       switch(self.gameState) {
        case "menu":
      self.menu.transition();
      break; // case menu
   case "active":
      if (!self.paused && !self.discardConfirmDialog.enabled) {
      switch(self.answerArea.submitAnswer()) {
       case "correct":
         if (self.isScramble) self.timer.addScrambleTime();
       break;
       case "solved":
         if (self.isScramble) self.timer.addScrambleTime();
         self.score.correct++;
         if (self.q.eof && self.score.correct + self.score.incorrect == self.score.total) self.endgame();
       break;
       } // end switch submitAnswer
      }
      else if (self.paused && !self.discardConfirmDialog.enabled) {self.paused = !self.paused;}
      break; // case active
  } // end switch on game state
     }); // end function
    document.getElementById("leftButton").addEventListener('click', function(e) {
                          if (self.gameState == "active") {
        self.score.requested = self.q.refreshQuestions(self.QUIZ_SIZE);
        self.grid.getWords();
        box.focus();} });
    document.getElementById("rightButton").addEventListener('click', function(e) {
                          if (self.gameState == "active") {
                          self.discardConfirmDialog.enabled = true;} });
  },
  setDimensions: function() { // get dimensions for canvas from screen
    this.INVH=this.INVW=Math.min(this.maxWidth,document.getElementById(this.targetDiv).offsetWidth-this.canvasIndent);
  },
  setCanvasDimensions: function() {

  document.getElementById("wordwallCanvas").width = this.INVW;
  document.getElementById("wordwallCanvas").height = this.INVH;
  document.getElementById("bgCanvas").height = this.INVH;
  document.getElementById("bgCanvas").width = this.INVW;
  $('#wordwallCanvasWrapper').css('width', (this.INVW+4) + 'px');
  $('#wordwallCanvasWrapper').css('height', (this.INVH+4) + 'px');
  $('#wordwallCanvasWrapper').css('margin', '0 auto');
  },

  animationLoop: function(previousTime, currentTime){

  var self = this;
  var elapsed = currentTime - previousTime;
  if (!document.getElementById("wordwallCanvas")) {
      // we have navigated away from the screen mid-game
      this.gameState = "inactive";
      return; }
  var ctx = document.getElementById("wordwallCanvas").getContext('2d');
  ctx.clearRect(0, 0, this.INVW, this.INVH);

  var g = ctx.createLinearGradient(0, 0, this.INVW, 0);
  g.addColorStop("0.0", "chocolate");
  g.addColorStop("0.5", "magenta");
  g.addColorStop("1.0", "chocolate");
  ctx.textBaseline = "bottom";

  switch(this.gameState) {
    case "menu":
        ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  var fontSize = Math.ceil(this.INVW/12);
        ctx.font = fontSize + 'pt Alegreya SC';
        ctx.fillStyle = g;
        ctx.fillText("Wall of Words", this.INVW/2, this.INVH*.15);
        fontSize = Math.ceil(fontSize/2);
        ctx.font = fontSize + 'pt Alegreya SC';
        ctx.fillText("Choose Quiz Type", this.INVW/2, this.INVH*.85);
        this.menu.display(elapsed);
        break;
    case "active":
        // draw grid
  this.grid.display(elapsed);
  this.score.display(elapsed);
        ctx.fillStyle = g;
        if(this.timed) this.timer.display(elapsed);
  else {
        ctx.fillStyle = g;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        ctx.textAlign = "center";
        fontSize = Math.ceil(this.INVH/15);
        // this gets recalculated every animation loop. Need to find a way to stop that
        ctx.font = fontSize + 'pt Alegreya SC';
        while (ctx.measureText(this.q.quizName).width >= this.INVW-10 && fontSize > 12) { // don't go smaller than 11pt font
          fontSize = fontSize-1;
          ctx.font = fontSize + 'pt Alegreya SC';
        }

        ctx.fillText(this.q.quizName, this.INVW/2, (this.INVH*.15));
  }
  this.quitButton.display(elapsed);

  if (this.discardConfirmDialog.enabled)
    this.discardConfirmDialog.display(elapsed);
  break;
     case "inactive":
        ctx.textAlign = "center";
  fontSize = Math.ceil(this.INVH/12);
        ctx.font = fontSize + 'pt Alegreya SC';

  ctx.fillStyle = g;
  ctx.fillText("Game Over", this.INVW/2, (this.INVH*.2));

  this.gameover.display(elapsed);
  break;

     }
  requestAnimationFrame(function (now) { self.animationLoop(currentTime, now);});

  },

  endgame: function() {
     this.gameState = "inactive";
     var bgctx = document.getElementById("bgCanvas").getContext('2d');
     if (Number(localStorage.gWordwallTheme) == 0) {
        bgctx.drawImage(self.background, 0, 0);
     } else if (Number(localStorage.gWordwallTheme == 1)) {
     bgctx.fillStyle = "honeydew";
     bgctx.fillRect(0, 0, this.INVW, this.INVH);
     }
     $('#invCurDiv').html("");
     this.gameover.init();
  },

  main: function(quizinfo) {
   // for now, event handler on menu does the init
   //this.init();

  this.gameState = "menu"; // if this runs during a quiz, go back to menu
  if (quizinfo) {
    this.quizid = quizinfo.quizid;
    this.quizname = quizinfo.quizname;
  } else { this.quizid = xerafin.storage.data.overview.currentQuiz;
           this.quizname = xerafin.storage.data.overview.currentQuizName; }
  this.q = new Quiz(false, this.quizid==-1, false, this.quizid);

   document.getElementById("wordwallCanvas").focus();
   document.getElementById("leftButton").disabled = false;
   this.setDimensions();
   this.setCanvasDimensions();
   this.score.init();
   this.menu.init();

  self = this;
  $('#bgCanvas').css('z-index', '1');
  $('#wordwallCanvas').css('z-index', '2');
  var ctx = document.getElementById("bgCanvas").getContext("2d");
  if (Number(localStorage.gWordwallTheme) == 0) {
    if (typeof(this.background) == 'undefined') {
       this.background = new Image();
       this.background.src = "images/brickwall.jpg";
       this.background.onload = function() {
       ctx.drawImage(self.background, 0, 0); };
     } else ctx.drawImage(this.background, 0, 0);
  } else if (Number(localStorage.gWordwallTheme == 1)) {
    ctx.fillStyle = "honeydew";
    ctx.fillRect(0, 0, this.INVW, this.INVH);
  }
//   requestAnimationFrame(function(now) { self.animationLoop(now, now);});
   },

   getPosition:function(event) { return { x: event.offsetX, y: event.offsetY } },

   canvasClick:function(e) {
     var pos = this.getPosition(e);
     var question = this.grid.getQuestionByPos(pos);
     if (question) {
        if (!this.paused) {
        this.answerArea.displayWord(question, question.answers, 'WRONG');
        this.score.incorrect++;
        question.markWrong();
        question.unanswered = [ ]; }
     } else {if (this.timer.eventOver(e) == "Pause" && this.grid.questions.length == this.QUIZ_SIZE) {
                 this.paused = !this.paused;
     document.getElementById('answerBox').focus(); }
            else  this.quitButton.click(e);  // the button checks itself to see if it was actually clicked
      }
     } // end canvasClick

} // end prototype

function wallKeydownListener(e) {
              if (e.keyCode == 32)
                 e.preventDefault();
              switch(self.gameState) {
              case "menu" :
                  if (e.keyCode == 38) { // up arrow
                    if(self.menu.selectedType>0) self.menu.selectedType--;
                    e.preventDefault();
                  }
                  if (e.keyCode == 40) { // down arrow
                    if(self.menu.selectedType<self.menu.displayTypes.length-1) self.menu.selectedType++;
                    e.preventDefault();
                  }
                  if (e.keyCode == 13) { // enter
                    self.menu.transition();
                  }
               break; // case menu
              }
  }

function Wordwall() {

  var self = this;
  // load any sounds and images here

  this.maxWidth = 360;
  this.targetDiv = 'content_pan_1_g';
  this.canvasIndent = 20;

  this.answerArea = new AnswerArea(self);
  this.timed = false;
  this.isScramble = false;
  this.scrambleInterval = 6000;
  this.paused = false;
  this.INVW = 60; // default
  this.INVH = 60; // default

  if (Number(localStorage.gWordwallTheme == 0))  {
    this.COLOR_LIST = [ "black", "azure", "plum", "palegreen", "yellowgreen", "khaki", "salmon", "hotpink", "crimson", "magenta", "chocolate", "peachpuff", "mistyrose", "floralwhite" ] // maximum number of anagrams is 13
  } else if (Number(localStorage.gWordwallTheme == 1)) {
    this.COLOR_LIST = [ "honeydew", "black", "darkviolet", "darkgreen", "olivegreen", "goldenrod", "indianred", "crimson", "lightcoral", "chocolate", "darkorchid", "darkslateblue", "darkslategrey", "indigo"]
  }

  this.gameState = "menu"; // "menu", "active", "inactive"
  this.QUIZ_SIZE = 24;
  this.scramble_size = 0;
  this.menu = {
           selectedType: 0,
           displayTypes: [ ],
           typeSelected: false,
           minDisplayType: 0,
           maxDisplayType: 0,
           timer: 0,
           menuTop: 0,
           menuItemHeight: 0,
           menuItems: 0,
           menuWidth: 0,
           rightMenuRight: 0,
           rightMenuItems: 0,
           rightMenuWidth: 0,
           fontSize: 0,
     init: function () {
       self.menu.rightMenuRight = self.INVW * (4/6);
       self.menu.menuTop = self.INVH/5;
       self.menu.menuItemHeight = self.INVH/12;
       self.menu.fontSize = Math.ceil(self.INVH/23);
       if (self.quizid == -1) { // cardbox quiz
         self.menu.displayTypes = ["Untimed", "2 Minute", "5 Minute", "Scramble"];
         } else { self.menu.displayTypes = ["Untimed", "2 Minute", "5 Minute"];}
           },
       display: function(elapsed) {
        var ctx = document.getElementById("wordwallCanvas").getContext('2d');
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = this.fontSize + 'pt Alegreya SC';
        this.timer += elapsed;

        this.rightMenuWidth = ctx.measureText(this.displayTypes.reduce((a,b) => a.length > b.length ? a : b, '')).width;
    for(var x=0;x<this.displayTypes.length;x++) {
      if (x==this.selectedType) ctx.fillStyle = "chocolate";
      else ctx.fillStyle = "grey";
      ctx.fillText(this.displayTypes[x], this.rightMenuRight-this.rightMenuWidth, this.menuTop+(this.menuItemHeight*x));
    } // end for each display type
           },
     mouseover: function(e) {
       var pos = self.getPosition(e);
       if (pos.x > this.rightMenuRight - this.rightMenuWidth && pos.y > this.menuTop && pos.x < this.rightMenuRight && pos.y < this.menuTop + (this.displayTypes.length*this.menuItemHeight)) {
         var selected = Math.floor((pos.y-this.menuTop)/this.menuItemHeight);
         this.selectedType = selected;
         return true;
       } else return false;
     },
     click: function(e) { if (this.mouseover(e)) this.transition(); },
     transition: function() {
       var quizid = this.quizid;
       var type = this.displayTypes[this.selectedType];
       self.gameState = "active";
       self.grid.init();
       document.getElementById("answerBox").focus();

       // Quiz constructor: wrong guesses -> mark as incorrect, cardbox, blank, quizid
       // let's autorefill everything for now
       self.grid.autoRefill = true; // always autorefill noncarbox since it's finite
       document.getElementById("leftButton").disabled = true;

       switch(type) {
       case "2 Minute":
        self.timed = true;
        self.isScramble = false;
        self.timer.timeLeft = 120000; // milliseconds
        self.timer.totalTime = 120000;
       break;
       case "5 Minute":
        self.timed = true;
        self.isScramble = false;
        self.timer.timeLeft = 300000; // milliseconds
        self.timer.totalTime = 300000; // milliseconds
       break;
       case "Scramble":
        self.timed = true;
        self.isScramble = true;
        self.timer.timeLeft = 2*self.scrambleInterval;
        self.timer.totalTime = 2*self.scrambleInterval;
        self.scramble_size = 100;
       break;
       default:  // Untimed
        self.timed = false;
        self.isScramble = false;
       break;
      } // end switch on  type
      self.q.loadQuestions(self.QUIZ_SIZE);
      self.grid.getWords();
      }
        };

  this.grid = {
    width: 3,
    height: 8,
    boxWidth: 100,
    boxHeight: 30,
    gridXOffset: 70,
    gridYOffset: 70,
    timer: 0,  //  as of yet grid has no animation so no timer needed
    questions: [],
    delay: [],
    autoRefill: false,
    init: function() {
      this.gridXOffset = self.INVW/40;
      this.gridYOffset = self.INVH/5;
      this.boxHeight = self.INVH/12;
      this.boxWidth = (self.INVW-(2*this.gridXOffset))/3;
      // draw the grid once on init instead of every frame
      var ctx = document.getElementById("bgCanvas").getContext("2d");

      ctx.lineWidth = "2";
      if (Number(localStorage.gWordwallTheme) == 0) {
        ctx.strokeStyle = "#676767";
      } else if (Number(localStorage.gWordwallTheme) == 1) { ctx.strokeStyle = "black"; }

      for(var w = 0; w < this.width; w++)
        for(var h = 0; h < this.height; h++) {
          var boxX = this.gridXOffset+(w*this.boxWidth);
          var boxY = this.gridYOffset+(h*this.boxHeight);
          ctx.beginPath();
          ctx.rect(boxX, boxY, this.boxWidth, this.boxHeight);
          ctx.stroke();

          if (Number(localStorage.gWordwallTheme) == 0) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = 'black';
            ctx.rect(boxX+2, boxY+2, this.boxWidth-4, this.boxHeight-4);
            ctx.fill();
            ctx.globalAlpha = 1.0; }
        }

    },
    getQuestionByPos: function(pos) {
       var col = Math.floor((pos.x-this.gridXOffset)/this.boxWidth);
       var row = Math.floor((pos.y-this.gridYOffset)/this.boxHeight);
       if(col > -1 && col < this.width && row > -1 && row < this.height) {
         var q = this.questions[(row*this.width)+col];
   if (q && q.unanswered.length > 0)
           return this.questions[(row*this.width)+col];
   else return null;
       } else return null;
    },
    getWords: function() {
      self.paused = true;
      this.questions = [ ];
      if (self.q.initialized && self.q.questionsLoaded > 0 && (!self.q.hasHTTPError)) {
        self.paused = false; // pause the timer while words load
        if (self.q.eof) document.getElementById("leftButton").disabled = true;
  // if total is 0, we need to initialize. else it's a refresh so we need to adjust in case
  // the refresh didn't come back with as many words as we asked for
  if (self.score.total == 0 ) self.score.total = self.q.questionsLoaded;
  else self.score.total = self.score.total + self.score.requested - (self.QUIZ_SIZE - self.q.questionsLoaded);
  self.score.requested = 0;
      for (var x = 0;x < self.q.questions.length;x++) {
        this.questions.push(self.q.questions[x]);
  // create hidden tables for each alpha to display on the bottom later
  self.answerArea.setupWord(self.q.questions[x]);
      }} // end if questions are loaded
  else {  setTimeout(function() { self.grid.getWords(); } , 500);}},

    display: function(elapsed) {
      // draw grid
      var ctx = document.getElementById("wordwallCanvas").getContext('2d');
      this.timer = this.timer + elapsed;
      for(var w = 0; w < this.width; w++)
        for(var h = 0; h < this.height; h++) {
    var boxX = this.gridXOffset+(w*this.boxWidth);
    var boxY = this.gridYOffset+(h*this.boxHeight);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!self.paused && !self.discardConfirmDialog.enabled) { // don't show words while paused
      var index = (h*this.width)+w;
      var currQuestion = this.questions[index];
      if (currQuestion) {
          if (currQuestion.unanswered.length == 0) { this.questions[index] = null; }
        var fontSize = 13;
        ctx.font = fontSize+"pt Arial";
        while ((ctx.measureText(currQuestion.alpha).width >= this.boxWidth-10 || fontSize >= this.boxHeight-4) && fontSize > 6) { // don't go smaller than 5pt font
          fontSize = fontSize-1;
          ctx.font = fontSize+"pt Arial"; }
        ctx.fillStyle = self.COLOR_LIST[currQuestion.unanswered.length];
        ctx.fillText(currQuestion.displayAlpha, boxX + (this.boxWidth/2), boxY + (this.boxHeight/2));
        } else if (this.autoRefill && typeof(currQuestion) == "object") {
          this.questions[index] = false; // yeah this is hacky, so sue me
          if (self.isScramble) {
        if (self.score.total - self.score.incorrect < self.scramble_size) { this.refill(index); }
        else if (self.score.correct == self.scramble_size) {self.endgame();}
           } else if (!self.q.eof)  {   this.refill(index); }
         }
    } // end if not paused
      }
    },
    refill: function(index) {
       self.q.loadQuestions(1);
       self.score.requested++;
       this.refillCallback(index, self.score.total+self.score.requested-1);
    },
    refillCallback: function(index, quizIndex) {
      if (self.q.questions[quizIndex]) {
         self.score.total++;
   self.score.requested--;
         this.questions[index] = self.q.questions[quizIndex];
   self.answerArea.setupWord(this.questions[index]);
      } else { if (self.q.eof) { // the question we requested isn't coming
                                 self.score.requested--;
    } else { setTimeout(function() {self.grid.refillCallback(index, quizIndex)}, 250);}
      }
      } // end function

    }; // end grid

    this.score = {
      correct: 0,
      incorrect: 0,
      total: 0,
      requested: 0,
      fontSize: 14,
      yPos: 0, // positions need to be calculated at runtime since canvas size may change
      init: function() {
        this.yPos = self.INVH*.95;
        this.correct = 0;
        this.incorrect = 0;
        this.total = 0;
        this.requested = 0;
        this.fontSize = 14;
      },
      display: function(elapsed) {
        if (this.total > 0) {
        var ctx = document.getElementById("wordwallCanvas").getContext('2d');
        ctx.fillStyle = "chocolate";
  ctx.textAlign = 'left';
  ctx.textBaseline = "center";
        this.fontSize = Math.ceil(Math.min(14, self.INVH/24));
  ctx.font = this.fontSize + 'pt Alegreya SC';
  ctx.fillText('Score: ' + this.correct + '/' + this.total, self.grid.gridXOffset, this.yPos);
  ctx.textAlign = 'right';
  var pct = (this.correct*100)/this.total;
  ctx.fillText(pct.toFixed(1) + '%', self.INVW-self.grid.gridXOffset, this.yPos);
  }}
      }, // end score

    this.timer = {
      timeLeft: 0,
      totalTime: 0,
      pausebox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },

      addScrambleTime: function() {
        var adjustment = self.scrambleInterval / self.answerArea.lastAnswered.answers.length;
        this.totalTime = this.totalTime + adjustment;
        this.timeLeft = this.timeLeft + adjustment;
     },

      eventOver: function(e) {
       var pos = self.getPosition(e);
       if (pos.x > this.pausebox.minX && pos.x < this.pausebox.maxX && pos.y > this.pausebox.minY && pos.y < this.pausebox.maxY) {
         return "Pause"; }
       else return undefined;
      },

      display: function(elapsed) {
         if (!self.paused && !self.discardConfirmDialog.enabled) this.timeLeft = this.timeLeft - elapsed;
         if (this.timeLeft <= 0) this.expired();
         var ctx = document.getElementById("wordwallCanvas").getContext('2d');
         var g = ctx.createLinearGradient(0, 0, self.INVW, 0);
         g.addColorStop("0.0", "chocolate");
         g.addColorStop("0.5", "magenta");
         g.addColorStop("1.0", "chocolate");
         var height = self.INVH/10;
         var width = self.INVW*.8;
         var widthRemaining = width * (this.timeLeft/this.totalTime);
         ctx.fillStyle = g;
         ctx.fillRect(self.INVW/10, self.INVH/20, widthRemaining, height);
         ctx.fillStyle = "white";
         ctx.textAlign = "left";
         ctx.textBaseline = "top";
         var fontSize = Math.max(height-16,10);
         ctx.font = fontSize + "pt Alegreya SC";
         ctx.fillText("⏰", (self.INVW/10)+5, (self.INVH/20)+5);
         if (self.paused) ctx.fillText("▶️", (self.INVW*.8), (self.INVH/20) + 5);
         else ctx.fillText("⏸️", (self.INVW*.8), (self.INVH/20) + 5);
         this.pausebox.minX = self.INVW*.8;
         this.pausebox.minY = (self.INVH/20) + 5;
         this.pausebox.maxY = this.pausebox.minY + fontSize + 5; // emojis look big so it's not 20
         this.pausebox.maxX = this.pausebox.maxX + ctx.measureText("⏸️").width;
   },
      expired: function() {
     self.endgame();
   }
    }; // end timer

    this.gameover = {
      init: function() { },
      okcolor: 'grey',
      okbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },


  display: function(elapsed) {
  var ctx = document.getElementById("wordwallCanvas").getContext('2d');
  ctx.fillStyle = "honeydew";
  ctx.fillRect(0, 0, this.INVW, this.INVH);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "chocolate";
  var fontSize = Math.ceil(self.INVH/23);
  ctx.font = fontSize + 'pt Alegreya SC';
  var textX = self.grid.gridXOffset;
  var textY = self.grid.gridYOffset;
  var unanswered = self.score.total - self.score.correct - self.score.incorrect;
  if (self.score.correct + self.score.incorrect > 0)
          var accuracy = (self.score.correct*100) / (self.score.correct + self.score.incorrect);
  else var accuracy = 0;
  var completed = ((self.score.correct+self.score.incorrect)*100) / self.score.total;
  var textArray = ["Correct: " + self.score.correct, "Incorrect: " + self.score.incorrect, "Unanswered: " + unanswered,
                   "Accuracy: " + accuracy.toFixed(1) + "%", "Completed: " + completed.toFixed(1) + "%"]
        if (self.isScramble && self.score.correct == self.scramble_size) { // 100 word scramble
     var timeLeft = new Date(self.timer.timeLeft);
     if (timeLeft.getMinutes() < 10) {
       var timeText = timeLeft.toISOString().substr(15,4);
     } else { var timeText = timeLeft.toISOString().substr(14,5); } // this will only work for times less than an hour
     textArray.push("Time Remaining: " + timeText); }
  for(var i=0;i<textArray.length;i++) {
    ctx.fillText(textArray[i], textX, textY);
    textY = textY + (2*fontSize);
  }
  ctx.textAlign = 'center';
  var fontSize = Math.ceil(self.INVH/14);
  ctx.font = fontSize + 'pt Alegreya SC';
  this.okbox.minY = self.INVH*.75;
  this.okbox.maxY = this.okbox.minY + fontSize+5; // 25pt font is 25 pixels tall
  var okWidth = ctx.measureText("OK").width;
  this.okbox.minX = self.INVW/2 - (okWidth/2);
  this.okbox.maxX = this.okbox.minX + okWidth;
        ctx.fillStyle = this.okcolor;
  ctx.fillText("OK", self.INVW/2, self.INVH*.75);
     }, // end display()


     eventOver: function(pos) {
       if (pos.x > this.okbox.minX && pos.x < this.okbox.maxX && pos.y > this.okbox.minY && pos.y < this.okbox.maxY) {
         return "OK"; }
       else return undefined;
     },

     click: function(e) {
       if (this.eventOver(self.getPosition(e)) == 'OK') {
         initWordWall(); }
     }

    }; // end gameover

    this.quitButton = {
      box: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      color: "grey",
      display: function(elapsed) {
        var ctx = document.getElementById("wordwallCanvas").getContext('2d');
  ctx.font = self.score.fontSize + 'pt Alegreya SC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = this.color;
  var width = ctx.measureText("❌").width;
  this.box.minX = (self.INVW/2) - (width/2);
  this.box.maxX = this.box.minX + width;
  this.box.maxY = self.score.yPos + Math.ceil(self.score.fontSize/2) + 2;
  this.box.minY = self.score.yPos - Math.ceil(self.score.fontSize/2) - 2;
  ctx.fillText("❌", self.INVW/2, self.score.yPos);
  },
      eventOver: function(pos) {
       if (pos.x > this.box.minX && pos.x < this.box.maxX && pos.y > this.box.minY && pos.y < this.box.maxY) return "Quit";
       else return undefined;
      },
      click: function(e) {
        if(this.eventOver(self.getPosition(e)) == "Quit") {
    self.endgame(); }
    }};


    this.discardConfirmDialog = {
      enabled: false,
      // dummy values -- will be calculated later
      boxX: 1,
      boxY: 1,
      boxWidth: 1,
      boxHeight: 1,
      okbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      cancelbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      // changed onmouseover
      okColor: "grey",
      cancelColor: "grey",
      display: function(elapsed) {
        var ctx = document.getElementById("wordwallCanvas").getContext('2d');


  ctx.lineWidth = "2";
  if (Number(localStorage.gWordwallTheme == 0)) {
      ctx.strokeStyle = "white";
    ctx.fillStyle = "black";
  } else if (Number(localStorage.gWordwallTheme == 1)) {
      ctx.strokeStyle = "black";
    ctx.fillStyle = "honeydew"; }
        ctx.beginPath();
  ctx.fillRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
  ctx.rect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
  ctx.stroke();
  ctx.font = "16px Alegreya SC";
  ctx.fillStyle = "chocolate";
        ctx.textAlign = "center";
  ctx.textBaseline = "top";
  switch(self.menu.selectedLevel) {
    case 2: // 100 word scramble
      var msg = ["This ", "will ", "mark ", "all ", "remaining ", "questions ", "wrong ", "and ", "replace ", "them."];
      break;
    default:
        var msg = ["This ", "will ", "mark ", "all ", "remaining ", "questions ", "wrong ", "and ", "refill ", "the ", "grid."]
            break; }
  var snippet = msg.shift();
  var rowHeight = 25;
  var textYOffset = this.boxY+10;
  while (msg.length > 0) {
    if (ctx.measureText(snippet + msg[0]).width < this.boxWidth-10) {
       snippet = snippet + msg.shift();
    } else { ctx.fillText(snippet, self.INVW/2, textYOffset);
             textYOffset = textYOffset + rowHeight;
       snippet = msg.shift(); }
  }

        // print the last line
  ctx.fillText(snippet, self.INVW/2, textYOffset);
  textYOffset = textYOffset + rowHeight;

  ctx.fillText("Continue?", self.INVW/2, textYOffset);
        ctx.fillStyle = this.okColor;
  var fontSize = Math.ceil(self.INVH/15);
        ctx.font = fontSize + "pt Alegreya SC";
  ctx.fillText("OK", self.INVW/3, textYOffset + rowHeight);
        ctx.fillStyle = this.cancelColor;
  ctx.fillText("Cancel", (self.INVW/3)*2, textYOffset + rowHeight);

  var oksize = ctx.measureText("OK");
  this.okbox.minX = (self.INVW/3) - (oksize.width/2);
  this.okbox.maxX = (self.INVW/3) + (oksize.width/2);
  this.okbox.minY = textYOffset + rowHeight;
  this.okbox.maxY = this.okbox.minY + fontSize + 2;

  var cancelsize = ctx.measureText("Cancel");
  this.cancelbox.minX = (self.INVW/3)*2 - (cancelsize.width/2);
  this.cancelbox.maxX = (self.INVW/3)*2 + (cancelsize.width/2);
  this.cancelbox.minY = textYOffset + rowHeight;
  this.cancelbox.maxY = this.cancelbox.minY + fontSize + 2;
        this.boxX = self.INVW*.15;
        this.boxY = self.INVH*.15;
        this.boxWidth = self.INVW*.7;
        this.boxHeight = this.cancelbox.maxY + 10 - this.boxY;


     },
     eventOver: function(pos) {
       if (pos.x > this.okbox.minX && pos.x < this.okbox.maxX && pos.y > this.okbox.minY && pos.y < this.okbox.maxY) {
         return "OK"; }
       else if(pos.x > this.cancelbox.minX && pos.x < this.cancelbox.maxX && pos.y > this.cancelbox.minY && pos.y < this.cancelbox.maxY)
         return "Cancel";
       else return undefined;
       },

       click: function(e) {
         switch(this.eventOver(self.getPosition(e))) {
     case "OK":
       if (self.grid.autoRefill) {
               for(var i=0;i<self.grid.questions.length;i++) {
            if(self.grid.questions[i] && self.grid.questions[i].unanswered.length > 0){
         self.grid.questions[i].markWrong();
               self.answerArea.displayWord(self.grid.questions[i],self.grid.questions[i].answers, 'WRONG');
               self.score.incorrect++;
         self.grid.questions[i] = null; // and let the grid refill itself
                 }}
       } else {
       // mark everything wrong and refresh
       var wrongList = self.grid.questions.filter(q => q);
       for (var x=0;x<wrongList.length;x++) {
          self.answerArea.displayWord(wrongList[x],wrongList[x].answers, 'WRONG');
    wrongList[x].markWrong();
    wrongList[x].unanswered = [ ];
    self.score.incorrect++;
         }
         self.score.total = self.score.total + self.q.refreshQuestions(self.QUIZ_SIZE);
         self.grid.getWords();
         break; }
       this.enabled = false;
       break;
     case "Cancel":
       this.enabled = false;
       break;
     default:
       break;
   }
       }
              }; // end discardConfirmDialog
     } // end constructor
