SlothLeaderboard.prototype = {
	constructor: SlothLeaderboard,
	calcTimeToDisplay: function(t){
		let x = new Date (Math.floor(t*1000));
		let d = Math.floor(x/(60*60*1000*24));
		let h = x.getUTCHours()-1;
		let m = x.getUTCMinutes();
		let s = x.getUTCSeconds();
		let z = x.getUTCMilliseconds();
		if (d>0){return (d>0 ? d+"d ": "")+(h>0 ? h+"h " : "") + (m<10 ? m+"m" : "");}
		else {
			if (h>0){return (h>0 ? h+"h " : "") + (m>0 ? m+"m" : "m");}
			else {
				if (m>0){return (m>0 ? m+"m " : " ") + (s>0 ? s+"s": "s");}
				else {
					if (s>0){return (s>0 ? s: "") + (z>0 ? "." + (z<100 ? "0" : "")+(z<10 ? "0" : "")+z+"s" : "s");}
					else {
						return z>0 ? "0."+ (z<100 ? "0" : "")+(z<10 ? "0" : "")+z+"s" : "s";
					}
				}
			}
		}
	},
	getNation: function(d){
		if (Number(d)!==0){
			return "<img src='images/flags/"+country.byId[Number(d)-1].short.toLowerCase()+".png' class='slothNation'><span style='font-size:0.6em;font-weight:300;margin-left:2px;'>"+country.byId[Number(d)-1].short+"</span>";
		}
		else {return "";}
	},
	addHeaders: function(){
		let x = document.createElement('tr');
		let rank = document.createElement('th');
		$(rank).addClass('slothRankLeft');
		let name = document.createElement('th');
		$(name).addClass('slothRankLeft');
		let correct = document.createElement('th')
		$(correct).html("Correct");
		let accuracy = document.createElement('th')
		$(accuracy).html("Accuracy");
		let time = document.createElement('th')
		$(time).html("Time");
		$(x).append(rank,name,correct,accuracy,time);
		return x;
	},

	addRow: function(d){
		let x = document.createElement('tr');
		let rank = document.createElement('td');
		let person = document.createElement('td');
		$(person).addClass('slothRankLeft');
		let correct = document.createElement('td');
		let accuracy = document.createElement('td');
		let time = document.createElement('td');
		$(rank).html(d.rank+"<sup>"+getOrdinal(d.rank)+"</sup>");
		$(person).html("<img src='"+d.photo+"' class='slothPhoto'>"+d.name+this.getNation(d.countryId));
		$(correct).html(((parseFloat(d.correct) >= 100) ? 100 : parseFloat(d.correct).toFixed(2))+"%");
		$(accuracy).html(((parseFloat(d.accuracy) >= 100) ? 100 : parseFloat(d.accuracy).toFixed(2))+"%");
		$(time).html(this.calcTimeToDisplay(parseFloat(d.time).toFixed(3)));
		$(x).append(rank, person, correct, accuracy, time);
		return x;
	},
	init: function(){
		this.content = document.createElement('div');
		this.draw();
	},
	draw: function(){
		this.placeholder = document.createElement('div');
		$(this.placeholder).addClass('slothNewAlpha');
		this.placeholderText = document.createElement('div');
		$(this.placeholderText).addClass('slothNewAlphaText');
		$(this.placeholderText).html("This alphagram has not been slothed before - Be the first!");
		$(this.placeholder).append(this.placeholderText);
		this.table = document.createElement('table');
		$(this.table).addClass('slothRankingsTable');
		this.content = document.createElement('div');
		$(this.content).append(this.placeholder,this.table);
	},
	update:function(d){
		$(this.table).html('');
		if (d.length>0){
			$(this.placeholder).hide();
			$(this.table).show();
			$(this.table).append(this.addHeaders());
			let self=this;
			d.forEach(function(v){
				console.log(v);
				$(self.table).append(self.addRow(v));
			});
		}
		else {
			$(this.placeholder).show();
			$(this.table).hide();
		}
	},
	output: function(){
		return this.content;
	}
}
function SlothLeaderboard(data={}){
	this.init();
}
