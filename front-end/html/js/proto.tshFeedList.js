TshFeedList.prototype = {
	constructor: TshFeedList,
	getFeeds : function(){
			clearTimeout(this.checkTimeout);
			this.sourceFunc();
	},
	displayFeeds : function(){
		var feeds = new Array;
		var that = this;
		$(this.container).empty();
		this.data.forEach(function(elem,index){
			feeds.push(
				new TshFeedElement({
					pare:that.container.id,
					data:elem,
					id: elem.id,
					divId: that.id+'_feedElem'+index
				})
			);
			$('#'+that.id+'_feedElem'+index).prop('tsh-id',elem.id);
			$('#'+that.id+'_feedElem'+index).click(function(){that.targetFunc($(this).prop('tsh-id'));});
		});
		this.feeds = feeds;
	},
	update: function(data){
		clearTimeout(this.checkTimeout);
		this.data = data;
		this.displayFeeds();
		this.checkTimeout=setTimeout(TshFeedList.prototype.getFeeds.bind(this),this.updateFrequency);
	},
	init : function(){
		this.container = document.createElement('div');
		this.container.id = this.id;
		$('#'+this.pare).append(this.container);
		this.sourceFunc();
		this.checkTimeout=setTimeout(TshFeedList.prototype.getFeeds.bind(this),this.updateFrequency);
	}
}
function TshFeedList(data){
	this.id = data.id;
	this.pare = data.pare;
	this.sourceFunc=data.sourceFunc;
	typeof data.updateFrequency!=='undefined'? this.updateFrequency = data.updateFrequency : this.updateFrequency = 15000;
	this.targetFunc=data.targetFunc;
	this.init();
}
