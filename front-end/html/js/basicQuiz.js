
function startQuiz() {
    initGlobalsQuiz();
    initUIQuiz();

    /** AJaX call to get first question **/
    var d = { cardbox: localStorage.cardboxCurrent };
    $.ajax({
        type: "POST",
        data: JSON.stringify(d),
        url: "newQuiz",
        beforeSend: function(){$("#quizConnect").html('<img src="images/ajaxLoad.gif" style="height:0.8em"> Initializing Quiz...');},
        success: function(response, responseStatus) {
        gUpdateCardboxScores(response, 0);
        $("#quizConnect").html('');
        getQuestion();
    },
        error: function(jqXHR, textStatus, errorThrown) {
      gNetworkErrorReport (jqXHR.status, '#quizConnect');
            console.log("Error, status = " + textStatus + " error: " + errorThrown);
            getQuestion();
        }
    });
}

function tempQuizNumberHide(){
  if (typeof(localStorage.showAnswersQuiz)=='undefined'){localStorage.setItem('showAnswers','1');}
  else {
    if (localStorage.showAnswersQuiz=='0'){$('#answerAmount').css({'color':'rgba(26,26,26,0)'});}
    else {$('#answerAmount').css({'color':'rgba(26,26,26,1)'});}
  }
}

function initGlobalsQuiz() {
    alphagram = "";
    fullAlpha = "";
    totalAnswers = 0;
    textFocus = true;
    incorrectAnswerFlag = false;
    incrementQ = true;
    correctProgress = 0;
    correctState = 0;
    correctPercent = 0.0;
    hintQuantity = 0;
  if (typeof localStorage.cardboxCurrent=='undefined'){localStorage.setItem('cardboxCurrent','0');}
  if (typeof localStorage.cardboxSent=='undefined'){localStorage.setItem('cardboxSent',false);}
}

function initUIQuiz() {

  if (!document.getElementById("pan_1_a")) {
    panelData = {
          "contentClass" : "panelContentDefault",
          "title": "Basic Quiz",
          "minimizeObject": 'content_pan_1_a',
          "variant": "a",
          "closeButton": false,
          "refreshButton" : false,
          "style" : 'Dark',
          "tooltip": "Occasional bug in tile window that pushes tiles to new line if many hooks."
          };
    generatePanel(1,panelData,"leftArea");

    /** Generate ordered DOM for Quiz [localName, type, classes, id, parent, innerHTML] **/
    createElemArray([
          ['a0','div','quizContent','quizContent','content_pan_1_a',''],
    /*0*/           ['a','div','quizAlphaSuper','alphaSuper','quizContent',''],
                    ['a1','div','quizAlphaContain','alphaContainer','a',''],
                    ['a1a','div','quizAlphaLeft','leftHook','a1',''],
                    ['a1b','div','quizAlpha','alphagram','a1',''],
                    ['a1c','div','quizAlphaRight','rightHook','a1',''],
          ['a2','div','quizConnection','quizConnect','quizContent',''],
                    ['b','div','quizAnswerRegion','','quizContent',''],
                    ['b1','button','btn quizButton quizButtonCorrect highlightRow','markAsCorrect','b','<span class="glyphicon glyphicon-ok"></span>'],
                    ['b2','button','btn quizButton quizButtonNext blueRowed','nextQuestion','b','<span class="glyphicon glyphicon-arrow-right"></span>'],
                    ['b3','button','btn quizButton quizButtonIncorrect redRowed','markAsIncorrect','b','<span class="glyphicon glyphicon-remove"></span>'],
                    ['b4','div','quizAnswerContain','answerContainer','b',''],
     /*10*/         ['b4a','div','quizAnswerNumber noselect','answerAmount','b4',''],
                    ['b4b','input','quizAnswerBox','answerBox','b4',''],
                    ['c','table','quizSessionTable','sessionInfo','quizContent',''],
                    ['c1','thead','','sessionHeader','c',''],
                    ['c1a','th','','sessionHeaderCell1','c1','questions'],
                    ['c1b','th','quizSessionTableHCardbox','sessionHeaderCell2','c1','cardbox'],
                    ['c1c','th','quizSessionTableHDue','sessionHeaderCell3','c1','due date'],
                    ['c1d','th','','sessionHeaderCell4','c1','score'],
                    ['c1e','th','quizSessionTableHCorrect','sessionHeaderCell5','c1','correct'],
                    ['c2','tr','','sessionContent','c',''],
    /*20*/          ['c2a','td','','sessionContentCell1','c2','<span id="questionsComplete">' + localStorage.qQCounter + '</span>'],
                    ['c2b','td','','sessionContentCell2','c2','<span id="cardboxNumber"></span>'],
                    ['c2c','td','','sessionContentCell3','c2','<span id="dueDate"></span>'],
                    ['c2d','td','','sessionContentCell4','c2','<span id="sessionScore">' + localStorage.qQAlpha + '</span>'],
                    ['c2e','td','','sessionContentCell5','c2','<span id="correctPercent">' + correctPercent.toFixed(2) + '%' + '</span>'],
                    ['d','div','btn-group btn-group-justified quizButtonRow','buttonRow','quizContent',''],
          ['d1','div','btn-group','','d',''],
                    ['d1a','button','btn btn-default quizSubButton silverRowed','shuffleButton','d1','<span class="glyphicon glyphicon-random"></span>'],
          ['d2','div','btn-group','','d',''],
                    ['d2a','button','btn btn-default quizSubButton silverRowed','slothButton','d2','<img id="imgSloth" src="images/sloth.png" style="width:28px;height:28px;margin:auto auto;padding:0px;">'],
                    ['d3','div','btn-group','','d',''],
            ['d3a','button','btn btn-default quizSubButton silverRowed','skipButton','d3','<span class="glyphicon glyphicon-step-forward"></span>'],
          ['d4','div','btn-group','','d',''],
                    ['d4a','button','btn btn-default quizSubButton silverRowed','advancedButton','d4','<span class="glyphicon glyphicon-menu-hamburger"></span>'],
                    ['e','div','quizAdvancedBox','advancedBox','quizContent',''],
          ['e1','div','btn-group btn-group-justified','','e',''],
          ['e1a','div','btn-group','','e1',''],
                    ['e1a1','button','btn btn-default quizAdvancedButton silverRowed','counterReset','e1a','Reset #'],
          ['e1b','div','btn-group','','e1',''],
                    ['e1b1','button','btn btn-default quizAdvancedButton silverRowed','addHint','e1b','Hint'],
          ['e1c','div','btn-group','','e1',''],
                    ['e1c1','button','btn btn-default quizAdvancedButton silverRowed','showQuestionStats','e1c','Stats'],
          ['e1d', 'div', 'btn-group quizBlankWrapper','','e1',''],
                    ['e1d1', 'div', 'quizBlankCheckbox', 'blankQuizBox', 'e1d', ''],
                    ['e1d1a', 'input', '', 'blankQuizCheck', 'e1d1', ''],
                    ['e1d1b', 'label', 'noselect', 'blankQuizLabel', 'e1d1', '?'],
                    ['f','table','wordTable','correctAnswers','quizContent',''],
                    ['g','div','wordTableWrong','wrongAnswers','quizContent','']
                    ]);

    /** Additional initialisation **/
    document.getElementById('markAsCorrect').title= "Mark as Correct";
    document.getElementById('markAsCorrect').onclick ='';
    document.getElementById('nextQuestion').style.display = 'none';
    document.getElementById('nextQuestion').title = "Next Question";
    document.getElementById('markAsIncorrect').title = "Mark as Incorrect";
    document.getElementById('markAsIncorrect').onclick='';
    document.getElementById('answerBox').type = 'text';
    document.getElementById('answerBox').maxLength = '15';
    document.getElementById('sessionHeaderCell4').title = '% of questions answered correctly this session.';
    document.getElementById('blankQuizBox').title = 'Blank Quiz';
    document.getElementById('blankQuizCheck').type = 'checkbox';
    document.getElementById('blankQuizCheck').value = '1';
  document.getElementById('blankQuizCheck').spellcheck = 'false';
    document.getElementById('blankQuizLabel').htmlFor = 'blankQuizCheck';
  tempQuizNumberHide();
    $('#blankQuizCheck').change(function() {getQuestion();});
    var buttonId=['shuffleButton','slothButton','skipButton','advancedButton','counterReset','addHint', 'showQuestionStats'];
    var buttonTitle=['Shuffle Tiles','Sloth This Word!','Skip Word','Advanced...','Clear Questions, Score and Correct % for this device.','See one more letter of solution(s).', 'Show stats and change cardbox for this question'];
    for (var i=0;i<buttonTitle.length;i++){
        document.getElementById(buttonId[i]).title=buttonTitle[i];
    }
    initClickEventsQuiz();
    initKeyEventsQuiz();
  }
    if ((Number(localStorage.gAlphaDisplay))==1) {
        $("alphagramLabel").css({'font-size':'2.8em','line-height':'0em','padding-top':'0.8em','padding-bottom':'0.8em;'});
    }

}

