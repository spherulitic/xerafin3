XeraActionHandler.prototype = {
	constructor: XeraActionHandler,
	init: function(){
		this.actionList = {};
	},
	findHandler: function(keyword){
		return (keyword in this.actionList);
	},
	add: function(keyword,data){
		var that=this;
		if (!this.findHandler(keyword)){
			if (typeof data.action!=='undefined'){
				this.actionList[keyword] = {'action' : new Function ('d',data.action+'(d)')};
				if (typeof data.watch!=='undefined'){
					if (!this.disable){
						typeof data.watch===typeof true ? this.actionList[keyword].watch = data.watch : this.actionList[keyword].watch = false;
					}
				}
			}
			else {appendDebugLog("No function call attached to keyword ("+keyword+") instruction ignored");}
		}
		else {appendDebugLog("Duplicate instruction ("+keyword+") request in XeraActionHandler, instruction ignored");}
	},
	toggleWatch: function(keyword){
		if (this.findHandler(keyword)){
			this.actionList.watch = !this.actionList.watch;
		}
	},
	list : function(){
		console.log(this.actionList);
		xerafin.error.log.add(this.actionList,'JSON');
	},
	remove: function (keyword){
		if (this.findHandler(keyword)) { delete this.actionlist[keyword]; }
	},
	watchOutput : function(keyword,data) {
		xerafin.error.log.add("Action Watch ("+keyword+") Data->",'action');
		xerafin.error.log.add(data,'JSON');
		console.log("%c Action Watch:["+this.name+"]("+keyword+") Data->","color:white;background:"+this.bgColor+";font-size:1.2em;font-variant:small-caps;");
		console.log(data);
	},
	send: function (keyword,data={},receipt=false) {
		if (this.findHandler(keyword)){
			if (this.actionList[keyword].watch){this.watchOutput(keyword,data);}
			this.actionList[keyword].action(data);
			if (receipt){return true;}
		}
		else {
			xerafin.error.log.add("Instruction not found ("+keyword+") in XeraActionHandler","comment");
			if (receipt){return false;}
		}
	}
}
function XeraActionHandler(d={}){
	typeof d.name!=='undefined'? this.name = d.name : this.name = 'Unspecified';
	typeof d.bgColor!=='undefined'? this.bgColor = d.bgColor:this.bgColor = 'black';
	typeof d.disable!=='undefined'? this.disable = d.disable:this.disable = false;
	this.init();
}
