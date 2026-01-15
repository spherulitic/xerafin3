OverviewList.prototype = {
	constructor: OverviewList,
	show:function(){
		$('#'+this.pare).append(this.content);
	},
	init:function(){
		this.list = {};
		this.initialized=false;
		this.content = document.createElement('div');
		this.content.id = this.pare+"_"+this.id;
		if (!this.hasSharedParent) {
			$(this.content).addClass('well well-sm pre-scrollable noselect searchScroll');
		//	$('#'+this.content.id).css({'padding':'10px 0px 10px 0px !important','border':'1px solid black'});
		}
		$(this.content).addClass(this.className);
		$(this.content).css({'max-height':'200px!important'});
		$(this.content).append(this.createHeading(),this.createPlaceholder(),this.createListRegion());
		$(this.placeholder).hide();
		Object.keys(this.data).length===0 ? $(this.title).hide() : $(this.title).show();
	},

//-----------------------------------------------------------------------------------------------
//If this group can contain a row that is a cardbox, store the object.  If the row currently
//exists: Update it.

	updateCardboxValues:function(d){
		if (this.canHoldCardbox){
			this.cardbox=d;
			if (this.rows){
				if (this.rows[-1]){
					this.rows[-1].updateCardboxValues(d);
				}
			}
		}
	},

//-----------------------------------------------------------------------------------------------

	createPlaceholder:function(){
		this.placeholder = document.createElement('div');
		$(this.placeholder).css({
			'width':'100%','height':'100px',
			'text-align':'center','font-family':'lato,sans-serif',
			'line-height':'100px','color':'rgba(220,220,200,1)','font-variant':'small-caps',
			'vertical-align':'middle',
			'border-radius':'10px','border':'1px solid rgba(220,220,200,1)','margin-top':'10px'
		})
		$(this.placeholder).addClass('metalBOne');
		$(this.placeholder).html('...');
		return this.placeholder;
	},
	createHeading:function(){
		this.title = document.createElement('div');
		$(this.title).addClass('overviewGroupHeader metalBOne');
		$(this.title).html(this.heading);
		return(this.title);
	},
	createListRegion:function(){
		this.listRegion = document.createElement('div');
		this.listRegion.id = this.pare+"_"+this.id+"_list";
		return this.listRegion;
	},

	clearSelectedRows:function(){
		var self=this;
		Object.entries(this.rows).forEach(function([index,value]){
			if ($(value.selector).hasClass('overviewListHighlight')) {
				$(self.rows[index].selector).removeClass('highlightRow overviewListHighlight');
				if (self.rows[index].data.sub) {$(self.rows[index].selector).addClass('blueRowed overviewItemSub');}
			}
		});
	},
//-----------------------------------------------------------------------------------------------
// Will only be called externally and the action will be ignored if multiple = false
	setSelection:function(i){
		if (!this.multiple){
			if (this.rows){
				this.clearSelectedRows();
				if (this.rows[i]){
					if (this.rows[i].data.sub) {$(this.rows[i].selector).removeClass('blueRowed overviewItemSub');}
					$(this.rows[i].selector).addClass('highlightRow overviewListHighlight');
				}

			}
		}
	},
//-----------------------------------------------------------------------------------------------
	clearSelection:function(){
		this.clearSelectedRows();
		this.action(this.context+"_SELECTION", []);
	},
	clearAll:function(){
		$(this.listRegion).find('div.overviewWidget').remove();
		this.data = {};
	},
//-----------------------------------------------------------------------------------------------
	disableButtons:function(x){
		if (typeof this.rows[x]!=='undefined'){
			this.rows[x].disableButtons();
		}
	},
//--------------------------------------------------
	updateButtonStates:function(x){
		if (typeof this.rows[x]!=='undefined'){
			this.rows[x].updateButtonStates();
		}
	},
//--------------------------------------------------
	processSelectedRows:function(){
          console.log("process selected rows for:");
          console.log(this);
		var self=this;
		var x = new Array();
		Object.entries(this.rows).forEach(function([index,value]){
			if ($(value.selector).hasClass('overviewListHighlight')) {
				x.push(Number(value.data.quizid));
			}
		});
		this.action(this.context+'_SELECTION', x);
		if (x.length===1) {
			this.action(this.context+'_SET_GO_NAME',this.data[x].quizname);
		}
	},
	addSelectionEvent:function(index){
		var self = this;
		$(this.rows[index].selector).on('click',function(e){
			e.stopPropagation();
			if (self.initialized){
			if (self.multiple){
					if (self.rows[index].data.sub) {$(self.rows[index].selector).removeClass('blueRowed overviewItemSub');}
					$(self.rows[index].selector).toggleClass('highlightRow overviewListHighlight');
			}
			else {
				self.clearSelectedRows();
				if (self.hasSubs){
					if (self.rows[index].data.sub){
						$(self.rows[index].selector).removeClass('blueRowed overviewItemSub');
					}
				}
				$(self.rows[index].selector).addClass('highlightRow overviewListHighlight');
			}
			self.processSelectedRows();
			}
			else {console.log("Selection is Disabled");}
		});
	},

//-----------------------------------------------------------------------------------------------
//Attach ResetAll Event to row

	addResetAllEvent:function(index){
		var self = this;
		$(this.rows[index].resetAll).on('click',function(e){
			e.stopPropagation();
			if (confirm("This will reset all progress for the following quiz: "+self.rows[index].data.quizname)){
				self.action('QID_RST_ALL', index);
			}
		});
	},
//-----------------------------------------------------------------------------------------------
//Attach ResetWrong event to row

	addResetWrongEvent:function(index){
		var self = this;
		$(this.rows[index].resetWrong).on('click',function(e){
			e.stopPropagation();
			//if (confirm("This will reset all wrong answers for the following quiz: "+self.rows[index].data.quizname)){
				self.action('QID_RST_WNG', index);
			//}
		});
	},
//-----------------------------------------------------------------------------------------------
//Attach Discard event to row
	addDiscardEvent:function(index){
		var self = this;
		$(this.rows[index].discard).on('click',function(e){
			e.stopPropagation();
			if (confirm("This will remove the following quiz from your active quizzes: "+self.rows[index].data.quizname)){
				self.action('QID_DISCARD', index);
			}
		});
	},
//-----------------------------------------------------------------------------------------------
//Attach Cardbox Add All event to row
	addAddAllEvent:function(index){
		var self = this;
		$(this.rows[index].addAll).on('click',function(e){
			e.stopPropagation();
			if (confirm("This will add up to "+self.rows[index].data.quizsize+" alphagrams from "+self.rows[index].data.quizname+ " to your cardbox.  Correct answers will go to Cardbox 1, Incorrect to Cardbox 0.  Continue?")){
				self.action('QID_ADD_ALL', index);
			}
		});
	},
//-----------------------------------------------------------------------------------------------
//Attach Cardbox Add Wrong event to row
	addAddWrongEvent:function(index){
		var self = this;
		$(this.rows[index].addWrong).on('click',function(e){
			e.stopPropagation();
			if (confirm("This will add up to "+self.rows[index].data.incorrect+" incorrect responses in "+self.rows[index].data.quizname+" to cardbox 0.  Continue?")){
				self.action('QID_ADD_WRONG', index);
			}
		});
	},
//-----------------------------------------------------------------------------------------------
//If list can contain subscriptions, count how many there are

	countSubAmount:function(){
		let y = 0;
		Object.values(this.data).forEach(function(value){
			if (value.sub){y++;}
		});
		return y;
	},
//-----------------------------------------------------------------------------------------------
	injectUpdate:function(d){
		let i = new Set([...Object.keys(d)]);
		let c = new Set([...Object.keys(this.data)]);
		let self= this;

		//Update Rows that intersect.
		let update = new Set([...c].filter(x => i.has(x))).forEach(function(v){
			self.rows[v].update(d[v]);
			self.rows[v].updateButtonStates();
			self.data[v] = d[v];
		});
	},
//-----------------------------------------------------------------------------------------------
//	A systematic comparison and update of existing rows
	compareData:function(d){
		let i = new Set([...Object.keys(d)]);
		let c = new Set([...Object.keys(this.data)]);
		let self = this;
		//Delete Rows that are not in the new data
		let remove = new Set([...c].filter(x => !i.has(x)));
		remove.forEach(function(v){
			let x= Number(v);
			delete self.data[x];
			$(self.rows[x].selectRegion).remove();
			delete self.rows[x];
		});
		//Update Rows that intersect.
		let update = new Set([...c].filter(x => i.has(x)));
		update.forEach(function(v){
			let x = Number(v);
			if ((d[x].status!==self.data[x].status) || (d[x].sub!==self.data[x].sub)){
				delete self.data[x];
				$(self.rows[x].selectRegion).remove();
				delete self.rows[x];
				self.data[x]=d[x];
				self.addDataRow(x,d[x]);

			}
			else {
				self.rows[v].update(d[v]);
				self.rows[v].updateButtonStates();
			}
		});
		//Append the rows that are not in the old data
		let append = new Set([...i].filter(x => !c.has(x)));
		append.forEach(function(v){
			let x = Number(v);
			self.data[x]=d[x];
			self.addDataRow(x,d[x]);
		});

		this.data = d;
	},
//-----------------------------------------------------------------------------------------------

	updateListTitle:function(){
		let x = Object.keys(this.data).length;
		let y = (this.countSubs ? this.countSubAmount() : 0);

		if (x===0) {
			if (this.hasPlaceholder) {
				$(this.placeholder).html('your search returned no results.');
				$(this.placeholder).fadeTo(1000,1);
				$(this.title).hide();
			}
		}
		else {
			if (this.showNumRows){
				$(this.title).html(this.heading+" ["+(x-y)+"]");
			}
			if (this.hasPlaceholder){
				$(this.placeholder).hide();
				$(this.title).show();
			}
		}
	},
//-----------------------------------------------------------------------------------------------
// Just a cleanup of the main flow. Returns the settings for a given row based on data states
	getSettings:function(d){
		let settings = {}
		//checking if row is a subscription
		if (typeof d.sub!=='undefined'){
			if (d.sub) {
				settings.hasAccordion = false;
				settings.hasResetWrong = false;
				settings.hasResetAll = false;
				settings.hasDiscard = false;
			}
			else {
				settings.hasAccordion = this.hasAccordion;
				settings.hasResetWrong = this.hasResetWrong;
				settings.hasResetAll = this.hasResetAll;
				settings.hasDiscard = this.hasDiscard;
			}
		}
		return settings;
	},

//-----------------------------------------------------------------------------------------------

	addDataRow:function(index,d){
		let settings = this.getSettings(d);
		this.rows[Number(index)] = new OverviewRow({
			'id':Number(index),
			'data':d,
			'hasAccordion': settings.hasAccordion,
			'hasTypeGroup': this.hasTypeGroup,
			'hasResetAll': settings.hasResetAll,
			'hasResetWrong': settings.hasResetWrong,
			'hasDiscard': settings.hasDiscard,
			'canHaveSubs' : this.hasSubs,
			'hasCActions' : this.hasCActions,
			'pare': this.listRegion.id,
			'sub': typeof (d.sub!=='undefined') ? d.sub:false
		});
		if (this.isSelectable) {this.addSelectionEvent(Number(index));}
		if ((this.cardbox)  && (Number(index)==-1)){
			this.rows[-1].updateCardboxValues(this.cardbox);
		}
		if (settings.hasAccordion){
			if (settings.hasResetAll){this.addResetAllEvent(Number(index));}
			if (settings.hasResetWrong){this.addResetWrongEvent(Number(index));}
			if (settings.hasDiscard){this.addDiscardEvent(Number(index));}
			if (this.hasCActions){
				this.addAddAllEvent(Number(index));
				this.addAddWrongEvent(Number(index));
			}
		}
		if (Number(index)===-1){
			$(this.listRegion).prepend(this.rows[Number(index)].output());
		}
		else {
			let pos = Object.keys(this.rows).findIndex(n => Number(n) > Number(index));
			(pos === -1) ? $(this.listRegion).append(this.rows[Number(index)].output()) : $(this.listRegion).find('div.overviewWidget').eq(pos-1).before(this.rows[Number(index)].output());
		}
	},

//-----------------------------------------------------------------------------------------------
// A clearout of all rowObjects and full redraw

	redrawData:function(d){
		this.rows = new Object();
		$(this.listRegion).find('div.overviewWidget').remove();
		this.data = d;

		if (this.hasTransitions) {$(this.listRegion).hide();}
		if (this.multiple) {
			this.action(this.context+'_SELECTION', []);
		}
		let self = this;
		Object.entries(this.data).forEach(function([i,v]){
			let x= Number(i);
			self.addDataRow(x,v);
		});

	},
//-----------------------------------------------------------------------------------------------
	updateData:function(d){
		this.initialized=false;
		this.clearDivs ? this.redrawData(d) : this.compareData(d);
		this.updateListTitle();
		Object.keys(d).length===0 ? $(this.title).hide() : $(this.title).show();
		if (this.hasTransitions){$(this.listRegion).fadeTo(1000,1);}
		this.initialized = true;
                window.dispatchEvent(new CustomEvent('listUpdated', {
                  detail: { listName: this.id }
                }));
	}
//-----------------------------------------------------------------------------------------------
}
function OverviewList(data = {}){
	this.rows = new Object();
	if (typeof data.id!=='undefined') {
		this.id = data.id;
		if (typeof data.pare!=='undefined') {
			typeof this.parentObject!== 'undefined' ? this.parentObject = data.parentObject : this.parentObject = null;
			this.pare = data.pare;
			// Haven't made this configurable at this stage.  I probably will.
			this.className = "overviewList";
			// Data can be forced in on creating the instance.
			typeof data.data!=='undefined' ? this.data = data.data : this.data={}
			// Name of heading for result rows, is updated by amount of search results, if there are any.
			typeof data.heading!=='undefined' ? this.heading = data.heading : this.heading = "Default";
			// Whether or not selection of multiple rows is possible
			typeof data.multiple!=='undefined' ? this.multiple = data.multiple : this.multiple = true;
			// Whether or not existing result divs should be updated, or if the contents are to just be cleared and redrawn
			typeof data.clearDivs!=='undefined' ? this.clearDivs = data.clearDivs : this.clearDivs = false;
			// Whether or not this list has a shared parent with other lists in the DOM.  If it does, it need not be enclosed in a pre-scrollable div.
			// - The parent should be configured to contain the necessary style classes.
			typeof data.hasSharedParent!=='undefined' ? this.hasSharedParent = data.hasSharedParent : this.hasSharedParent = true;
			// Whether of not to transition (hide, fade in) between updates
			typeof data.hasTransitions!=='undefined' ? this.hasTransitions = data.hasTransitions : this.hasTransitions = false;
			// Whether or not to show the number of rows in the heading
			typeof data.showNumRows!=='undefined' ? this.showNumRows = data.showNumRows : this.showNumRows = true;
			// Whether or not row contents should have a resetWrong button in the accordion by default
			typeof data.hasResetWrong!=='undefined' ? this.hasResetWrong = data.hasResetWrong : this.hasResetWrong = true;
			// Whether or not row contents should have a resetAll button in the accordion by default
			typeof data.hasResetAll!=='undefined' ? this.hasResetAll = data.hasResetAll : this.hasResetAll = true;
			// Whether or not row contents should have a Discard button in the accordion by default
			typeof data.hasDiscard!=='undefined' ? this.hasDiscard = data.hasDiscard : this.hasDiscard = true;
			// Whether or not there even is an accordion.  This overrides the previous 3 flags.
			typeof data.hasAccordion!=='undefined' ? this.hasAccordion = data.hasAccordion : this.hasAccordion = true;
			// Whether or not subscriptions should count if showNumRows is true;
			typeof data.hasSubs!=='undefined' ? this.hasSubs = data.hasSubs : this.hasSubs = false;
			// Whether or not there is an placeholder in the event of 0 results.
			typeof data.countSubs!=='undefined' ? this.countSubs = data.countSubs : this.countSubs = false;
			// Whether or not there is an placeholder in the event of 0 results.
			typeof data.hasPlaceholder!=='undefined' ? this.hasPlaceholder = data.hasPlaceholder : this.hasPlaceholder = false;
			// Whether of not to display an image in the left of the row div
			typeof data.hasTypeGroup!=='undefined' ? this.hasTypeGroup = data.hasTypeGroup : this.hasTypeGroup = true;
			// Not sure if this is needed just yet
			typeof data.canHoldCardbox!=='undefined' ? this.canHoldCardbox = data.canHoldCardbox : this.canHoldCardbox = false;
			// There's no point in selecting completed quizzes so this flag is to make that not a thing
			typeof data.isSelectable!=='undefined' ? this.isSelectable = data.isSelectable : this.isSelectable = true;
			// If there should be a cardbox function row in the accordion
			typeof data.hasCActions!=='undefined' ? this.hasCActions = data.hasCActions : this.hasCActions = false;
			//Needs to know the context of the data to send upstream, otherwise terminate;

			if (typeof data.context!=='undefined') {
				this.context = data.context;
				this.init();
			}
			else {console.log('---> No Context attached to instance of OverviewList.  Instance Aborted');}
		}
		else {appendDebugLog ("XeraOverviewListGroup Error : no parent DOM object defined!");}
	}
	else {appendDebugLog("XeraOverlistListGroup Error : no id defined!");}
}