function initClickEventsQuiz(){
    $('#addHint').click(function() {
        hintQuantity++;var data=[];
        withHints(wordData, allAnswers, hintQuantity, document.getElementById('correctAnswers'),'');
        if (textFocus)
           $('#answerBox').focus();
    });
    $('#advancedButton').click(function(){$('#advancedBox').toggle(400);});
    $('#counterReset').click(function() {
        localStorage.qQCounter = '0';
        localStorage.qQCorrect = '0';
        localStorage.qQAlpha = '0';
        $('#questionsComplete').html(Number(localStorage.qQCounter));
        $('#sessionScore').html(Number(localStorage.qQAlpha));
        $('#correctPercent').html('0.00%');
    });
    $('#markAsCorrect').on('click', null , true, submitQuestion);
    $('#markAsIncorrect').click(function(){submitQuestion(false);});
    $('#nextQuestion').click(function() {textFocus = false;getQuestion();});
    $('#showQuestionStats').click(function() {showAlphaStats(alphagram);});
    $('#shuffleButton').click(function() {
        if ((Number(localStorage.gAlphaDisplay))===0) {stringToTiles(alphaShuffle(alphagram), '#alphagram');}
        else {$('#alphagram').html(alphaShuffle(alphagram));}
    });
    $('#slothButton').click(function() {initSloth(alphagram);});
    $('#skipButton').click(skipQuestion);
}

function initKeyEventsQuiz(){
  //window.addEventListener('resize', function(event){displayUserArray(usersArray)});
    answerBox.addEventListener("keypress", function(e) {if (e.which === 13) {$(this).attr("disabled", "disabled");submitAnswer();}});
    $('#answerBox').keypress("m",function(e) {if(e.ctrlKey) $(this).val("");});
    $('#answerBox').keypress(function(e) {if (e.which == 32) {if (quizState !== "finished"){$(this).attr("disabled", "disabled");submitAnswer();}}});
}

