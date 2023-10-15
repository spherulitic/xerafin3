function showAlphaStats (alpha) {
  if ((typeof alpha!=='object') && (typeof alpha!=='undefined')) {
    if (alpha!==''){
      alpha=alpha.toUpperCase();
      d = { alpha: alpha };
    $.ajax({
      type: "POST",
      url: "getAuxInfo",
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      data: JSON.stringify(d),
      success: displayAlphaStats,
      error: function(jqXHR, textStatus, errorThrown) {
        console.log("Error getting alphagram stats, status = " + textStatus + " error: " + errorThrown);
      }
    });
    }
    else {displayAlphaStats();}
  }
}


function createAlphaStatsTable() {
  if (!document.getElementById("pan_5")) {
    panelData = {  "contentClass" : "panelContentDefault",
            "title": "Alphagram Info",
            "refreshButton":false,
            "tooltip": "This Works!"
        };
    generatePanel(5,panelData,"middleArea", displayAlphaStats, hideAlphaStats);
    var cardboxTable = document.createElement("table");
    var headerCol = document.createElement('thead');
    var headerRow1 = document.createElement('tr');
    var headerCell1 = document.createElement('th');

    /** Initial Styling **/
    cardboxTable.className += " lbTable";
    cardboxTable.style.width = "80%";
    cardboxTable.id = "alphaTable";
    document.getElementById('content_pan_5').appendChild(cardboxTable);
  /** Unorganised **/

  var tableBody = document.createElement('tbody');
  tableBody.id = 'alphaTableBody';
  cardboxTable.appendChild(tableBody);
  }
  document.getElementById('alphaTableBody').innerHTML="";
}

function getCardboxNumberDropdown(alpha, auxIn) {
  /** Cardbox Number List Box Initialisation **/
  var periodList = document.createElement('select');
  for(var x=0;x<20;x++) {
    cbOption = document.createElement("option");
    cbOption.text = String(x);
    cbOption.value = x;
    periodList.add(cbOption);
  }
  if (typeof auxIn!=='undefined') {if (typeof auxIn!=='null') {periodList.value=auxIn;}}
/** Actions when list box value changes **/
  periodList.onchange = function() {
    var d = { question: alpha,
              correct: (periodList.value>0),
              cardbox:periodList.value-1,
              incrementQ: false };
        $.ajax({
                type: "POST",
                url: "submitQuestion",
                headers: {"Accept": "application/json", "Authorization": keycloak.token},
                data: JSON.stringify(d),
                success: function(response, responseStatus) {
                  gFloatingAlert("cardboxUploadAlert",3000,"Alphagram Info", "Question "+alpha+" updated in cardbox",500);
                  var aux = response.aux;
                  if (typeof aux!=='undefined'){
                    var dueDate = new Date(aux.aux.nextScheduled * 1000);
                    $('#alphaStatsDueDate').html(gFormatDateForDisplay(dueDate));
                  }
                  else {
                    $('#alphaStatsDueDate').html('');
                  }
                },
                error: function(jqXHR, textStatus, errorThrown) {
        gFloatingAlert("cardboxUploadAlert",3000,"Alphagram Info", "Error: question " + alpha+ " could not be updated.",500);
                }
    });
  };
  periodList.style.width='25%';
  periodList.id = 'alphaStatsCardbox';
  return periodList;
  }


function displayAlphaStats (response, responseStatus) {
  createAlphaStatsTable();
  if (typeof response!=='undefined'){
  var alpha = response.alpha;
  var aux = response.aux;
  }
  else {
    var alpha="";
    var aux="null";
  }
        var row = document.createElement("tr");
        var alphaTableBody = document.getElementById("alphaTableBody");
        alphaTableBody.appendChild(row);
        var col1 = document.createElement("td");
        var col2 = document.createElement("td");
        col1.innerHTML = "Alphagram";
        var textbox = document.createElement("input");
        textbox.type = "text";
        textbox.maxlength = 15;
        textbox.className = "quizAnswerBox";
        textbox.id = "currentAlpha";
        textbox.value = alpha;
        col2.onchange = function() {
                    var inputValue = document.getElementById("currentAlpha").value;
                    if(inputValue) {
                 showAlphaStats(toAlpha(inputValue.toUpperCase()));
        }};
        col2.append(textbox);
        row.appendChild(col1);
        row.appendChild(col2);

  row = document.createElement("tr");
        alphaTableBody.appendChild(row);
        var col1 = document.createElement("td");
        var col2 = document.createElement("td");
        col1.innerHTML = "Cardbox";
        if(!jQuery.isEmptyObject(aux)) {
           var dropdown = getCardboxNumberDropdown(alpha, aux.cardbox);
       if (typeof aux.cardbox!=='undefined') {if (typeof aux.cardbox!=='null') {dropdown.value=aux.cardbox;}}
           col2.appendChild(dropdown); }
        else {

           var button = document.createElement("button");
           button.innerHTML = "Add to Cardbox";
           button.onclick = function() { addToCardboxFromStats(alpha); };
           col2.appendChild(button);
        }
        row.appendChild(col1);
        row.appendChild(col2);

        row = document.createElement("tr");
        alphaTableBody.appendChild(row);
        col1 = document.createElement("td");
        col2 = document.createElement("td");
        col1.innerHTML = "Next Scheduled";
        if (aux!=='null' && !jQuery.isEmptyObject(aux)) {
           var dueDate = new Date(aux.nextScheduled * 1000);
           col2.innerHTML = gFormatDateForDisplay(dueDate);
           col2.id = 'alphaStatsDueDate';
        }
        row.appendChild(col1);
        row.appendChild(col2);

        /* Footer Row */
        row = document.createElement("tr");
        document.getElementById('alphaTableBody').appendChild(row);
}
function hideAlphaStats() {
  $('#pan_5').remove();
}

function addToCardboxFromStats(word) {

   var alpha = toAlpha(word);
   if (confirm("Click OK to add " + alpha + " to your Cardbox.")) {
      var d = {user: userid, question: alpha};
      $.ajax({type: "POST",
              data: JSON.stringify(d),
               url: "addQuestionToCardbox.py",
           success: addedToCardboxFromStats,
             error:  function(jqXHR, textStatus, errorThrown) {
              console.log("Error adding " + alpha + ", status = " + textStatus + " error: " + errorThrown);
              }} );
       }
}

function addedToCardboxFromStats(response, responseStatus) {
   if (response[1].status == "success") {
      showAlphaStats(response[0].question);
   } else if (response[1].status == "Invalid Alphagram") {
      gFloatingAlert("cardboxUploadAlert",3000,"Alphagram Info", "Could not add to cardbox: Invalid Alphagram.",500);
   } else {
    gFloatingAlert("cardboxUploadAlert",3000,"Alphagram Info", "Error adding to your Cardbox. Please try again.",500);
  }
}
