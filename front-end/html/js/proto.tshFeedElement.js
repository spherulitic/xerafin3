TshFeedElement.prototype = {
	constructor: TshFeedElement,
	getTimeDiff:function(a,b){
		var x = (b-a)/1000;var res;var gap;
		if (x>=86400){gap = "day(s)";res = Math.floor(x/86400);}
		if (x<86400){gap = "hour(s)";res = Math.floor(x/3600);}
		if (x<3600){gap = "minute(s)";res = Math.floor(x/60);}
		if (x<60){gap ="second(s)";res = Math.floor(x);}
		return res+" "+gap;
	},
	timeFormat:function(a){
		var d = new Date(a);
		var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + " @ " + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
	},
	init:function(){
		this.elem = document.createElement('div');
		this.elem.id = this.divId;
		this.subjectRow = document.createElement('div');
		this.activeBg = document.createElement('div');
		this.activeRow = document.createElement('div');
		this.titleRow = document.createElement('div');

		this.statusRow = document.createElement('div');
		$(this.elem).addClass('steelRowed noselect tshFeedMain');
		$(this.subjectRow).addClass('tshFeedSubjectRow');
		$(this.activeBg).addClass('tshFeedActiveBg');
		$(this.activeRow).addClass('tshFeedActiveRow');
		$(this.titleRow).addClass('tshFeedTitleRow');
		$(this.statusRow).addClass('tshFeedStatusRow');

		$(this.titleRow).html(this.data.name);
		if (this.data.active==1){}
		if (this.data.active==1){
			if (this.data.pause==0){
				$(this.statusRow).addClass('highlightRow');
				$(this.activeRow).html("Last Updated: "+this.getTimeDiff(this.data.lastUpdate*1000,(new Date()).getTime())+" ago.");
			};
			if (this.data.pause==1){
				$(this.statusRow).addClass("goldRowed");
				if (typeof (this.data.pauseMess) !=='undefined'){
					$(this.activeRow).html("<marquee>"+this.data.pauseMess+"</marquee>");
				}
			};
		}
		if (this.data.active==0){
			$(this.statusRow).addClass("metalBOne");
			$(this.activeRow).html("Play ended on "+(this.timeFormat(this.data.lastUpdate*1000)));
		}
		if (!this.data.connect){
			$(this.statusRow).addClass("redRowed");
			$(this.activeRow).html(
			"<marquee>Failed to connect to source on last attempt.  Last updated: "+(this.timeFormat(this.data.lastUpdate*1000))+"</marquee>");
		}
		$(this.subjectRow).append(this.titleRow,this.statusRow);
		$(this.activeBg).append(this.activeRow);
		$(this.elem).append(this.subjectRow,this.activeBg);
		$('#'+this.pare).append(this.elem);
	}
}
function TshFeedElement(data){
	typeof data.divId!=='undefined'? this.divId=data.divId:this.divId = "TshElem";
	if (typeof data.id!=='undefined') {
		this.id=data.id;
		if (typeof data.data!=='undefined'){
			this.data=data.data;
			if (typeof data.action!=='undefined'){
				this.action = data.action;
			}
			if (typeof data.pare!=='undefined'){
				this.pare=data.pare;
				this.init();
			}
			else {console.log("TshFeedElement Error: No Parent Object Assigned.  Instance Aborted");}
		}
		else {console.log("TshFeedElement Error: No Relevant Data Provided.  Instance Aborted");}
	}
	else {console.log("TshFeedElement Error: No TSH ID provided. Instance Aborted");}
}
