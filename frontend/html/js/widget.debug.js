function initDebug(){
	debug = new Debug();
	debug.output();
}
Debug.prototype = {
	constructor:Debug,
	init: function(){
		let self=this;
		this.statuses = new Object();
		if (!document.getElementById("pan_"+this.panel)) {
			let panelData = {
			"title": "Debug",
			"tooltip": "<p>Debug Window</p>",
			"contentClass" : "panelContentDefault",
			};


			generatePanel(Number(this.panel),panelData,"leftArea",function(){self.update();},function(){self.hide();});
		}
		this.draw();
	},

	getImportedData: function(i){
		let self=this;
		$.ajax({
			type: "POST",
			url: "errorLogs/"+i+".error",
			success: function(res, responseStatus) {
				let d = JSON.parse(res);
				self.main.add('Log file '+i+' imported','HTTP');
				$(self.fileStatus).html("Showing error log #"+i);
				self.imported.insert(d);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				self.main.add("errorLogs/"+i+".error",'HTTP');
				self.main.add("jqXHR:"+jqXHR.status+" text: "+ errorThrown,"error");
				if (jqXHR.status == 404){
					$(self.fileStatus).html("Error log #"+i+" not found!");
				}
			}
		});
	},
	drawImportedRow: function(){
		let self=this;
		let w= document.createElement('div');
		$(w).css({'text-align':'left'});
		let x= document.createElement('div');
		$(x).addClass('steelRowed');
		$(x).css({'display':'inline-block','text-align':'left','color':'black','width':'100%','font-family':'Lato,sans-serif','font-variant':'small-caps','padding':'3px'});
	    this.idInput = document.createElement('input');
		$(this.idInput).css({'display':'inline-block','background-color':'rgba(26,26,26,0.9)','color':'rgb(230,230,210)','width':'20%'});
		$(this.idInput).prop({'type':'number'});
		$(this.idInput).on('keypress',function(e){
			if (e.which==13){
			e.preventDefault();
			self.getImportedData($(this).val());
			}
		});
		this.fileStatus = document.createElement('div');
		$(this.fileStatus).css({'width':'40%','text-align':'right','font-size':'0.8em','display':'inline-block','padding-left':'2%'})
		$(this.fileStatus).html('Waiting for error log #');
		let y = document.createElement('div');
		$(y).css({'display':'inline-block','width':'28%','text-align':'right','margin-right':'10px','font-size':'0.9em'});
		$(y).html('Log ID: ');
		$(x).append(y,this.idInput,this.fileStatus);
		$(w).append(x);
		return w;
	},
	externImport:function(id){
		$(this.idInput).val(id);
		this.getImportedData(id);
		this.tabs.externShowTabContent(1);
	},
	drawButtonBank: function(target,desc){
		this.statuses[desc] = new Object();
		let self=this;
		let names = ['comment','old','HTTP','JSON','action','event','error'];
		let x = document.createElement('div');
		names.forEach(function(v,i){
			self.statuses[desc][v] = true;
			let y = document.createElement('div');
			$(y).addClass('silverRowed nodrag noselect');
			$(y).css({'border':'1px solid #555','font-size':'0.8em','width':'13%','font-variant':'small-caps','display':'inline-block','height':'25px','vertical-align':'middle','line-height':'25px'});
			$(y).html(v);
			$(y).on('click',function(){
				$(y).toggleClass('silverRowed metalBOne');
				self.statuses[desc][v] = !self.statuses[desc][v];
				target.updateStates(self.statuses[desc]);
			});
			$(x).append(y);
		});
		return x;
	},
	draw: function(){
		this.content=document.createElement('div');
		$(this.content).addClass('');
		this.tabs = new XeraTabGenerator({'id':'debugTabs','titles':['Current','Imported']});
		$(this.tabs.contents[0]).append(this.main.output(),this.drawButtonBank(this.main,'main'));
		$(this.tabs.contents[1]).append(this.drawImportedRow(),this.imported.output(),this.drawButtonBank(this.imported,'imported'));
		$(this.main.content).addClass('well well-sm pre-scrollable');
		$(this.imported.content).addClass('well well-sm pre-scrollable');
		$(this.main.content).css({'background':'transparent','border':'1px solid black','text-align':'left','height':'400px','width':'100%'});
		$(this.imported.content).css({'background':'transparent','border':'1px solid black','text-align':'left','height':'400px','width':'100%'});
		$(this.content).append(this.tabs.output());
	},
	update: function(){
		$(this.content).html();
		$(this.content).append(xerafin.error.log.output());
	},
	output: function(){
		$('#content_pan_'+this.panel).append(this.content);
	},
	hide: function(){
		$('#pan_'+this.panel).remove();
		delete this;
	}
	//Will probably need an update Cycle timeout in here to check for mutations in log content
}
function Debug(data={}){
	this.main = data.main || xerafin.error.log
	this.imported = new XErrorLog();
	this.panel=501;
	this.init();
}
