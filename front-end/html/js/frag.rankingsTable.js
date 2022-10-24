RankingsTable.prototype = {
	constructor: RankingsTable,
	getMedalRank:function(i){
		//console.log(i)
		let result = 0;
		if ((i===1) && (this.hasTopAward)){return 0;}
		else {
			for (let x=this.awardRanges.length;x>0;x--){
				if (i<Math.ceil(this.awardRanges[x]*this.totalRanks)+1){result = x;}
			}
			return ((result === 0)? this.awardRanges.length : result)
		}
	},
	init:function(){
		this.draw();
	},
	setFadeDelay: function(i){
		return Math.min(Math.floor(this.fadeDelay/this.data.length),200)*(this.data.length-i);
	},
	drawTableHeader: function(){
		let x = document.createElement('div');
		$(x).addClass('lbDiv nodrag noselect');
		let awardImage=['emerald.png','ruby.png','sapphire.png','gold.png','silver.png','bronze.png','sigma.png'];
		let awardDesc=[
			'1st Place awards for questions answered',
			'Top 0.2% in questions answered (min. 501 users)',
			'Top 1% in questions answered (min. 101 users)',
			'Top 5% in questions answered (min. 21 users)',
			'Top 12.5% in questions answered (min. 9 users)',
			'Top 25% in questions answered (min. 5 users)','Total Awards'
		];
		for (let y=0;y<3;y++){
			let z=document.createElement('div');
			$(z).addClass('lbDivchild lbAwardHead');
			$(z).html("&nbsp;");
			$(x).append(z);
		}
		let z = document.createElement('div');
		$(z).addClass('lbDivchild lbUserName');
		$(z).html("&nbsp;");
		$(z).css({'background-color':'rgba(0,0,0,0)'});
		$(x).append(z);
		let self=this;
		awardImage.forEach(function(v,i){
			if ((self.hideRuby) && (i===1)){}
			else {
				let z=document.createElement('div');
				let y = new Image();
				y.src = 'images/icons/'+v;
				y.title = awardDesc[i];
				$(z).addClass('lbDivchild lbAwardHead');
				$(y).css({'height':'15px','width':'15px','margin':'auto'});
				$(z).append(y);
				$(x).append(z);
			}
		});
		return x;
	},
	draw:function(){
		this.content = document.createElement('div');
		$(this.content).css({'padding-top':'5px'});
		if (this.type==='award'){
			$(this.content).append(this.drawTableHeader());
		}
		let self=this;
		Object.entries(this.data).forEach(function([i,v]){
			let d = {
				'data':v,
					'isNation': self.isNation,
					'hasDates': self.hasDates,
					'hasAwards': self.hasAwards,
					'hasCountries': self.hasCountries,
					'users': v.users.length,
					'fadeDelay': self.setFadeDelay(i)
				}
				if (self.type === 'rank') {
					if (self.hasAwards){
						let x = self.getMedalRank(v.rank);
						v.award = {'name':self.awardNames[x], 'style':self.awardStyles[x]};
					}
					self.rows[i] = new RankingsRow(d);
				}
				if (self.type === 'award') {
					self.rows[i] = new AwardsRow(d);
				}
				$(self.content).append(self.rows[i].output());
			});
		//else {
		//	let x = document.createElement('div');
		//	$(x).html(JSON.stringify(this.data));
		//	$(self.content).append(x);
		//}
	},
	output:function(){
		return this.content;
	}
}
function RankingsTable(data={}){
	console.log(data);
	this.rows = [];
	this.data = data.data || {};
	this.type = data.type || "rank";
	this.totalRanks = data.totalRanks || 0;
	this.refreshTimer = data.refreshTimer || 300000;
	this.hasHeading = data.hasHeading || false;
	typeof data.hasAwards!=='undefined' ? this.hasAwards = data.hasAwards : this.hasAwards=true;
	typeof data.hasDates!=='undefined' ? this.hasDates = data.hasDates : this.hasDates =false;
	typeof data.hasCountries!=='undefined' ? this.hasCountries = data.hasCountries : this.hasCountries =true;
	typeof data.isNation!=='undefined' ? this.isNation = data.isNation : this.isNation =false;
	typeof data.animate!=='undefined' ? this.animate = data.animate : this.animate = true;
	typeof data.hideRuby!=='undefined' ? this.hideRuby = data.hideRuby : this.hideRuby = true;
	this.isNation = data.isNation || false;
	this.fadeDelay = data.fadeDelay || 1600;
	if (data.hasAwards) {
		this.hasTopAward = data.hasTopAward || true;
		this.awardRanges = data.awardRanges || [0,0.002,0.01,0.05,0.125,0.25];
		this.awardStyles = data.awardStyles || ["highlightRow","redRowed","blueRowed","goldRowed","steelRowed","bronzeRowed","metalBOne"];
		this.awardNames = data.awardNames || ['Emerald','Ruby','Sapphire','Gold','Silver','Bronze','No Award'];
	}
	if (data.styles!=='undefined'){
		this.styles = data.styles;
	}
	else {
		this.styles = {
			'content':''
		}
	}
	this.init();
}
