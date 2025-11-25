class QuizList {
  constructor(d) {

  var self = this;
  this.initialized = false;
  //if (d)
  //  d.userid = userid;
  //else
  //  var d = { userid: userid };
  this.data = d;
  this.quizList = [ ];
  if (typeof(d.searchType) === 'undefined' || d.searchType == 'emptyList') {
     this.initialized = true;
  } else {
  $.ajax({ type: "POST",
           data: JSON.stringify(d),
           headers: {"Accept": "application/json", "Authorization": keycloak.token},
           url: "getQuizList",
           success: function(response, responseStatus) { self.quizList = response;
                                                         self.initialized = true; },
           error: function(jqXHR, textStatus, errorThrown) {
           var msg = "error, status = " + textStatus + " error: " + errorThrown;
           appendDebugLog(msg); }
           });
   } // end if emptyList
     } // end constructor
  refreshQuizList(d) {
    var self = this;
    this.initialized = false;
  $.ajax({ type: "POST",
           data: JSON.stringify(d),
           headers: {"Accept": "application/json", "Authorization": keycloak.token},
           url: "getQuizList",
           success: function(response, responseStatus) { self.quizList = response;
                                                         self.initialized = true;
     },
     error: function(jqXHR, textStatus, errorThrown) {
           var msg = "error, status = " + textStatus + " error: " + errorThrown;
           appendDebugLog(msg); }
           });

  }

  discardBookmark(quizid) {
    var self = this;
    self.initialized = false;
    var d = { quizid: quizid };
    $.ajax({type: "POST",
            data: JSON.stringify(d),
            headers: {"Accept": "application/json", "Authorization": keycloak.token},
            url: "discardBookmark.py",
            success: function(response, responseStatus) { self.refreshQuizList(self.data); },
            error: function(jqXHR, textStatus, errorThrown) {
                 var msg = "error, status = " + textStatus + " error: " + errorThrown;
                 appendDebugLog(msg); }
          });
    }


  resetQuiz(quizid, action) {
    var self = this;
    self.initialized = false;
    var d = { quiz: quizid,
             action: action}; // action in <resetall, resetwrong>
    $.ajax({type: "POST",
            data: JSON.stringify(d),
            headers: {"Accept": "application/json", "Authorization": keycloak.token},
            url: "resetQuiz.py",
            success: function(response, responseStatus) { //console.log("Quiz reset");
                                                          self.refreshQuizList(self.data);
                              },
            error: function(jqHXR, textStatus, errorThrown) {
                 var msg = "error, status = " + textStatus + " error: " + errorThrown;
                 appendDebugLog(msg); }
          });
    }

  activateQuiz(quizid) {
    this.activateQuizzes([quizid]);
  }

  activateQuizzes(quizidList) {
    typeof this.connectionAttempts!=='undefined' ? this.connectionAttempts = 0 : this.connectionAttempts++;
    if (typeof this.retryActivate!=='undefined'){clearTimeout(this.retryActivate);}
  // takes in an array of quizzes to activate
  //console.log('QuizIDs:'+quizidList);
    let self = this;
    self.initialized = false;
    let d = { quizidList: quizidList };
    $.ajax({type: "POST",
    data: JSON.stringify(d),
    headers: {"Accept": "application/json", "Authorization": keycloak.token},
    url: "activateQuiz",
    success: function(response, responseStatus) {
      self.refreshQuizList(self.data);
      delete self.connectionAttempts;
    },
    error: function(jqHXR, textStatus, errorThrown) {
      var msg = "error, status = " + textStatus + " error: " + errorThrown;
      appendDebugLog(msg);
      if (self.connectionAttempts > 9){
        appendDebugLog("Quiz Activation Failed. IDs: ["+quizidList+"]");
      }
      else {
        self.retryActivate = setTimeout(QuizList.prototype.activateQuizzes.bind(this,quizidList),500);
      }
    }
  });
   }

   addQuizToCardbox(quizid, action, after=function(){}) {
    typeof this.addAttempts!=='undefined' ? this.addAttempts = 0 : this.addAttempts++;
    if (typeof this.retryAdd!=='undefined'){clearTimeout(this.retryAdd);}
    let self = this;
    let d = {
      'quizid': quizid,
      'action': action
    };
    $.ajax({
      type: "POST",
      data: JSON.stringify(d),
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "addQuizToCardbox.py",
      success: function(response, responseStatus) {
        delete self.addAttempts;
        after(response[0]);

      },
      error: function(jqHXR, textStatus, errorThrown) {
        //let msg = "error, status = " + textStatus + " error: " + errorThrown;
        //console.log(msg);
        //appendDebugLog(msg);
        if (self.addAttempts > 9){
          appendDebugLog("Quiz Activation Failed. ID: ["+quizid+", "+action+"]");
        }
        //self.retryActivate = setTimeout(QuizList.prototype.activateQuizzes.bind(this,quizid, action, after),500);
      }
    });
   }

} // end class

