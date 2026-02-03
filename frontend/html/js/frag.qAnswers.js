QAnswers.prototype = {
  constructor: QAnswers,
  initUI: function(){
    this.container = document.createElement('div');
    this.answerTable = document.createElement('table');
    this.wrongAnswers = document.createElement('div');
    $(this.answerTable).addClass('wordTable');
    $(this.wrongAnswers).addClass('wordTableWrong');
    $(this.container).append(this.answerTable,this.wrongAnswers);
  },
  findExtLinks: function (def,word){
    let definition = " "+def;
    let inlineExtExp = new RegExp('(-)[A-Z]{1,}','gm');
    let inlineExt = def.match(inlineExtExp);
    if (inlineExt) {
      for (let i=0;i<inlineExt.length;i++){
        let r = new RegExp('([^A-Z])(' + inlineExt[i] + ')([^A-Z])','g');
        inlineExt[i]=inlineExt[i].replace('-','');
        definition = definition.replace(r, '$1<span title="Click this to view alphagram info." onclick="showAlphaStats(\''+toAlpha(word+inlineExt[i])+'\')">$2</span>$3');
      }
    }
    return definition;
  },
  findWordLinks: function(def){
    let definition = " "+def;
    let regex = /(?:[\s])(?:[^-]|[^']|[^"]|[^(]|)[A-Z]{2,}/gm;
    let inlineWordsExp = new RegExp(regex);
    let inlineWords = def.match(inlineWordsExp);
    if (inlineWords){
      for (let i=0;i<inlineWords.length;i++) {
        inlineWords[i]=inlineWords[i].replace(' ','');
        inlineWords[i]=inlineWords[i].replace('(','');
        let r = new RegExp('([^A-Z])(' + inlineWords[i] + ')([^A-Z])','g');
        definition = definition.replace(r, '$1<span title="Click this to view alphagram info." onclick="showAlphaStats(\''+toAlpha(inlineWords[i])+'\')">$2</span>$3');
      }
    }
    return definition;
  },
  createRow: function(key, data){
    let that=this;
    this.rows[key] = {};
    this.rows[key].output = document.createElement('tr');
    var y = new Array();
    var temp = data[4] || "";
    var list = [data[0],(data[3][0] ? dot : ""),key,(data[3][1] ? dot : "")+temp,data[1],this.findWordLinks(this.findExtLinks(data[2],key))];
    for (var x=0;x<6;x++){
      y[x]= document.createElement('td');
      $(y[x]).html(list[x]);
      $(that.rows[key].output).append(y[x]);
    }
    this.rows[key].display = false;
    $(this.rows[key].output).css({'display':'none'})
    $(this.answerTable).append(this.rows[key].output);
  },
  displayRow: function(data){
    if (typeof this.rows[data[0]]!=='undefined'){
      $(this.answerTable).children().removeClass('wordTableHighlightCorrect',this.effectEnd);
      if (data[1]===0){
        $(this.rows[data[0]].output).addClass('wordTableHighlightCorrect',this.effectEnd);
      }
      if (data[1]===1){
        $(this.rows[data[0]].output).addClass('wordTableHighlightWrong',this.effectEnd);
      }
      $(this.rows[data[0]+'_H'].output).remove();
      delete this.rows[data[0]+'_H'];

      $(this.rows[data[0]].output).css({'display':'table-row'});
      this.rows[data[0]].display = true;
    }
  },
  displayRest: function(type){
    //console.log(this.rows);
    let that=this;
    Object.keys(this.rows).forEach(function(a){
      if (!RegExp(/_H$/g).test(a)) {
        if (that.rows[a].display===false){
          that.displayRow([a,type]);
        }
      }
      else {delete that.rows[a];}
    });
  },
  cycleAnswers: function(n){
    $(this.answerTable).children().removeClass('wordTableCycle');
    $(this.answerTable).eq((n % Object.keys(this.data).length)-1).addClass('wordTableCycle');
  },
  clearDuplicate: function(key){
    $(this.rows[key].output).removeClass(this.styles.duplicateInput);
  },
  highlightDuplicate: function(key){
    var that=this;
    if (typeof this.rows[key]!=='undefined'){
      $(this.rows[key].output).addClass(this.styles.duplicateInput,this.effectStart);
      setTimeout(QAnswers.prototype.clearDuplicate.bind(this,key),that.effectEnd);
    }
  },
  showHints:function(){
    if (this.hints<=Object.keys(this.data)[0].length-2) {this.hints++;}
    let that=this;
    Object.keys(this.rows).forEach(function(a){
      if (RegExp(/_H$/g).test(a)){
        let q='?';
        //console.log('['+a+'] '+a.length+" ");
        let h =a.substr(0,that.hints)+(q.repeat(a.length-2-that.hints));
        $(that.rows[a].output).find('td').filter(':eq(2)').html(h);
        that.rows[a].display= true;
        $(that.rows[a].output).css({'display':'table-row'});

      }
    });
  },
  appendWrong: function(ans){
    $(this.wrongAnswers).append(" "+ans);
  },
  start: function(data){
    let that=this;
    let q='?';
    this.data = data;
    this.hints = 0;
    this.rows = {};
    $(this.answerTable).empty();
    $(this.wrongAnswers).empty();
    var z = Object.keys(data).sort();
    z.forEach(function(a){
      that.createRow(a,that.data[a]);
      that.createRow(a+'_H',['','','',[0,0],'','']);

      $(that.rows[a+'_H'].output).find('td').filter(':eq(2)').html(q.repeat(a.length));
    });
    //console.log(this.answerTable);
    $(this.wrongAnswers).html('');
  },
  init: function(){
    this.initUI();
  },
  showPrepend: function(){
    $('#'+this.pare).prepend(this.container);
  },
  show: function(){
    $('#'+this.pare).append(this.container);
  }
}
function QAnswers(data){
  this.data = data.data || {};
  this.pare = data.pare;
  this.styles = {
    'correctInput' : '',
    'wrongInput' : 'flashWrong',
    'duplicateInput' : 'flashDuplicate',
    'typoInput' : 'flashTypo'
  }
  this.effectStart = 400;
  this.effectEnd = 600;
  this.init();
}