function getQuestion() {
    var url;
    var callback;
    $('#nextQuestion').off("click");
  if (localStorage.cardboxSent=='false'){var d= {numQuestions: 1, user:userid};}
  else {var d = {numQuestions: 1,user: userid,cardbox: localStorage.cardboxCurrent};}
    if (document.getElementById('blankQuizCheck').checked) {
       url = "getBlankQuestion.py";
       callback = initBlankQuestion;
       }
    else {
       url = "getQuestion.py";
       callback = initQuestionData;
       }
    $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(d),
    beforeSend: function (){
      delayTimer=setTimeout(function(){$("#quizConnect").html('<img src="images/ajaxLoad.gif" style="height:0.8em"> Loading Next Question...');},300);
    },
    complete: function (){if (typeof scrollTimer !== 'undefined' && scrollTimer !== null ){
                clearInterval(scrollTimer);}
                clearTimeout(delayTimer);},
        success: callback,
        error: function(jqXHR, textStatus, errorThrown) {
      gNetworkErrorReport (jqXHR.status, '#quizConnect');
            console.log("Error, status = " + textStatus + " error: " + errorThrown);
            stopScrollTimer();
            $('#answerBox').removeAttr("disabled", "disabled");
            $('#nextQuestion').click(function() {
                textFocus = false;
                getQuestion();
            });
        }
    });
    correctState = 0;
}

function resizeHookFontQuiz () {
    var hookFont = $('#alphaSuper').width()/18;
    if (hookFont>30){hookFont=30;}
    $('#leftHook').css({'font-size':hookFont+'px','line-height':'0.7'});
    $('#rightHook').css({'font-size':hookFont+'px','line-height':'0.7'});
}
function resetHookWidthsQuiz () {
    hookWidth = 0;
        $('#rightHook').width(0);
        $('#leftHook').width(0);
        resizeHookFontQuiz();
    if (typeof allAnswers!=="undefined"){
      for (i=0;i<allAnswers.length;i++){
        $('#leftHook').html(addLineBreaks(eval('wordData.'+allAnswers[i]+'[0]'), 7));
        var x=$('#leftHook').width();
        if (x>hookWidth){hookWidth=x;}
        $('#leftHook').html(addLineBreaks(eval('wordData.'+allAnswers[i]+'[1]'), 7));
        var x=$('#leftHook').width();
        if (x>hookWidth){hookWidth=x;}
      }
    }
        $('#rightHook').width(hookWidth);
        $('#leftHook').width(hookWidth);
        $('#leftHook').html('');
        $('#rightHook').html('');

}

function prepareNewWords() {
            var d = { userid: userid };
            $.ajax({
                type: "POST",
                url: "prepareNewWords.py",
                data: JSON.stringify(d),
                success: function(response, responseStatus) {
                    console.log("Next Added table prepared.");
                    console.log(response);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("Error preparing Next Added");
                }
            });

}

function initBlankQuestion(response, responseStatus) {
    console.log(response);
    var r = response[0];
    // if we finished the previous question and the new alpha is the same as the old
    // we have a lag problem -- need to wait and get question again
    if (r.fullAlpha == fullAlpha && quizState == "finished") {
        setTimeout(getQuestion, 700);
        // the previous question took too long
        // to submit, so we need to wait to get a fresh one
        $('#answerBox').val("Loading Question ...");
    } else {
        wordData = r.words;
        answers = Object.keys(wordData);
        allAnswers = Object.keys(wordData);
        alphagram = r.question + "?";
        fullAlpha = r.fullAlpha;

        aux = r.answers;
    for (var x=0;x<aux.length;x++){
      if (aux[x].alpha==fullAlpha) {
        if (Number(localStorage.cardboxCurrent)!==aux[x].auxInfo.cardbox){
          localStorage.cardboxSent='false';
          localStorage.cardboxCurrent=aux[x].auxInfo.cardbox;
          if ($('#pan_4').length>0){
            cardboxHighlightAction(aux[x].auxInfo.cardbox, false);
            showCardboxStats();
          }
        }
      }
    }
   }

        if (r.getFromStudyOrder) {
           prepareNewWords();
        }
// check here to see if there's some lag and the question is a duplicate
        displayQuestion();
    }

function initQuestionData(response, responseStatus) {
    var r = response[0];
    var question = r.questions;
    wordData = r.words;
    aux = r.aux[0];
    if (r.getFromStudyOrder) {
        var d = {
            userid: userid
        };
        $.ajax({
            type: "POST",
            url: "prepareNewWords.py",
            data: JSON.stringify(d),
            success: function(response, responseStatus) {
                console.log("Next Added table prepared.");
                console.log(response);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Error preparing Next Added");
            }
        });
    }
    if (Object.keys(question)[0] == alphagram && quizState == "finished") {
        $("#quizConnect").html('<img src="images/ajaxLoad.gif" style="height:0.8em"> Awaiting Server Response...');
        setTimeout(getQuestion, 700);
        // the previous question took too long
        // to submit, so we need to wait to get a fresh one
    } else {
        alphagram = Object.keys(question)[0];
        answers = eval("question." + alphagram);
        allAnswers = answers.slice();
        displayQuestion();
    }
}