class Quiz {
  constructor(submitStrict=true, isCardbox=true, blankQuiz=false, quizid=-1) {

    var self = this;
    this.initialized = false;
    this.quizName = "";
    this.lastQuestion = null;
    /** AJaX call to get questions **/
    var d = {
  cardbox: localStorage.cardboxCurrent,
  isCardbox: isCardbox,
  quizid: (isCardbox ? -1 : quizid)
    };
    $.ajax({ type: "POST",
             data: JSON.stringify(d),
             headers: {"Accept": "application/json", "Authorization": keycloak.token},
              url: "newQuiz",
     success: function(response, responseStatus) { self.initialized = true;
                                                 //console.log("New Quiz initialization done");
                                                 self.quizName = response.quizName;
                               gUpdateCardboxScores(response, 0);
               },
   error: function(jqXHR, textStatus, errorThrown) {
        gNetworkErrorReport(jqXHR.status, '#quizConnect');
        var msg = "error, status = " + textStatus + " error: " + errorThrown;
        appendDebugLog(msg); }
                              });
    this.questions = [ ];
    this.questionsLoaded = 0;
    this.submitStrict = submitStrict;
    this.isCardbox = isCardbox;
    this.quizid = quizid;
    this.blankQuiz = blankQuiz;
  this.hasHTTPError = false;
    this.eof = false;
   }

   setSubmitStrict(val) {
     // does a wrong guess cause the word to be autosubmitted as "wrong" by default?
     this.submitStrict = val; }

   prepareNew() {
       var d = { userid: userid };
       $.ajax({
           type: "POST",
           headers: {"Accept": "application/json", "Authorization": keycloak.token},
           url: "prepareNewWords.py",
           data: JSON.stringify(d),
           success: function(response, responseStatus) {
//               console.log("Next Added table prepared.");
//               console.log(response);
           },
           error: function(jqXHR, textStatus, errorThrown) {
               appendDebugLog("Error preparing Next Added");
           }
       });
   }
  retryLoad(code, numQ){
    this.hasHTTPError = true;
    appendDebugLog("Load Quiz -> Http Error Code: "+code);
    this.loadErrorTimeout = setTimeout(Quiz.prototype.loadQuestions.bind(this, numQ),(Number(code) === 0) ? 3000 : 10000);
  }

