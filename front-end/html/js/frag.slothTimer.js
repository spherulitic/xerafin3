SlothTimer.prototype = {
	constructor: SlothTimer,
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).addClass('slothTimerContainer');
		this.timeSpan = document.createElement('span');
		$(this.timeSpan).addClass('slothTimer');
		this.milliSpan = document.createElement('span');
		$(this.milliSpan).addClass('slothTimer slothTimerMilli');
		$(this.content).append(this.timeSpan,this.milliSpan);
	},
	start: function(){
		this.startTime = new Date().getTime();
		this.update();
		this.updateLoop = setInterval(SlothTimer.prototype.update.bind(this),this.frequency);
	},
	stop: function(){
		if (this.updateLoop!=='undefined'){clearInterval(this.updateLoop);}
		console.log("STOP");
		this.update();
	},
	report: function(){
		return this.result;
	},
	updateSpans: function(d,h,m,s,z){
		$(this.timeSpan).html((d>0 ? d+":" : "")+(h>0 ? (h<10 ? "0"+h+":" : h+":") : "") + (m<10 ? "0"+m+":" : m+":") + (s<10 ? "0"+s : s));
		$(this.milliSpan).html(":"+(z<100 ? "0" : "")+(z<10 ? "0" : "")+z);
	},
	adjust: function(d){
		let x = new Date(d);
		this.updateSpans(Math.floor(x/(60*60*1000*24)), x.getUTCHours()-1, x.getUTCMinutes(), x.getUTCSeconds(), x.getUTCMilliseconds());
		this.result = x;
	},
	update: function(){
		let x = new Date(new Date().getTime()-this.startTime);
		this.updateSpans(Math.floor(x/(60*60*1000*24)), x.getUTCHours()-1, x.getUTCMinutes(), x.getUTCSeconds(), x.getUTCMilliseconds());
		this.result = x;
	},
	reset: function(){
		let x = new Date(0);
		this.updateSpans(Math.floor(x/(60*60*1000*24)), x.getUTCHours()-1, x.getUTCMinutes(), x.getUTCSeconds(), x.getUTCMilliseconds());
	},
	init: function(){
		this.draw();
	},
	output: function(){
		return this.content;
	}
}
function SlothTimer(data={}){
	data.frequency!=='undefined' ? this.frequency = data.frequency : this.frequency = 89;
	this.init();
}
