SubscriptionList.prototype = {
	constructor: SubscriptionList,
	addClickEvent: function(i){
		let self=this;
		$(this.subItem[i]).on('click',function(e){
			e.stopPropagation();
			$(self.updateButton).prop('disabled',false);
			$(self.subItem[i]).toggleClass('highlightRow');
			$(self.subItem[i]).toggleClass('steelRowed');
			if ($(self.subItem[i]).hasClass('highlightRow')) {
				self.subs.add(Number(i));
			}
			else {
				self.subs.delete(Number(i));
			}
		});
	},
	drawUpdateWidget: function(){
		let x=document.createElement('div');
		$(x).addClass('overviewGoRegion steelRowed');
		this.updateButton=document.createElement('button');
		$(this.updateButton).addClass('');
		$(this.updateButton).html('Update');
		$(this.updateButton).prop('disabled',true);
		let self=this;
		$(this.updateButton).on('click',function(){
			self.update();
		});
		$(x).append(this.updateButton);
		return x;
	},
	drawSubscription: function(v,i){
		this.subItem[v]=document.createElement('div');
		$(this.subItem[v]).addClass('noselect subscribeButton');
		this.subs.has(Number(v)) ? $(this.subItem[v]).addClass('highlightRow') :$(this.subItem[v]).addClass('steelRowed');
		//console.log("V: "+v+" Has: "+this.subs.has(v));
		$(this.subItem[v]).html(this.data.init[i][v]);
		this.addClickEvent(v);
		return this.subItem[v];
	},
	drawGroup: function(index){
		let y=document.createElement('div');
		$(y).addClass('overviewGroupHeader metalBOne');
		$(y).html(index);
		let x=document.createElement('div');
		$(x).addClass('');
		$(x).css({'display':'inline-block','width':'100%'});
		let self=this;
		Object.keys(this.data.init[index]).forEach(function(v){
			$(x).append(self.drawSubscription(v,index));
		});
		let z=document.createElement('div');
		$(z).append(y,x);
		return z;
	},

	draw: function(){
		this.cont = document.createElement('div');
		this.groupCont=document.createElement('div');
		$(this.groupCont).addClass('well well-sm pre-scrollable overviewList');
		$(this.groupCont).css({'text-align':'left'});
		let self=this;
		$(self.groupCont).append(self.drawGroup('Daily Quizzes'));
		$(self.groupCont).append(self.drawGroup('Weekly Workout'));
		$(self.groupCont).append(self.drawGroup('Monthly Marathon'));
		$(this.cont).append(this.groupCont, this.drawUpdateWidget());
	},
	fetch: function(after=function(){}){
		let self=this;
		$.ajax({
			url:'getSubscriptions',
			type: "POST",
			success: function(response,responseStatus){
                                console.log("Got Subscription Data")
				self.data=response;
                                console.log(self.data)
				xerafin.error.log.add('Subscriptions Data','comment');
				xerafin.error.log.add(self.data,'JSON');
				self.subs = new Set(self.data.subs);
				self.draw();
				after();
			},
		});
	},
	update: function(after=function(){}){
		this.write(after());

	},
	write: function(after=function(){}){
		$(this.updateButton).prop('disabled',true);
		let self=this;
		let d= {
			'userid': userid,
			'subList' : Array.from(self.subs)
		};
		xerafin.error.log.add('Updating Subscriptions','comment');
		xerafin.error.log.add(d,'JSON');
		console.log(d);
		$.ajax({
			url:'subscribe.py',
			data: JSON.stringify(d),
			type: "POST",
			success: function(response,responseStatus){
				gFloatingAlert("subscriptions",3000,"Subscriptions", "Your subscriptions have been updated.",800);
				self.action('SUB_UPDATE',function(){});
			}
		});
	},
	init: function(){
		this.subs = new Set();
		this.subItem = new Object();
		this.fetch();
	},
	output: function(){
		return this.cont;
	},
	show: function(){
		$('#'+this.pare).append(this.output());
	}
}
function SubscriptionList(data={}){
	typeof this.pare!=='undefined' ? this.pare=data.pare : this.pare='overviewTabs_2'
	this.init();
}
