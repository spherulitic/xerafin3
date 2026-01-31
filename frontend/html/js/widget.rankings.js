Rankings.prototype = {
  constructor: Rankings,
  init: function(){
    this.content = document.createElement('div');
    this.draw();
  },
  fetch: function(d){
    console.log("Fetching rankings. Data sent to stats service:");
    console.log(d);
    let self= this;
    $.ajax({
      type: "POST",
      url: "/getRankings",
      headers: {"Accept": "application/json", "Authorization": keycloak.token},
      data: JSON.stringify(d),
      beforeSend: function(){
        $("#heading_text_pan_3").html('Rankings <img src="images/ajaxLoad.gif" style="height:0.8em">');
      },
      success: function(r, rS){
        $("#heading_text_pan_3").html("Rankings");
        self.drawRankings(r);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $("#heading_text_pan_3").html("Rankings");
        console.log("Error getting rankings stats, status = " + textStatus + " error: " + errorThrown);
      }
    });
  },
  setFooterComment: function(){
    //needs to be adjusted with the correct variables
    let c = this.stSrc;
    if ((c.type=="QA") && (Number(c.rankType)!==2)  && (Number(c.rankType)!==3)){
      let tense='';
      let denom=0;
      let plural='point';
      switch(c.rankPeriod) {
        case 'today':case 'yesterday': denom=1;plural='point';break;
        case 'thisWeek': case 'lastWeek': denom=3;plural='points';break;
        case 'thisMonth': case 'lastMonth': denom=5;plural='points';break;
        case 'thisYear': case 'lastYear': denom=30;plural='points';break;
      }
      switch (c.rankPeriod) {
        case 'yesterday': case 'lastWeek': case 'lastMonth': case 'lastYear': tense='were';break;
        case 'today': case 'thisWeek': case 'thisMonth': case 'thisYear': tense='are';break;
      }
      let x = (c.rankPeriod==='eternity' ? "Records began on the 11th of October 2016": "Award slots for this period "+tense+" worth <span style='color:rgba(120,190,48,1);font-size:1.2em'>"+denom+"</span> "+plural+".  See 'Awards' rankings for current standings.");
      return x;
    }
    if ((c.type=="QA") && (Number(c.rankType)===2)) {
        return "Records began on the 11th of October 2016";
    }
    if ((c.type=="QA") && (Number(c.rankType)===3)) {
        return "Meta Myrank centres on your personal best for a timeframe if a current one is not selected.";
    }
    if (c.type==="AW"){
      return "Awards were introduced on the 14th of May 2018"
    }
    if ((c.type==="QA") && ((Number(c.rankType)===2) || (Number(c.rankType)===3))){
      return "Rankings began on the 11th of October 2016"
    }
    if (c.type==="SL"){
      return "Unique totals are not cumulative on a daily basis but unique alphagrams for that whole period."
    }
  },
  getYearsListbox: function(year){
    let x=[{'text':'All Time', 'value':0}];
    let currDate=new Date();
    let z = Number(currDate.getTime()) - (24*60*60*1000) + (6*60*1000) - ((240-currDate.getTimezoneOffset())*1000*60);
    let newDate = new Date(z);
    let tim = newDate.getFullYear();
    for (let y=tim;y>=year;y--){
      x.push({'text':y,'value':y});
    }
    return x;
  },
  createFilters: function(){
    let c = this.stSrc;
    let self=this;
    this.filters = new ComboFilters({
      'mainSelect' : {//-1
        'data' : [
          {'text':'Questions Answered','value':'QA'},{'text':'Awards','value':'AW'},{'text':'Subword Sloth','value':'SL'}
        ],
        'dependents':{
          'QA': [0],'AW': [1,4,5],'SL':[1,6,2]
        },
        'val':xerafin.storage.data.rankings.type,
        'change':function(){
          c.type = $ ( this ).val();
          xerafin.storage.write();
          self.getRankingsSelect();
        }
      },
      'auxSelect' : [//0
        {
          'data' : [
            {'text':'Leaderboard','value':0},{'text':'Myrank','value':1},
            {'text':'Metaranks','value':2},{'text':'Meta Myrank','value':3}
          ],
          'dependents':{
            '0': [2], '1': [2], '2': [3], '3': [3]
          },
          'val':c.rankType,
          'change':function(){
            c.rankType = $ ( this ).val();
            xerafin.storage.write();
            self.getRankingsSelect();
          }
        },
        {//1
          'data' : [
            {'text':'Leaderboard','value':0},{'text':'Myrank','value':1},
          ],
          'dependents':{
          },
          'val':c.awardType,
          'change':function(){
            c.awardType = $ ( this ).val();
            xerafin.storage.write();
            self.getRankingsSelect();
          }
        },
        {//2
          'data' : [
            {'text':'Today' , 'value':'today'},{'text':'This Week' , 'value':'thisWeek'},{'text':'This Month' , 'value':'thisMonth'},
            {'text':'This Year' , 'value':'thisYear'},{'text':'All-Time' , 'value':'eternity'},{'text':'Yesterday' , 'value':'yesterday'},
            {'text':'Last Week' , 'value':'lastWeek'},{'text':'Last Month' , 'value':'lastMonth'},{'text':'Last Year' , 'value':'lastYear'}
          ],
          'dependents':{},
          'val':c.rankPeriod,
          'change':function(){
            c.rankPeriod = $ ( this ).val();
            xerafin.storage.write();
            self.getRankingsSelect();
          }
        },
        {//3
          'data' : [
            {'text':'Daily' , 'value':'daily'},{'text':'Weekly' , 'value':'weekly'},{'text':'Monthly' , 'value':'monthly'},
            {'text':'Yearly' , 'value':'yearly'},{'text':'Monday' , 'value':'monday'},{'text':'Tuesday' , 'value':'tuesday'},
            {'text':'Wednesday' , 'value':'wednesday'},{'text':'Thursday' , 'value':'thursday'},{'text':'Friday' , 'value':'friday'},
            {'text':'Saturday' , 'value':'saturday'},{'text':'Sunday' , 'value':'sunday'},{'text':'January' , 'value':'january'},
            {'text':'February' , 'value':'february'},{'text':'March' , 'value':'march'},{'text':'April' , 'value':'april'},
            {'text':'May' , 'value':'may'},{'text':'June' , 'value':'june'},{'text':'July' , 'value':'july'},
            {'text':'August' , 'value':'august'},{'text':'September' , 'value':'september'},{'text':'October' , 'value':'october'},
            {'text':'November' , 'value':'november'},{'text':'December' , 'value':'december'}
          ],
          'dependents':{},
          'val':c.metaPeriod,
          'change':function(){
            c.metaPeriod = $ ( this ).val();
            xerafin.storage.write();
            self.getRankingsSelect();
          }
        },
        {//4
          'data' : [
            {'text':'Highest Awards' , 'value':'top'},{'text':'Most Awards' , 'value':'most'}
          ],
          'dependents':{},
          'val':c.awardSort,
          'change':function(){
            c.awardSort = $ ( this ).val();
            xerafin.storage.write();
            self.getRankingsSelect();
          }
        },
        {//5
          'data' : this.getYearsListbox(2018),
          'dependents':{},
          'val':c.awardYear,
          'change':function(){
            c.awardYear = $ ( this ).val();
            xerafin.storage.write();
            self.getRankingsSelect();
          }
        },
        {//6
          'data' : [
            {'text':'Total Attempted' , 'value':'all'},{'text':'Total Completed' , 'value':'all100s'},{'text':'Total Perfects' , 'value':'allPerfect'},
            {'text':'Uniques Attempted' , 'value':'unique'},{'text':'Unique Completed' , 'value':'100s'},{'text':'Unique Perfects' , 'value':'perfect'}
          ],
          'dependents':{},
          'val':c.slothType,
          'change':function(){
            c.slothType = $ ( this ).val();
            xerafin.storage.write();
            self.getRankingsSelect();
          }
        }
      ],
      'selectorState':c.selectorState
    });
  },
  buildArguments: function(){
    let d = {
      'userid':userid,
      'view': this.filters.mainSelectorState(),
      'pageNumber':((this.selectChange) ? 1:this.paginator.currentPage)
    };
    this.selectChange = false;
    let self = this;
    this.filters.selectorState.forEach(function(v){
      let x = self.filters.auxSelectorState(v);
      switch (v){
        case 0: case 1: d.displayType = Number(x); break;
        case 2: case 3: d.timeframe = x; break;
        case 4: case 6: d.type = x; break;
        case 5: d.year = Number(x); break;

      }
    });
    if (this.filters.selectorState.includes(0)){
      //console.log("State 0:"+Number(this.filters.auxSelectorState(0)));
      let x = Number(this.filters.auxSelectorState(0));
      d.pageSize = (((Number(x) === 1)||(Number(x) === 3)) ? 2*this.paginator.plusMinus : this.paginator.numResults);
    }
    else if (this.filters.selectorState.includes(1)){
      let x = Number(this.filters.auxSelectorState(1));
      d.pageSize = (((Number(x) === 1)||(Number(x) === 3)) ? 2*this.paginator.plusMinus : this.paginator.numResults);
    }
    else {d.pageSize = this.paginator.numResults;}
    this.paginator.numResType = Number(d.displayType);
    this.stSrc.plusMinus = this.paginator.plusMinus;
    this.stSrc.numResults = this.paginator.numResults;
    xerafin.storage.write();
    this.errorLog.add("Rankings Data to send:",'comment');
    this.errorLog.add(d,'JSON');
    return d;
  },
  checkHasAwards: function(){
    return ((this.filters.mainSelectorState()==='QA')
        && (this.filters.auxSelectorState(2)!=='eternity')
        && (this.filters.selectorState.includes(0))
        && (Number(this.filters.auxSelectorState(0))!==2)
        && (Number(this.filters.auxSelectorState(0))!==3)
        );
  },
  drawRankings: function(d){
    if (this.timer!=='undefined'){clearTimeout(this.timer);}
    $(this.table).empty();
    this.paginator.update({'totalResults':Number(d.users),'currentPage':d.page,'comment':this.setFooterComment()});
    let y = this.checkHasAwards();
    //this.errorLog.add("Data in to Rankings Table",'comment');
    //this.errorLog.add(d,'JSON');
    let x = new RankingsTable({
      'data':d.rankings,
      'totalRanks':d.users,
      'hasDates':((Number(this.filters.auxSelectorState(0))===2) || (Number(this.filters.auxSelectorState(0))===3)),
      'hasAwards':y,
      'type':(this.filters.mainSelectorState()==='AW' ? 'award':'rank')
    });
    this.timer=setTimeout(Rankings.prototype.getRankings.bind(this),x.refreshTimer);
    $(this.table).append(x.output());
    $(this.lastUpdate).html(((d.lastUpdate!=='undefined') ?  gReturnUpdateTime(Number(d.lastUpdate)*1000) :gReturnTime()));
  },
  getRankings: function(){
    this.filters.parseDependencies(-1);
    this.stSrc.selectorState = this.filters.selectorState;
    xerafin.storage.write();
    this.fetch(this.buildArguments());
  },
  getRankingsSelect: function(){
    this.selectChange = true;
    this.getRankings();
  },
  getPagType:function(){
    let x;
    switch(this.filters.mainSelectorState()){
      case 'QA': case 'SL' : x=0;break;
      case 'AW': x=1;break;
    }
    console.log("ResType = "+Number(this.filters.auxSelectorState(x)));
    return Number(this.filters.auxSelectorState(x));
  },
  draw: function(){
    let c = this.stSrc;
    let self=this;
    this.table = document.createElement('div');
    this.createFilters();
    this.paginator = new Paginator({
      'totalResults':0,
      'action':function(){self.getRankings();},
      'numRestype':this.getPagType(),
      'plusMinus':this.stSrc.plusMinus,
      'numResults':this.stSrc.numResults,
      'comment':"Awaiting Results"
    });
    this.lastUpdate = document.createElement('div');
    $(this.lastUpdate).addClass('updateTime');
    $(this.content).append(this.filters.output(),this.table,this.paginator.output(),this.lastUpdate);
    //add last update text
  },
  output: function(){
    return this.content;
  }
}
function Rankings(data={}){
  this.stSrc = data.stSrc || xerafin.storage.data.rankings;
  this.errorLog = xerafin.error.log;
  this.selectChange = true;
  this.init();
}

//These functions have been left in this state awaiting an eventual implementation of a new panel system.
function hideLeaderboard() {
  rankings.delete;
  $('#pan_3').remove();
}
function initLeaderboard(){
  rankings = new Rankings({});
  showLeaderboardHeader();
}
function showLeaderboardHeader () {
  if (!document.getElementById("pan_3")) {
    let panelData = {"contentClass" : "lbContent",
          "title": "Rankings",
          "tooltip": "<p style='text-align:left'>Rankings will update automatically every 5 minutes.  Using the Refresh button will also reset this timer.</p><p style='text-align:left'>No known bugs at present</p>"
          };
    generatePanel(3,panelData,"middleArea", showLeaderboardHeader, hideLeaderboard);

    $('#content_pan_3').css({'width':'100%'});
    $('#content_pan_3').append(rankings.output());

    var lbUpdateTimeBox= document.createElement('div');
    lbUpdateTimeBox.id='lbUpdateTimeBox';
    lbUpdateTimeBox.className+=' updateTime';
    $("#content_pan_3").append(lbUpdateTimeBox);
  }
  if (rankings.timer!=='undefined'){clearTimeout(rankings.timer);}
  rankings.getRankings();
}
