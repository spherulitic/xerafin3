SlothBoard.prototype = {
	constructor:SlothBoard,
	init: function(){
		this.draw();
	},
	draw: function(){
		this.content = document.createElement('div');
		$(this.content).addClass('well well-sm pre-scrollable slothAnswer');
	},
	toAlpha: function(s){
		return s.split('').sort().join('');
	},
	populate: function(data){
		$(this.content).html("");
		this.tables = new Object();
		this.wordlist = data;
		//console.log(data);
		for (let y=15;y>=2;y--){
			let x = new Set([...this.wordlist].filter(e => e.length==y));
			//console.log(this.wordlist);
			//console.log(x);
			if (x.size>0){
				this.tables[y]=new SlothTable({'wordLength':y, 'data': x});
				$(this.content).append(this.tables[y].output());
			}
		}
	},
	highlightAlphas: function(w){
		let self=this;
		Object.entries(this.tables[w.length].cells).forEach(function([i,v]){
			if (self.toAlpha(i) == w){
				$(v).parent().addClass('slothHighlight');
			}
		});
	},
	unhighlightAlphas: function(w){
		let self=this;
		Object.entries(this.tables[w.length].cells).forEach(function([i,v]){
			if (self.toAlpha(i) == w){
				$(v).parent().removeClass('slothHighlight');
			}
		});
	},
	endGame: function(data){
		let self=this;
		data.wordsRemaining.forEach(function(v){
			self.showMissed(v);
		});
		console.log(data);
		Object.entries(this.tables).forEach(function([i,v]){
			//console.log(i);
			Object.entries(v.cells).forEach(function([a,b]){
				//console.log(a);
				$(b).parent().on('mouseenter',function(){
					self.highlightAlphas(data.toAlpha(a));
				});
				$(b).parent().on('mouseleave',function(){
					self.unhighlightAlphas(data.toAlpha(a));
				});
				switch (data.questions[data.toAlpha(a)].endState) {
					case 0:
						$(b).parent().prop('title',"Not in cardbox. click to add.");
						$(b).parent().on('click', function(){
							self.action("BOARD_ADD_WORD",data.toAlpha(a));
						});
						//click property added to add word to cardbox.
						break;
					case 1:
						$(b).parent().addClass('slothCorrectDue',0);
						$(b).parent().prop('title',"In cardbox, due and complete. Raised to next cardbox.");
						break;
					case 2:
						$(b).parent().addClass('slothCorrectNotDue',0);
						$(b).parent().prop('title',"In cardbox. Question not due.");
						break;
					case 3:
						$(b).addClass('slothMissedInBox',0);
						$(b).parent().css({
							'border': '1px solid transparent'
						});
						$(b).parent().prop('title',"Alphagram is in cardbox and missed completely. No action taken.");
						break;
					case 4:
						$(b).addClass('slothMissedNotInBox',0);
						$(b).parent().css({
							'border': '1px solid transparent'
						});
						$(b).parent().prop('title',"Alphagram is not in cardbox and missed completely. click to add.");
						$(b).parent().on('click', function(){
							self.action("BOARD_ADD_WORD",data.toAlpha(a));
						});
						break;
					case 5:
						$(b).parent().addClass('slothPartialInBox',0);
						$(b).parent().prop('title',"Alphagram is in cardbox and only partially answered. Marked as wrong.");
						break;
					case 6:
						$(b).parent().addClass('slothPartialNotInBox',0);
						$(b).parent().prop('title',"Alphagram is not in cardbox and only partially answered. click to add.");
						$(b).parent().on('click', function(){
							self.action("BOARD_ADD_WORD",data.toAlpha(a));
						});
						break;
				}
			});
			//.entries(v).forEach(function([a,b]){
			//	console.log(a);
			//});
		});
	},
	update: function(value){
	},
	offsetScroll: function(s){
		$(this.content).scrollTop(0);
		let e;
		let x;
		if (($(this.tables[s.length].table).height()-20) < $(this.content).height()) {
			e = $(this.tables[s.length].heading);
			t = $(this.tables[s.length].table);
			x = (e.offset().top + t.outerHeight() - $(this.content).offset().top + 30) + (e.outerHeight()- $(this.content).height());
			//console.log("OFFSET TABLE:")
			//console.log(x);
		}
		else {
			e = $(this.tables[s.length].cells[s]);
			x = (e.offset().top - $(this.content).offset().top) + ((e.outerHeight()- $(this.content).height())/2);
			//console.log("OFFSET CELL:");
			//console.log(x);
		}
		$(this.content).scrollTop(x);
	},
	showAdded: function(w){
		let self=this;
		Object.entries(this.tables[w.length].cells).forEach(function([i,v]){
			if (self.toAlpha(i) == w){
				$(v).parent().addClass('slothAdded');
				$(v).parent().prop('title','Alphagram added to cardbox');
			}
		});
	},
	showMissed: function(s){
		$(this.content).scrollTop(0);
		$(this.tables[s.length].cells[s]).html(s);
		$(this.tables[s.length].cells[s]).addClass('slothMissed',500);
	},
	showWord: function(s){
		this.offsetScroll(s);
		$(this.tables[s.length].cells[s]).html(s);
		$(this.tables[s.length].cells[s]).parent().toggleClass('slothFlashCorrect',500).toggleClass('slothCorrect',1500);
	},
	showDup: function(s){
		this.offsetScroll(s);
		$(this.tables[s.length].cells[s]).parent()
		.addClass('slothFlashDuplicate',500)
		.removeClass('slothFlashDuplicate',500)
	},
	showAll: function(){
	},
	output: function(){
		return this.content;
	}
}
function SlothBoard(data={}){
	this.data=data.data;
	this.init();
}
