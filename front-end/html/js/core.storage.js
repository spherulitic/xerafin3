//will eventually require a function to skip certain nodes ... for example, it's not necessary to have all
//the initial panels, just some of them
//will also require a function to delete dead localStorage values.
//Finally, a function to remove redundant future changes will eventualy be needed
UserStorage.prototype = {
	constructor : UserStorage,
	write: async function(){
		let x = JSON.parse(localStorage.getItem('storage'));
		x[this.user] = this.data;
		localStorage.setItem('storage', JSON.stringify(x));
	},
	clearRedundantLS: function(){
		let redundant = new Array(
			'defaultRankGroup','defaultRankType','defaultRankPeriod','defaultAwardSort',
			'defaultAwardPeriod','awardRankType','lbPagPlusMinus','lbPagNumResults','defaultMetaPeriod',
			'currentQuizId','selectedQuizName','overviewGoActionValue'
		);
		redundant.forEach(function(v){
			localStorage.removeItem(v);
		});

	},
	evaluate:function(d=this.defaults, objName=new Array('self.data')){
		let self=this;
		//console.log(d);
		Object.entries(d).forEach(function ([i,v]){
			//console.log(objName);
			let c = eval(objName[0]);
			//checks for object paths to ignore will go here.
			if (typeof v!=='object') {
				if (typeof c[i] ==='undefined' || typeof c[i] === 'null') {
					c[i] = v;
				}
			}
			else {
				if (typeof c[i] ==='undefined' || typeof c[i] === 'null') {
					c[i] = v;
				}
				else {
					//console.log("Index pushed "+i);
					let x = [objName[0],i];
					self.evaluate(d[i], [x.join(".")]);
				}
			}
		});
	},
	get: function(){
		if (typeof localStorage.storage === 'undefined') {
			localStorage.storage="{}";
		}
		let x = JSON.parse(localStorage.getItem('storage'));
		if (typeof x[this.user]!=='undefined'){
			this.data = x[this.user];
			this.evaluate();
			this.write();
		}
		else {
			this.data = this.defaults;
			this.write();
		}
		this.clearRedundantLS();
	},
	init: function(){
		this.get();
	}

}
function UserStorage(data={}){
	//console.log(data);
	if (typeof data.user!=='undefined'){
		this.defaults = data.defaults;
		//console.log(this.defaults);
		this.user = data.user;
		this.init();
	}
	else {
		alert("UserStorage Error: No user defined");
	}
}
