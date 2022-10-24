function initSloth(question) {
//  console.log("initSloth " + question);
  if (typeof slothTimer !== 'undefined' && slothTimer !== null)
    clearInterval(slothTimer);
  if (typeof question !== 'undefined') {
    slothQuestion = question
    initSloth2();
  }
  else {
    if (localStorage.cardboxSent=='false'){d = { user: userid };}
    else {d = {user:userid, cardbox: localStorage.cardboxCurrent};}
    $.ajax({type: "POST",
      data: JSON.stringify(d),
      url: "getNextBingo.py",
      success: populateSlothQuestion,
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error getting bingo, status = " + textStatus + " error: " + errorThrown);
      }
    });
  }
}

function populateSlothQuestion(response, responseStatus) {
//  console.log(response);
  slothQuestion = response[0].alpha;
  initSloth2();
}

function initSloth2() {
  if (!document.getElementById("pan_1_b")) {
    panelData = {
          "contentClass" : "panelContentDefault",
          "title": "Subword Sloth",
          "minimizeObject": "content_pan_1_b",
          "variant": "b",
          "closeButton": false,
          "refreshButton" : false,
          "tooltip": "<p>No known bugs at present</p>"
          };
    generatePanel(1,panelData,"leftArea");
    console.log("Starting Sloth for " + slothQuestion);
  }
  $('#content_pan_1_b').empty();
  stopScrollTimer();
  resetHookWidthsQuiz();
  gCreateElemArray([
    ['a','div','quizContent','slothWrapper','content_pan_1_b',''],
    ['a1','div','quizAlphaSuper highlightRowInv slothAlphaSuper','alphaSuper','a',''],
    ['a1a','div','quizAlphaContain','slothAlphagramContainer','a1',''],
    ['a1a1','div','','leftHook','a1a',''],
    ['a1a2','div','quizAlpha','slothAlphagram','a1a',''],
    ['a1a3','div','','rightHook','a1a',''],
    ['a3b','div','slothInputRegion','timerLabel','a',''],
    ['a3c','div','slothTimer','timerText','a3b',''],
    ['a3','div','slothStatusWrap','statusWrap','a',''],
    ['a3d','div','slothAnswerRegion','answerBoxField','a3',''],
    ['a3d1','input','quizAnswerBox','slothAnswerBox','a3d',''],
    ['a3a','div','progress silverRowed','progressWrap','a3',''],
    ['a3a1','div','progress-bar progress-bar-custom highlightRow','progressBar','a3a',''],
    ['a3a2','span','progress-value','progressLabel','a3a','0%'],
    ['a2','div','well well-sm pre-scrollable slothAnswerWrap slothAnswer','answerField','a',''],
    ['a4','button','btn btn-default slothStartButton','startButton','a','Start']

  ]);
  $('#statusWrap').css("display","none");
  $('#progressBar').attr('role','progressbar');
  $('#progressBar').attr('aria-valuenow', '0%').css('width','0%');
  $('#slothAnswerBox').prop("disabled",true);
  $('#slothAnswerBox').css('width','50%');
  $('#slothAnswerBox').on("keypress", function(e) {
    if (e.which === 13) {submitSlothAnswer();}
  });
  $('#startButton').on("click", startSloth);
  if ((Number(localStorage.gAlphaDisplay))==0) {
    stringToTiles(Array(slothQuestion.length+1).join(" "), '#slothAlphagram');
  }
  else {
    $('#slothAlphagram').css('visibility', 'hidden');
    $('#slothAlphagram').html(alphaSortMethod(slothQuestion, Number(localStorage.gAlphaSortInput)));
  }
  var d = { user: userid, alpha: slothQuestion, getAllWords: localStorage.gSlothPref };
  $.ajax({type: "POST",
    data: JSON.stringify(d),
    url: "getSlothData.py",
    success: setupSloth,
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("Error, status = " + textStatus + " error: " + errorThrown);
    }
  });
}

function setupSloth (response, responseStatus) {
  document.getElementById("startButton").style.display = "block";
  slothData = response[0];
  //console.log(response[0]);
  if (Number(localStorage.cardboxCurrent)!==slothData[slothData.length-1].auxInfo.cardbox){
    localStorage.cardboxSent='false';
    localStorage.cardboxCurrent=slothData[slothData.length-1].auxInfo.cardbox;
    if ($('#pan_4').length>0){
      cardboxHighlightAction(slothData[slothData.length-1].auxInfo.cardbox, false);
      showCardboxStats();
    }
   }
  var tmpWordlist = [ ];
  for (var x=0;x<slothData.length;x++)
    for (var y=0;y<slothData[x].words.length;y++)
      tmpWordlist.push(slothData[x].words[y])
    var wordlist = tmpWordlist.sort(function f (a,b) {
      return a.length < b.length || (a.length == b.length && a < b) ? -1 : a.length > b.length || (a.length == b.length && a > b) ? 1 : 0
    });
    var minSubLength = 4;
    totalScore = 0;
    slothScore = 0;
    slothTimerCount = Math.max(180, wordlist.length*3);
    var answerField = document.getElementById("answerField");
    for (var y=slothQuestion.length;y>=minSubLength;y--){
    var content = wordlist.filter( function( element ) {
      return element.length == y;
    });
    if (content.length!==0){generateSlothTable (content,y)};
  }
  $('#startButton').prop('disabled',false);
}

