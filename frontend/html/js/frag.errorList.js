ErrorListItem.prototype = {
	constructor: ErrorListItem,
	init: function(){
		this.draw();
	},
	getDate: function(d){
		let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + " at " + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
	},
	drawLogLink: function(i){
		let y = document.createElement('div');
		$(y).css({'min-width':'40px','width':'40px','background-color':'black',
		'color':'#black','border-radius':'0.2em','margin':'0px','text-align':'center','font-size':'1.2em','line-height':'1.2em','margin-bottom':'2px',
		'border':'1px solid black','display':'inline-block','cursor':'pointer'});
		$(y).on('click',function(){
			if (typeof debug==='undefined'){initDebug();}
			debug.externImport(i);
		});
		$(y).addClass('highlightRow');
		$(y).html(i);
		return y;
	},
	drawLogListLink: function(){
		let self=this;
		let y = document.createElement('div');
		$(y).css({'min-width':'40px','width':'40px','background-color':'black',
		'color':'#black','border-radius':'0.2em','margin':'0px','text-align':'center','font-size':'1.2em','line-height':'1.2em','margin-bottom':'2px',
		'border':'1px solid black','cursor':'pointer'});
		$(y).on('click',function(){
			$(self.linkAccordion).toggle(500);
		});
		$(y).addClass('silverRowed noselect nodrag');
		$(y).html(dot+dot+dot);
		return y;
	},
	drawLogLinkAccordion: function(){
		let self=this;
		this.linkAccordion = document.createElement('div');
		$(this.linkAccordion).css({'width':'100%','min-width':'100%','text-align':'left'});
		this.data.list.forEach(function(v,i){
			$(self.linkAccordion).append(self.drawLogLink(v));
		});
		$(this.linkAccordion).hide();
		return this.linkAccordion;
	},
	drawLeftBlockRow: function(a,b){
		let y = document.createElement('div');
		let x = document.createElement('div');
		$(x).css({'display':'table-cell','font-family':'Lato,sans-serif','text-align':'left','vertical-align':'middle'});
		$(x).html(a);
		let z = document.createElement('div');
		$(z).css({'display':'table-cell','font-size':'0.8em','padding-left':'5px','color':'black','vertical-align':'middle'});
		$(z).html(b);
		$(y).append(x,z);
		return y;
	},
	drawLeftBlock: function(){
		let x = document.createElement('div');
		let z = document.createElement('div');
		$(z).css({'display':'inline-block','width':'40%'});
		$(x).css({'display':'table','width':'99%','font-family':'Lato,sans-serif','text-align':'left','vertical-align':'middle','border-right':'1px solid #aaa','padding-right':'5px'});
		$(x).append(
			this.drawLeftBlockRow(this.drawLogLink(this.data.newest),this.getDate(new Date(this.data.latest*1000))),
			this.drawLeftBlockRow(this.drawLogListLink(),this.data.instances+' Instance'+(this.data.instances!==1 ? 's':'')),
			this.drawLeftBlockRow(this.drawLogLink(this.data.id),this.getDate(new Date(this.data.time*1000)))
		);
		$(z).append(x);
		return z;
	},
	drawRightBlock: function(){
		let x = document.createElement('div');
		$(x).css({'display':'inline-block','width':'50%','text-align':'left','vertical-align':'top'});
		y = document.createElement('div');
		z = document.createElement('div');
		$(y).css({'display':'inline-block','width':'100%','text-align':'left','font-size':'0.7em'})

		$(y).html(
			this.data.browser + " " + this.data.browserVer+ "<br>"+this.data.OS+"<br>"+this.data.userid+'<br>'+this.data.code
		);
		$(z).css({'width':'80%','font-size':'0.8em'});
		let self=this;
		this.dDown = new XeraSelect({
			'data': this.types,
			'id':'error_status_'+this.data.id,
			'hasImages':false,
			'val': this.data.lowest,
			'direction':'up',
			'onChange': function(){
				self.pare.changeStatus(self.data.id,self.dDown.val());
				//add Ajax Call here
			},
			'zIndex':1000,
			'maxHeight': $(window).height()/4
		});
		$(z).append(this.dDown.output());
		$(x).append(y,z);
		return x;
	},
	drawDataRegion: function(){
		this.dataRegion=document.createElement('div');
		$(this.dataRegion).addClass('steelRowed');
		$(this.dataRegion).css({'margin-bottom':'4px','border':'1px solid black','border-radius':'0.2em','word-break':'break-word','padding':'2px'});
		$(this.dataRegion).append(this.drawLeftBlock(),this.drawRightBlock());
		return this.dataRegion;
	},
	draw: function(){
		this.content=document.createElement('div');
		$(this.content).append(this.drawDataRegion(),this.drawLogLinkAccordion());
	},
	output: function(){
		return this.content;
	}
}
function ErrorListItem(data={}){
	this.data = data.data;
	this.pare = data.pare;
	this.types = data.types;
	this.init();
}

