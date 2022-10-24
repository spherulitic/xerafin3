AnswerArea.prototype = {
  constructor: AnswerArea,
  setButtonText: function(leftButton, rightButton) {
   $('#leftButton').html(leftButton);
   $('#rightButton').html(rightButton);
  },

  setupWord: function(question) {

  var q = this.parent.q;
	if(!document.getElementById('invWords'+question.alpha)) { // don't create duplicate DOM element for alphas on refresh
	gCreateElemArray([
	   ['a','div','invAlphaDiv','invAlphaDiv'+question.alpha,'invCurDiv',''],
	   ['a1','table','wordTable','invWords'+question.alpha,'a',''],
	   ['a2','div','wordTableWrong','invWordsWrong'+question.alpha,'a','']
	]);
        if (typeof question.cardbox === "undefined") {
	  $('#invAlphaDiv'+question.alpha).addClass("steelRowedInv");
          document.getElementById('invAlphaDiv'+question.alpha).onclick = function() {
	                            q.getQuestionByAlpha(question.alpha).addToCardbox();
				    $('#invAlphaDiv'+question.alpha).removeClass("steelRowedInv");
				    $('#invAlphaDiv'+question.alpha).addClass("blueRowed");
                               	    };
				    }
	$('#invAlphaDiv'+question.alpha).css('visibility','hidden');
     }
     },  // end setupWord

  submitAnswer: function() {

  var answer = $('#answerBox').val().toUpperCase().trim();
  var alpha = toAlpha(answer);
  var q = this.parent.q;
  var status;
  $('#answerBox').val("");
  var questionAnswered = q.getQuestionByAlpha(alpha);
  if ( questionAnswered ) {
    // attempted to answer a real question
    this.lastAnswered = questionAnswered;
    var result = questionAnswered.submitAnswer(answer);
    switch(result) {
      case 0: // wrong answer
        $('#answerBox').toggleClass('flashWrong',200).delay(100).toggleClass('flashWrong',200);
	      $('#invWordsWrong'+alpha).append(" "+answer);
       	$('#invWordsWrong'+alpha).css('visibility','visible');
	      if (questionAnswered.unanswered.length > 0) {
           $('#invCurDiv').prepend($('#invAlphaDiv'+alpha));
	      }
	      var par = $('#invAlphaDiv'+alpha).parent().attr("id");
	      $('.nav-pills a[href="#'+par+'"]').tab('show');
        status = "wrong";
	    break;
      case 1: // correct answer
        status = this.displayWord(questionAnswered, [answer], 'CURRENT');
//	$('#answerBox').toggleClass('slothFlashCorrect',200).delay(100).toggleClass('slothFlashCorrect',200);
	    break;
      case 2:  // already guessed
	      $('#answerBox').toggleClass('flashDuplicate',200).delay(100).toggleClass('flashDuplicate',200);
        status = "duplicate"
	    break;
    } // end switch

  } else { // no alphagram matches what was entered
    $('#answerBox').toggleClass('flashTypo',200).delay(100).toggleClass('flashTypo',200);
    status = "typo";
  }
  return status;
  }, // end submitAnswer

  displayWord: function(question, words, state) {
    var status;
    var data = new Array();
    var table = document.getElementById("invWords"+question.alpha);
    $(table).empty();
    if (question.unanswered.length==0){state='SOLVED';}
    var tabState;
    switch(state) {
      case 'CURRENT':
        tabState = 'invCurDiv';
	data = question.answers.filter(function(w) {return question.unanswered.indexOf(w) == -1;}); // data is array of answered words only
	data = data.sort();
	$('.nav-pills a[href="#invCurDiv"]').tab('show');
      status = "correct";
	break;
      case 'SOLVED':
        tabState = 'invSolvedDiv';
       	if (question.quizid > -1 && typeof question.cardbox != 'undefined' && question.difficulty != 4) {
           // if updating cardbox in non-cardbox quiz
	         $("#invWords"+question.alpha).addClass('highlightRow'); }
       	data = question.answers.sort();
	      $('.nav-pills a[href="#invSolvedDiv"]').tab('show');
        status = "solved";
	break;
      case 'WRONG':
        tabState = 'invMissedDiv';
	data = words.sort();
	$('.nav-pills a[href="#invMissedDiv"]').tab('show');
  status = "wrong";
	break;
     } // end switch
     $("#invAlphaDiv"+question.alpha).prependTo($("#"+tabState));
     $("#invAlphaDiv"+question.alpha).css('visibility', 'visible');
     for (var x=0;x<data.length;x++) {
       var datas = getTableLineData(data[x], eval("question.words."+data[x]));
       var row = table.insertRow(-1);
       var cells = [ ];
       var cellClassList = [" wordTableLeftHook", " wordTableInnerLeft", " wordTableWord", " wordTableInnerRight", " wordTableLexiconSymbol", " wordTableRightHook", " wordTableDefinition"];
       for(var i=0;i<cellClassList.length;i++) {
         cells[i] = row.insertCell(i);
	 cells[i].className += cellClassList[i];
	 cells[i].innerHTML = datas[i];
       }
     } // end for x
     clearTimeout(this.clearAnswersTimer);
     this.clearAnswersTimer = setTimeout(function() { $('.nav-pills a[href="#invCurDiv"]').tab('show');}, 3000);
   return status;
  }, // end displayWord

  addDOM: function(domParent) {

    gCreateElemArray([
    	['a2', 'div', 'invAnswerBoxRow', 'answerBoxRow', domParent, ''],
    	['a2a', 'div', 'invButtonBoxPause', 'buttonBox1', 'a2', ''],
    	['a2a1', 'button', 'btn btn-default invButton', 'leftButton', 'a2a', ''],
    	['a2b', 'div', 'invAnswerBoxField', 'answerBoxField', 'a2', ''],
      ['a2b1', 'input', 'quizAnswerBox invAnswerBox', 'answerBox', 'a2b', ''],
    	['a2c', 'div', 'invButtonBoxReset', 'buttonBox2', 'a2', ''],
      ['a2c1', 'button', 'btn btn-default invButton', 'rightButton', 'a2c', ''],
      ['a3','ul','nav nav-pills well sm-well metalBTwo nav-justified invTabs','invTabs',domParent,''],
      ['a3a','li','active','invCurTab','a3','<a data-toggle="tab" href="#invCurDiv">Current</a>'],
      ['a3b','li','','invSolvedTab','a3','<a data-toggle="tab" href="#invSolvedDiv">Solved</a>'],
      ['a3c','li','','invMissedTab','a3','<a data-toggle="tab" href="#invMissedDiv">Missed</a>'],
      ['a4','div','tab-content well well-sm quizContent pre-scrollable invWordDiv','invWordDiv',domParent,''],
      ['a4a','div','tab-pane fade in active','invCurDiv','a4',''],
      ['a4b','div','tab-pane fade','invSolvedDiv','a4',''],
      ['a4c','div','tab-pane fade','invMissedDiv','a4','']
   ]);

  } // end addDOM
} // end AnswerArea prototype

function AnswerArea(parentObj) {
  this.parent = parentObj;
  this.clearAnswersTimer = -1;
  this.lastAnswered = {};

  } // end AnswerArea constructor
