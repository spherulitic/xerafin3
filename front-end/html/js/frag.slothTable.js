SlothTable.prototype = {
	constructor: SlothTable,
	init: function(){
		this.draw();
	},
	drawHeading: function(){
		this.heading = document.createElement('div');
		this.heading.id = 'slothTable_'+this.wordLength; //Might not need
		$(this.heading).addClass('slothTableHeading nodrag noselect');
		$(this.heading).html(this.headings[this.wordLength]+' ('+this.data.size+')');
		return this.heading;
	},
	drawTableRow: function(n){
		let tr = document.createElement('tr');
		let z = Array.from(this.data);
		for (let x=0; x<= this.columns[this.wordLength]; x++){
			let y = n + (x)*(this.rows);
			if (y < this.data.size  && x < this.data.size) {
				let td = document.createElement('td');
				$(td).css({
					'width':100/this.columns[this.wordLength]+'%',
					'maxwidth':100/this.columns[this.wordLength]+'%',
					'border': '1px solid rgba(128,128,128,1)'
				});
				td.id = "Sloth_"+this.wordLength+"_"+n+"_"+x;

				this.cells[z[y]] = document.createElement('span');
				//$(this.cells[z[y]]).html(z[y]);
				$(this.cells[z[y]]).html("&nbsp;");
				$(this.cells[z[y]]).css({'color':'rgb(230,230,210)'});
				$(this.cells[z[y]]).addClass('noselect nodrag');
				$(td).append(this.cells[z[y]]);
				$(tr).append(td);
			}
		}
		return tr;
	},
	drawTable: function(){
		this.table = document.createElement('table');
		if (this.data.size >= this.columns[this.wordLength]){
			$(this.table).css({'width':'100%'});
		}
		$(this.table).addClass('slothTable');
		this.table.id ='slothTable'+this.wordLength; // Might not need.
		this.rows = Math.ceil(this.data.size / this.columns[this.wordLength]);
		for (let n=0; n<this.rows; n++) {
			$(this.table).append(this.drawTableRow(n));
		}
		return this.table;
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).append(this.drawHeading(),this.drawTable());
	},
	output: function(){
		return this.content;
	}
}
function SlothTable(data={}){
	this.columns = [0,0,15,10,7,7,6,6,5,5,4,4,3,3,2,2];
	this.cells = {};
	this.headings =  ['','','Twos','Threes','Fours','Fives','Sixes','Sevens','Eights','Nines','Tens','Elevens','Twelves','Thirteens','Fourteens','Fifteens'];
	this.wordLength = data.wordLength;
	this.data = data.data;
	this.init();
}
