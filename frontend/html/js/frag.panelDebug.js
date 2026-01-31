PanelDebug.prototype = {
	constructor: PanelDebug,
	initUI:function(){
		let that=this;
		this.debugWin = document.createElement('div');
		$(this.debugWin).css({'color':'#ccc'})
		this.debugHeader = document.createElement('div');
		this.debugRegion = document.createElement('div');
		$(this.debugRegion).css({'text-align':'left'});
		$(this.debugHeader).html("Debug");
		$(this.debugRegion).hide();
		$(this.debugHeader).on('click',function(){$(that.debugRegion).toggle(400);});
		$(this.debugWin).append(this.debugHeader,this.debugRegion);
	},
	tabGen:function(a){
		var v='';
		for (var x=0;x<=a;x++){
			v+='&nbsp;&nbsp;';
		};
		return v;
	},
	parse:function(data,depth=0){
		let that=this;
		var closure=false
		var content='';
		if (typeof(data)!=='undefined' || typeof(data)!=='null'){
		Object.entries(data).forEach(function (a,b){
			if (isNaN(a[0])) {content+='<br>';}
			else {b === 0 ? content+='[': content+=', ';}
			if (depth>0 && isNaN(a[0])) {content+=that.tabGen(depth);}
			var output = a[1];
			if (typeof a[1]==='string') {output="&#39;"+a[1]+"&#39;";}
			if (isNaN(a[0])) {content+= '<span style="color:rgba(95,117,48,1);">'+a[0]+'</span>: ';}
			if ((typeof a[1] === 'object') && (a[1]!=null)) {
				content+=that.parse(a[1],depth+1);
			}
			else {
				content+=output;
			}
			closure =  !isNaN(a[0]);
		});
		closure ? content+=']':content+='';
		return content;
		}
	},
	update:function(data){
		$(this.debugRegion).html(this.parse(data,0));
	},
	show:function(){
		$('#'+this.pare).append(this.debugWin);
	}
}
function PanelDebug(data){
	this.pare = data.pare;
	this.initUI();
}