  loadQuestions(numQ) {
    if (this.loadErrorTimeout!=='undefined'){clearTimeout(this.loadErrorTimeout);}
     // cardboxSent: boolean, are we restricting by cardbox?
     // cardboxCurrent: number, which cardbox to select from
    let self = this;
    if (numQ>0) {
      if(this.initialized || this.hasHTTPError) {
        this.initialized = false;  // only one loadQuestions call out at a time
        let d = { numQuestions: numQ,
          quizid: self.quizid,
          isCardbox: self.isCardbox,
          lock: true
        };
        if (self.isCardbox && getBool(localStorage.cardboxSent)) {
          d.cardbox = localStorage.cardboxCurrent;
        }
      $.ajax({ type: "POST",
        headers: {"Accept": "application/json", "Authorization": keycloak.token},
        url: "getQuestions",
        data: JSON.stringify(d),
        success: function(response, responseStatus) {
          self.hasHTTPError = false;
          if (response.getFromStudyOrder)
            self.prepareNew(); // this is in basic quiz right now
            self.eof = response.eof;
            if (self.eof){
              overview.fetchData();
            }
          let questionArray = response.questions;
          for (let i=0;i<questionArray.length;i++) {
            self.createQuestion(questionArray[i]);
          }
          if (self.isCardbox && Number(localStorage.cardboxCurrent)!==self.questions[self.questions.length-1].cardbox){
            localStorage.cardboxSent='false';
            localStorage.cardboxCurrent=self.questions[self.questions.length-1].cardbox;
            if ($('#pan_4').length>0){
              cardboxHighlightAction(self.questions[self.questions.length-1].cardbox, false);
              showCardboxStats();
            }
          }
          self.initialized = true;
        },
        error: function(jqXHR, textStatus, errorThrown) {
          self.questionsLoaded = -1;
          self.retryLoad(jqXHR.status, numQ);

        }
      });
    }
    else {
      //console.log("Quiz not initialized - waiting...");
      setTimeout(function() { self.loadQuestions(numQ); }, 30); } // end if initialized
    } // end if numQ > 0
  }

  createQuestion(d) {
  // { alpha, answers: [word, word], correct, incorrect, nextScheduled,
  //   cardbox, difficulty, words: { WORD: [ info ], WORD: [ info ] etc } }
    this.questions.push(new Question(d, this.submitStrict, this.quizid));
    this.questionsLoaded++;
  }


   refreshQuestions(quizSize,cardboxSent=false,cardboxCurrent=0) {
     // closes any questions which have been answered and replaces them with new questions from the server
     this.closeAnswered();
     this.loadQuestions(quizSize-this.questions.length);
     return quizSize-this.questions.length;
   }

   closeAnswered() {
     var finished = this.questions.filter(question => question.submitted);
     for(var x=0;x<finished.length;x++)
        this.closeQuestion(finished[x].alpha);
   }

   getNextQuestion() {
         return this.questions[0];
       }

       getQuestionByAlpha(alpha) {
         // if alpha doesn't exist, then return undefined
   return this.questions.filter(q => q.alpha == alpha)[0];
       }

       closeQuestion(alpha) {
         // modifies self.questions in place and returns a promise that resolves to true
   var q = this.getQuestionByAlpha(alpha);
         var i = this.questions.indexOf(q);
   this.questions.splice(i, 1);
   this.questionsLoaded--;
         return true;
  }

  skipQuestion(alpha) {
    // reschedules to the future in cardbox
    //
  let self = this;
    if (self.cardbox == undefined) self.closeQuestion(alpha);
    else {
    let d = {question: alpha,
             quizid: this.quizid,
             user: userid};


         $.ajax({
               type: "POST",
               headers: {"Accept": "application/json", "Authorization": keycloak.token},
               url: "delayQuestion.py",
               data: JSON.stringify(d),
               success: function(response, responseStatus) {
                 self.closeQuestion(alpha);
               },
               error: function(jqXHR, textStatus, errorThrown) {
                   appendDebugLog("Error: status = " + textStatus + " error thrown = " + errorThrown);
               }
         });
     } // end if
  } // end skipquestion

  stash(alpha) {
  let self = this;
    self.lastQuestion = self.getQuestionByAlpha(alpha);
  }
}

