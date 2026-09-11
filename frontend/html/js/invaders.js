function createNewAudio(ident, args, pare){
  var sound = document.createElement("audio");
  sound.id=ident;
  if (typeof args.src!=='undefined'){
    sound.src=args.src;
    if (typeof args.autoplay!=='undefined'){sound.autoplay=args.autoplay;}
    if (typeof args.loop!=='undefined'){sound.loop=args.loop;}
    if (typeof args.controls!=='undefined'){sound.controls=args.controls;}
    if (typeof pare!=='undefined'){$('#'+pare).append(sound);}
    return sound;
  }
  else {
    console.log ("Error creating new audio "+ident+".  No Source Defined!");
  }
}

Invader.prototype = {
  constructor: Invader,
//-------------------------------------------------------------------------------------------------------------------------------
  setDimensions:function(){
    this.INVH=this.INVW=Math.min(this.maxWidth,document.getElementById(this.targetDiv).offsetWidth-this.canvasIndent);
    this.soundPositionX = this.INVW-30;
    this.soundPositionY = this.INVH-20;
    this.alphaSize=Math.floor(this.INVH/20);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  getHighScores:function(){
    var that=this;
    $.ajax({
      type: "POST",
      data: JSON.stringify({}),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "getInvaderHighScores",
      success: function(response, responseStatus) {
        that.personalHighScore = response.personal;
        that.dailyHighScore = response.daily.score;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error, status = " + textStatus + " error: " + errorThrown);
      }
    });
  },
//-------------------------------------------------------------------------------------------------------------------------------
  getLetterDimensions:function(){
    var testDiv = document.createElement('div');
    testDiv.style="font: "+this.alphaSize+"px courier;display:inline-block;padding:0;margin:0;border:0;line-height:";
    testDiv.id='testDiv';
    testDiv.innerHTML='W';
    $('#'+this.targetDiv).append(testDiv);
    this.alphaHeight = Math.round(this.alphaSize*0.8);
    this.letterWidth  = Math.ceil($(testDiv).width());
    $(testDiv).remove();
  },
//-------------------------------------------------------------------------------------------------------------------------------
  drawSoundIcon:function() {
          var soundIcon;
      var ctx = document.getElementById('invadersCanvas').getContext('2d');
          if (localStorage.musicEnabled == "true")
             soundIcon = "🎵";
          else if (localStorage.soundEnabled == "true")
             soundIcon = "🔈";
          else soundIcon = "🔇";
          ctx.beginPath();
          ctx.rect(this.soundPositionX, this.soundPositionY, 30, 25);
          ctx.fillStyle = "black";
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.fillText(soundIcon, this.INVW-20, this.INVH-2);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  getPosition:function(event) {
    return { x: event.offsetX, y: event.offsetY }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  toggleSound:function(e){
    var pos = this.getPosition(e);
    if ((pos.x > (this.soundPositionX)) && (pos.y > (this.soundPositionY))) {
      if (localStorage.musicEnabled == "true") {
        localStorage.musicEnabled = "false";
        invadersMusic.pause();
        localStorage.soundEnabled = "true";
      }
      else if (localStorage.soundEnabled == "true") {
        localStorage.soundEnabled = "false";
      }
      else {
        localStorage.musicEnabled = "true";
        localStorage.soundEnabled = "true";
        invadersMusic.play();
      }
      this.drawSoundIcon();
    }
    for(var i=0;i<this.invadersAlphas.length;i++) {
      if(this.invadersAlphas[i].leftx<=pos.x && pos.x <= this.invadersAlphas[i].leftx+this.invadersAlphas[i].width &&
        this.invadersAlphas[i].y-this.invadersAlphas[i].height<=pos.y && pos.y <= this.invadersAlphas[i].y) {
        if (this.invadersAlphas[i].active)
          this.invadersAlphas[i].timeout = 0; // clicking marks it wrong
        break;
      }
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  pauseGame:function(){
    // the animation loop stays alive while paused; it draws the pause screen
    // and freezes all timers until the status flips back to "started"
    if (this.invaderStatus == "started") {
      this.invaderStatus = "paused";
      $("#leftButton").html("Resume");
    }
    else if (this.invaderStatus == "paused") {
      this.invaderStatus = "started";
      $("#leftButton").html("Pause");
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  initEvents:function(){
    var that=this;
    $('#rightButton').off('click').on('click', function(){that.endCurrentGame();});
    $('#leftButton').off('click').on('click', function(){that.pauseGame();});
    $('#invadersCanvas').off('click').on('click', function(e){that.toggleSound(e);});
    $('#answerBox').off('keydown').on("keydown", function(e) {
      if(e.ctrlKey) {
        $(this).val("");
      }
      else if (e.which === 13 || e.which == 32) {
        that.submitAnswer();
      }
    });
  },
//-------------------------------------------------------------------------------------------------------------------------------
  animateAlphas:function(previousTime, currentTime, lastWordTime) {
    var that = this;
    if (!document.getElementById("invadersCanvas"))  {
      this.detectWindowClose();
      return;
    }
    var ctx = document.getElementById('invadersCanvas').getContext('2d');
    if (this.invaderStatus == "paused") {
      // freeze the game: hide the alphagrams behind a pause screen and keep
      // rescheduling without advancing the fall, word spawn, or question timers
      this.drawPauseScreen(ctx);
      requestAnimationFrame(function(timestamp) {
        that.animateAlphas(currentTime, timestamp, currentTime);
      });
      return;
    }
    if (this.invaderStatus != "started") return;
    var activeAlphas = this.invadersAlphas.filter(function(el) { return el.active; });
    if ((activeAlphas.length == 0 || currentTime-lastWordTime > this.wordFreq) && !this.gettingWord) {
      this.getAlpha();
      this.gettingWord = true;
      lastWordTime = currentTime;
    }
    if (this.gettingWord) lastWordTime = currentTime;
    // need to skip the rest gracefully when invadersAlphas is empty
    if (this.invadersAlphas.length == 0) {
      requestAnimationFrame(function(timestamp) {
        that.animateAlphas(currentTime, timestamp, lastWordTime);
      });
      return;
    }
    // deal with any completed questions
    for (var i=0;i<this.invadersAlphas.length;i++) {
    if (this.invadersAlphas[i].unanswered.length == 0) {
      this.markAsCorrect(this.invadersAlphas[i]);
      // the explosion image is centered in a 64x64 square
      // so we want the center of the animation frame to be the alpha X,Y
      var newExplosion = this.explosion({x: this.invadersAlphas[i].x-32, y: this.invadersAlphas[i].y-60});
      this.explosions.push(newExplosion);
      if (localStorage.soundEnabled == "true") {
        explosionSound.play();
      }

      delete this.invadersAlphas[i]; } }
      this.invadersAlphas = this.invadersAlphas.filter(Boolean);
      // clear the screen
      ctx.drawImage(invaderBgImg, 0, 0,this.INVH,this.INVW);
      // display the explosions
      for(i=0;i<this.explosions.length;i++) {
      this.explosions[i].render(currentTime-previousTime);
      if (this.explosions[i].done)
      delete this.explosions[i]
    }
    this.explosions = this.explosions.filter(Boolean);
    // display the alphagrams
    this.drawAlphas(ctx);

    // display high scores
       ctx.fillStyle = "white";
       ctx.font = (this.alphaSize-6)+"px courier";
       ctx.textAlign = "left";
     var scale=Math.round(this.alphaSize);
       ctx.fillText("Score: " + this.currentScore, 1, this.INVH-2);
       ctx.fillText("High: " + this.personalHighScore, 5*scale, this.INVH-2);
       ctx.fillText("Daily High: " + this.dailyHighScore, 10*scale, this.INVH-2);
       this.drawSoundIcon();
    // check for collisions, update positions
    for (i=this.invadersAlphas.length-1;i>=0;i--) {
       var clear = true;
       for(var j=i-1;j>=0;j--)
         clear = clear && this.noCollision(this.invadersAlphas[i], this.invadersAlphas[j]);
       if (!clear && this.invadersAlphas[i].y - this.invadersAlphas[i].height <= 0) { // game over
         this.invaderStatus = "gameover";
         this.postHighScores();
         invadersMusic.pause();
         this.drawEndText(ctx, "GAME OVER");
         $('#rightButton').html("New Game");
         return;
       }
       if (clear && this.invadersAlphas[i].y < this.INVH-25) {
          var deltay = (currentTime-previousTime)/this.fallSpeed;
          if (deltay > 1.0) {
            this.invadersAlphas[i].y += 1.0;
          } else { this.invadersAlphas[i].y += deltay; }
       }
       if(this.invadersAlphas[i].timeout <= 0 && this.invadersAlphas[i].active == true) {
          this.markAsIncorrect(this.invadersAlphas[i]);
          this.invadersAlphas[i].active = false; }
       else if (currentTime-previousTime > 50)
               this.invadersAlphas[i].timeout -= 50;
            else this.invadersAlphas[i].timeout -= (currentTime-previousTime);
    }
  var that=this
    requestAnimationFrame(function(timestamp) {
        that.animateAlphas(currentTime, timestamp, lastWordTime);
    });
  },
//-------------------------------------------------------------------------------------------------------------------------------
  drawAlphas:function(ctx) {
    ctx.font = this.alphaSize+"px courier";
    ctx.textAlign = "center";
    for (var i=0;i<this.invadersAlphas.length;i++) {
      if (this.invadersAlphas[i].active) {
        ctx.fillStyle = this.colorList[this.invadersAlphas[i].unanswered.length];
      }
      else {
        ctx.fillStyle = "grey";
        ctx.fillRect(this.invadersAlphas[i].leftx, this.invadersAlphas[i].y-(this.alphaHeight), this.invadersAlphas[i].alpha.length*this.letterWidth, this.alphaHeight+1);
        ctx.fillStyle = this.colorList[0];
      }
      ctx.fillText(this.invadersAlphas[i].displayAlpha, this.invadersAlphas[i].x, this.invadersAlphas[i].y);
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  drawPauseScreen:function(ctx) {
    if (typeof invaderBgImg !== "undefined" && invaderBgImg) {
      ctx.drawImage(invaderBgImg, 0, 0, this.INVH, this.INVW);
    } else {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, this.INVW, this.INVH);
    }
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, this.INVW, this.INVH);
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = (this.alphaSize+4)+"px courier";
    ctx.fillText("PAUSED", this.INVW/2, this.INVH/2);
    ctx.font = (this.alphaSize-4)+"px courier";
    ctx.fillText("Click Resume to continue", this.INVW/2, this.INVH/2 + (2*this.alphaSize));
    this.drawSoundIcon();
  },
//-------------------------------------------------------------------------------------------------------------------------------
  drawEndText:function(ctx, text) {
    // big solid green letters straight over the frozen board, no box
    ctx.textAlign = "center";
    ctx.font = "bold " + Math.round(this.alphaSize*2) + "px courier";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.strokeText(text, this.INVW/2, this.INVH/2);
    ctx.fillStyle = "rgba(140,176,48,1)";
    ctx.fillText(text, this.INVW/2, this.INVH/2);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  playLaserSound:function() {
    if (localStorage.musicEnabled == "true"){
      var x = getRandomInt(2);
      switch(x){
        case 0: laserSound.play();break;
        case 1: laserSound2.play();break;
        default: laserSound.play();break;
      }
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  submitAnswer:function() {
    var that=this;
    if (this.invaderStatus == 'ended' || this.invaderStatus == 'gameover') {
      this.startNewGame();
      return;
    }
    if (this.invaderStatus == 'paused') {
      // loop is already alive; just unfreeze it
      this.invaderStatus = 'started';
      $('#leftButton').html('Pause');
      return;
    }
    if (this.invaderStatus == 'finished') {
      this.invaderStatus = 'started';
      requestAnimationFrame(function(timestamp) {
        that.animateAlphas(timestamp, timestamp, timestamp);
      });
      return;
    }
    if (this.invaderStatus == 'started')  {
      var status = this.answerArea.submitAnswer();
      if (status == 'correct' || status == 'solved') {
        this.playLaserSound();
      }
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  getAlpha:function() {
    // ask the Quiz object for one new question and, once it arrives, drop it into play
    var that=this;
    if (!this.q) { this.gettingWord = false; return; }
    var quiz = this.q;
    quiz.loadQuestions(1);
    var waitForQuestion = function() {
      if (!document.getElementById("invadersCanvas")) return;
      if (that.q !== quiz) return; // a new game started while we were waiting
      if (quiz.hasHTTPError) { that.gettingWord = false; return; }
      if (quiz.initialized) {
        var tracked = { };
        for (var i=0;i<that.invadersAlphas.length;i++) {
          tracked[that.invadersAlphas[i].alpha] = true;
        }
        for (var j=0;j<quiz.questions.length;j++) {
          var question = quiz.questions[j];
          if (!tracked[question.alpha]) {
            that.addAlpha(question);
            that.gettingWord = false;
            return;
          }
        }
        // no new question was returned (empty cardbox / end of quiz)
        that.gettingWord = false;
        return;
      }
      setTimeout(waitForQuestion, 30);
    };
    setTimeout(waitForQuestion, 30);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  addAlpha:function(question) {
    question.width = question.alpha.length * this.letterWidth;
    question.height = this.alphaHeight;
    question.leftx = (Math.round(Math.random() * ((this.INVW/this.letterWidth) - question.alpha.length)) * this.letterWidth);
    question.x = question.leftx + question.width/2;
    question.y = 1.0;
    question.timeout = 60000; // 60 seconds
    question.active = true;
    this.invadersAlphas.push(question);
    this.answerArea.setupWord(question);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  blinkText:function(){

  },
//-------------------------------------------------------------------------------------------------------------------------------
  plotPrescreen:function(){
    var that=this;
    var ctx=document.getElementById("invadersCanvas").getContext('2d');
    var invaderIcon = new Image();
    var scale=Math.round(this.alphaSize);
    invaderBgImg = new Image();
    invaderBgImg.src = "images/nightsky.png";
    invaderBgImg.onload = function() {
      ctx.drawImage(invaderBgImg, 0, 0,that.INVW,that.INVH);
      ctx.textAlign = 'center';
      ctx.font = (that.alphaSize+4)+'px courier';
      ctx.fillStyle = 'rgb(255,48,48)';
      var mid = Math.round(that.INVW/2)
      ctx.fillText('CARDBOX', mid, 3*scale);
      ctx.fillText('INVADERS', mid, (4*scale)+5);
      ctx.fillStyle = 'white';
      ctx.font = (that.alphaSize-4)+'px courier';
      ctx.fillText("Don't let your cardbox", mid, 7*scale);
      ctx.fillText(" fill the screen", mid, (8*scale)+2);
      ctx.fillText('Click an alphagram to', mid, 11*scale);
      ctx.fillText('mark wrong and see answers', mid, (12*scale)+2);
      ctx.fillStyle = 'orange';
      ctx.fillText('Press Enter to Begin', mid, that.INVW-(2*scale));
      that.drawSoundIcon();
      invaderIcon.src = "images/cardboxInvaders2.png";
      invaderIcon.onload = function () {
        ctx.drawImage(invaderIcon, mid-(6*scale), 2*scale, 2.5*scale, 2.5*scale);
        ctx.drawImage(invaderIcon, mid+(3.5*scale),2*scale, 2.5*scale, 2.5*scale);
      }

    };

  },
//-------------------------------------------------------------------------------------------------------------------------------
  postHighScores:function() {
    if (this.currentScore <= 0) { return; }
    var that=this;
    var d = { score: this.currentScore, gameOver: true };
    $.ajax({type: "POST",
      data: JSON.stringify(d),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "setInvaderHighScores",
      success: function(response, responseStatus) {
        that.personalHighScore = response.personal;
        that.dailyHighScore = response.daily.score;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error, status = " + textStatus + " error: " + errorThrown);
      }
    });
  },
//-------------------------------------------------------------------------------------------------------------------------------
  endCurrentGame:function() {
    // right button: end the game, or start a new one once it has ended
    if (this.invaderStatus == 'ended' || this.invaderStatus == 'gameover') {
      this.startNewGame();
      return;
    }
    if (this.invaderStatus != 'started' && this.invaderStatus != 'paused') { return; }
    this.invaderStatus = 'ended';
    // neutralise every onscreen word's timer so none can time out, but leave
    // them looking normal - they were not marked wrong
    for (var i=0;i<this.invadersAlphas.length;i++) {
      this.invadersAlphas[i].timeout = Infinity;
    }
    this.postHighScores();
    invadersMusic.pause();
    // freeze the board behind the end text for review
    var ctx = document.getElementById('invadersCanvas').getContext('2d');
    ctx.drawImage(invaderBgImg, 0, 0, this.INVH, this.INVW);
    this.drawAlphas(ctx);
    this.drawEndText(ctx, "ENDED");
    $('#rightButton').html("New Game");
    $('#leftButton').html("Pause");
  },
//-------------------------------------------------------------------------------------------------------------------------------
  startNewGame:function() {
    this.invadersAlphas = [];
    this.explosions = [];
    this.currentScore = 0;
    this.gettingWord = false;
    $('#rightButton').html("End");
    $('#leftButton').html("Pause");
    this.init();
    this.plotPrescreen();
    this.invaderStatus = "finished";
    if (localStorage.musicEnabled == "true") {invadersMusic.pause();invadersMusic.play(); }
    $('#answerBox').focus();
  },
//-------------------------------------------------------------------------------------------------------------------------------
  setCanvasDimensions:function(){
    document.getElementById('invadersCanvas').height=this.INVH;
    document.getElementById('invadersCanvas').width=this.INVW;
  },
//-------------------------------------------------------------------------------------------------------------------------------
  markAsCorrect:function(question) {
    // the Question object has already submitted itself when its last answer was found;
    // here we just account for the kill and stop tracking it in the Quiz
    this.currentScore++;
    if (this.currentScore > this.personalHighScore) {this.personalHighScore = this.currentScore; }
    if (this.currentScore > this.dailyHighScore) {this.dailyHighScore = this.currentScore; }
    this.q.closeQuestion(question.alpha);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  markAsIncorrect:function(question) {
    question.markWrong();
    this.answerArea.displayWord(question, question.answers, 'WRONG');
    this.q.closeQuestion(question.alpha);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  explosion:function(options) {
    var that = {};
    // ctx is the Invaders canvas
    // The image we have is 8x8 frames, 512x512 pixels
    // Whole animation will last ~2 seconds; 30ms per frame
    that.context = document.getElementById("invadersCanvas").getContext('2d');
    that.frame = 0;
    that.timeElapsed = 0;
    that.width = 64;
    that.height = 64;
    that.x = options.x;
    that.y = options.y;
    that.numberOfFrames = 64;
    that.done = false;
    that.image = explosionImg;
    that.render = function(tick) {
    that.done = (that.frame >= that.numberOfFrames);
    if (!that.done) {
      that.context.drawImage(
        that.image, (that.frame%8)*64, Math.trunc(that.frame/8)*64,  // source X, Y
        that.width, that.height,  // source width, height
        that.x, that.y, //canvas x, y
        that.width, that.height); // canvas width, height
        that.timeElapsed += tick;
        that.frame = Math.trunc(that.timeElapsed/30);
      }
    return 0;
    };
  return that;
  },
//-------------------------------------------------------------------------------------------------------------------------------
  detectWindowClose:function(){
    if (this.invTimeout) {clearTimeout(this.invTimeout);}
    if (!document.getElementById("invadersCanvas"))  {
    // we have navigated away from the screen mid-game
      invadersMusic.pause();
      if (this.invaderStatus == 'finished' || this.invaderStatus == 'gameover' || this.invaderStatus == 'ended') {
      } else { this.postHighScores();  } // only post the chat if we nav away midgame
      this.invaderStatus='finished';
    }
    else {
      this.invTimeout=setTimeout(Invader.prototype.detectWindowClose.bind(this),250);
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  noCollision:function(a, b) {
    if (a.leftx < b.leftx + b.width  && a.leftx + a.width > b.leftx && a.y < b.y + b.height && a.y + a.height > b.y) return false;
    else return true;
  },
//-------------------------------------------------------------------------------------------------------------------------------
  init:function() {
    // Quiz(submitStrict, isCardbox, blankQuiz, quizid)
    // submitStrict=false so completing every answer always counts as correct,
    // matching the original Invaders behaviour (wrong guesses don't fail the question)
    $('#invCurDiv').empty();
    $('#invSolvedDiv').empty();
    $('#invMissedDiv').empty();
    this.q = new Quiz(false, true, false, -1);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  generateDOM:function() {
    gCreateElemArray([
      ['a','div','quizContentDark invWrapper','invadersWrapper','content_pan_1_c',''],
      ['a1','canvas','invCanvas','invadersCanvas','a',''],
      ['ax','div','','colorStrip','a','']
      ]);
    this.answerArea.addDOM('invadersWrapper');
    this.answerArea.setButtonText("Pause", "End");
    let x = xerafin.config.colorAnswers.slice(0);
    x.shift();
    let colorTest= new ColorStrip({'width':'80%','colors':x});
    $('#colorStrip').append(colorTest.output());
  },
//-------------------------------------------------------------------------------------------------------------------------------
  main:function() {
    if (this.invLoad) {clearTimeout(this.invLoad);}
    if ($('#'+this.targetDiv).width()>100){
      this.init();
      this.setDimensions();
      this.getLetterDimensions();
      this.setCanvasDimensions();
      this.getHighScores();
      this.plotPrescreen();
      $('#leftButton').html('Pause');
      $('#rightButton').html('End');
      $('#answerBox').focus();
    }
    else {
      this.invLoad=setTimeout(Invader.prototype.main.bind(this),250);
    }
  }
//-------------------------------------------------------------------------------------------------------------------------------
}
function Invader(){
  this.answerArea = new AnswerArea(this);
  this.canvasIndent = 20;
  this.clearAnswersTimer = -1;
  this.colorList = xerafin.config.colorAnswers;
  this.currentScore = 0;
  this.dailyHighScore = 0;
  this.explosions = [];
  this.fallSpeed = 40.0;
  this.gettingWord = false;
  this.invadersAlphas = [];
  this.invaderStatus = "finished";
  this.nextAlphaTimer = -1;
  this.personalHighScore = 0;
  this.targetDiv = "content_pan_1_c";
  this.wordFreq = 8000;
  this.maxWidth = 380;
}

function initInvaders() {
  if (!document.getElementById("pan_1_c")) {
    panelData = {
      "contentClass" : "panelContentDefault",
      "title": "Cardbox Invaders",
      "minimizeObject": "content_pan_1_c",
      "variant": "c",
      "closeButton": false,
      "refreshButton" : false,
      "tooltip": "<p>Something helpful will go here.</p>"
    };
    generatePanel(1,panelData,"leftArea");
    stopScrollTimer();
  }
  // If an Invaders game is already underway, keep it running. The Quiz reads
  // the selected cardbox from localStorage on each loadQuestions call, so a
  // mid-game cardbox change is picked up automatically.
  if (typeof invader !== 'undefined' && document.getElementById('invadersCanvas') &&
      (invader.invaderStatus == 'started' || invader.invaderStatus == 'paused')) {
    $('#answerBox').focus();
    return;
  }
  if (typeof invader!=='undefined' && invader.invTimeout) {clearTimeout(invader.invTimeout);}
  invader = new Invader();
  if (!document.getElementById('invadersCanvas')){
    explosionSound=createNewAudio("explosionSound",{src:'explosion_sm.wav'},"content_pan_1_c");
    laserSound=createNewAudio("laserSound",{src:'audio/laserShot.mp3'},"content_pan_1_c");
    laserSound2=createNewAudio("laserSound2",{src:'audio/laserShot2.mp3'},"content_pan_1_c");
    invadersMusic=createNewAudio("invadersMusic",{src:'invadersMusic.ogg',autoplay:false,loop:true,controls:false},"content_pan_1_c");
    explosionImg = new Image();
    explosionImg.src = "images/explosion_sprite.png";
    invader.generateDOM();
  }
  invader.detectWindowClose();
  invader.initEvents();
  if (localStorage.musicEnabled == "true") {invadersMusic.pause();invadersMusic.play(); }
  $('#answerBox').prop('disabled', false);
  invader.main();
  //console.log("panel container"+document.getElementById('content_pan_1_c').offsetWidth);
}
