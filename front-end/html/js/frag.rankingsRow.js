RankingsRow.prototype = {
	constructor: RankingsRow,
	init:function(){
		this.draw();
	},
	setRankFontSize:function(){
		if (this.data.rank>99999){return 0.5};
		if (this.data.rank>9999){return 0.7};
		if (this.data.rank>999){return 0.75};
		if (this.data.rank>99){return 0.8};
		if (this.data.rank>9){return 0.9};
		return 1.1;
	},
	drawImage:function(i){
		let x = new Image();
		x.src = this.data.users[i].photo;
		$(x).on("error", function(e){
			x.style.visibility = 'hidden';
			x.src = "images/unknown_player.gif";
			x.style.visibility = 'visible';
		});
		x.title = this.data.users[i].name;
		return x;
	},
	drawImages:function(){
		let self=this;
		let t;
		switch(this.data.users.length){
			case 1: t='One';break;
			case 2: t='Two';break;
			case 3: t='Three';break;
		}
		let x = document.createElement('div');
		$(x).addClass(this.styles['imageBox'+t]);
		Object.entries(this.data.users).forEach(function([i,v]){
			$(x).append(self.drawImage(i));
		});
		return x;
	},
	drawCountry: function(){
	},
	chooseHighlight: function(){
		return ((this.data.isCurrent) ? this.styles.current : this.styles.highlight);
	},
	drawDate: function(){
		let x = document.createElement('div');
		$(x).addClass(this.styles.date);
		$(x).html(this.data.date);
		if (this.data.isMe){$(x).addClass(this.chooseHighlight());}
		return x;
	},
	drawAward: function(){
		let x = document.createElement('div');
		$(x).addClass(this.styles.award);
		$(x).addClass(this.data.award.style);
		x.title = this.data.award.name+" award available for this rank"
		return x;
	},
	drawPCountry: function(){
		let x = document.createElement('img');
		let y = document.createElement('span');
		x.src = 'images/flags/'+country.byId[Number(this.data.countryId)-1].short.toLowerCase()+".png";
		//move to styles
		$(x).addClass(this.styles.userFlag);
		$(y).addClass(this.styles.flagName);
		//---
		$(y).html(country.byId[Number(this.data.countryId)-1].short);
		return [x,y];
	},
	drawParticipant:function(){
		let x = document.createElement('div');
		$(x).addClass(this.styles.userSection);
		if (this.data.isMe){$(x).addClass(this.chooseHighlight());}
		if (this.isCountry){
			//insert country name
		}
		else {
			//console.log(this.data.users);
			let z = document.createElement('div');
			$(z).addClass(this.styles.userName);
			$(z).html(this.data.users[0].name);
			$(x).append(z);
		}
		if (this.hasCountries  && Number(this.data.countryId)!==0){
			let y = this.drawPCountry()
			$(x).append(y[0],y[1]);

		}
		return x;
	},
	drawRank:function(){
		let x = document.createElement('div');
		$(x).addClass(this.styles.rank);
		$(x).css({'font-size':this.setRankFontSize(this.data.rank)+'em','font-variant-numeric':'ordinal'});
		$(x).html(this.data.rank+"<sup>"+(getOrdinal(this.data.rank))+"</sup>");
		return x;
	},
	drawScore:function(){
		let x= document.createElement('div');
		let y= document.createElement('div');
		$(x).addClass(this.styles.score);
		if (this.data.isMe){$(x).addClass(this.chooseHighlight());}
		$(y).html(this.data.users[0].answered);
		$(x).append(y);
		return x;
	},
	drawRow: function(){
		$(this.content).append(this.drawRank());
		if (this.hasAwards){$(this.content).append(this.drawAward());}
		$(this.content).append(this.drawImages(),this.drawParticipant());
		if (this.hasDates){$(this.content).append(this.drawDate());}
		$(this.content).append(this.drawScore());
	},
	draw:function(){
		this.content = document.createElement('div');
		$(this.content).addClass(this.styles.row);
		if (this.animate) {$(this.content).css('opacity','0');}
		this.drawRow();
	},

	output:function(){
		if (this.animate){
			$(this.content).delay(this.fadeDelay).fadeTo(1000,1);
		}
		return this.content;
	}

}
function RankingsRow(data={}){
	this.data = data.data || {};
	typeof data.hasAwards!=='undefined' ? this.hasAwards = data.hasAwards : this.hasAwards=true;
	typeof data.hasDates!=='undefined' ? this.hasDates = data.hasDates : this.hasDates =false;
	typeof data.hasCountries!=='undefined' ? this.hasCountries = data.hasCountries : this.hasCountries =true;
	typeof data.isNation!=='undefined' ? this.isNation = data.isNation : this.isNation =false;
	typeof data.animate!=='undefined' ? this.animate = data.animate : this.animate = true;
	typeof data.hideRuby!=='undefined' ? this.hideRuby = data.hideRuby : this.hideRuby = true;
	this.users = data.users || 1;
	this.fadeDelay = data.fadeDelay || 0;
	if (data.hasAwards) {
		this.awardStyle = data.awardStyle || "metalBOne";
	}
	if (typeof data.styles!=='undefined'){
		this.styles=data.styles;
	}
	else {
		//they're all in here due to an extend of the class
		this.styles = {
			'row':'lbDiv nodrag noselect',
			'rank':'lbDivchild steelRowed lbRank',
			'award':'lbDivchild lbAward',
			'imageBoxOne':'lbDivchild lbPhoto lbPhotoOne',
			'imageBoxTwo':'lbDivchild lbPhoto lbPhotoTwo',
			'imageBoxThree':'lbDivchild lbPhoto lbPhotoThree',
			'userSection':'lbDivchild lbUserSection',
			'userName':'lbUserName',
			'userFlag':'lbCountry',
			'awardSlot':'lbRankchild',
			'flagName':'lbCountryName',
			'highlight':'highlightRow',
			'current':'blueRowed',
			'date':'lbDivchild lbDate',
			'score':'lbDivchild lbScore'
		}
	}
	this.init();
}

class AwardsRow extends RankingsRow {
	constructor(data={}){
		super(data);
	}
	drawAwardValue(v){
		let x = document.createElement('div');
		let y = document.createElement('div');
		$(x).addClass(this.styles.awardSlot);
		if (this.data.isMe){$(x).addClass(this.chooseHighlight());}
		$(y).html((Number(v)===0)? '-':v);
		$(x).append(y);
		return x;
	}
	drawRow(){
		$(this.content).append(this.drawRank());
		$(this.content).append(this.drawImages(),this.drawParticipant());
		let self=this;
		Object.entries(this.data.values).forEach(function([i,v]){
			if ((i==='ruby') && (self.hideRuby)){}
			else {
				$(self.content).append(self.drawAwardValue(v));
			}
		});
	}
}