class Question {
  constructor (response, submitStrict, quizid) {
    this.alpha = response.alpha;
    this.displayAlpha = alphaSortMethod(response.alpha, Number(localStorage.gAlphaSortInput));
// for Invaders
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.timeout = 0;
    this.answers = response.answers;
    this.words = response.words;
    this.cardbox = response.cardbox;
// for toggling -- we need to save this
    this.origCardbox = response.cardbox;
    this.nextScheduled = response.nextScheduled;
    this.correct = response.correct;
    this.incorrect = response.incorrect;
// difficulty 4 means "not due in cardbox" which is true if it's not in cardbox at all
    this.difficulty = (typeof response.difficulty === "undefined" ? 4 : response.difficulty);
    this.unanswered = response.answers.slice(0); // this changes so it must be a copy
    this.complete = false;
    this.wrongGuess = false;
    this.firstSubmit = true; // first time submit, increment "questions solved" on the server
    this.submitted = false; // has initial submit been kicked off?
    this.readyToSubmit = true;
    this.submitStrict = submitStrict;
    this.quizid = quizid;
    this.hasHTTPError = false;
  }

  submitAnswer(answer) {
    let x;
    // 0 is falsy - wrong answer
    // 1 is truthy - correct
    // 2 - correct but already answered
    // -1 - truthy; wrong alphagram
    // normal function - no promises
    if (toAlpha(answer) != this.alpha) {
      return -1;
    }
    else {
      if ((x = this.unanswered.indexOf(answer)) > -1) {
      // new correct answer
        this.unanswered.splice(x, 1);
        if (this.unanswered.length == 0) {
          this.complete = true;
          this.autoSubmitQuestion(); // autosubmit when question is complete?
        }
        return 1;
      }
      else {
        if ((x = this.answers.indexOf(answer)) == -1) {
        // completely wrong
          this.wrongGuess = true;
          return 0;
        }
        else { // already answered
          return 2;
        }
      }
    }
  }

  autoSubmitQuestion() {
    if (this.submitStrict && (this.wrongGuess || !this.complete))
      this.markWrong();
    else this.markCorrect();
  }

  // wrappers for submitQuestion()
  // submitQuestion(correct, cardboxNumber, isCardbox)

  markCorrect() {
    if (this.readyToSubmit) {
    // for all quizzes, if it's eligible to advance and is correct, update in cardbox
      if (this.difficulty != 4) {
        //IF NOT is SUBMITTED FLAG

        //appendDebugLog("1C FIRED");
        this.submitQuestion(true, this.origCardbox, true);
        // the toggle situation -- if it's not eligible to advance and has been changed
        // from incorrect to correct, put it back in the original cardbox
      }
      else {
        if ((!this.firstSubmit)) {
          //appendDebugLog("2C FIRED");
          this.submitQuestion(true, this.origCardbox-1, true);
        }
      }
      // separately, if it is not a cardbox quiz, update the non-cardbox quiz
      if (this.quizid > -1) {
        //appendDebugLog("3C FIRED");
        this.submitQuestion(true, (this.firstSubmit ? -1 : this.origCardbox-1), false);
      }
    }
    else { setTimeout(this.markCorrect, 30); }
  }

  markWrong() {
    if (this.readyToSubmit) {
    // need to check for undefined and not "falsy" because cardbox = 0 is a thing!
    // mark wrong for all wrong answers, not just those which are due (difficulty != 4)
      if (this.origCardbox != undefined ) {
        //appendDebugLog("1W FIRED");
        this.submitQuestion(false, this.origCardbox, true);
      }
      if (this.quizid > -1) {
        //appendDebugLog("2W FIRED");
        this.submitQuestion(false, -1, false);
      }
    }
    else {
      setTimeout(this.markWrong, 30);
    }
  }

  moveToCardbox(cardbox) {
    let self = this;
    if (this.readyToSubmit) { this.submitQuestion(true, cardbox-1); }
    else { setTimeout(function() { self.moveToCardbox(cardbox); } , 30); }
  }