function displayQuestion() {
  // Requires globals to be set up:
  // alphagram
  // answers - list of answers
  // allAnswers - list of answers
  // aux - list of aux data dicts
  // for blank quiz aux contains list: [ alpha: ABCDE, auxInfo: {aux stuff}, words: [ words ] ]
  // wordData - { word: <hook data>, word: <hook data> }
   stopScrollTimer();
   resetHookWidthsQuiz();
   correctProgress = 0;
   hintQuantity = 0;
   document.getElementById('shuffleButton').disabled = false;
   document.getElementById('skipButton').disabled = false;
   if (hintQuantity+2>=alphagram.length){document.getElementById('addHint').disabled = true;}
   else {document.getElementById('addHint').disabled = false;}
   if (alphagram.length>6 && !document.getElementById('blankQuizCheck').checked){
       document.getElementById('slothButton').disabled = false;
       $('#imgSloth').css('opacity', '1');
       document.getElementById('slothButton').title = 'Sloth this word!';
   }
   else {document.getElementById('slothButton').disabled = true;
         $('#imgSloth').css('opacity', '0.3');
         if(document.getElementById('blankQuizCheck').checked) {
            document.getElementById('slothButton').title = 'Sloths cannot handle blanks.'; }
         else {
            document.getElementById('slothButton').title = 'Alphagram is too short for sloths!'; }
        }
  $('#alphaSuper').removeClass('redRowed incorrect');
  $('#alphaSuper').removeClass('highlightRowInv correct');
   document.getElementById('nextQuestion').disabled = false;
   if ((Number(localStorage.gAlphaDisplay))===0) {
      stringToTiles(alphaSortMethod(alphagram, Number(localStorage.gAlphaSortInput)), '#alphagram');



   } else {
      $('#alphagram').html(alphaSortMethod(alphagram, Number(localStorage.gAlphaSortInput)));

   }
   $('#alphaSuper').addClass('blueRowed unanswered');
   $('#quizConnect').html("");
   $('#leftHook').html("");
   $('#rightHook').html("");
   $('#correctAnswers').html("");
   $('#wrongAnswers').html("");
   $('#answerBox').val("");
   $('#answerBox').removeAttr("disabled", "disabled");
   $('#nextQuestion').click(function() {
       textFocus = false;
       document.getElementById('nextQuestion').disabled = true;
       getQuestion();
   });
   if (textFocus)
       $('#answerBox').focus();
   textFocus = true;
   if (document.getElementById('blankQuizCheck').checked) {
     $('#dueDate').html("");
     $('#cardboxNumber').html("");
   } else {
     var dueDate = new Date(aux.nextScheduled * 1000);
     $('#dueDate').html(gFormatDateForDisplay(dueDate));
     $('#cardboxNumber').html(aux.cardbox); }
   if (localStorage.qQCounter > 0)
       correctPercent = (localStorage.qQCorrect / localStorage.qQCounter) * 100;
   $('#correctPercent').html(correctPercent.toFixed(2) + '%');
   totalAnswers = Object.keys(wordData).length;
   $('#answerAmount').html('<b>Answers&#58;</b> ' + correctProgress + '  / ' + totalAnswers);
   $('#nextQuestion').hide();
   $('#markAsCorrect').show();
   $('#markAsIncorrect').show();
   if (document.getElementById('blankQuizCheck').checked) {
     $('#markAsCorrect').prop("disabled", true);
     $('#markAsIncorrect').prop("disabled", true);
   } else {
     $('#markAsCorrect').prop("disabled", false);
     $('#markAsIncorrect').prop("disabled", false);  }
   if(document.getElementById("currentAlpha")) { // if the Alphagram Stats is up
     showAlphaStats(alphagram); }
   quizState = "started";
   incorrectAnswerFlag = false;
   incrementQ = true;
   $('#content_pan_1_a').css("visibility","visible");
  if (Number(localStorage.cardboxCurrent)!==aux.cardbox){
    localStorage.cardboxSent='false';
    localStorage.cardboxCurrent=aux.cardbox;
    if ($('#pan_4').length>0){
       cardboxHighlightAction(aux.cardbox, false);
       showCardboxStats();
    }
   }
}

function submitAnswer() {

    if (quizState == "finished") {
        document.getElementById('nextQuestion').disabled = true;
        getQuestion();
    }
    else {
        answer = $.trim($('#answerBox').val().toUpperCase());
        if (answer === "") {
           if (document.getElementById('blankQuizCheck').checked) {
              submitBlankQuestion(); }
           else  {
              submitQuestion(false); }
        }
        else {
            idx = $.inArray(answer, answers);
            if (idx > -1) {
                answers.splice(idx, 1);
                correctProgress++;
                $('#answerAmount').html('<b>Answers&#58;</b> ' + correctProgress + ' / ' + totalAnswers);
                var data = eval("wordData." + answer);
                var cellContent = getTableLineData(answer, data);
                displayAnswer(answer, cellContent);
                if (answers.length === 0) {
                   if(document.getElementById('blankQuizCheck').checked ) {
                      submitBlankQuestion();
                   } else {
                    submitQuestion(!incorrectAnswerFlag);} }
            }
            else {
                console.log("Incorrect Answer");
                if ($.inArray(answer, allAnswers) >= 0 || toAlpha(answer) != alphagram)
                    $('#answerBox').addClass('flashTypo');
                else {
                    $('#answerBox').addClass('flashWrong');
                    incorrectAnswerFlag = true;
                    document.getElementById("wrongAnswers").innerHTML += answer + " ";
                }
                setTimeout(function() {$('#answerBox').removeClass('flashWrong');$('#answerBox').removeClass('flashTypo');}, 1000);
            }
            document.getElementById("answerBox").value = "";
        }
        $('#answerBox').removeAttr("disabled", "disabled");
        $('#answerBox').focus();
    }
}

function adjustAlphaChange(corrected, states) {
    var adjustment = [[0 - aux.cardbox, 0 - aux.cardbox - 1], [1, (aux.cardbox + 1)]];
    var a = (corrected) ? 1 : 0;
    localStorage.qQAlpha = Number(localStorage.qQAlpha) + adjustment[a][states];
}

function skipQuestion() {
    document.getElementById('skipButton').disabled = true;
    var d = {user: userid, question: alphagram};
    $.ajax({ type: "POST",
             url: "delayQuestion.py",
             data: JSON.stringify(d),
            success: function(response, responseStatus) {
                      console.log(alphagram + " delayed. ");
                      getQuestion(); },
         error: function(jqXHR, textStatus, errorThrown) {
            document.getElementById('skipButton').disabled = false;
            console.log("Error: question " + alphagram + " could not be updated. " + errorThrown + " " + textStatus);
             }});
}