function generateSlothTable (content,wordLength) {
  var slothColumns = [0,0,15,10,7,7,6,6,5,5,4,4,3,3,2,2];
  var slothTableHeadings = ['','','Twos','Threes','Fours','Fives','Sixes','Sevens','Eights','Nines','Tens','Elevens','Twelves','Thirteens','Fourteens','Fifteens']
  var currentTable = document.createElement('table');
  if (content.length>=slothColumns[wordLength]){
    currentTable.style.width='100%';}
  currentTable.className+=" slothTable";
  currentTable.id='slothTable'+wordLength;
  var tableHeading = document.createElement('div');
  tableHeading.id='slothHeading'+wordLength;
  tableHeading.className+=' slothTableHeading silverRowed';
  tableHeading.innerHTML=slothTableHeadings[wordLength]+' ('+content.length+')';
  $('#answerField').append(tableHeading);
  var tableRows = Math.ceil(content.length / slothColumns[wordLength]);
  for (var x=0; x< tableRows; x++) {
    var tr = document.createElement('tr');
    var idx = x;
    for (var i=0;i < slothColumns[wordLength];i++) {
      if (idx < content.length) {
        var td = document.createElement('td');
        td.id= "Sloth_"+wordLength+"_"+x+"_"+i;
            var spanS = document.createElement('span');
            spanS.id = content[idx];
            spanS.innerHTML = content[idx];
             totalScore += Math.pow(content[idx].length,2);
            tr.appendChild(td);
        td.appendChild(spanS);
            idx += tableRows;
      }
    }
    currentTable.appendChild(tr);
  }
  document.getElementById("answerField").appendChild(currentTable);
}

function startSloth () {
  document.getElementById("startButton").style.display = 'none';
  $('#statusWrap').css('display', 'initial');
  if ((Number(localStorage.gAlphaDisplay))==0) {
    stringToTiles(alphaSortMethod(slothQuestion, Number(localStorage.gAlphaSortInput)), '#slothAlphagram');
  }
  else {
    $('#slothAlphagram').css('visibility', 'visible');
  }
  //  $('#slothAlphagram').html(alphaSortMethod (slothQuestion, Number(localStorage.gAlphaSortInput)));
  document.getElementById('slothAnswerBox').disabled = false;
  $('#slothAnswerBox').css("display","initial");
  $('#slothAnswerBox').focus();
  slothTimer = setInterval(updateSlothTimer, 1000);
}

function slothTimerExpire () {
  //var wd;
  var d;
  if (slothScore / totalScore >= 0.6) {
    var progress = Math.round((slothScore/totalScore)*100) + '%';
    d = {userid: userid, score: Math.round((slothScore/totalScore)*100), alpha: slothQuestion}
    $.ajax({
      type: "POST",
      data: JSON.stringify(d),
      url: "submitSloth.py",
      success: function(response) {
        console.log("Sloth submitted: "+response);
      }
    });
  }
  $('#slothAnswerBox').prop("disabled", true);
  $('#slothAnswerBox').css("display","none");
  $('#startButton').html("Next Word");
  $('#startButton').off('click');
  $('#startButton').on('click', function f(e) {
    $('#startButton').prop('disabled', true);
    initSloth();
  });
  $('#startButton').css('display', 'initial');
  $('#timerText').css('display', 'none');
  for (var x=0; x<slothData.length; x++) {
    if ( $.isEmptyObject(slothData[x].auxInfo) ) {
    // not in cardbox
      for(var y=0;y<slothData[x].words.length;y++) {
        wd = document.getElementById(slothData[x].words[y]).parentNode;
        wd.title = "Click to add to cardbox";
        wd.onclick = function () {
          addToCardbox(this.firstChild.id);
        };
        $(wd).toggleClass('slothNotInBox',1000);
      }
    }
    else {
      var allCorrect = true;
      for(var y=0;y<slothData[x].words.length;y++)
        allCorrect = allCorrect && (document.getElementById(slothData[x].words[y]).style.visibility == 'visible');
      if (allCorrect && slothData[x].auxInfo.difficulty == 4) {
      // correct and due in future
      //      console.log(slothData[x].alpha + " is correct and due in the future.");
      //      d = { user: userid, question: slothData[x].alpha, correct: true, cardbox: slothData[x].auxInfo.cardbox-1, incrementQ: false };
      //      slothSubmitQuestion(d);
        for(var y=0;y<slothData[x].words.length;y++) {
          wd = document.getElementById(slothData[x].words[y]).parentNode;
          wd.title = "Not due";
        }
      }
      else if (allCorrect && slothData[x].auxInfo.difficulty != 4) {
      // correct and due now
      //      console.log(slothData[x].alpha + " is correct and due now.");
        d = {question: slothData[x].alpha, correct: true, cardbox: slothData[x].auxInfo.cardbox, incrementQ: true };
        slothSubmitQuestion(d);
        for(var y=0;y<slothData[x].words.length;y++) {
          var nextCardbox = slothData[x].auxInfo.cardbox + 1;
          wd = document.getElementById(slothData[x].words[y]).parentNode;
          wd.title = "Moved up to cardbox " + nextCardbox;
          $(wd).addClass("highlightRow");
        }
      }
      else { // not correct
        if (slothData[x].alpha == slothQuestion) {
          d = {question: slothData[x].alpha, correct: false, cardbox: slothData[x].auxInfo.cardbox, incrementQ: true };
          slothSubmitQuestion(d);
          for(var y=0;y<slothData[x].words.length;y++) {
            wd = document.getElementById(slothData[x].words[y]).parentNode;
            wd.title = "Moved to cardbox 0";
            wd.style = "background:#222;";
          }

        }
      }
    }
    }  // end for loop
  var tds = document.querySelectorAll('#answerField td');
  var spanChild;
  console.log("number of tds:"+tds.length);
  for (var x=0; x<tds.length; x++) {
    spanChild = tds[x].firstChild;
    console.log(spanChild.id+" Visibility:"+spanChild.style.visibility)
    if (spanChild.style.visibility!=='visible'){
      //console.log ("Hidden Id: "+spanChild.id);
      $(spanChild).css('color','#933');
      $(spanChild).css('visibility','visible');
      $(spanChild).css('fontWeight','normal');
      $(spanChild).css('fontStyle','italic');
    }
  }
}

