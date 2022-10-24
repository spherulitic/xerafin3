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

function alpha(alphagram, answers, cardbox, invCfg) {
  console.log(invCfg);
  // answers is an object: { "WORD": [ aux info ... ], etc }
  this.width = alphagram.length * invCfg.letterWidth;
  this.height = invCfg.alphaHeight;
  this.leftx = (Math.round(Math.random() * ((invCfg.INVW/invCfg.letterWidth) - alphagram.length)) * invCfg.letterWidth);
  this.x = this.leftx + this.width/2;
  this.y = 1.0;
  this.alphagram = alphagram;
  this.displayAlphagram = alphaSortMethod(alphagram, Number(localStorage.gAlphaSortInput));
  this.answers = Object.keys(answers);
  this.words = this.answers.slice();
  this.wordAuxInfo = answers;
  this.cardbox = cardbox;
  this.timeout = 60000; // 60 seconds
  this.active = true;
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
    var d = { userid: userid };
    var that=this;
    $.ajax({
      type: "POST",
      data: JSON.stringify(d),
      url: "getInvaderHighScores.py",
      success: function(response, responseStatus) {
        that.personalHighScore = response[0].personal;
        that.dailyHighScore = response[0].daily.score;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error, status = " + textStatus + " error: " + errorThrown);
      }
    });
    this.personalHighScore=that.personalHighScore;
    this.dailyHighScore=that.personalHighScore;
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
    //var x = event.x;
    //var y = event.y;
    //var canvas = document.getElementById("invadersCanvas");
    //var rect = canvas.getBoundingClientRect();
    //x -= rect.left;
    //y -= rect.top;
    //console.log('x:'+x+' y:'+y);
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
          this.displayWord(this.invadersAlphas[i], this.invadersAlphas[i].words, 'WRONG');
          break;
      }
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  pauseGame:function(){
    var that=this;
    if (this.invaderStatus == "started") {
      this.invaderStatus = "paused";
            this.endGame(false, true);
            $("#pauseButton").html("Resume");
    }
    else if (this.invaderStatus == "paused") {
      this.invaderStatus = "started";
      $("#pauseButton").html("Pause");
      requestAnimationFrame(function(timestamp) {
        that.animateAlphas(timestamp, timestamp, timestamp);
      });
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  initEvents:function(){
    var that=this;
    $('#resetButton').on('click', function(){that.endGame(true, false);});
    $('#pauseButton').on('click', function(){that.pauseGame();});
    $('#invadersCanvas').on('click', function(e){console.log(e);that.toggleSound(e);});
    $('#invAnswerBox').on("keypress", function(e) {
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
    if (this.invadersAlphas[i].answers.length == 0) {
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
    ctx.font = this.alphaSize+"px courier";
    ctx.textAlign = "center";
    for (i=0;i<this.invadersAlphas.length;i++) {
      if (this.invadersAlphas[i].active) {
        ctx.fillStyle = this.colorList[this.invadersAlphas[i].answers.length];
      }
      else {
        ctx.fillStyle = "grey";
        ctx.fillRect(this.invadersAlphas[i].leftx, this.invadersAlphas[i].y-(this.alphaHeight), this.invadersAlphas[i].alphagram.length*this.letterWidth, this.alphaHeight+1);
       ctx.fillStyle = this.colorList[0]; }
//       ctx.fillText(this.invadersAlphas[i].alphagram, this.invadersAlphas[i].x, this.invadersAlphas[i].y);
       ctx.fillText(this.invadersAlphas[i].displayAlphagram, this.invadersAlphas[i].x, this.invadersAlphas[i].y);
    }

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
         invaderStatus = "gameover";
     var invGameOver=document.createElement('div');
     invGameOver.id="invGameOver";
     invGameOver.className+=" invGameOver";
     invGameOver.innerHTML="GAME OVER";
     $('#invadersWrapper').prepend(invGameOver);
         this.endGame(false, false);
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
    var ctx = document.getElementById('invadersCanvas').getContext('2d');
    if (this.invaderStatus == 'paused') {$('#pauseButton').html('Pause');}
    if (this.invaderStatus == 'finished' || this.invaderStatus == 'paused') {
      this.invaderStatus = 'started';
      ctx.font = this.alphaSize+'px courier';
        requestAnimationFrame(function(timestamp) {
        that.animateAlphas(timestamp, timestamp, timestamp);
      });
    }
    else if (this.invaderStatus == 'started')  {
      var ans = document.getElementById('invAnswerBox').value.toUpperCase().trim();
      var found = false;
      $('#invAnswerBox').val("");
      alphas:
        for (var i=0;i<this.invadersAlphas.length;i++) {
        if (!this.invadersAlphas[i].active)
        continue;
      answers:
        for(var j=0;j<this.invadersAlphas[i].answers.length;j++) {
          if (ans == this.invadersAlphas[i].answers[j]) {
            console.log(ans);
          // possible race condition with mult answers searched at once?
            this.playLaserSound();
            this.invadersAlphas[i].answers = this.invadersAlphas[i].answers.filter(function(el) {return (el != ans); });
            this.displayWord(this.invadersAlphas[i], [ans], 'CURRENT');
            found = true;
          break alphas;
          }

        }
        if ((this.invadersAlphas[i].alphagram==ans.split('').sort().join('')) && (found==false)){;
          $('#invCurDiv').prepend($('#invAlphaDiv'+this.invadersAlphas[i].alphagram));
          $('#invWordsWrong'+this.invadersAlphas[i].alphagram).append(" "+ans);
          $('#invWordsWrong'+this.invadersAlphas[i].alphagram).css('visibility','visible');
          $('.nav-pills a[href="#invCurDiv"]').tab('show');
        }
      }
      if (found) {$('#invAnswerBox').toggleClass('slothFlashCorrect',200).delay(100).toggleClass('slothFlashCorrect',200);}
      else {$('#invAnswerBox').toggleClass('flashTypo',200).delay(100).toggleClass('flashTypo',200);}
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  getAlpha:function() {
    // also need to lock words as we grab them
    var d = { numQuestions: 1, user: userid, lock: true };
    var that=this;
    $.ajax({ type: "POST",
      url: "getQuestion.py",
      data: JSON.stringify(d),
      success: function (response, responseStatus) {
        var r = response[0];
        var question = r.questions;
        var words = r.words;
        var cardbox = r.aux[0].cardbox;
        var alphagram = Object.keys(question)[0];
        if (r.getFromStudyOrder)
          prepareNewWords();
        var newAlpha = new alpha(alphagram, words, cardbox, that);
        that.invadersAlphas.push(newAlpha);
        that.gettingWord = false;
        gCreateElemArray([
          ['a','div','invAlphaDiv','invAlphaDiv'+alphagram,'invCurDiv',''],
          ['a1','table','wordTable','invWords'+alphagram,'a',''],
          ['a2','div','wordTableWrong','invWordsWrong'+alphagram,'a','']
        ]);
        $("#invAlphaDiv"+alphagram).css('visibility','hidden');
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error status = " + textStatus + " Error Thrown " + errorThrown);
      }
    });
    this.invadersAlphas=that.invadersAlphas;
    this.gettingWord=that.gettingWord;
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
  endGame:function(restart,pause) {
    var d;
    console.log("endGame triggered");
    if (this.currentScore >= this.personalHighScore || this.currentScore >= this.dailyHighScore) {
      d = { userid: userid, score: this.currentScore, gameOver: !pause };
      var that=this;
      $.ajax({type: "POST",
        data: JSON.stringify(d),
        url: "setInvaderHighScores.py",
        success: function(response, responseStatus) {
          that.personalHighScore = response[0].personal;
          that.dailyHighScore = response[0].daily.score;
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.log("Error, status = " + textStatus + " error: " + errorThrown);
        }
      });
      this.personalHighScore = that.personalHighScore;
      this.dailyHighScore = that.dailyHighScore;
    }
    if (restart){
      this.invaderStatus = "finished";
      $('#invGameOver').remove();
      invadersMusic.pause();
      initInvaders();
    }
  },
//-------------------------------------------------------------------------------------------------------------------------------
  setCanvasDimensions:function(){
    document.getElementById('invadersCanvas').height=this.INVH;
    document.getElementById('invadersCanvas').width=this.INVW;
  },
//-------------------------------------------------------------------------------------------------------------------------------
  displayWord:function(alphaObj, words, state) {
    var data = new Array();
    var table = document.getElementById("invWords"+alphaObj.alphagram);
    $(table).empty();
    if (alphaObj.answers.length===0){state='SOLVED';}
    var tabState;
    switch (state) {
      case 'CURRENT':
        tabState= 'invCurDiv';
        data = alphaObj.words.filter(function(val) {return alphaObj.answers.indexOf(val) == -1;})
        data = data.sort();
        $('.nav-pills a[href="#invCurDiv"]').tab('show');
        break;
      case 'SOLVED' :
        tabState= 'invSolvedDiv';
        data = alphaObj.words.sort();
        $('.nav-pills a[href="#invSolvedDiv"]').tab('show');
        break;
      case 'WRONG':
        tabState= 'invMissedDiv';
        data = words.sort();
        $('.nav-pills a[href="#invMissedDiv"]').tab('show');
        break;
    }
    $("#invAlphaDiv"+alphaObj.alphagram).prependTo($("#"+tabState));
    $("#invAlphaDiv"+alphaObj.alphagram).css('visibility','visible');
    for (var x=0;x<data.length;x++) {
      var datas = getTableLineData(data[x], eval("alphaObj.wordAuxInfo." + data[x]));

      var row = table.insertRow(-1);
      var cells = [ ];
      var cellClassList = [" wordTableLeftHook", " wordTableInnerLeft", " wordTableWord", " wordTableInnerRight", " wordLexiconSymbol", " wordTableRightHook", " wordTableDefinition"];
      for(var i=0;i<cellClassList.length;i++) {
        cells[i] = row.insertCell(i);
        cells[i].className += cellClassList[i];
        cells[i].innerHTML = datas[i];
      }
    }
    clearTimeout(this.clearAnswersTimer);
    this.clearAnswersTimer = setTimeout(function () {
      $('.nav-pills a[href="#invCurDiv"]').tab('show');
    }, 3500);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  markAsCorrect:function(alphaObj) {
    this.currentScore++;
    // mark as correct in cardbox
    if (this.currentScore > this.personalHighScore) {this.personalHighScore = this.currentScore; }
    if (this.currentScore > this.dailyHighScore) {this.dailyHighScore = this.currentScore; }
    var d = {question: alphaObj.alphagram, correct: true, cardbox: alphaObj.cardbox, incrementQ: true};
    slothSubmitQuestion(d);
  },
//-------------------------------------------------------------------------------------------------------------------------------
  markAsIncorrect:function(alphaObj) {
    var  d = {question: alphaObj.alphagram, correct: false, cardbox: alphaObj.cardbox, incrementQ: true};
    slothSubmitQuestion(d);
    this.displayWord(alphaObj, alphaObj.words.sort(function (a, b) {return b[2] - a[2];}), 'WRONG');
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
      if (this.invaderStatus == 'finished' || this.invaderStatus == 'gameover') {
      } else { this.endGame(false, false);  } // only post the chat if we nav away midgame
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
                var d = { cardbox: localStorage.cardboxCurrent };
    $.ajax({
      type: "POST",
      data: JSON.stringify(d),
      url: "newQuiz",
      success: function(response,responseStatus){
        gUpdateCardboxScores (response, 0);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error, status = " + textStatus + " error: " + errorThrown);
      }
    });
  },
//-------------------------------------------------------------------------------------------------------------------------------
  generateDOM:function() {
    gCreateElemArray([
      ['a','div','quizContentDark invWrapper','invadersWrapper','content_pan_1_c',''],
      ['a1','canvas','invCanvas','invadersCanvas','a',''],
      ['ax','div','','colorStrip','a',''],
      ['a2','div','invAnswerBoxRow','answerBoxRow','a',''],
      ['a2a','div','invButtonBoxPause','buttonBox1','a2',''],
      ['a2a1','button','btn btn-default invButton','pauseButton','a2a','Pause'],
      ['a2b','div','invAnswerBoxField','answerBoxField','a2',''],
      ['a2b1','input','quizAnswerBox invAnswerBox','invAnswerBox','a2b',''],
      ['a2c','div','invButtonBoxReset','buttonBox2','a2',''],
      ['a2c1','button','btn btn-default invButton','resetButton','a2c','Reset'],
      ['a3','ul','nav nav-pills well sm-well metalBTwo nav-justified invTabs','invTabs','a',''],
      ['a3a','li','active','invCurTab','a3','<a data-toggle="tab" href="#invCurDiv">Current</a>'],
      ['a3b','li','','invSolvedTab','a3','<a data-toggle="tab" href="#invSolvedDiv">Solved</a>'],
      ['a3c','li','','invMissedTab','a3','<a data-toggle="tab" href="#invMissedDiv">Missed</a>'],
      ['a4','div','tab-content well well-sm quizContent pre-scrollable invWordDiv','invWordDiv','a',''],
      ['a4a','div','tab-pane fade in active','invCurDiv','a4',''],
      ['a4b','div','tab-pane fade','invSolvedDiv','a4',''],
      ['a4c','div','tab-pane fade','invMissedDiv','a4','']
      ]);
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
      $('#pauseButton').html('Pause');
      $('#invAnswerBox').focus();
    }
    else {
      this.invLoad=setTimeout(Invader.prototype.main.bind(this),250);
    }
  }
//-------------------------------------------------------------------------------------------------------------------------------
}
function Invader(){
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
  if (typeof invader=='undefined'){var invader=new Invader();}
  else {
    if (invader.invaderStatus=='finished'){
      invader=null;
      delete invader;
      var invader=new Invader();
    }
  }
  if (!document.getElementById('invadersCanvas')){
    explosionSound=createNewAudio("explosionSound",{src:'explosion_sm.wav'},"content_pan_1_c");
    laserSound=createNewAudio("laserSound",{src:'audio/laserShot.mp3'},"content_pan_1_c");
    laserSound2=createNewAudio("laserSound2",{src:'audio/laserShot2.mp3'},"content_pan_1_c");
    invadersMusic=createNewAudio("invadersMusic",{src:'invadersMusic.ogg',autoplay:false,loop:true,controls:false},"content_pan_1_c");
    explosionImg = new Image();
    explosionImg.src = "images/explosion_sprite.png";
    invader.generateDOM();
    invader.detectWindowClose();
    invader.initEvents();
  }
  if (localStorage.musicEnabled == "true") {invadersMusic.pause();invadersMusic.play(); }
  $('#invAnswerBox').prop('disabled', false);
  invader.main();
  //console.log("panel container"+document.getElementById('content_pan_1_c').offsetWidth);

  //  }
  //}
}

function slothSubmitQuestion(d) {
  $.ajax({
    type: "POST",
    data: JSON.stringify(d),
    url: "submitQuestion",
    success: function(response) {
      if (d.incrementQ){
        gUpdateCardboxScores (response);
        gCheckMilestones(response.qAnswered);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("Error getting bingo, status = " + textStatus + " error: " + errorThrown);
        }
  });
}