function submitBlankQuestion() {

   quizState = "finished";
   unhighlightAnswerTable();
   startScrollTimer();
   // global answers has list of unanswered words
   var wrongAlphas = [];
   for(var x=0;x<answers.length;x++) {
     var a = toAlpha(answers[x]);
     if (wrongAlphas.indexOf(a) == -1) // eliminate duplicate alphagrams
        wrongAlphas.push(a);
   }
   var allAlphas = [];
   for(x=0;x<aux.length;x++) {
      a = aux[x].alpha;
      var notInCardbox = $.isEmptyObject(aux[x].auxInfo);
      var correct = (wrongAlphas.indexOf(a) == -1);
      if (!notInCardbox) {
         var currentCardbox = aux[x].auxInfo.cardbox;
         var dueNow = (aux[x].auxInfo.difficulty < 3); }

      for(var i=0;i<aux[x].words.length;i++) {
         var word = aux[x].words[i];
         var data = getTableLineData(word, eval("wordData." + word));
         if (!getRowFromWord(word))
            displayAnswerRow(word, data, false);
         var row = getRowFromWord(word);
         if (notInCardbox) {
            row.className += " wordTableHighlightNotInCardbox";
            row.title = "Click to add to cardbox";
            row.onclick = function() { addToCardboxFromQuiz(getWordFromRow(this)); };
         } else if (!correct) {
            row.className += " wordTableHighlightWrong2";
            row.title = "Incorrect - Moved to Cardbox 0";
            row.onclick = function() {
                var alpha = toAlpha(getWordFromRow(this));
                markAsCorrectFromQuiz(alpha); };
         } else if (dueNow) {
            row.className += " wordTableHighlightCorrect";
            row.title = "Correct - Moved to Cardbox " + (currentCardbox+1);
            row.onclick = function() {
                var alpha = toAlpha(getWordFromRow(this));
                markAsIncorrectFromQuiz(alpha); };
         } else {
            row.className += " wordTableHighlightNotDue";
            row.title = "Not Due";
            row.onclick = function() {
                var alpha = toAlpha(getWordFromRow(this));
                markAsIncorrectFromQuiz(alpha); };
         }
      }
      if (notInCardbox)
         continue;
      if (wrongAlphas.indexOf(a) > -1) {
         var d = { user: userid,
              question: a,
              correct: false,
              cardbox: currentCardbox,
              incrementQ: true };
         slothSubmitQuestion(d);
         localStorage.qQCounter++;
         localStorage.qQAlpha -= currentCardbox;
      } else {
         if (dueNow) {
            var d = { user: userid,
                  question: a,
                   correct: true,
                   cardbox: currentCardbox,
                incrementQ: true };
             slothSubmitQuestion(d);
             localStorage.qQCorrect++;
             localStorage.qQCounter++;
             localStorage.qQAlpha++;

         }
       }
    }
    correctPercent = (localStorage.qQCorrect / localStorage.qQCounter) * 100;
    $('#correctPercent').html(correctPercent.toFixed(2) + '%');
    $('#questionsComplete').html(localStorage.qQCounter);
    $('#sessionScore').html(localStorage.qQAlpha);
}

function submitQuestion(correct) {
    document.getElementById('shuffleButton').disabled = true;
    document.getElementById('skipButton').disabled = true;
    var failFlag = false;
    var d = {
        "question": alphagram,
        "correct": correct,
        "cardbox": aux.cardbox,
        "incrementQ": incrementQ
    };
    $.ajax({
        type: "POST",
        url: "submitQuestion",
        data: JSON.stringify(d),
        success: function(response, responseStatus) {
          console.log("Question " + alphagram + " updated in cardbox.");
          if (quizState == "finished") {
            var aux = response.aux;
            var dueDate = new Date(aux.nextScheduled * 1000);
            $('#dueDate').html(gFormatDateForDisplay(dueDate));
            $('#cardboxNumber').html(aux.cardbox); }
          if ((response.qAnswered !== null ) ) {
            if (incrementQ) {
              gCheckMilestones(response.qAnswered);
              gUpdateCardboxScores(response);
              incrementQ = false;
              }
          }
          else { failFlag = true; }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("Error: question " + alphagram + " could not be updated.");
            failFlag = true;
        }
    });
    if (failFlag) {
        failFlag = false;
        submitQuestion(correct);
    }
    if (correct) {
        //console.log("Correct Question");
    $('#alphaSuper').removeClass('redRowed incorrect');
    $('#alphaSuper').removeClass('blueRowed unanswered');
    $('#alphaSuper').addClass('highlightRowInv correct');

        $('#markAsCorrect').hide();
        $('#markAsIncorrect').show();
        $('#nextQuestion').show();
        $('#nextQuestion').css('float', 'left');
        if (correctState === 0) {
            if (incrementQ) {
                localStorage.qQCounter++;
            }
        }
        adjustAlphaChange(correct, correctState);
        correctState = 1;
        localStorage.qQCorrect++;
    }
    else {
        //console.log("Incorrect Question");
    $('#alphaSuper').removeClass('blueRowed unanswered');
    $('#alphaSuper').removeClass('highlightRowInv correct');
    $('#alphaSuper').addClass('redRowed incorrect');
        $('#markAsIncorrect').hide();
        $('#markAsCorrect').show();
        $('#nextQuestion').show();
        $('#nextQuestion').css('float', 'right');
        if (correctState === 0) {
            if (incrementQ) {
                localStorage.qQCounter++;
            }
        } else {
            localStorage.qQCorrect--;
        }
        adjustAlphaChange(correct, correctState);
        correctState = 1;
    }
    quizState = "finished";
    correctPercent = (localStorage.qQCorrect / localStorage.qQCounter) * 100;
    $('#correctPercent').html(correctPercent.toFixed(2) + '%');
    $('#questionsComplete').html(localStorage.qQCounter);
    $('#sessionScore').html(localStorage.qQAlpha);
    document.getElementById('addHint').disabled = true;

    for (var x = 0; x < answers.length; x++) {
        var data = eval("wordData." + answers[x]);
        var cellContent = getTableLineData(answers[x], data);
        displayAnswer(answers[x], cellContent);
    }
    answers = [];
    var temp = getWordWithHook(Object.keys(wordData)[0]);
    var maxWidths = hookWidth;
    $('#rightHook').width(hookWidth);
    $('#leftHook').width(hookWidth);
    temp[0] = addLineBreaks(temp[0], 7);
    temp[2] = addLineBreaks(temp[2], 7);
    if ((Number(localStorage.gAlphaDisplay))===0) {stringToTiles(temp[1], '#alphagram');}
    else {$('#alphagram').html(temp[1]);}
    $('#leftHook').html(temp[0]);
    $('#rightHook').html(temp[2]);
    startScrollTimer();
    $('#nextQuestion').show();
}