  onFirstSubmit(qAns, correct){
    gCheckMilestones(qAns);
    localStorage.qQCounter = Number(localStorage.qQCounter) + 1;
    localStorage.qQCorrect = Number(localStorage.qQCorrect) + Number(correct);
    if (typeof (this.origCardbox)!=='undefined') {
      correct ? localStorage.qQAlpha = Number(localStorage.qQAlpha)+1 : localStorage.qQAlpha = Number(localStorage.qQAlpha) - this.origCardbox;
    }
  }

  async submitQuestion(correct, cardbox, isCardbox) {
    // if there wasn't a success when data was sent, then the previous submission doesn't count.
    if (this.hasHTTPError){this.submitted = false;}
    if (isNaN(cardbox)){cardbox = -1;}
    if (this.submitErrorTimeout){clearTimeout(this.submitErrorTimeout);}
    this.readyToSubmit = false;
    this.complete = correct;
    let d = {
      question: this.alpha,
      correct: correct,
      cardbox: cardbox, // current cardbox
      quizid: isCardbox ? -1 : this.quizid,
      incrementQ: this.firstSubmit && !this.submitted
    };

    this.submitted = true;

    try {

    const response = await fetchWithAuth('submitQuestion', {
      method: 'POST',
      body: JSON.stringify(d) });

    if (!response.ok) { throw new Error('HTTP ${response.status}'); }

    const result = await response.json()

    // Process success
    this.hasHTTPError = false;
    this.processSubmissionResult(result, correct, isCardbox);

    } catch (error) {
      console.error("Submit question failed: ", error);
      this.retrySubmit(error.message.includes('HTTP') ? error.message.split(' ')[1] : 0, correct, cardbox, isCardbox);
      }
   }

processSubmissionResult(response, correct, isCardbox) {
    if (this.firstSubmit) {
        this.onFirstSubmit(response.qAnswered, correct);
    } else {
        this.updateLocalStorage(correct);
    }

    if ($('#pan_5').length !== 0) {
        showAlphaStats(this.alpha);
    }

    this.firstSubmit = false;
    this.lastSubmit = correct;

    // Handle response data
    const auxData = response.aux?.aux || {};
    this.nextScheduled = auxData.nextScheduled ?? -1;
    this.cardbox = auxData.cardbox ?? -1;

    // Update overview if needed
    if (overview.data.activeList) {
        if (isCardbox) {
            overview.fetchCardboxSummary();
        } else {
            overview.updateOverview();
        }
    }

    gUpdateCardboxScores(response);
    this.readyToSubmit = true;
}

updateLocalStorage(correct) {
    const qQCorrect = Number(localStorage.qQCorrect || 0);
    const qQAlpha = Number(localStorage.qQAlpha || 0);
    const origCardbox = Number(this.origCardbox || 0);

    if (!this.lastSubmit && correct) {
        // Wrong last time, correct this time
        localStorage.qQCorrect = qQCorrect + 1;
        if (this.origCardbox !== undefined) {
            localStorage.qQAlpha = qQAlpha + origCardbox + 1;
        }
    } else if (this.lastSubmit && !correct) {
        // Correct last time, wrong this time
        localStorage.qQCorrect = qQCorrect - 1;
        if (this.origCardbox !== undefined) {
            localStorage.qQAlpha = qQAlpha - origCardbox - 1;
        }
    }
}

retrySubmit(code, correct, cardbox, isCardbox) {
    this.hasHTTPError = true;
    appendDebugLog(`Question Submit -> Http Error Code: ${code}`);

    const delay = Number(code) === 0 ? 1000 : 10000;
    this.submitErrorTimeout = setTimeout(
        () => this.submitQuestion(correct, cardbox, isCardbox),
        delay
    );
}


  addToCardbox() {
    let d = {question: this.alpha };
    $.ajax({
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      url: "addQuestionToCardbox",
      type: "POST",
      data: JSON.stringify(d),
      success: function(response, responseStatus) { },
      error: function(jqXHR, textStatus, errorThrown) {
      }
    });
  }
} // end class definition
