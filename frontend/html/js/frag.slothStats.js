SlothStats.prototype = {
	constructor: SlothStats,
	drawHeading: function(t){
		let h = document.createElement('td');
		$(h).prop('colspan',7);
		$(h).addClass('slothStatsHeading');
		if (t.length===0){$(h).addClass('slothStatsHeadingEmpty');}
		$(h).html(t);
		let s = document.createElement('tr');
		$(s).append(h);
		return s;
	},
	drawRow: function(titles,values,type){
		let r = document.createElement('tr');
		let self=this;
		let ty = document.createElement('td');
		$(ty).addClass('slothStatsType');
		$(ty).html(type);
		$(r).append(ty);
		titles.forEach(function(v,i){
			let y = document.createElement('td');
			$(y).addClass('slothStatsLabel');
			$(y).html(v);
			self.stats[values[i]] = document.createElement('td');
			$(self.stats[values[i]]).addClass('slothStatsValue');
			$(self.stats[values[i]]).html('...');
			$(r).append(y,self.stats[values[i]]);

		});
		return r;
	},

	update: function(d){
		$(this.stats['uAttempts']).html(d.uAttempts);
		$(this.stats['tAttempts']).html(d.tAttempts);
		$(this.stats['uComplete']).html(d.uComplete);
		$(this.stats['tComplete']).html(d.tComplete);
		$(this.stats['uPerfect']).html(d.uPerfect);
		$(this.stats['tPerfect']).html(d.tPerfect);
		console.log(d);
	},
	init: function(){
		this.draw();
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).addClass('slothStatsWrapper');
		this.stats = new Object();
		let titles = ['Attempted','Completed','Perfects'];
		let x = document.createElement('table');
		$(x).addClass('slothStatsTable');
		$(x).append(
			this.drawHeading('Daily Stats'),
			this.drawRow(titles,['uAttempts','uComplete','uPerfect'],'Uniques:'),
			this.drawHeading(''),
			this.drawRow(titles,['tAttempts','tComplete','tPerfect'],'Total:'),
			this.drawHeading('')
		);
		$(this.content).append(x);
	},
	output: function(){
		return this.content;
	}
}
function SlothStats(data={}){
	this.init();
}