function findPosInTable(el,answer,sortCol){
    if (el.rows.length > 0) {
        for (var z = 0; z < el.rows.length; z++) {
            if (answer.toUpperCase() < el.rows[z].cells[sortCol].innerHTML) {return z;}
         }
    } return -1;
}

function getRowFromWord(word) {
    var ANSWER_COLUMN = 2;
    var ANSWER_TABLE = document.getElementById('correctAnswers');
    if (ANSWER_TABLE.rows.length > 0) {
        for (var z = 0; z < ANSWER_TABLE.rows.length; z++) {
            if (word == stripHTML(ANSWER_TABLE.rows[z].cells[ANSWER_COLUMN].innerHTML)) {return ANSWER_TABLE.rows[z];}
        }
    }
    return null;
}

function stripHTML (str) {
   return str.replace(/<[^>]*>/g, '');
}

function getWordFromRow(row) {
   var ANSWER_COLUMN = 2;
   return stripHTML(row.cells[ANSWER_COLUMN].innerHTML);
}

function unhighlightAnswerTable() {
   var ANSWER_TABLE = document.getElementById('correctAnswers');
   for(var x=0; x<ANSWER_TABLE.rows.length; x++) {
      var r = ANSWER_TABLE.rows[x];
      if (r.classList.contains('wordTableHighlight'))
         {r.classList.remove('wordTableHighlight');}
   }
}

function getHints(a, h){var x = a.length;var z = [];for (var i=0;i<x;i++){z[i]= a[i].substr(0, h);for (var j=h;j<a[i].length;j++){z[i]+='_';}} return z;}

function withHints (data,a,h,obj,ans){
    if (hintQuantity+2>=alphagram.length){document.getElementById('addHint').disabled = true;}
    var hints = getHints(a,h);
    var objContent = [];
    var tableLines =[];
    for (var i=0;i<a.length;i++){
        tableLines[i]=['','',hints[i],'',"",''];
    }

    for (var i=0;i<obj.rows.length;i++){
        objContent[i]=obj.rows[i].cells[2].innerHTML;
        if (obj.rows[i].classList.contains('wordTableHighlight'))
            {obj.rows[i].classList.remove('wordTableHighlight');}
        }
    if (ans!=="") {objContent.push(ans);}
    for (var i=0;i<a.length;i++){
        var x= $.inArray(a[i],objContent);
        if (x!==-1) {
            var content = eval('data.'+a[i]);
            tableLines[i]= getTableLineData(a[i], content);

        }
    }
    obj.innerHTML="";
    for (var i=0;i<tableLines.length;i++){
        if (ans==tableLines[i][2]) {displayAnswerRow(a[i],tableLines[i],true);}
        else {displayAnswerRow(a[i],tableLines[i], false);}
    }
}

function displayAnswerRow(answer, data, highlight) {
    var highlight = highlight || false;
    //console.log(highlight);
    var cells = [];
    var numCols = 7;
    var x = document.getElementById('correctAnswers');
    if (hintQuantity>0){var row = x.insertRow(-1);}
    else {row = x.insertRow(findPosInTable(x,answer,2));}
    if (hintQuantity===0){
    for (var i = 0; i < x.rows.length; i++) {
        if (x.rows[i].classList.contains('wordTableHighlight'))
        {x.rows[i].classList.remove('wordTableHighlight');}
    }
    }
    if ((quizState !== "finished") && (hintQuantity===0)) {row.className += ' wordTableHighlight';}
    if (quizState == 'finished') {row.className += ' wordTableHighlightWrong';}
    if (highlight) {row.className += ' wordTableHighlight';}
    var cellClass = [" wordTableLeftHook", " wordTableInnerLeft", " wordTableWord", " wordTableInnerRight", " wordTableLexiconSymbol", " wordTableRightHook", " wordTableDefinition"];
    for (var i = 0; i < numCols; i++) {
        cells[i] = row.insertCell(i);
        cells[i].className += cellClass[i];
        cells[i].innerHTML = data[i];
    }
}

function displayAnswer (answer, data){
    if (hintQuantity===0){displayAnswerRow(answer,data);}
    else { withHints(wordData, allAnswers,hintQuantity,document.getElementById('correctAnswers'),answer);}
}

function toAlpha(word) {return word.split('').sort().join('');}

function getWordWithHook(word) {
    var result = [eval("wordData." + word)[0], word, eval("wordData." + word)[1]];
    return result;
}

function isSubAlpha(a1, a2) {
    // is a1 a sub alphagram of a2
    var idx = 0;
    var result = true;
    for (var x = 0; x < a1.length && result; x++) {
        result = result && ((idx = a2.indexOf(a1.charAt(x), idx)) > -1);
        idx++;
    }
    return result;
}

function getDivisor(item, divideBy) {
    if (divideBy !== 0) {
        return Math.ceil(item.length / divideBy);
    }
}

