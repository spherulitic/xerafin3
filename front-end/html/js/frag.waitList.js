WaitListItem.prototype = {
	constructor: WaitListItem,
	init: function(){
		this.reason = 'None';
		this.draw();
	},
	drawHeading: function(handle, time){
		let x = document.createElement('div');
		$(x).css({'border-bottom':'1px solid #555'});
		let y = document.createElement('div');
		let z = document.createElement('div');
		$(y).css({'width':'40%','display':'inline-block','font-size':'1.1em','font-variant':'normal'});
		$(y).html(handle);
		$(z).css({'width':'59%','display':'inline-block','font-size':'0.8em','text-align':'right'});
		$(z).html(time);
		$(x).append(y,z);
		return x;
	},
	drawNameRow: function(name, email){
		let x = document.createElement('div');
		let y = document.createElement('div');
		let z = document.createElement('div');
		$(y).css({'width':'40%','display':'inline-block','font-size':'0.9em','font-variant':'normal'});
		(name.length>1) ? $(y).html(name) : $(y).html(" ");
		$(z).css({'width':'59%','display':'inline-block','font-size':'0.9em','text-align':'right'});
		$(z).html(email)
		$(x).append(y,z);
		return x;
	},
	drawComments: function(comments){
		let x = document.createElement('div');
		if (comments.length>0){
			let y = document.createElement('div');
			$(y).css({'display':'inline-block','font-size':'0.8em','text-align':'left','border-top':'1px solid #999','width':'100%'});
			$(y).html(comments);
			$(x).append(y);
		}
		return x;
	},
	drawResponse: function(){
		let self=this;
		let a = 'silverRowed overviewListButton';
		let x = document.createElement('div');
		$(x).css({'width':'100%','display':'inline-block','margin-top':'5px','border-top':'1px solid #999','padding-top':'5px'});
		this.approve = document.createElement('button');
		$(this.approve).html('Approve');
		$(this.approve).css({'width':'25%','display':'inline-block'});
		$(this.approve).addClass(a);
		this.reject = document.createElement('button');
		$(this.reject).html('Reject');
		$(this.reject).css({'width':'25%','display':'inline-block'});
		$(this.reject).addClass(a);
		this.dropdown = document.createElement('div');
		$(this.dropdown).css({'width':'45%','display':'inline-block','vertical-align':'middle','margin-left':'2%','margin-right':'2%'});
		this.dDown = new XeraSelect ({
			'data': [
					{
						'name':'Inappropriate',
						'value':'Inappropriate Content'
					},
					{
						'name':'Information',
						'value':'Insufficient Information'
					},
					{
						'name':'Trolling',
						'value':'Trolling'
					},
					{
						'name':'None',
						'value':'None'
					}
					],
			'id':'search_list',
			'hasImages':false,
			'direction':'up',
			'val': this.reason,
			'onChange': function(){
				self.reason = self.dDown.val();
			},
			'maxHeight': $(window).height()/10
		});
		$(this.dropdown).append(this.dDown.output());
		$(x).append(this.approve,this.dropdown,this.reject);
		return x;
	},
	drawRow: function(){
		this.box = document.createElement('div');
		$(this.box).css({'font-variant':'small-caps','font-family':'Lato,sans-serif','padding':'5px 10px','box-sizing':'border-box'});
		$(this.box).addClass('steelRowed overviewItem');
		let y = document.createElement('div');
		$(y).html("Comments: "+this.data.comments);
		$(this.box).append(
			this.drawHeading(this.data.handle, this.data.time),
			this.drawNameRow(this.data.firstname+" "+this.data.lastname, this.data.eMail),
			this.drawComments(this.data.comments),
			this.drawResponse()
		);
		return this.box;
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).append(this.drawRow());
	},
	output: function(){
		return this.content;
	}
}
function WaitListItem(data={}){
	this.panel=500;
	this.data=data.data || {};
	console.log(this.data);
	this.init();
}
WaitList.prototype = {
	constructor: WaitList,
	init: function(){
		this.data = new Object();
		this.rows = [];
		this.fetch();
		this.draw();
	},
	drawButtons: function(){
		let self = this;
		let x = document.createElement('div');
		$(x).addClass('overviewItemOptGroup metalBOne');
		let a = "steelRowed overviewAccordionButton overviewListButton";
		$(x).css({'font-variant':'small-caps','font-size':'0.9em','display':'inline-block','width':'100%','text-align':'left','padding':'3px','box-sizing':'border-box','border':'1px solid black'});
		this.refreshButton = document.createElement('button');
		$(this.refreshButton).addClass(a);
		$(this.refreshButton).css({'display':'inline-block','width':'25%'});
		$(this.refreshButton).html("<i class='fa fa-sync-alt'></i> Refresh");
		$(this.refreshButton).on('click',function(){
			//possibly a function to disable interaction until done
			self.fetch();
		});
		this.allowAll = document.createElement('button');
		$(this.allowAll).addClass(a);
		$(this.allowAll).css({'display':'inline-block','width':'25%'});
		$(this.allowAll).html("<i class='fa fa-user-plus'></i> All");
		$(x).append(this.refreshButton,this.allowAll);
	// Add events as well
		return x;
	},
	drawInterface: function(){
		let x = document.createElement('div');
		this.itemBox = document.createElement('div');
		$(this.itemBox).addClass('well well-sm pre-scrollable waitItemBox');
		$(x).append(this.itemBox, this.drawButtons());
		return x;
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).append(this.drawInterface());
	},
	fetch: function(){
		let self=this;
		if (this.statusWait!=='undefined'){clearTimeout(this.statusWait);}
		$.ajax ({
			url:'PHP/getWaitingList.php',
			dataType: 'json',
			type: "POST",
			beforeSend: function(){$("#heading_text_pan"+self.panel).html('Manage <img src="images/ajaxLoad.gif" style="height:0.8em">');},
			success: function(response,responseStatus){
				$("#heading_text_pan"+self.panel).html('Manage');
				self.update(response);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log("Error, status = " + textStatus + " error: " + errorThrown);
				$("#heading_text_pan_500"+self.panel).html('Manage');
			}
		});
	},
	write: function(handle,accept,msg=''){
		let d = {'handle':handle,'response':accept,'msg':msg};
		$.ajax ({
			url:'PHP/authorize.php',
			dataType: 'json',
			data: JSON.stringify(d),
			type: "POST",
			beforeSend: function(){$("#heading_text_pan"+self.panel).html('Manage <img src="images/ajaxLoad.gif" style="height:0.8em">');},
			success: function(response,responseStatus){
				$("#heading_text_pan"+self.panel).html('Manage');
				self.fetch();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log("Error, status = " + textStatus + " error: " + errorThrown);
				$("#heading_text_pan_500"+self.panel).html('Manage');
			}
		});
	},
	approveAll: function(){
		//ajax Call to approve all
		let d = {'handle': Object.keys(self.rows)};
		$.ajax ({
			url:'PHP/massAuthorize.php',
			data: JSON.stringify(d),
			dataType: 'json',
			type: "POST",
			beforeSend: function(){$("#heading_text_pan"+self.panel).html('Manage <img src="images/ajaxLoad.gif" style="height:0.8em">');},
			success: function(response,responseStatus){
				$("#heading_text_pan"+self.panel).html('Manage');
				self.update(response);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log("Error, status = " + textStatus + " error: " + errorThrown);
				$("#heading_text_pan_500"+self.panel).html('Manage');
			}
		});
	},
	addSelectionEvent: function(ind){
		let self=this;
		$(ind).on('click',function(){
			Object.keys(self.rows).forEach(function(i){
				$(i.content).removeClass('highlightRow');
			});
			$(ind).toggleClass('steelRowed highlightRow');
		});
	},
	addEvents: function(i,obj){
		let self=this;
		$(obj.approve).on('click',function(){
			self.write(i,true);
		});
		$(obj.reject).on('click',function(){
			self.write(i,false,obj.reason);
		});
	},
	update: function(d){
		let self=this;
		self.rows = new Array();
		$(this.itemBox).html('');
		Object.entries(d).forEach(function([i,v]){
			console.log(v);
			self.rows[v.handle] = new WaitListItem({'data':v});
			//self.addSelectionEvent(self.rows[v.handle].box);
			self.addEvents(v.handle,self.rows[v.handle]);
			$(self.itemBox).append(self.rows[v.handle].output());
		});
		this.data=d;
		//set comparison (use handle)
	},
	output: function(){
		return this.content;
	}
}
function WaitList(data={}){
	this.init();
}
