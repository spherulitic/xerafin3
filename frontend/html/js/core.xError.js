XErrorTicket.prototype = {
	constructor: XErrorDialog,
	init: function(){
	}
}
function XErrorTicket(data={}){
	this.init();
}

XErrorDialog.prototype = {
	constructor: XErrorDialog,
	init: function(){
		this.draw();
	},
	drawHeading: function(){
		let x = document.createElement('div');
		$(x).css({'font-variant':'small-caps','color':'rgb(230,230,210)','text-align':'left','display':'inline-block','width':'100%','padding':'5px','opacity':1,'background-color':'black'});
		$(x).addClass('MetalBOne');
		$(x).html('An Error Has Occurred...');
		return x;
	},
	drawDetail: function(){
		let x = document.createElement('div');
		$(x).addClass('HighlightRow');
		$(x).css({'color':'black','text-align':'left','display':'inline-block','width':'100%','padding':'5px','background-color':'rgb(140,176,48,1)','font-family':'Lato, sans-serif','margin-bottom':'0px'});
		if (this.data.common!==-1){
			$(x).html("This glitch is known to us.  It was first reported on "+this.data.time+".  A full log of the event has been sent to our team.");
		}
		else {
			$(x).html("This glitch is new to this version of Xerafin.  An error report has been sent to the developers.");
		}
		return x;
	},
	drawStatus:function(){
		let x = document.createElement('div');
		$(x).addClass('MetalBOne');
		$(x).css({'font-size':'0.9em','padding-right':'5px','font-family':'Lato, sans-serif','color':'rgb(230,230,210)','text-align':'right','display':'inline-block','width':'100%','background-color':'#111','font-style':'italic'});
		let y = ((this.data.common!==-1) ? "Error Thread: <span style='color:#999'>"+this.data.common+"</span>&nbsp;&nbsp;&nbsp;" : "") + "Error Code: <span style='color:#999'>"+this.data.code+"</span>&nbsp;&nbsp;&nbsp; Status: <span style='color:#999'>"+this.data.state+"</span>";
		$(x).html(y);
		return x;
	},
	drawClose:function(){
		let self=this;
		let x = document.createElement('div');
		$(x).css({
			'font-variant':'small-caps','text-align':'center',
			'display':'inline-block','width':'100%','opacity':1,'padding-top':'5px','padding-bottom':'5px','background-color':'black','margin-top':'0px'});
		$(x).addClass('MetalBOne');
		this.closeButton = document.createElement('button');
		$(this.closeButton).addClass('overviewListButton silverRowed');
		$(this.closeButton).css({'width':'25%','color':'black','margin':'auto','margin-top':'0px'});
		$(this.closeButton).html('Close');
		$(this.closeButton).on('click',function(e){
			e.stopPropagation();
			self.overlay.clear();
			delete self;
		});
		$(x).append(this.closeButton);
		return x;
	},
	draw: function(){

		this.content = document.createElement('div');
		$(this.content).css({'background-color':'black','margin':'auto','width':'min(90vw, 500px)','margin-top':'20vh','opacity':'1','border':'2px solid black','border-radius':'0.6em'})
		$(this.content).append(this.drawHeading(),this.drawDetail());
		$(this.content).append(this.drawStatus());
		$(this.content).append(this.drawClose());
	},
	output: function(){
		this.overlay = new Overlay({'content':this.content});
	}
}

function XErrorDialog(data={}){
	this.data = data;
	this.init();
}