function addLineBreaks(item, divideBy) {
    var divisor = getDivisor(item, divideBy);
    if (divisor > 1) {
        var splitUp = item;
        var splitPos = Math.ceil(item.length / divisor);
        for (var i = 1; i < divisor; i++) {
            splitUp = splitUp.substr(0, (i * splitPos) + (4 * (i - 1))) + '<br>' + splitUp.substr((i * splitPos) + (4 * (i - 1)));
        }
        return splitUp;
    }
    return item;
}

function alphaSortVC(content, type) {
    var consonants = content.replace(/[aeiou]/ig, '');
    var vowels = content.replace(/[bcdfghjklmnpqrstvwxyz]/ig, '');
    if (type === 0) {
        return vowels + consonants;
    }
    else {
        return consonants + vowels;
    }
}

function alphaShuffle(content) {
    return content.split('').sort(function() {
        return 0.5 - Math.random();
    }).join('');
}

function alphaSortMethod(content, type) {
    var output = content;
    switch (type) {
    case 0: output = content; break;
    case 1: output = alphaSortVC(content, 0);break;
    case 2: output = alphaSortVC(content, 1);break;
    case 3: output = alphaShuffle(content);break;
    default:output = content;break;
    }
    return output;
}

function createElemArray(par){

    for (var x=0;x<par.length;x++){
        eval("var "+par[x][0]+"= document.createElement('"+par[x][1]+"')");
        eval(par[x][0]+".className = ' '+par[x][2]");
        eval(par[x][0]+".id = '"+par[x][3]+"'");
        eval(par[x][0]+".innerHTML= '"+par[x][5]+"'");
        eval(par[x][4]+".appendChild("+par[x][0]+")");
    }
}

function stringToTiles(input, parent) {
    var tileLetter = input.split('');
    var tileValue = [1, 3, 3, 2, 1, 4, 2, 4, 1, 8, 5, 1, 3, 1, 1, 3, 10, 1, 1, 1, 1, 4, 4, 8, 4, 10];
    var tiles = [];
    $(parent).html("");

  var totalWidth= $('#alphaSuper').width()-$('#leftHook').width()-$('#rightHook').width();
  //hack to deal with quiz starting as minimized and hence no width with variables we can't get to.
  //Thank you Jquery :p
  if (totalWidth<150) {totalWidth = $('#leftArea').width()*0.66;
  console.log ('widthTest-'+totalWidth);}
     $(parent).css('width',totalWidth);
    var tileContainer = document.createElement('div');
    var x = getActiveUserDimensions ($(parent).width()-(tileLetter.length*4),40,tileLetter.length,1,1,1);
    $(parent).width(tileLetter.length*x.picWidth+ (tileLetter.length*4));
    for (i = 0; i < tileLetter.length; i++) {
        tiles[i] = document.createElement('div');
        tiles[i].className += ' xeraTiles noselect';
        tiles[i].id = 'tile' + i;
        tiles[i].style.width = x.picWidth+'px';
        tiles[i].style.height = tiles[i].style.width;
        tiles[i].style.fontSize = (x.picWidth*(2/3)) + 'px';
        tiles[i].style.lineHeight = (x.picWidth)  + 'px';
        tiles[i].style.verticalAlign = 'middle';
        tiles[i].style.margin = 'middle';
        tiles[i].innerHTML = tileLetter[i];
        tileContainer.appendChild(tiles[i]);
        /** div for tile values, right hand side, bottom relative (width of parent - width of div - 0.2em, value tileValue[String.fromCharCode(tileLetter[i])-64];**/
    }
    $(parent).append(tileContainer);
    $(parent).css('font-size','1em');
    tileContainer.id = 'tileContainer';
    $ ("#tileContainer").css('vertical-align','middle');
     $( function() {
        $( "#tileContainer" ).sortable(
        {placeholder: 'quizPlaceholder', tolerance: 'touch'});
        $( "#tileContainer" ).sortable( "option", "disabled", false );
        $( "#tileContainer" ).disableSelection();
       } );

}

function getTableLineData(word, auxWordData) {
// auxWordData is the list [ front hooks, back hooks, definition, [frontDot, backDot], lexiconSymbol ]
   if(document.getElementById('blankQuizCheck') && document.getElementById('blankQuizCheck').checked ) {
      var givenAlpha = alphagram.replace('?', '');
      var blankLetter = word;
      var i = givenAlpha.length;
      while(i--) {
         blankLetter = blankLetter.replace(givenAlpha.charAt(i), "");
      }
      word = word.replace(blankLetter, "<span style='color: red'>" + blankLetter + "</span>");
   }

   // make definitions clickable
   var definition = " " + auxWordData[2]; // hack so my regexp works
   var inlineWordsExp = new RegExp('[A-Z]{4,}', 'g');
   var inlineWords = auxWordData[2].match(inlineWordsExp);
   if (inlineWords)
   for (var i=0;i<inlineWords.length;i++) {
       var r = new RegExp('([^A-Z])(' + inlineWords[i] + ')([^A-Z])');
       definition = definition.replace(r, '$1<span onclick="showAlphaStats(\''+toAlpha(inlineWords[i])+'\')">$2</span>$3');
   }

   return [auxWordData[0], (auxWordData[3][0] ? dot : ""), word, (auxWordData[3][1] ? dot : ""), (auxWordData[4]? auxWordData[4]:"") , auxWordData[1], definition];

}
function startScrollTimer() {
// scrollTimer is a global
    var counter = 0;
    scrollTimerInstance(counter);
    counter++;
    stopScrollTimer();
    scrollTimer = setInterval(function() {
       scrollTimerInstance(counter);
       counter++;
    }, 2500);
}

function stopScrollTimer() {
// scrollTimer is a global
    if (typeof scrollTimer !== 'undefined' && scrollTimer !== null )
        clearInterval(scrollTimer);
}

