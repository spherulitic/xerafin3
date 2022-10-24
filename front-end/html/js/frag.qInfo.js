QInfo.prototype = {
	constructor: QInfo,
	drawHeader:function(data){
		let that = this;
		let widthIndex = data.weight.reduce(function(total,num){return total+num;});
		let target = document.createElement('tr');
		data.weight.forEach(function(a,b){
			let x = document.createElement('th');
			$('#'+that.pare).parent().width()<300 ? $(x).html(data.xShort[b]) : $(x).html(data.xLong[b]);
			$(x).css({'width': 100*(a/widthIndex)+'%'})
			$(target).append(x);
		})
		return target;
	},
	initDataRow:function(n){
		let y = document.createElement('tr');
		for (var x=0;x<n;x++){
			let x = document.createElement('td');
			$(y).append(x);
		}
		return y;
	},
	initTables:function(){
		this.cbHeader = this.drawHeader({
			xLong: ['questions','cardbox','due date','movement','correct'],
			xShort: ['q#','cb','due','move','&#x2714;%'],
			weight: [1,1,2.2,1,1]
		});
		this.cbContent = this.initDataRow(5);
		$(this.cardboxTable).append(this.cbHeader,this.cbContent);
		this.quizHeader = this.drawHeader ({
			xLong : ['question','correct','wrong','&#x2714;%'],
			xShort : ['q#','&#x2714;','&#x274C;','&#x2714%'],
			weight : [1,1,1,1]
		});
		this.quizContent = this.initDataRow(4);
		$(this.quizTable).append(this.quizHeader,this.quizContent);
	},
	detectWidthChange:function(){
		let y = $('#'+this.pare).parent().width();
		if ((y<this.minWidth && this.lastWidth>=this.minWidth) || (y>=this.minWidth && this.lastWidth<this.minWidth)){
			$(this.cardboxTable).empty();
			$(this.quizTable).empty();
			this.initTables();
		}
		this.lastWidth = y;
	},
	initUI:function(){
		let that=this;
		this.container = document.createElement('div');
		$(this.container).addClass('noselect')
		this.cardboxTable = document.createElement('table');
		$(this.cardboxTable).addClass(this.styles.table);
		if (isMobile()) {$(this.cardboxTable).css({'font-size':'0.8em'});}
		this.quizTable = document.createElement('table');
		$(this.quizTable).addClass(this.styles.table);
		if (isMobile()) {$(this.quizTable).css({'font-size':'0.8em'})}
		this.initTables();
		$(this.container).append(this.cardboxTable,this.quizTable);
		if (!isMobile()) {$(window).resize(debounce(function(event){
			that.detectWidthChange();that.update(that.data);
		},500));};

	},
	checkQuizList:function(){
		let x = Object.keys(this.quizList.quizList);
		let y = this.quizList.quizList[x[0]];
		if (Number(x[0])!==Number(this.data.quizid)){console.log('checkQuizList error')}
		else {

			$(this.quizContent).find('td').eq(0).html(((y.quizsize-y.untried)+Number(this.data.firstSubmit))+'/'+y.quizsize);
			$(this.quizContent).find('td').eq(1).html(y.correct);
			$(this.quizContent).find('td').eq(2).html(y.incorrect);
			let z = (y.correct*100)/(y.quizsize-y.untried);
			let b = 0;
			isNaN(z) ? b = 0 : b = z;
			$(this.quizContent).find('td').eq(3).html(b.toFixed(2)+'%');
		}
	},
	convertToDate: function(d){
		var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	    return d.getDate() + " " + months[d.getMonth()] + " '" + d.getFullYear().toString().substr(2,2) + " " + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
	},
	checkQuestion: function(){
		$(this.cbContent).find('td').eq(0).html(localStorage.qQCounter);
		let a = (typeof this.data.cardbox!=='undefined'? this.data.cardbox : '-');
		$(this.cbContent).find('td').eq(1).html(a);
		a = (typeof this.data.nextScheduled !== 'undefined' ? this.convertToDate(new Date(this.data.nextScheduled*1000)) : 'Not In Cardbox');
		$(this.cbContent).find('td').eq(2).html(a);
		$(this.cbContent).find('td').eq(3).html(localStorage.qQAlpha);
		let z = (100*Number(localStorage.qQCorrect))/Number(localStorage.qQCounter);
		let b = 0;
		isNaN(z) ? b=0:b=z;
		$(this.cbContent).find('td').eq(4).html(b.toFixed(2)+'%');
	},
	toggleView: function(n){
		this.toggle = !this.toggle;
	},
	toggleAction:function(){
		if (Number(this.data.quizid)!==-1) {
			if (this.toggle){
				$(this.cardboxTable).hide();
				$(this.quizTable).show();
			}
			else {
				$(this.cardboxTable).show();
				$(this.quizTable).hide();
			}
		}
		else {
			$(this.cardboxTable).show();
			$(this.quizTable).hide();
		}
	},
	refreshQuizList: function(){
		this.quizList.refreshQuizList({'searchType': 'quizid', 'quizid': this.data.quizid});
	},
	initQuizList: function(){
		this.quizList = new QuizList({'searchType': 'emptyList'});
	},
	update: function(data){
		this.refreshQuizList();
		this.updateTwo(data);
	},
	updateTwo: function(data){
		if (this.sourceTimer!=='undefined'){clearTimeout(this.sourceTimer);}
		if (this.quizList.initialized  && this.data.readyToSubmit){
			this.data = data;
			if (Number(this.data.quizid)!==-1){
				this.checkQuizList();
				this.toggleAction();
			}
			this.checkQuestion();
		}
		else {
			this.sourceTimer = setTimeout(QInfo.prototype.updateTwo.bind(this,data),30);
		}
	},
	initNew:function(data){
		this.data = data;
		this.refreshQuizList();
		this.toggleAction();
		this.update(this.data);
	},
	show: function(){
		$('#'+this.pare).append(this.container);
	}
}
function QInfo(data){
	this.toggle=true;
	this.pare = data.pare;
	this.minWidth = 300;
	this.lastWidth = $('#'+this.pare).parent().width();
	this.styles = {
			'table': 'quizSessionTable'
	}
	this.initQuizList();
	this.initUI();
}