ErrorList.prototype = {
	constructor: ErrorList,
	init: function(){
		this.data = new Object();
		this.types = [{name: "Unknown", value: 0},{name: "Examined", value: 1},{name: "Debugging", value: 2},{name: "Next Update",value:3},{name: "Resolved", value: 4}];
		this.rows = [];
		this.fetch();
		this.draw()

	},
	fetch: function(){
		let d = {'action':'GET_UNIQUE', 'status':this.current};
		let self=this;
		$.ajax({
			url:'/PHP/logError.php',
			data: JSON.stringify(d),
			type: "POST",
			success: function(response,responseStatus){
				let data=JSON.parse(response);
				xerafin.error.log.add('Error Log Received','HTTP');
				//xerafin.error.log.add(self.data,'JSON');
				self.populate(data);

			},
		});
	},
	changeStatus:function(i, s){
		let self=this;
		let d = {'action':'NEW_STATUS','id':i,'status':s};
		xerafin.error.log.add('Status change of ' + i + ' to '+self.types[s].name,'comment');
		$.ajax({
			url:'/PHP/logError.php',
			data: JSON.stringify(d),
			type: "POST",
			success: function(response,responseStatus){
				xerafin.error.log.add('Success','HTTP');
				self.fetch();
			},
		});
	},
	mergeCodes:function(f,t){
		let self=this;
		let d = {'action':'MERGE','from':f,'to':t};
		xerafin.error.log.add('Merging ' + f + ' with '+t,'comment');
		$.ajax({
			url:'/PHP/logError.php',
			data: JSON.stringify(d),
			type: "POST",
			success: function(response,responseStatus){
				let y = JSON.parse(response);
				if (y.result) {
					xerafin.error.log.add('Merge Successful','HTTP');
					self.fetch();
				}
				else {
					xerafin.error.log.add('Merge Failed','HTTP');
				}
			},
		});
	},
	populate:function(d){
		let self=this;
		this.data = d;
		$(this.listRegion).html('');
		this.rows = new Array();
		Object.entries(this.data).forEach(function([i,v]){
			self.rows[i] = new ErrorListItem({'data':v,'types':self.types,'pare':self});
			$(self.listRegion).append(self.rows[i].output());
		});
	},
	drawListRegion:function(){
		this.listRegion = document.createElement('div');
		$(this.listRegion).addClass('well well-sm pre-scrollable');
		$(this.listRegion).css({'background':'transparent','border':'1px solid black','min-height':'340px','margin-bottom':'0px'});
		return this.listRegion;
	},
	updateTypeRegion:function(){
		let self=this;
		this.typeButton.forEach(function(v,i){
			$(self.typeButton[i]).removeClass('highlightRow steelRowed');
			(i === self.current) ? $(self.typeButton[i]).addClass('highlightRow') : $(self.typeButton[i]).addClass('steelRowed');
		});
	},
	drawMergeRow: function(){
		let x = document.createElement('div');
		let a = {'width':'18%','display':'inline-block','background-color':'rgba(26,26,26,0.95)','border-radius':'0.2em','color':'rgb(230,230,210)'};
		let b = {'width':'10%','display':'inline-block','text-align':'right','vertical-align':'middle'};
		let c = {'width':'20%','display':'inline-block','text-align':'center','vertical-align':'middle'};
		let d = {'width':'15%','display':'inline-block','text-align':'center','margin-left':'1%','vertical-align':'middle','margin-left':'9%'};
		$(x).css({'width':'100%','display':'inline-block','padding':'2px','vertical-align':'middle','height':'36px','font-variant':'small-caps'});
		this.mergeLabel = document.createElement('div');
		this.mergeFrom = document.createElement('input');
		$(this.mergeFrom).prop({'type':'number'});
		this.mergeTo = document.createElement('input');
		this.mergeSubmit = document.createElement('button');
		$(this.mergeSubmit).addClass('silverRowed overviewListButton');
		$(this.mergeSubmit).css(d);
		$(this.mergeTo).prop({'type':'number'});
		y = document.createElement('div');
		z = document.createElement('div');
		$(this.mergeFrom).css(a);
		$(this.mergeTo).css(a);
		$(this.mergeLabel).css(c);
		$(z).css(b);
		$(y).css(b);
		$(z).html('Merge:');
		$(y).html('With:');
		$(this.mergeLabel).html('Merge Codes');
		$(this.mergeSubmit).html('Merge');
		let self=this;
		$(this.mergeSubmit).on('click',function(){
			self.mergeCodes($(self.mergeFrom).val(),$(self.mergeTo).val());
		});
		$(x).append(this.mergeLabel, z, this.mergeFrom, y, this.mergeTo, this.mergeSubmit);
		return x;
	},
	drawToolAccordion:function(){
		this.toolAccordion = document.createElement('div');
		$(this.toolAccordion).css({'border':'1px solid black','font-size':'0.9em','color':'black','text-align':'left','font-family':'Lato,sans-serif'});
		$(this.toolAccordion).addClass('steelRowed');
		$(this.toolAccordion).append(this.drawMergeRow());
		$(this.toolAccordion).hide();
		return this.toolAccordion;
	},
	drawToolRegion:function(){
		let self=this;
		this.toolRegion = document.createElement('div');
		$(this.toolRegion).css({'margin-bottom':'10px'});
		let a = '<i class="fa fa-sort-down"></i>';
		let b = '<i class="fa fa-sort-up"></i>';
		let x = document.createElement('div');
		$(x).addClass('metalBOne');
		$(x).css({'border':'1px solid black','font-size':'0.9em','color':'rgb(230,230,210)','font-variant':'small-caps','margin-top':'10px'})
		let y = document.createElement('div');
		$(y).html('Tools');
		$(y).css({'text-align':'left','width':'90%','display':'inline-block'});
		let z = document.createElement('div');
		$(z).html(a);
		$(z).css({'display':'inline-block','width':'8%','text-align':'center'});
		$(z).on('click',function(){
			$(self.toolAccordion).toggle(500);
			$(z).html() === a ? $(z).html(b) : $(z).html(a);
		});
		$(x).append(y,z);
		$(this.toolRegion).append(x,this.drawToolAccordion());
		return this.toolRegion;
	},
	drawTypeRegion:function(){
		this.typeButton = new Array();
		let self=this;
		this.typeRegion = document.createElement('div');
		//$(this.typeRegion).addClass
		this.types.forEach(function(v,i){
			self.typeButton[i] = document.createElement('button');
			$(self.typeButton[i]).html(v.name);
			$(self.typeButton[i]).addClass('errorTypeButton overviewListButton steelRowed');
			$(self.typeButton[i]).on('click',function(e){
				self.current = i;
				self.fetch();
				self.updateTypeRegion();
			});
			$(self.typeRegion).append(self.typeButton[i]);
		});
		this.updateTypeRegion();
		return this.typeRegion;
	},
	draw: function(){
		this.content=document.createElement('div');
		$(this.content).append(this.drawListRegion(),this.drawToolRegion(),this.drawTypeRegion());
		//$(this.content).css({'background-color':'black'});
	},
	update: function(d){
	},

	output: function(){
		return this.content;
	}
}
function ErrorList(data={}){
	this.current = 0;
	this.init();
}
