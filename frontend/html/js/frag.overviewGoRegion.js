OverviewGoRegion.prototype = {
	constructor : OverviewGoRegion,

//-------------------------------------------------------------------------->

	setGoApps:function(data){
		var self = this;
		this.actionValues = data;
		this.optionList = new Array();
		this.actionValues.forEach(function(row,index){
			self.optionList[index]={"name":row[0],"value":index,"img":row[2]};
		});
		this.draw();
	},

//-------------------------------------------------------------------------->

	setDefault:function(x){
		this.actionValue=x;
		if (typeof this.dropDown!=='undefined'){
			this.dropDown.val(x);
		}
	},
//-------------------------------------------------------------------------->

	deactivate:function(boo){
		if (this.multiples) {
			$(this.goButton).prop('disabled',boo);
		}
		$(this.addButton).prop('disabled',boo);
	},

//-------------------------------------------------------------------------->
	freeze:function(boo){
		$(this.goButton).prop('disabled',boo);
	},
//-------------------------------------------------------------------------->
	setButtonStates:function(amount){
		let x = (amount>0);
		if (this.multiples) {
			$(this.addButton).prop('disabled',!(amount>0));
			$(this.goButton).prop('disabled',(amount!==1));
		}
		else {
			$(this.goButton).prop('disabled', false);
		}
	},

//-------------------------------------------------------------------------->

	drawLabel:function(){
		x = document.createElement('div');
		$(x).addClass('overviewGoRegionText noselect');
		$(x).html("Open In:");
		x.id = this.cont.id+"_label";
		return x;
	},

//-------------------------------------------------------------------------->

	drawDropdown:function(){
		let self=this;
		this.dDown = document.createElement('div');
		this.dDown.id = this.cont.id +'_dropDown';
		$(this.dDown).addClass('overviewGoRegionSelect');
		this.multiples ? dDownWidth = '43%' : dDownWidth = '55%';
		$(this.dDown).css({'width':dDownWidth});
		this.dropDown = new XeraSelect({
			'data': this.optionList,
			'id': this.cont.id+'_action_list',
			'val': self.actionValue,
			'onChange': function(value){
				self.actionValue=value;
				self.action("SET_GO_ACTION",{'context':self.context,'value':value});
			},
			'hasImages':true,
			'direction':'up',
			'maxHeight': $('window').height()/4,
			'styles': {'image':'xeraGoImage'}
		})
		this.dropDown.val(this.actionValue);
		$(this.dDown).append(this.dropDown.output()); //might not work.. it's possible stuff needs to be rendered first.  Can't remember.
		return this.dDown;
	},

//-------------------------------------------------------------------------->

	drawGoButton:function(){
		var self=this;
		this.goButton = document.createElement('button');
		$(this.goButton).html('Start');
		this.goButton.id=this.cont.id+'_GoButton';
		$(this.goButton).addClass('silverRowed noselect');
		$(this.goButton).click(function(){
			self.action("GO",self.context);
			//probably more
		});
		return this.goButton;
	},

//-------------------------------------------------------------------------->

	drawAddButton:function(){
		var that=this;
		this.addButton = document.createElement('button');
		$(this.addButton).html('Add');
		this.addButton.id = this.cont.id+'_AddButton';
		$(this.addButton).addClass('silverRowed noselect');
		$(this.addButton).click(function(){
			that.action(that.context+"_ADD");
		});
		return this.addButton;
	},

//-------------------------------------------------------------------------->

	draw: function(){
		if (typeof this.actionValues!=='undefined'  && typeof this.actionValue!=='undefined'){
			var that=this;

			$(this.cont).append(this.drawLabel(),this.drawDropdown(),this.drawGoButton());
			if (this.multiples) {
				$(this.cont).append(this.drawAddButton());
			}
			this.setButtonStates();
		}
		else {
			//if values for dropdown have not been populated yet, try again in 250ms.
			this.checkTimer=setTimeout(OverviewGoRegion.prototype.draw.bind(this),250);
		}
	},

//-------------------------------------------------------------------------->

	init: function(){
		this.cont = document.createElement('div');
		this.cont.id = this.id;
		$(this.cont).addClass('overviewGoRegion steelRowed');
	},

//-------------------------------------------------------------------------->

	show: function(){
		$('#'+this.pare).append(this.cont);
	}
}

// ------------------------------------------------------------------------->

function OverviewGoRegion(data){
	if (typeof data.id!=='undefined') {
		this.id = data.id;
		if (typeof data.pare!=='undefined') {

			this.pare = data.pare;

			//Whether multiple selection is a thing as this effects the UI and data sent
			if (typeof data.multiples!=='undefined') {
				data.multiples ? this.multiples = true : this.multiples= false;
			}
			else {this.multiples = false;}

			//Context required in order to know what to send as an instruction
			if (data.context!=='undefined') {
				this.context = data.context
				this.init();
			}
			else {
				console.log("XeraGoRegion instance requires a context in order to initialize.");
			}

		}
		else {appendDebugLog ("XeraGoRegion Error : no parent DOM object defined!");}
	}
	else {appendDebugLog("XeraGoRegion Error : no id defined!");}
}
