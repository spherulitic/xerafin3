Paginator.prototype = {
	constructor: Paginator,
	updateResCont: function(){
		this.calcNumPages();
		if (this.numResType===0){
		$(this.numCurResData).html("showing "+this.viewResName+" <span class='paginHighlight'>"+
		(((this.currentPage-1)*this.numResults)+1)+
		"</span> - <span class='paginHighlight'>"+
		(Math.min(this.currentPage*this.numResults,this.totalResults))+
		"</span> of <span class='paginHighlight'>"+
		this.totalResults+"</span> ( page "+
		"<span class='paginHighlight'>"+this.currentPage+"</span> of "+
		"<span class='paginHighlight'>"+this.numPages+"</span> )"
		);
		}
		if (this.numResType===1){
			$(this.numCurResData).html("showing up to <span class='paginHighlight'>"+(this.plusMinus*2)+
			"</span> users near your rank of <span class='paginHighlight'>"+this.totalResults+"</span> total users");
		}
	},
	expandInputs:function(){
		if (this.expandState){
			$(this.numCurResExpand).html("<i class='glyphicon glyphicon-chevron-up'></i>");
			$(this.inputRegion).show(400);
		}
		else {
			$(this.numCurResExpand).html("<i class='glyphicon glyphicon-chevron-down'></i>");
			$(this.inputRegion).hide(400);
		}
	},
	toggleExpandState:function(){
		this.expandState=(!this.expandState);
		this.expandInputs();

	},
	draw: function(){
		if (this.totalResults === 0){$(this.container).hide();}
		else {$(this.container).show();}
		this.updateResCont();
		this.populatePagination();
		this.populateOptions();

	},
	update: function(data){
		if (typeof data.currentPage!=='undefined') {this.currentPage = data.currentPage;}
		if (typeof data.totalResults!=='undefined') {this.totalResults=data.totalResults;}
		this.draw();
	},
	init: function(){
		this.container = document.createElement('div');
		this.container.id = "paginatorContainer"; //change this later
		this.numCurResCont = document.createElement('div');
		this.inputRegion = document.createElement('div');
		this.optionRegion=document.createElement('div');
		this.paginTabs = document.createElement('div');
		this.numCurResLeft=document.createElement('div');
		this.numCurResData=document.createElement('div');
		this.numCurResRight=document.createElement('div');
		this.numCurResExpand=document.createElement('div');
		$(this.paginTabs).addClass('paginTabs');
		$(this.numCurResCont).addClass('numCurResCont');
		$(this.numCurResCont).addClass('metalBThree');
		$(this.numCurResExpand).addClass('numCurResExpand');
		$(this.inputRegion).addClass('metalBOne');
		$(this.inputRegion).addClass('paginInputRegion');
		$(this.optionRegion).addClass('paginOptionRegion');
		var that=this;
		$(this.numCurResCont).click(function(){that.toggleExpandState();});
		this.expandInputs();
		$(this.numCurResRight).append(this.numCurResExpand);
		$(this.numCurResCont).append(this.numCurResLeft,this.numCurResData,this.numCurResRight);
		$(this.inputRegion).append(this.paginTabs,this.optionRegion);
		$(this.container).append(this.numCurResCont,this.inputRegion);
		$('#'+this.pare).append(this.container);
		this.draw();
	},
	calcNumPages: function(){
		this.numPages = Math.ceil(this.totalResults/this.numResults);
	},
	runActions:function(x){
		this.currentPage = Number(x);
		this.action();

	},
	changePageSize:function(x){
		if (this.numResType === 0){this.numResults = Number(x);}
		if (this.numResType === 1){this.plusMinus = Number(x);}
		this.action();
	},
	createPagTab:function(x){
		this.numTabs[x] = document.createElement('div');
		this.numTabs[x].id = this.id+"popTag"+x;
		$(this.numTabs[x]).addClass('paginNumTabs');
		if ((x+1)==this.currentPage){$(this.numTabs[x]).addClass('paginNumTabCur');};
		$(this.numTabs[x]).addClass('noselect');
		$(this.numTabs[x]).html(x+1);
		var that=this;
		$(this.paginTabs).append(this.numTabs[x]);
		$('#'+this.id+'popTag'+x).prop("data-pag",x+1);
		$(this.numTabs[x]).click(function(){that.runActions($(this).prop('data-pag'))});
	},
	createPagTabGap:function(){
		var x=document.createElement('div');
		$(x).addClass('paginNumTabGap');
		$(x).html('...');
		$(this.paginTabs).append(x);
	},
	populatePagination: function(){
		this.numResType === 0 ? this.calcNumPages() : this.numPages = 1;
		$(this.paginTabs).empty();
		var min;var max;
		if (this.numResType === 0) {
			if (this.numPages > 1){
			$(this.paginTabs).show();
				this.numTabs = new Array();
				var maxValues = (2*this.pageRange) +1;
				min = Math.max(this.currentPage-this.pageRange,1);
				max = Math.min(this.numPages, this.currentPage + this.pageRange);
				if (min>this.currentPage-this.pageRange){
					max = Math.min(maxValues,this.numPages);
				}
				if (max<this.currentPage+this.pageRange){
					min = Math.max(this.numPages - maxValues +1, 1);
				}
				if (min > 1){this.createPagTab(0);}
				if ((this.currentPage - 10 > 1) && ((this.currentPage - 10) < min)) {
					this.createPagTab(this.currentPage - 11);
					if ((this.currentPage - 9) < min) {this.createPagTabGap();}
				}
				for (var x=min-1;x<max;x++){
					this.createPagTab(x);
				}
				if ((this.currentPage + 10 < this.numPages) && ((this.currentPage + 10) > max)) {
					if ((this.currentPage +11) > max) {this.createPagTabGap();}
					this.createPagTab(this.currentPage + 9);
				}
				if (max < this.numPages) {this.createPagTab(this.numPages-1);}


			}
			else {
				$(this.paginTabs).hide();
			}
		}
		else {$(this.paginTabs).hide();}
	},
	populateOptions: function(){
		$(this.optionRegion).empty();
		var that = this;
		if (this.numResType === 0){
			this.pageNumberInput = document.createElement('input');
			this.pageNumberInput.id = this.id+'PageNumberInput';
			this.pageNumberLabel = document.createElement('div');
			$(this.pageNumberLabel).html('Page # : ');
			this.pageNumberRegion = document.createElement('div');
			$(this.pageNumberLabel).addClass('paginInputLabel');
			$(this.pageNumberRegion).addClass('paginInputSubRegion');
			$(this.pageNumberInput).addClass('paginInput');
			$(this.pageNumberInput).val(this.currentPage);
			$(this.pageNumberInput).on('change', function(){
				var z = Number($(this).val());
				if ((Number.isInteger(z)) && (Number(z)>0) && (Number(z)<= that.numPages)) {
					that.runActions(z);
				}
				else {
					console.log('Invalid Page Number Submitted '+z+' Numpages:'+that.numPages);
				}

			});
			$(this.pageNumberRegion).append(this.pageNumberLabel,this.pageNumberInput);
			$(this.optionRegion).append(this.pageNumberRegion);
			gSetInputSize(this.id+'PageNumberInput',3,3);
			$(this.pageNumberInput).prop('autocomplete','off');
		}
		this.numResultsRegion = document.createElement('div');
		this.numResultsLabel = document.createElement('div');
		this.numResultsInput = document.createElement('input');
		this.numResultsInput.id = this.id+'NumResultsInput';
		$(this.numResultsLabel).addClass('paginInputLabel');
		$(this.numResultsRegion).addClass('paginInputSubRegion');
		$(this.numResultsInput).addClass('paginInput');
		$(this.numResultsRegion).append(this.numResultsLabel, this.numResultsInput);
		$(this.numResultsInput).prop('autocomplete','off');
		if (this.numResType === 0){$(this.numResultsLabel).html('Results per Page: ');$(this.numResultsInput).val(this.numResults);}
		if (this.numResType === 1){$(this.numResultsLabel).html('Show Myrank +/- : ');$(this.numResultsInput).val(this.plusMinus);}

		$(this.numResultsInput).on('change',function(){
			var z = Number($(this).val());
			var y;var v;
			if (that.numResType === 0){y=50;v=3;}
			if (that.numResType === 1){y=25;v=1;}

			if ((Number.isInteger(z)) && (Number(z)>=v) && (Number(z)<=y)  && ((Number(z)*(that.currentPage-1)+1)<=(that.totalResults))) {
				that.changePageSize(z);
			}

			else {
				console.log('Invalid Page Size Submitted '+z);
			}
		});
		$(this.optionRegion).append(this.numResultsRegion);
		gSetInputSize(this.id+'NumResultsInput',3,3);
	}
}
function Paginator(data){
	typeof data.currentPage!=='undefined' ? this.currentPage = data.currentPage : this.currentPage = 1;
	typeof data.numResults!=='undefined' ? this.numResults = data.numResults : this.numResults = 10;
	typeof data.showCurRes!=='undefined' ? this.showCurRes = data.showCurRes : this.showCurRes = true;
	typeof data.numResType!=='undefined' ? this.numResType = data.numResType : this.numResType = 0;
	typeof data.plusMinus!=='undefined' ? this.plusMinus = data.plusMinus : this.plusMinus = 5;
	typeof data.pageRange!=='undefined' ? this.pageRange = data.pageRange : this.pageRange = 3;
	typeof data.id!=='undefined' ? this.id = data.id : this.id = 'pagin';
	typeof data.viewResName!=='undefined' ? this.viewResName = data.viewResName : this.viewResName = 'results';
	this.expandState=false;
	if (typeof data.action!=='undefined') {this.action = data.action;}
	else {data.action = function(){alert("No pagination function defined");}}
	if (typeof data.totalResults!=='undefined') {
		this.totalResults = data.totalResults;
		if (typeof data.pare!=='undefined') {
			this.pare = data.pare;
			this.init();
		}
	}
	else {appendDebugLog("No result quantity defined, paginator aborted");}
}
