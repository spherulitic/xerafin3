XeraActionListener.prototype = {
	constructor: XeraPanelUI,
	init: function(){
		this.childUI = new Array();
		this.actionListener= new Array();
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
				console.log('%c ['+this.name+'] Data Watch ('+type+') Data->','color:white;background:black;font-size:1.2em;font-variant:small-caps;');
				console.log(data);
				appendDebugLog('['+this.name+'] Data Watch ('+type+') Data->');
				appendDebugLog(data);
			}
			this.actionListener[type].funct(data);
		}
	}
}

function XeraActionListener(data){
	this.name = data.name || "Undefined Listener";
	if (typeof data.eventHandler!=='undefined') {
		this.eventHandler = data.eventHandler;
	}
	else {appendDebugLog("XeraUI Notice: No eventHandler [.eventHandler] defined.  This may cause problems.");}
	this.init();
}
