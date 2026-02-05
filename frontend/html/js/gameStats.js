function hideGameStats() {
  $('#pan_6').remove();
}
function refreshGameStats() {
  if ($('#globalRecTab').hasClass('active')){getGameStats(1)}
  else if ($('#indivRecTab').hasClass('active')){getGameStats(3)}
  else if ($('#persRecTab').hasClass('active')){getGameStats(2)};
}
function getGameStats(value){
  switch (value) {
    case 1:url='get_site_records';
      break;
    case 2:url='get_individual_records';
      break;
    case 3:url='get_my_records';
      break;
//    case 2:data={userrecords:true, usertotals:true};break;
//    case 3:data={indivrecords:true};break;
  }
  fetchWithAuth(url, {method:"GET"})
  .then(response => {
    if (!response.ok) {throw new Error(`HTTP ${response.status}`);}
    return response.json(); })
  .then(responseData => {
    $("#heading_text_pan_6").html("Game Stats");
    showStatTable(responseData, value);
  })
  .catch(error => {
    console.error("Error getting game stats:", error);
  });
}

function showGameStats(){
  if (!document.getElementById("pan_6")) {
    panelData = {  "title": "Game Stats",
          "tooltip": "<p>This panel shows the global stats and records for Xerafin</p>",
          "contentClass" : "panelContentDefault"
          };
    generatePanel(6,panelData,"middleArea",refreshGameStats,hideGameStats);

    $("#content_pan_6").css("visibility","hidden");
    var statTab = document.createElement('ul');
    statTab.id = 'gameStatTab';
    statTab.className+=' nav nav-pills nav-justified';
    var statTab1 = document.createElement('li');
    statTab1.id = 'globalRecTab';

    $(statTab1).html("<a data-toggle='tab' href='#globalRec'>Global</a>");
    var statTab2 = document.createElement('li');
    statTab2.id = 'indivRecTab';
    $(statTab2).html("<a data-toggle='tab' href='#indivRec'>Player Records</a>");
    var statTab3 = document.createElement('li');
    statTab3.id = 'persRecTab';
    statTab3.className+=' active';
    $(statTab3).html("<a data-toggle='tab' href='#persRec'>Personal</a>");
    var gameStatContent = document.createElement('div');
    gameStatContent.className+=" tab-content";
    var gameStatGlobalRec = document.createElement('div');
    gameStatGlobalRec.id='globalRec';
    gameStatGlobalRec.className+=" tab-pane statTab fade";
    var gameStatIndivRec = document.createElement('div');
    gameStatIndivRec.id='indivRec';
    gameStatIndivRec.className+=" tab-pane statTab fade";
    var gameStatPersRec = document.createElement('div');
    gameStatPersRec.id='persRec';
    gameStatPersRec.className+=" tab-pane statTab fade in active";
    $(statTab1).click(function(){getGameStats(1)});
    $(statTab2).click(function(){getGameStats(3)});
    $(statTab3).click(function(){getGameStats(2)});

    $(statTab).append(statTab3,statTab1,statTab2);
    $(gameStatContent).append(gameStatPersRec,gameStatGlobalRec,gameStatIndivRec);
    $('#content_pan_6').append(statTab,gameStatContent);
    $("#content_pan_6").css('visibility','visible');
  }
  getGameStats(2);
}
function returnMaxGameStats(values1, values2){
  if (values1[0]>=values2[0]){return values1;}
  else {return values2;}
}
function showStatTable(response, value){
    var data = response[0];
    var statValues = new Array();
    var maxValue = new Array();
    switch (value) {
    case 1:
      maxValue[0]=returnMaxGameStats([data.siterecords.maxQuestions.year.questions, "("+data.siterecords.maxQuestions.year.date+")"],[data.globe.questions.thisYear,'(This Year)']);
      maxValue[1]=returnMaxGameStats([data.siterecords.maxQuestions.month.questions,"("+data.siterecords.maxQuestions.month.date+")"],[data.globe.questions.thisMonth,'(This Month)']);
      maxValue[2]=returnMaxGameStats([data.siterecords.maxQuestions.week.questions,"("+data.siterecords.maxQuestions.week.date+"-"+data.siterecords.maxQuestions.week.dateEnd+")"],[data.globe.questions.thisWeek,'(This Week)']);
      maxValue[3]=returnMaxGameStats([data.siterecords.maxQuestions.day.questions,"("+data.siterecords.maxQuestions.day.date+")"],[data.globe.questions.today,'(Today)']);
      maxValue[4]=returnMaxGameStats([data.siterecords.maxQuestions.weekday.questions,"("+data.siterecords.maxQuestions.weekday.date+")"],[data.globe.questions.today,'(Today)']);
      $("#globalRec").html("");
      statValues = [
      ["Questions answered since live:", data.globe.questions.eternity],
      ["Questions answered this year:", data.globe.questions.thisYear],
      ["Questions answered this month:",data.globe.questions.thisMonth],
      ["Questions answered this week:",data.globe.questions.thisWeek],
      ["Questions answered yesterday:",data.globe.questions.yesterday],
      ["Questions answered today:",data.globe.questions.today],
      ["Most questions in a year:",maxValue[0][0]+" "+maxValue[0][1]],
      ["Most questions in a month:",maxValue[1][0]+" "+maxValue[1][1]],
      ["Most questions in a week:",maxValue[2][0]+" "+maxValue[2][1]],
      ["Most questions in a day:",maxValue[3][0]+" "+maxValue[3][1]],
      ["Most questions on a "+data.siterecords.maxQuestions.weekday.weekday+":",maxValue[4][0]+" "+maxValue[4][1]]
      ];
      createGameStatsTable ("questionStats", statValues, "Questions Answered", "#globalRec");

      maxValue[0]=returnMaxGameStats([data.siterecords.maxUsers.year.users, "("+data.siterecords.maxUsers.year.date+")"],[data.globe.users.thisYear,'(This Year)']);
      maxValue[1]=returnMaxGameStats([data.siterecords.maxUsers.month.users,"("+data.siterecords.maxUsers.month.date+")"],[data.globe.users.thisMonth,'(This Month)']);
      maxValue[2]=returnMaxGameStats([data.siterecords.maxUsers.week.users,"("+data.siterecords.maxUsers.week.date+"-"+data.siterecords.maxUsers.week.dateEnd+")"],[data.globe.users.thisWeek,'(This Week)']);
      maxValue[3]=returnMaxGameStats([data.siterecords.maxUsers.day.users,"("+data.siterecords.maxUsers.day.date+")"],[data.globe.users.today,'(Today)']);
      maxValue[4]=returnMaxGameStats([data.siterecords.maxUsers.weekday.users,"("+data.siterecords.maxUsers.weekday.date+")"],[data.globe.users.today,'(Today)']);
      statValues = [
      ["Total users since live:", data.globe.users.eternity],
      ["Users this year:", data.globe.users.thisYear],
      ["Users this month:", data.globe.users.thisMonth],
      ["Users this week:", data.globe.users.thisWeek],
      ["Users yesterday:", data.globe.users.yesterday],
      ["Users today:", data.globe.users.today],
      ["Most users in a year:",maxValue[0][0]+" "+maxValue[0][1]],
      ["Most users in a month:",maxValue[1][0]+" "+maxValue[1][1]],
      ["Most users in a week:",maxValue[2][0]+" "+maxValue[2][1]],
      ["Most users in a day:",maxValue[3][0]+" "+maxValue[3][1]],
      ["Most users on a "+data.siterecords.maxUsers.weekday.weekday+":",maxValue[4][0]+" "+maxValue[4][1]]
      ];
      createGameStatsTable ("userStats", statValues, "Users", "#globalRec");
      break;

    case 2:
      $("#persRec").html("");
      var statValues = [
      ["Questions answered since joining:",data.usertotals.questions.eternity],
      ["Questions answered this year:",data.usertotals.questions.thisYear],
      ["Questions answered this month:",data.usertotals.questions.thisMonth],
      ["Questions answered this week:",data.usertotals.questions.thisWeek],
      ["Questions answered yesterday:",data.usertotals.questions.yesterday],
      ["Questions answered today:",data.usertotals.questions.today],
      ["Most questions in a year:",data.userrecords.year.questions+" ("+data.userrecords.year.date+")"],
      ["Most questions in a month:",data.userrecords.month.questions+" ("+data.userrecords.month.date+")"],
      ["Most questions in a week:",data.userrecords.week.questions+" ("+data.userrecords.week.date+"-"+data.userrecords.week.dateEnd+")"],
      ["Most questions in a day:",data.userrecords.day.questions+" ("+data.userrecords.day.date+")"],
      ["Most questions on a "+data.userrecords.weekday.weekday+":",data.userrecords.weekday.questions+" ("+data.userrecords.weekday.date+")"]
      ];


      createGameStatsTable ("questionStatsPers", statValues, "Questions Answered", "#persRec");
      break;

    case 3:
      $("#indivRec").html("");
      var statValues = [
      ["Most questions since live:",data.indivrecords.eternity.answered+" - "+data.indivrecords.eternity.name],
      ["Most questions in a year:",data.indivrecords.year.answered+" - "+data.indivrecords.year.name+" ("+data.indivrecords.year.date+")"],
      ["Most questions in a month:",data.indivrecords.month.answered+" - "+data.indivrecords.month.name+" ("+data.indivrecords.month.date+")"],
      ["Most questions in a week:",data.indivrecords.week.answered+" - "+data.indivrecords.week.name+" ("+data.indivrecords.week.date+"-"+data.indivrecords.week.dateEnd+")"],
      ["Most questions in a day:",data.indivrecords.day.answered+" - "+data.indivrecords.day.name+" ("+data.indivrecords.day.date+")"],
      ["Most questions on a "+data.indivrecords.weekday.weekday+":",data.indivrecords.weekday.answered+" - "+data.indivrecords.weekday.name+" ("+data.indivrecords.weekday.date+")"]
      ];
      createGameStatsTable ("questionStatsIndiv", statValues, "Questions Answered", "#indivRec");
      break;

    default: break;
    }

}
function createGameStatsTable (tableId,data,title,pare){
  var newTable = document.createElement('table');
  newTable.id = tableId;
  var tableRow = new Array();
  var rowTitle = new Array();
  var rowValue = new Array();
  var heading = document.createElement('div');
  heading.id=tableId+"Heading";
  heading.classname+=" statTableHeading darksteelRowed";
  $(heading).html(title);
  for (var x=0;x<data.length;x++){
    tableRow[x]=document.createElement('tr');
    tableRow[x].id=tableId+"Row"+x;
    rowTitle[x]=document.createElement('td');
    rowTitle[x].id=tableId+"Row"+x+"Title";
    $(rowTitle[x]).html(data[x][0]);
    rowValue[x]=document.createElement('td');
    rowValue[x].id=tableId+"Row"+x+"Value";
    $(rowValue[x]).html(data[x][1]);
    $(tableRow[x]).append(rowTitle[x],rowValue[x]);
    $(newTable).append(tableRow[x]);
  }
  $(pare).append(heading,newTable);
}
