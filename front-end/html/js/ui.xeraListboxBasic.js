XeraListboxBasic.prototype = {
	constructor : XeraListboxBasic,
	init: function(){
		this.draw();
	},
	populateOptions: function(){
		let self=this;
		Object.entries(this.data).forEach(function([i,v]){
			let x = document.createElement('option');
			x.text = v.text;
			x.value = v.value;
			self.content.add(x);
		});
		$(this.content).val(this.val);
	},
	getDependents:function(x){
		return (this.dependent[x] ? this.dependent[x] : new Array());
	},
	setWidth:function(x){
		$(this.content).css({'width':x+'%'});
	},
	change: function(){
		//need to figure out how to call this
		this.val = $(this.content).val();
		console.log("CHANGE FIRED IN CHANGE "+this.val);
	},
	draw: function(){
		this.content = document.createElement('select');
		$(this.content).addClass(this.style);
		this.populateOptions();
		let self=this;
		$(this.content).change(self.onChange);
		//$(this.content).change(self.xxx);
	},
	output: function(){
		return this.content;
	}
}
function XeraListboxBasic(data={}){
	this.data = data.options || {};
	this.onChange = data.change || function(){alert('No change action defined');}
	this.dependents = data.dependents || {}
	this.val = data.val || "AW";
	if (typeof data.style!=='undefined'){
		this.style = data.style;
	}
	else {
		this.style = 'mainFilter';
	}
	this.init();
}
