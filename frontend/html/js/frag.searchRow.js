SearchDate.prototype = {
	constructor: SearchDate,
	setValues:function(){
		(this.toggleState % 2 === 0) ?
			this.values = {'minDate':this.minVal, 'maxDate':this.minVal}
			: this.values = {'minDate':this.minVal, 'maxDate':this.maxVal} ;
	},
	setOptions:function(){
		switch (this.toggleState % 2){
			case 0: $(this.toggle).html('<i class="fa fa-equals"></i>');
					$(this.toggle).prop({'title':'Is Equal To'});
					this.setValues();
					$(this.maxInput).hide();
					$(this.and).hide();
					break;
			case 1: $(this.toggle).html('<i class="fa fa-caret-right"></i><i class="fa fa-caret-left"></i>');
					$(this.toggle).prop({'title':'Is Between'});
					this.setValues();
					$(this.maxInput).show();
					$(this.and).show();
					break;
		}
	},
	setToggleEvent:function(){
		let self = this;
		$(this.toggle).on('click',function(){
			self.toggleState++;
			self.setOptions();
		});
	},
	drawMinInput: function(){
		this.minInput = document.createElement('input');
		$(this.minInput).addClass('overviewQueryTextInput noappearance');
		$(this.minInput).css({'display':'inline-block','width':'30%'});
		let self=this;
		$(this.minInput).datepicker({
            dateFormat: 'yy-mm-dd',
            defaultDate: 0,
            gotoCurrent: true,
            nextText: "",
            prevText: "",
            changeMonth: true,
            changeYear: true,
            minDate: new Date(2018, 9-1, 22), // min date is 22 Sep 2018, first Daily Quiz
            maxDate: 0 // max date is today
            });
		let df = new Date();
		$('.ui-datepicker').addClass('silverRowed');
		$(this.minInput).on('change',function(){
			let x = $(self.minInput).datepicker('getDate');
			$(self.maxInput).datepicker('option',{'minDate':x});
			self.minVal = $(self.minInput).val();
			if ((self.toggleState % 2) === 0) {
				$(self.maxInput).val(self.minVal);
			}
			self.setValues();
		});
		df.setDate(df.getDate() -1);
		$(this.minInput).val($.datepicker.formatDate('yy-mm-dd', df));
		this.minVal = $(this.minInput).val();
		return this.minInput;
	},
	drawMaxInput: function(){
		this.maxInput = document.createElement('input');
		$(this.maxInput).addClass('overviewQueryTextInput noappearance');
		$(this.maxInput).css({'display':'inline-block','width':'30%'});
		let self=this;
		$(this.maxInput).datepicker({
            dateFormat: 'yy-mm-dd',
            defaultDate: 0,
            gotoCurrent: true,
            nextText: "",
            prevText: "",
            changeMonth: true,
            changeYear: true,
            minDate: new Date(2018, 9-1, 22), // min date is 22 Sep 2018, first Daily Quiz
            maxDate: 0 // max date is today
            });
		$(this.maxInput).on('change',function(){
			let x = $(self.maxInput).datepicker('getDate');
			$(self.minInput).datepicker('option',{'maxDate':x});
			self.maxVal = $(self.maxInput).val();
			self.setValues();
		});
		let dt = new Date();
		dt.setDate(dt.getDate() -1);
		$(this.maxInput).val($.datepicker.formatDate('yy-mm-dd', dt));
		this.maxVal = $(this.maxInput).val();
		return this.maxInput;
	},
	drawTypeToggle:function(){
		this.toggle = document.createElement('button');
		$(this.toggle).css({'display':'inline-block','width':'8%','text-align':'center','margin-right':'2%','height':'24px'});
		$(this.toggle).addClass('silverRowed overviewListButton');
		this.setToggleEvent();
		return this.toggle;
	},
	drawOption:function(){
		let x = document.createElement('div');
		$(x).css({'text-align':'left','display':'inline-block','min-width':'5%'});
		if (this.isOptional){
			this.selected = document.createElement('input');
			$(this.selected).prop({'type':'checkbox'});
			$(this.selected).prop({'checked':true});
			this.isSelected = true;
			//$(this.selected).css({'margin-right':'10px'})
			let self = this;
			$(this.selected).on('change',function(){
				self.isSelected = $(self.selected).prop('checked');
			});
			$(x).append(this.selected);
		}
		else {this.isSelected = true;}
		return x;
	},
	drawFieldName:function(){
		let x = document.createElement('div');
		$(x).css({'display':'inline-block','text-align':'left','margin-right':'2%','min-width':'14%'});
		$(x).html(this.fieldName+':');
		return x;
	},
	drawAnd:function(){
		this.and = document.createElement('div');
		$(this.and).css({'display':'inline-block','margin-left':'1%','margin-right':'1%'});
		$(this.and).html('&');
		return this.and;
	},
	draw:function(){
		//min cannot exceed max, max cannot be under min ... need function to deal with that.
		this.content = document.createElement('div');
		$(this.content).css({'width':'95%','style':'inline-block','text-align':'left','padding-top':'3px','padding-bottom':'3px','border-bottom':'1px solid #222'});
		$(this.content).addClass('overviewQueryRow');
		$(this.content).append(this.drawOption(),this.drawFieldName());
		if (this.hasToggle) {$(this.content).append(this.drawTypeToggle());}
		$(this.content).append(this.drawMinInput(),this.drawAnd(),this.drawMaxInput());
		$('.ui-datepicker').addClass('silverRowed');
		this.setOptions();
	},
	init:function(){
		this.draw();
		this.setValues();
	},
	output:function(){
		return this.content;
	}
}
function SearchDate (data={}){
	typeof data.hasToggle!=='undefined' ? this.hasToggle = data.hasToggle : this.hasToggle = true;
	typeof data.toggleState!=='undefined' ? this.toggleState = data.toggleState : this.toggleState = 1;
	typeof data.isOptional!=='undefined' ? this.isOptional = data.isOptional : this.isOptional = true;
	typeof data.startDate!=='undefined' ? this.startDate = data.startDate : this.startDate = new Date (2018, 9-1, 22); // First Daily Quiz
	typeof data.fieldName!=='undefined' ? this.fieldName = data.fieldName : this.fieldName = 'Date'
	this.init();
}

