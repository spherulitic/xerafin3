AdminSummary.prototype = {
	constructor: AdminSummary,
	init: function(){
		this.draw();
		this.fetch();
	},
	drawIcon: function(d){
		let x = document.createElement('div');
		$(x).addClass('manageIcons');
		let z = document.createElement('span');
		$(z).html("<i class='"+d.icon+"'></i>");
		$(z).css({'color':d.color});
		$(x).append(z);
		return x;
	},
	drawValue: function(i,d){
		let x = document.createElement('div');
		$(x).addClass('manageValue');
		this[i].value = document.createElement('span');
		$(this[i].value).html(d);
		$(x).append(this[i].value);
		return x;
	},
	drawSubject: function(i,d){
		x = document.createElement('div');
		$(x).addClass('manageSummaryItem');
		let y= this.drawIcon(d);
		let z= this.drawValue(i,d.value);
		$(x).append(y,z);
		return x;
	},
	drawItems: function(){
		this.summary = document.createElement('div');
		$(this.summary).addClass('steelRowed manageWrapper nodrag noselect');
		let self=this;
		Object.entries(this.inputs).forEach(function([i,v]){
			self[i] = new Object();
			self[i].output = self.drawSubject(i,v);
			$(self[i].output).css({'display':'inline-block'});
			$(self.summary).append(self[i].output);
		});
		return this.summary;
	},
	draw: function(){
		this.content = document.createElement('div');
		this.content.id = this.id;
		$(this.content).append(this.drawItems());
	},
	output: function(){
		return this.content;
	},
	update: function(d){
		let self=this;
		Object.entries(d).forEach(function([i,v]){
			$(self[i].value).html(v);
		});
	},
	fetch: function(){
		let self=this;
		if (this.statusWait!=='undefined'){clearTimeout(this.statusWait);}
		$.ajax ({
			url:'PHP/getUserCounts.php',
			dataType: 'json',
			type: "POST",
			beforeSend: function(){$("#heading_text_pan"+self.panel).html('Manage <img src="images/ajaxLoad.gif" style="height:0.8em">');},
			success: function(response,responseStatus){
				$("#heading_text_pan"+self.panel).html('Manage');
				self.update(response);
				this.statusWait= setTimeout(AdminSummary.prototype.fetch.bind(self),self.refreshRate);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log("Error, status = " + textStatus + " error: " + errorThrown);
				$("#heading_text_pan_500"+self.panel).html('Manage');
				this.statusWait= setTimeout(AdminSummary.prototype.fetch.bind(self),self.refreshRate);
			}
		});
	}
}
function AdminSummary(data = {}){
	this.id = data.id || 'drawSummary';
	this.refreshRate = data.refreshRate || 20000;
	this.inputs = data.inputs || {
		'users': {
			'icon':'fa fa-user',
			'color':'rgba(48,140,176,0.95)',
			'value':0
		},
		'wait': {
			'icon':'fa fa-user-plus',
			'color':'rgba(140,176,48,0.95)',
			'value':0
		},
		'links': {
			'icon':'fa fa-link',
			'color':'white',
			'value':0
		},
		'errors': {
			'icon':'fa fa-bug',
			'color':'rgba(176,72,72,0.95)',
			'value':0
		},
	}
	this.init();
}