function updateSlothTimer() {
  var min = Math.floor(slothTimerCount/60);
  var sec = slothTimerCount%60;
  $('#timerText').html(min + ":" + (sec<10?'0'+sec:sec));
  if (slothTimerCount == 0) {
    clearInterval(slothTimer);
    slothTimerExpire();
  }
  else slothTimerCount--;
}


function submitSlothAnswer () {
  var answer = $.trim($('#slothAnswerBox').val().toUpperCase());
  $('#slothAnswerBox').val("");
  var e = document.getElementById(answer);
  if (e) {
    var pare = e.parentNode.id;
    if (e.style.visibility == 'visible'){
      $('#slothAnswerBox').toggleClass('flashTypo',300).toggleClass('flashTypo',300);
      $('#'+pare).toggleClass('flashTypo',500).toggleClass('flashTypo',500);
    }
    else {
      $('#slothAnswerBox').toggleClass('slothFlashCorrect',300).toggleClass('slothFlashCorrect',300);
      e.style.visibility = 'visible';
      $('#'+pare).toggleClass('slothFlashCorrect',500).toggleClass('slothCorrect',1500);
      slothScore += Math.pow(answer.length, 2);
      document.getElementById('answerField').scrollTop = 0;
      var elem = $("#slothTable"+answer.length);
      var offset = (elem.offset().top - elem.parent().offset().top + 20)+ (elem.outerHeight() - elem.parent().height()  - 20)  ;
      var topPos = $('#slothTable'+answer.length).position().top;
      document.getElementById('answerField').scrollTop = offset;
      var progress = Math.round((slothScore/totalScore)*100) + '%';
      $('#progressBar').attr('aria-valuenow', progress).css('width',progress);
      $('#progressLabel').html(progress);
      if (slothScore == totalScore) {
        clearInterval(slothTimer);
        slothTimerExpire();
      }
    }
    }
  else {
    if (isSubAlpha(toAlpha(answer), slothQuestion))
      $('#slothAnswerBox').toggleClass('flashWrong',300).toggleClass('flashWrong',300);
    else
      $('#slothAnswerBox').toggleClass('flashTypo',300).toggleClass('flashTypo',300);
    }
    $('#slothAnswerBox').focus();
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

function submitSlothChat() {
  var x = 'initSloth("' + slothQuestion + '")';
  var link = "<a href='#' onclick='" + x + "'>Click here</a>";
  submitChat(username + " has completed " + slothQuestion + " on Subword Sloth with a score of " + $('#progressLabel').html() + ". " + link + " to try and beat it!", true, 1); // system userid for Subword Sloth is 1
}

function addToCardbox(word) {
  var alpha = toAlpha(word);
  if (confirm("Click OK to add " + alpha + " to your cardbox.")) {
    var d = {user: userid, question: alpha};
    $.ajax({
      type: "POST",
      data: JSON.stringify(d),
      url: "addQuestionToCardbox.py",
      success: addedToCardbox,
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error adding " + alpha + ", status = " + textStatus + " error: " + errorThrown);
      }
    });
  }
}

function addedToCardbox(response, responseStatus) {
  if (response[1].status == "success") {
    var alphaAdded = response[0].question;
    for (var x=0; x<slothData.length; x++) {
      if(slothData[x].alpha == alphaAdded) {
        for(var y=0;y<slothData[x].words.length;y++) {
          wd = document.getElementById(slothData[x].words[y]).parentNode;
          wd.removeAttribute("onclick");
          $(wd).removeClass("steelRowedInv").addClass("blueRowed");
          wd.title = "Added to Cardbox";
        }
      }
    }
  }
   else alert("Error adding " + response[0].question + " to Cardbox. Please try again.");
}
