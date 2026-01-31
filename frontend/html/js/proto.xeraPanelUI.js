XeraPanelUI.prototype = {
	constructor: XeraPanelUI,
	init: function(){
		if (Number(this.targetPanel)===20){this.targetPanel='1';}
		if (!document.getElementById("pan_"+this.targetPanel+(typeof this.variant!=='undefined' ? '_'+this.variant:''))){
			var panelData = {
				"contentClass" : "panelContentDefault",
				"title": this.title,
				"minimizeObject": "content_pan_"+this.targetPanel+(typeof this.variant!=='undefined' ? '_'+this.variant:''),
				"closeButton": false,
				"refreshButton" : false,
				"tooltip": "<p>Something helpful will go here.</p>"
			};
			if (typeof this.variant!=='undefined'){panelData.variant = this.variant;}
			generatePanel(this.targetPanel, panelData, this.targetColumn);
		}
		this.content = document.createElement('div');
		this.content.id = this.id;
		this.childUI = new Array();
		this.actionListener= new Array();
		$('#content_pan_'+this.targetPanel+(typeof this.variant!=='undefined' ? '_'+this.variant:'')).append(this.content);
	},
	addActionListener: function(type, data){
		this.actionListener[type]={};
		this.actionListener[type].funct=new Function('d',data.action+"(d);");
		this.actionListener[type].watch=false;
		if (typeof data.watch!=='undefined'){
		if (typeof data.watch === typeof true) {this.actionListener[type].watch = data.watch;}
		}
	},
	addChild: function(data){
		this.childUI[data.name] = data.child;
		this.childUI[data.name].action = new Function('t','d','r=false',data.actionHandler+'.send(t,d,r)');
	},
	addChildListeners: function(data){
		var that=this;
		data.forEach(function(row,index){
			that.addActionListener(row[0], row[1]);
		});
	},
	update: function (type,data){
		if (typeof this.actionListener[type]!=='undefined'){
			if (this.actionListener[type].watch){
				if (this.disableWatch!==true) {
					//console.log('%c Data Watch ('+type+') Data->','color:white;background:black;font-size:1.2em;font-variant:small-caps;');
					xerafin.error.log.add('Data Watch ('+type+') Data->','event');
					xerafin.error.log.add(data,'JSON');
					xerafin.error.log.add(' ' + this.disableWatch + ' ' ,'comment');
				}
			}
			this.actionListener[type].funct(data);
		}
	}
}

function XeraPanelUI(data){
	if (typeof data.id!=='undefined') {
		this.id=data.id;
		typeof data.disableWatch!=='undefined' ? this.disableWatch = data.disableWatch : this.disableWatch = false;
		if (typeof data.targetPanel!=='undefined') {

			this.targetPanel = data.targetPanel;
			typeof data.targetColumn!=='undefined' ? this.targetColumn = data.targetColumn : this.targetColumn = 'leftArea';
			this.className = data.className || "xeraOverviewUI";
			typeof data.title!=='undefined' ? this.title = data.title : this.title = 'Unnamed';
			if (typeof data.eventHandler!=='undefined') {
				this.eventHandler = data.eventHandler;
			}
			if (typeof data.variant!=='undefined') {this.variant = data.variant;}
			else {appendDebugLog("XeraUI Notice: No eventHandler [.eventHandler] defined.  This may cause problems.");}
			this.init();
		}
		else {appendDebugLog("XeraUI Error: No target panel [.targetPanel] defined.  Init aborted") ;}
	}
	else {appendDebugLog("XeraUI Error: No div wrapper id [.id] defined.  Init aborted");}
}