function scrollTimerInstance(counter) {
    var temp2 = getWordWithHook(allAnswers[counter % allAnswers.length]);
    // strip lexicon symbols from the hooks in the scroll timer
    temp2[0] = temp2[0].replace(/\+/g, '');
    temp2[2] = temp2[2].replace(/\+/g, '');
    temp2[0] = addLineBreaks(temp2[0], 7);
    temp2[2] = addLineBreaks(temp2[2], 7);
    $('#rightHook').width(hookWidth);
    $('#leftHook').width(hookWidth);
    if ((Number(localStorage.gAlphaDisplay))===0) {stringToTiles(temp2[1], '#alphagram');}
    else {$('#alphagram').html(temp2[1]);}
    $('#leftHook').html(temp2[0]);
    $('#rightHook').html(temp2[2]);
}

function addToCardboxFromQuiz(word) {

   var alpha = toAlpha(word);
   if (confirm("Click OK to add " + alpha + " to your Cardbox.")) {
      var d = {user: userid, question: alpha};
      $.ajax({type: "POST",
              data: JSON.stringify(d),
               url: "addQuestionToCardbox.py",
           success: addedToCardboxFromQuiz,
             error:  function(jqXHR, textStatus, errorThrown) {
              console.log("Error adding " + alpha + ", status = " + textStatus + " error: " + errorThrown);
              }} );
       }
}

function addedToCardboxFromQuiz(response, responseStatus) {
   if (response[1].status == "success") {
      var alphaAdded = response[0].question;
      for (var x=0;x<aux.length;x++) {
         if (aux[x].alpha == alphaAdded) {
            for (var y=0;y<aux[x].words.length;y++) {
               var r = getRowFromWord(aux[x].words[y]);
               r.onclick = null;
               r.title = "Added to Cardbox";
               r.classList.remove('wordTableHighlightNotInCardbox');
               r.classList.add('wordTableHighlightAdded'); }
         break;
         }
       }
    } else { alert("Error adding " + alpha + " to your Cardbox. Please try again."); }
}

function markAsCorrectFromQuiz(alpha) {
   var correctClass;
   if (confirm("Mark " + alpha + " as correct?")) {
      var d = { user: userid,
          question: alpha,
          correct: true,
          cardbox: getCardboxFromAlpha(alpha),
       incrementQ: false };
       slothSubmitQuestion(d);
       for(var x=0;x<aux.length;x++) {
          if (aux[x].alpha == alpha) {
             if (aux[x].auxInfo.difficulty < 2) {
                localStorage.qQCorrect++;
                correctClass = "wordTableHighlightCorrect";
             } else { correctClass = "wordTableHighlightNotDue";
                      localStorage.qQCounter--;}
             localStorage.qQAlpha = parseInt(localStorage.qQAlpha) + getCardboxFromAlpha(alpha) + 1;
             for(var y=0;y<aux[x].words.length;y++) {
                r = getRowFromWord(aux[x].words[y]);
                r.title = "Correct - Moved to Cardbox " + (getCardboxFromAlpha(alpha)+1);
                r.classList.remove("wordTableHighlightWrong2");
                r.classList.add(correctClass);
                r.onclick = function() { var alpha = toAlpha(getWordFromRow(this));
                                         markAsIncorrectFromQuiz(alpha); };
             } // end for
             break;
          } // end if
        } // end for
       if (localStorage.qQCorrect > 0) {
           correctPercent = (localStorage.qQCorrect / localStorage.qQCounter) * 100;
           $('#correctPercent').html(correctPercent.toFixed(2) + '%');
           $('#questionsComplete').html(localStorage.qQCounter);
           $('#sessionScore').html(localStorage.qQAlpha); }
     } // end if (confirm...)

}

function markAsIncorrectFromQuiz(alpha) {
   if (confirm("Mark " + alpha + " as incorrect?")) {
      var d = { user: userid,
          question: alpha,
          correct: false,
          cardbox: getCardboxFromAlpha(alpha),
       incrementQ: false };
       slothSubmitQuestion(d);
       for(var x=0;x<aux.length;x++) {
          if (aux[x].alpha == alpha) {
             if (aux[x].auxInfo.difficulty < 2) {localStorage.qQCorrect--;}
             else {localStorage.qQCounter++;}
             localStorage.qQAlpha -= (getCardboxFromAlpha(alpha)+1);
             for(var y=0;y<aux[x].words.length;y++) {
                r = getRowFromWord(aux[x].words[y]);
                r.title = "Incorrect - moved to Cardbox 0";
                r.classList.remove("wordTableHighlightCorrect");
                r.classList.remove("wordTableHighlightNotDue");
                r.classList.add("wordTableHighlightWrong2");
                r.onclick = function() { var alpha = toAlpha(getWordFromRow(this));
                                         markAsCorrectFromQuiz(alpha); };
             } // end for
          break;
          } // end if
        } // end for
       if (localStorage.qQCounter > 0) {
           correctPercent = (localStorage.qQCorrect / localStorage.qQCounter) * 100;
           $('#correctPercent').html(correctPercent.toFixed(2) + '%');
           $('#questionsComplete').html(localStorage.qQCounter);
           $('#sessionScore').html(localStorage.qQAlpha); }
     } // end if (confirm...)

}

function getCardboxFromAlpha(alpha) {
  for (var x=0; x<aux.length; x++) {
     if (aux[x].alpha == alpha) {
        if (aux[x].auxInfo.difficulty < 2) // if it's not due, need to mark correct into
           return aux[x].auxInfo.cardbox; // current cardbox, not promote to the next
        else return aux[x].auxInfo.cardbox-1; // Not Due = Difficulty 4
     }
  }
  return null;
}
