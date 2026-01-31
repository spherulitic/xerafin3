Paginator.prototype = {
	constructor: Paginator,
	toggleExpandState:function(){
		this.expandState=(!this.expandState);
		this.expandInputs();
	},
	expandInputs:function(){
		if (this.expandState){
			$(this.expandButton).html("<i class='glyphicon glyphicon-chevron-up'></i>");
			$(this.inputRegion).show(400);
		}
		else {
			$(this.expandButton).html("<i class='glyphicon glyphicon-chevron-down'></i>");
			$(this.inputRegion).hide(400);
		}
	},
	drawExpandButton: function(){
		this.resultsRight = document.createElement('div');
		this.expandButton = document.createElement('div');
		$(this.expandButton).addClass(this.styles.expandButton);
		$(this.resultsRight).append(this.expandButton);
		return this.resultsRight;
	},
	drawResultsRow: function(){
		this.resultsRow = document.createElement('div');
		this.resultsLeft = document.createElement('div');
		this.resultsData = document.createElement('div');
		$(this.resultsRow).addClass(this.styles.resultsRow);
		$(this.resultsRow).append(this.resultsLeft, this.resultsData, this.drawExpandButton());
		let self=this;
		$(this.resultsRow).click(function(){self.toggleExpandState();});
		return this.resultsRow;
	},
	drawTabRow: function(){
		console.log("PAGE NUMBER CHANGED, SHOULD UPDATE TABS");
		let self=this;
		$(this.tabRow).empty();
		let x = (((this.numResType!==1) && (this.numResType!==3)) ? this.numPages : 1);
		this.tabs = new PaginTabs({
			'pages': x,
			'currentPage':this.currentPage,
			'action':function(x){self.runActions(x);}
		});
		console.log(this.tabs.output());
		$(this.tabRow).append(this.tabs.output());
	},
	drawPageNumberInput: function(){
		this.pageNumberInput = document.createElement('input');
		this.pageNumberLabel = document.createElement('div');
		$(this.pageNumberLabel).html('Page # : ');
		this.pageNumberRegion = document.createElement('div');
		$(this.pageNumberLabel).addClass(this.styles.inputLabel);
		$(this.pageNumberRegion).addClass(this.styles.inputSubRegion);
		$(this.pageNumberInput).addClass(this.styles.input);
		//need to check if currentPage exceeds possible value



		//
		$(this.pageNumberInput).val(this.currentPage);
		let self=this;
		$(this.pageNumberInput).on('change', function(){
			let z = Number($(this).val());
			if ((Number.isInteger(z)) && (Number(z)>0) && (Number(z)<= self.numPages)) {
				self.runActions(z);
			}
			else {
				console.log('Invalid Page Number Submitted '+z+' Numpages:'+self.numPages);
			}
		});
		$(this.pageNumberRegion).append(this.pageNumberLabel,this.pageNumberInput);
		$(this.pageNumberInput).attr({'maxlength':4,'size':4});
		$(this.pageNumberInput).prop('autocomplete','off');
		return this.pageNumberRegion;
	},
	drawNumResultsInput: function(){
		this.numResultsRegion = document.createElement('div');
		this.numResultsLabel = document.createElement('div');
		this.numResultsInput = document.createElement('input');
		$(this.numResultsLabel).addClass(this.styles.inputLabel);
		$(this.numResultsRegion).addClass(this.styles.inputSubRegion);
		$(this.numResultsInput).addClass(this.styles.input);
		$(this.numResultsRegion).append(this.numResultsLabel, this.numResultsInput);
		if ((this.numResType === 1)||(this.numResType===3)){$(this.numResultsLabel).html('Show Myrank +/- : ');$(this.numResultsInput).val(this.plusMinus);}
		else {$(this.numResultsLabel).html('Results per Page: ');$(this.numResultsInput).val(this.numResults);}
		let self=this;
		$(this.numResultsInput).on('change',function(){
			let z = Number($(this).val());
			let y;let v;
			if ((self.numResType === 1)||(self.numResType===3)){y=25;v=1;}
			else {y=50;v=3;}

			if ((Number.isInteger(z)) && (Number(z)>=v) && (Number(z)<=y)  && ((Number(z)*(self.currentPage-1)+1)<=(self.totalResults))) {
				self.changePageSize(z);
			}

			else {
				console.log('Invalid Page Size Submitted '+z);
			}
		});
		$(this.numResultsInput).attr({'maxlength':3,'size':3});
		$(this.numResultsInput).prop('autocomplete','off');
		return this.numResultsRegion;
	},
	populateTextInputRow: function(){
		$(this.textInputRow).empty();
		if ((this.numResType !==1) && (this.numResType!==3)){
			$(this.textInputRow).append(this.drawPageNumberInput());
		}
		$(this.textInputRow).append(this.drawNumResultsInput());
	},
	drawTextInputRow: function(){
		this.textInputRow = document.createElement('div');
		$(this.textInputRow).addClass(this.styles.textInputRow);
		return this.textInputRow;
	},
	drawResultSpans: function(){
		this.fromSpan = document.createElement('span');
		$(this.fromSpan).addClass(this.styles.highlight);
		this.toSpan = document.createElement('span');
		$(this.toSpan).addClass(this.styles.highlight);
		this.ofSpan = document.createElement('span');
		$(this.ofSpan).addClass(this.styles.highlight);
		this.curSpan = document.createElement('span');
		$(this.curSpan).addClass(this.styles.highlight);
		this.totalSpan = document.createElement('span');
		$(this.totalSpan).addClass(this.styles.highlight);
		this.myRange = document.createElement('span');
		$(this.myRange).addClass(this.styles.highlight);
	},
	drawInputRegion: function(){
		this.inputRegion = document.createElement('div');
		this.tabRow = document.createElement('div');
		this.drawTabRow();
		$(this.inputRegion).append(this.tabRow,this.drawTextInputRow());
		$(this.inputRegion).addClass(this.styles.inputRegion);
		return this.inputRegion;
	},
	drawCommentRow: function(){
		this.commentRow = document.createElement('div');
		$(this.commentRow).addClass(this.styles.comment);
		$(this.commentRow).html(this.comment);
		return this.commentRow;
	},
	changePageSize:function(x){
		if ((this.numResType === 1)||(this.numResType===3)){this.plusMinus = x;}
		else {this.numResults = x;}
		this.action();
	},
	updateResultValues: function(){
		$(this.fromSpan).html(((this.currentPage-1)*this.numResults)+1);
		$(this.toSpan).html(Math.min(this.currentPage*this.numResults,this.totalResults));
		$(this.ofSpan).html(this.totalResults);
		$(this.curSpan).html(this.currentPage);
		$(this.totalSpan).html(this.numPages);
		$(this.myRange).html(this.plusMinus*2);
	},
	runActions:function(x){
		this.currentPage = x;
		this.action();
	},
	updateResultText: function(){
		$(this.resultsData).empty();
		if (this.totalResults==0) {
			$(this.resultsData).append("no ",this.viewResName," found");
		}
		else {
			if ((this.numResType===1)||(this.numResType===3)){
				$(this.resultsData).append("showing up to ",this.myRange," ranks near your rank of ",this.ofSpan," total ranks");
			}
			else {
				$(this.resultsData).append("showing ",this.viewResName," ",this.fromSpan,"-",this.toSpan," of ",this.ofSpan," ( page ",this.curSpan," of ",this.totalSpan," )");
			}
		}
	},
	updateComment: function(){
		$(this.commentRow).html(this.comment);
	},
	calcNumPages: function(){
		this.numPages = Math.ceil(this.totalResults/this.numResults);
	},

	update: function(data){
		this.totalResults = data.totalResults || 0;
		this.calcNumPages();
		if (typeof data.currentPage!=='undefined') {
			(this.currentPage = data.currentPage);
		}
		if (typeof data.comment!=='undefined') {this.comment = data.comment;}
		this.updateResultValues();
		this.updateResultText();
		this.drawTabRow();
		this.populateTextInputRow();
		this.updateComment();
	},
	init: function(){
		this.content=document.createElement('div');
		this.draw();
	},
	draw: function(){
		$(this.content).append(this.drawResultsRow(), this.drawInputRegion(), this.drawCommentRow());
		this.expandInputs();
		$(this.textInputRow).append(this.populateTextInputRow());
		this.drawResultSpans();
	},
	output: function(){
		return this.content;
	}
}
function Paginator(data={}){
	this.currentPage = data.currentPage || 1;
	this.numResults = data.numResults || 10;
	this.numResType = data.numResType || 0;
	this.showCurRes = data.showCurRes || true;
	this.comment = data.comment || " ";
	this.type = data.type || "rankings";
	this.plusMinus = data.plusMinus || 5;
	this.viewResName = data.viewResName || 'results';
	this.expandState=false;
	this.action = data.action || function(){alert("No pagination function defined");}
	if (typeof data.styles!=='undefined'){
		this.styles=data.styles;
	}
	else {
		this.styles = {
			'comment':'metalBTwo paginFooter noselect nodrag',
			'highlight':'paginHighlight',
			'inputRegion':'metalBOne paginInputRegion',
			'resultsRow':'numCurResCont metalBThree nodrag noselect',
			'textInputRow':'paginOptionRegion',
			'expandButton':'numCurResExpand',
			'inputSubRegion': 'paginInputSubRegion',
			'inputLabel': 'paginInputLabel',
			'input': 'paginInput'
		}
	}
	if (typeof data.totalResults!=='undefined') {
		this.totalResults = data.totalResults;
		this.init();
	}
	else {appendDebugLog("No result quantity defined, paginator aborted");}
}
