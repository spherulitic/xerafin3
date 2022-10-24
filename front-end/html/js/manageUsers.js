function initManageUsers(){
	manageUsers = new ManageUsers();
	manageUsers.show();
}

ManageUsers.prototype = {
	constructor:ManageUsers,
	init: function(){
		let self=this;
		if (!document.getElementById("pan_"+this.panel)) {
			let panelData = {
			"title": "Manage",
			"tooltip": "<p>Primarily to set privs, but will increase in functionality over time</p>",
			"contentClass" : "panelContentDefault",
			"minimizeObject": "manageUsers",
			"refreshButton" : true
			};
			generatePanel(Number(this.panel),panelData,"leftArea","",function(){self.hide();});
			this.draw();
		}
	},

	addSearchEvent:function() {
		let self=this;
		$(this.searchInput).on("keypress",function(e){
			if (($(self.searchInput).val().length>2) || ($(self.dDown).val()=="secLevel")){
				self.getSearchResults($(self.SearchInput).val(),$(self.dDown).val());
			};
		});
	},
	drawSearchDialog: function() {
		let x= document.createElement('div');
		$(x).css({'display':'inline-block','border':'1px solid black','padding':'3px 2px'})
		$(x).addClass('steelRowed');
		this.searchInput = document.createElement('input');
		$(this.searchInput).css({'width':'60%','display':'inline-block','margin':'0px 3px','background-color':'rgb(26,26,26)!important','color':'rgb(230,230,210)'});
		this.addSearchEvent();
		this.options = new Array();
		let self=this;
		Object.entries(this.searchMethod).forEach(function([i,v]){
			self.options.push({'name':v, 'value':i});
		});
		this.dropdown = document.createElement('div');
		$(this.dropdown).css({'width':'30%','display':'inline-block','margin-right':'2%','vertical-align':'middle','padding':'0px'});
		this.dDown = new XeraSelect ({
			'data': this.options,
			'id':'search_list',
			'hasImages':false,
			'val': this.searchMode,
			'onChange': function(){
				self.searchMode = self.dDown.val();
			},
			'maxHeight': $(window).height()/4
		});
		$(this.dropdown).append(this.dDown.output());
		$(x).append(this.dropdown,this.searchInput);
		return x;

	},
	drawSearch: function() {
		this.searchRegion = document.createElement('div');
		$(this.searchRegion).addClass('well well-sm pre-scrollable');
		$(this.searchRegion).css({'height':'200px','background':'transparent','padding':'3px','vertical-align':'middle','margin':'auto'});
		$(this.searchRegion).append(this.drawSearchDialog());
		return this.searchRegion;
	},
	initResultsTable: function(){
		this.resultsTable = document.createElement('table');
		$(this.resultsTable).addClass('searchContent');
		let x = document.createElement('tr');
		let y = ["","Xid", "Handle", "Name", "Privs"];
		y.forEach(function(v){
			let z = document.createElement('th');
			$(z).html(v);
			$(x).append(z);
		});
		$(this.resultsTable).append(x);
		return this.resultsTable;
	},
	highlightResultRow: function(ind){
		let self=this;
		this.results.forEach(function(v,i){
			$(self.results[i]).removeClass('highlightRow');
			(i === ind) ? $(self.results[i]).addClass('highlightRow') : $(self.results[i]).addClass('metalBOne');
		});
	},
	addClickEvent: function(row, i){
		let self=this;
		$(row).on('click',function(){
			self.highlightResultRow(i);
			self.displayData = new AdminProfile();
			//showPerson
		});
	},
	addResultsRow: function(d, i){
		let self=this;
		let x = document.createElement('tr');
		let img = new Image();
		img.src = d.photo;
		$(img).css({'height':'25px','width':'25px'});
		let y = [img, d.xid, d.handle, d.name, d.secLevel];
		y.forEach(function(v){
			let z = document.createElement('td');
			$(z).html(v);
			$(x).append(z);
		});
		this.addClickEvent(x, i);
		return x;
	},
	drawResultRegion: function(){
		this.resultRegion = document.createElement('div');
		$(this.resultRegion).addClass('well well-sm pre-scrollable');
		$(this.resultRegion).css({'min-height':'400px'});
		$(this.resultRegion).hide();
		$(this.resultRegion).append(this.initResultsTable());
		return this.resultRegion;
	},
	draw: function() {
		this.summary = new AdminSummary({'refreshRate':30000});
		this.waitList = new WaitList({});
		this.errorList = new ErrorList({});
		this.content = document.createElement('div');
		this.content.id = "manageUsers";
		this.tabs = new XeraTabGenerator({'id':'manageUserTabs','titles':['Search', 'Waiting', 'Links', 'Errors']});
		$(this.tabs.contents[0]).append(this.drawSearch(),this.drawResultRegion());
		$(this.tabs.contents[1]).append(this.waitList.output());
		$(this.tabs.contents[3]).append(this.errorList.output());
		$(this.content).append(this.tabs.output());
	},
	show: function() {
		$('#'+this.pare).append(this.summary.output(),this.content);
	},
	hide: function() {
		$('#pan_'+this.panel).remove();
		delete (this);
	},
	getSearchResults: function() {
		let da={'queryType':this.dDown.val(),'val':this.searchInput};
		let self=this;
		if (da.queryType = "secLevel") {da.val = Number(da.val);}
		$.ajax ({
			url:'PHP/getUsers.php',
			dataType: 'json',
			data: JSON.stringify(da),
			type: "POST",
			beforeSend: function(){$("#heading_text_pan"+self.panel).html('Manage <img src="images/ajaxLoad.gif" style="height:0.8em">');},
			success: function(response,responseStatus){
				$("#heading_text_pan"+self.panel).html('Manage');
				this.data = JSON.parse(response);
				this.displaySearchResults();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log("Error, status = " + textStatus + " error: " + errorThrown);
				$("#heading_text_pan_502"+self.panel).html('Manage');
			}
		});
	},
	displaySearchResults: function(){
		$(this.resultRegion).empty();
		let self=this;
		this.results = new Array();
		Object.entries(this.data).forEach(function([i,v]){
			self.results.push(addResultsRow(v,i));
			$(self.resultRegion).append(self.results[i]);
		});
	}
}
function ManageUsers(data={}){
	this.panel="502";
	this.pare="content_pan_502";
	this.searchMethod= {'name':"Name", 'userid':"User ID", 'handle':'Handle', 'secLevel':"Priv"};
	this.searchMode = 'handle';
	this.init();
}

AdminProfile.prototype = {
	constructor: AdminProfile,
	init: function(){
		this.fetch();
	},
	drawHeading: function(){
	},
	drawValues: function(){
	},
	draw: function(){
		this.content=document.createElement('div');

	},
	fetch: function(){
		let self=this;
		$.ajax ({
		url:'PHP/getUserAdminData.php',
		dataType: 'json',
		data:{xid},
		type: "POST",
		beforeSend: function(){$("#heading_text_pan_"+self.panel).html('Manage <img src="images/ajaxLoad.gif" style="height:0.8em">');},
		success: function(response,responseStatus){
			self.data = response[0];
			self.draw();
			//displayAdminManageForm(response[0]);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Error, status = " + textStatus + " error: " + errorThrown);
		},
		complete: function(){
			$("#heading_text_pan_"+self.panel).html('Manage');
		}

	});
	},
	output: function(){
		return this.content;
	}
}
function AdminProfile (data = {}){
	this.xid = data.xid;
	this.panel = data.panel || 502
	this.init();
}