XErrorLog.prototype = {
	constructor: XErrorLog,
	init: function(){
		this.content = document.createElement('div');
		$(this.content).css({'text-align':'left','font-size':'0.75em'});
		this.data = new Array();
		this.add("Log Initiated",'comment');
	},
	getTimeTaken: function(t){
		let tArray = [86400000,3600000,60000,1000,1];
		let tText = ['d:','h:','m:','s:','ms'];
		let tD = t;
		let tStr ="";
		tText.forEach(function(v,i){
			let tVal = Math.floor(tD/tArray[i]);
			if (t>=tArray[i]){tStr+=tVal+tText[i];}
			tD = tD-(tVal*tArray[i]);
		});
		return tStr;
	},
	drawTableRow: function(d){
		let a = new Object();
		a = {
			'comment': {'font-style':'italic','color':'green'},
			'HTTP': {'color':'skyblue'},
			'JSON': {'color':'#ccc','word-break':'break-all'},
			'error': {'color':'red','font-weight':'bold'},
			'value': {'color':'yellow'},
			'old': {'color':'#999','font-style':'italic'},
			'action': {'color':'cyan','font-style':'italic'},
			'event': {'color':'orange','font-style':'italic'}
		}
		if (typeof a[d.type]==='undefined'){d.type = 'comment';}
		let x = document.createElement('tr');
		$(x).css(a[d.type])
		$(x).css({'border-bottom':'1px solid #555','min-width':'99%','width':'99%'});
		$(x).prop({'data-type': d.type});

		let y = document.createElement('td');
		$(y).html(this.getTimeTaken(d.time));
		$(y).css({'padding-right':'1%','min-width':'17%','width':'17%'});
		let z = document.createElement('td');
		$(z).css({'width':'80%','min-width':'80%'});
		$(z).html(d.text);
		$(x).append(y,z);
		if (!this.show[d.type]){$(x).hide();}
		return x;
	},
	append: function(v){
		$(this.table).append(this.drawTableRow(v));
	},
	removeFirst: function(){
		$(this.table).children().eq(0).remove();
	},
	insert:function(d){
		this.data = d;
		this.draw();
	},
	draw: function(){
		let self=this;
		$(this.content).html('');
		this.table = document.createElement('table');
		$(this.table).css({'width':'99%'});
		this.data.forEach(function(v,i){
			if (self.show[v.type]){
				$(self.table).append(self.drawTableRow(v));
			}
		});
		$(this.content).append(this.table);
	},
	updateStates: function(obj){
		this.show = obj;
		this.draw();
	},
	add: function(x,type){
		if (type==='JSON'){x = JSON.stringify(x);}
		let y = {
			'time': Date.now() - this.started,
			'type':type,
			'text':" "+x
		}
		this.data.push(y);
		this.count++;
		this.append(y);
		if (this.data.length>this.maxLength) {
			let x = this.data.slice(Math.max(this.data.length - this.maxLength, 0));
			this.removeFirst();
			this.data = x;
		}
		this.draw();
	},
	output: function(){
		return this.content;
	}
}
function XErrorLog(data={}){
	this.maxLength = data.maxLength || 100;
	this.show = {'comment':true,'HTTP':true,'error':true,'JSON':true,'old':true,'value':true,'action':true,'event':true}
	if (typeof data.show!=='undefined'){
		Object.entries(data.show).forEach(function([i,v]){
			if (typeof this.show[i]!=='undefined'){this.show[i] = v;}
		});
	}
	this.count= 0;
	this.started = Date.now();
	this.init();
}

XError.prototype = {
	constructor: XError,
	init: function(){
		this.log = new XErrorLog({'maxLength':'200'});
	},
	buildError: function(e,f,g,h,i){
		let x;
		let y;
		let z;
		typeof h!=='undefined' ? y = ','+h : y = '';
		if (typeof i==='object' && i!==null) {
			(typeof i.stack==='string') ? z = " Stack Trace: "+i.stack : z = "Error: "+i;
		}
		else {
			z = "";
		}
		x = e+" in "+f+" at "+g+y+z;
		return x;
	},
	getDate: function(d){
		let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + " at " + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
	},
	createDialog: function(){
		this.dialog = new XErrorDialog({'common':this.common,'code':this.code,'time':this.time,'state':this.state});
		this.dialog.output();
	},
	generateError: function(){
		let d = {
				'action': 'NEW',
				'user': userid,
				'ident': this.errorHash,
				'browser': this.info.browser,
				'browserVer': this.info.browserMajorVersion +' (' + this.info.browserVersion + ')',
				'OS': this.info.os +' '+ this.info.osVersion,
				'screen': this.info.screen,
				'mobile':this.info.mobile,
				'log':this.log.data
			}
		let self=this;
		$.ajax({
			type: "POST",
			url: "/PHP/logError.php",
			data: JSON.stringify(d),
			success: function(response,responseStatus){
				self.log.add('Generate Error Return:','comment');
				let y = JSON.parse(response);
				self.log.add(y,'JSON');
				self.code = y.id;
				self.createDialog();
				//do something with response (get id, forward to XErrorDialog)
			},
			error : function(jqXHR, textStatus, errorThrown) {
				self.log.add("logError.php","comment");
				self.log.add("jqXHR:"+jqXHR.status+" text: "+ errorThrown,"error");
			}
		});
	},
	processError: function(d){
		let code, state;
		//self.log.add("Error Data","comment");
		//self.log.add(d,"JSON");
		(d.found) ? this.common = d.id : this.common = -1;
		(d.found) ? this.state = d.status : this.state = null;
		this.time = this.getDate(new Date(d.time*1000))
		this.generateError();
	},
	checkLogs: function(){
		let self=this;
		let d = {'user':(userid || -1), 'ident':this.errorHash};
		$.ajax({
			type: "POST",
			url: "PHP/checkErrorLogs.php",
			data: JSON.stringify(d),
			success: function(res, responseStatus) {
				let d = JSON.parse(res);
				self.log.add('Error Log Check','comment');
				self.log.add(d,'JSON');
				self.processError(d);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				appendDebugLog("Error checking Error history, status = " + textStatus + " error: " + errorThrown);
			}
		});
	},
	newError: function(e,f,g,h,i){
		this.error = this.buildError(e,f,g,h,i);
		this.log.add(this.error,'error');
		this.errorHash = md5(this.error);
		this.checkLogs();
	}
}
function XError(data={}){
	let self=this;
	addEventListener('error', e => {
		const { message,source,lineno,colno,error } = e;
		console.log(e);
		self.newError(message, source, lineno, colno, error);
	});
	//window.onerror = function(e,f,g,h,i){self.newError(e,f,g,h,i);}
	this.info = data.userSource || jscd;
	this.init();
}
