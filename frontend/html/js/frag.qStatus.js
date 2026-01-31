QStatus.prototype = {
	constructor: QStatus,
	initUI : function(){
		let that=this;
		this.caption = document.createElement('div');

		$(this.caption).addClass('metalBOne noselect');
		$(this.caption).append(this.cbShift);
		$(this.caption).css({'height':'20px','max-height':'20px','overflow':'hidden','width':'100%','text-align':'left'})
		this.captionText = document.createElement('div');
		$(this.captionText).css({'font-face':'Montserrat, sans-serif','font-size':'0.8em','font-variant':'small-caps','text-align':'left',
			'color':'#CCC','margin-left':'5px','margin-right':'5px','vertical-align':'middle','line-height':'20px','display':'inline-block'});

		this.cbShift = document.createElement('button');
		$(this.cbShift).css({'height':'16px','font-size':'0.7em','display':'inline-block','vertical-align':'middle'});
		//$(this.cbShift).hide();
		$(this.cbShift).html('Revert to Cardbox');
		$(this.cbShift).on('click', function(){
			that.action('INF_CBX_NXT',-1);

		});
		$(this.caption).append(this.captionText,this.cbShift);
		$(this.cbShift).hide();
	},
	setLoading : function(){
		$(this.cbShift).hide();
		$(this.captionText).html('<img src="images/ajaxLoad.gif" style="height:0.8em"> Loading...');
	},
	setCustom : function(data){
		$(this.cbShift).hide();
		$(this.captionText).html(data);
	},
	updateSource: function(data){
		$(this.cbShift).hide();
		if (this.sourceTimer!=='undefined'){clearTimeout(this.sourceTimer);}
		if (typeof overview!=='undefined'){
			if (typeof overview.data.currentList!=='undefined'){
				if (overview.data.currentList.fetched){
					let x = Object.keys(overview.data.currentList.quizList);
					let y = overview.data.currentList.quizList[x[0]];
					if (Number(x[0])!==Number(data.id) && data.eof){
						$(this.captionText).html("Quiz Complete.");
						overview.checkCurrentQuizStatus();
						$(this.cbShift).show();
					}
					else {
						if (isNaN(data.id)){
							$(this.captionText).html('Loading...');
						}
						else {
							Number(data.id)!==-1 ? $(this.captionText).html(y.quizname+": Question "+((y.quizsize-y.untried)+1)+" of "+y.quizsize):$(this.captionText).html('Cardbox');
						}
					}
				}
				else {
					this.sourceTimer = setTimeout(QStatus.prototype.updateSource.bind(this,data),20);
				}
			}
			else {
					this.sourceTimer = setTimeout(QStatus.prototype.updateSource.bind(this,data),20);
				}
		}
		else {
			this.sourceTimer = setTimeout(QStatus.prototype.updateSource.bind(this,data),20);
		}
	},
	show : function(){
		$('#'+this.pare).append(this.caption);
	}
}
function QStatus(data){
	this.initUI();
	this.pare = data.pare;
}