class SearchLength extends SearchDate {
	constructor(data={}){
		super(data);
	}
	setValues(){
		if (this.toggleState % 2 === 0) {
			this.values = {'minLength':Number(this.minVal), 'maxLength':Number(this.minVal)} ;
		}
		else {
			this.values = {'minLength':Number(this.minVal), 'maxLength':Number(this.maxVal)} ;
		}

	}
	setOptions(){
		switch (this.toggleState % 2){
			case 0: $(this.toggle).html('<i class="fa fa-equals"></i>');
					$(this.toggle).prop({'title':'Is Equal To'});
					this.setValues();
					$(this.maxInput).hide();
					$(this.and).hide();
					$(this.maxInput).val(15);
					$(this.minInput).prop({'max':15});
					$(this.maxInput).prop({'max':15});
					this.maxVal = 15;
					break;
			case 1: $(this.toggle).html('<i class="fa fa-caret-right"></i><i class="fa fa-caret-left"></i>');
					$(this.toggle).prop({'title':'Is Between'});
					this.setValues();
					$(this.maxInput).show();
					$(this.and).show();
					break;
		}
	}
	drawMinInput(){
		this.minInput = document.createElement('input');
		$(this.minInput).prop({'type':'Number','min':2,'max':15});
		$(this.minInput).addClass('overviewQueryTextInput noappearance');
		$(this.minInput).css({'display':'inline-block','text-align':'center','padding':0,'width':'15%'});
		$(this.minInput).val(2);
		let self=this;
		$(this.minInput).on('change',function(){
			if (Number($(self.minInput).val())>Number($(self.minInput).prop('max'))) { $(self.minInput).val($(self.minInput).prop('max'));}
			if (Number($(self.minInput).val())<Number($(self.minInput).prop('min'))) { $(self.minInput).val($(self.minInput).prop('min'));}
			$(self.maxInput).prop({'min':$(self.minInput).val()});
			self.minVal = $(self.minInput).val();
			if ((self.toggleState % 2) === 0) {
				$(self.maxInput).val(15);
				this.maxVal=15;
			}
			else {
				$(self.maxInput).prop({'min':$(self.minInput).val()});
			}
			self.setValues();
		});
		this.minVal=2;
		return this.minInput;
	}
	drawMaxInput(){
		this.maxInput = document.createElement('input');
		$(this.maxInput).prop({'type':'Number','min':2,'max':15});
		$(this.maxInput).addClass('overviewQueryTextInput noappearance');
		$(this.maxInput).css({'display':'inline-block','text-align':'center','padding':0,'margin':0,'width':'15%'});
		$(this.maxInput).val(15);
		let self=this;
		$(this.maxInput).on('change',function(){
			if (Number($(self.maxInput).val())>Number($(self.maxInput).prop('max'))) { $(self.maxInput).val($(self.maxInput).prop('max'));}
			if (Number($(self.maxInput).val())<Number($(self.maxInput).prop('min'))) { $(self.maxInput).val($(self.maxInput).prop('min'));}
			((self.toggleState % 2) === 0) ? $(self.minInput).prop({'max':15}) : $(self.minInput).prop({'max':$(self.maxInput).val()});
			self.maxVal = $(self.maxInput).val();
			//if ((self.toggleState % 2) === 0) {$(self.maxInput).val() = self.minVal;}
			self.setValues();
		});
		this.maxVal=15;
		return this.maxInput;
	}
}
class SearchProb extends SearchDate {
	constructor(data={}){
		super(data);
	}
	setValues(){
		(this.toggleState % 2 === 0) ?
			this.values = {'minProb':Number(this.minVal), 'maxProb':Number(this.minVal)}
			: this.values = {'minProb':Number(this.minVal), 'maxProb':Number(this.maxVal)} ;
	}
	setOptions(){
		switch (this.toggleState % 2){
			case 0: $(this.toggle).html('<i class="fa fa-equals"></i>');
					$(this.toggle).prop({'title':'Is Equal To'});
					this.setValues();
					$(this.maxInput).hide();
					$(this.and).hide();
					$(this.minInput).prop({'max':99999});
					$(this.maxInput).prop({'max':99999});
					$(this.maxInput).val(99999);
					this.maxVal = 99999;
					break;
			case 1: $(this.toggle).html('<i class="fa fa-caret-right"></i><i class="fa fa-caret-left"></i>');
					$(this.toggle).prop({'title':'Is Between'});
					this.setValues();
					$(this.maxInput).show();
					$(this.and).show();
					break;
		}
	}
	drawMinInput(){
		this.minInput = document.createElement('input');
		$(this.minInput).prop({'type':'Number','min':0,'max':99999});
		$(this.minInput).addClass('overviewQueryTextInput noappearance');
		$(this.minInput).css({'display':'inline-block','text-align':'center','padding':0});
		$(this.minInput).val(0);
		let self=this;
		$(this.minInput).on('change',function(){
			if (Number($(self.minInput).val())>Number($(self.minInput).prop('max'))) { $(self.minInput).val($(self.minInput).prop('max'));}
			if (Number($(self.minInput).val())<Number($(self.minInput).prop('min'))) { $(self.minInput).val($(self.minInput).prop('min'));}
			$(self.maxInput).prop({'min':$(self.minInput).val()});
			self.minVal = $(self.minInput).val();
			self.setValues();
		});
		this.minVal=0;
		return this.minInput;
	}
	drawMaxInput(){
		this.maxInput = document.createElement('input');
		$(this.maxInput).prop({'type':'Number','min':0,'max':99999});
		$(this.maxInput).addClass('overviewQueryTextInput noappearance');
		$(this.maxInput).css({'display':'inline-block','text-align':'center','padding':0,'margin':0});
		$(this.maxInput).val(99999);
		let self=this;
		$(this.maxInput).on('change',function(){
			if (Number($(self.maxInput).val())>Number($(self.maxInput).prop('max'))) { $(self.maxInput).val($(self.maxInput).prop('max'));}
			if (Number($(self.maxInput).val())<Number($(self.maxInput).prop('min'))) { $(self.maxInput).val($(self.maxInput).prop('min'));}
			$(self.minInput).prop({'max':$(self.maxInput).val()});
			self.maxVal = $(self.maxInput).val();
			//if ((self.toggleState % 2) === 0) {$(self.maxInput).val() = self.minVal;}
			self.setValues();
		});
		this.maxVal=99999;
		return this.maxInput;
	}
}
