XeraFeed.prototype = {
	constructor: XeraFeed,
	fetchStaticData: function(){
		$.ajax({
			type: "POST",
			url: this.getPath,
			timeout: 1000,
			data: JSON.stringify({'view':'IN','id':this.tournamentId}),
			context: this,
			success: function(response, responseStatus) {
				this.populateStaticData (JSON.parse(response));
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log("Error retrieving Feeds. Status: " + textStatus + "  Error: " + errorThrown +" Retrying...");
				appendDebugLog("Error retrieving Feeds. Status: " + textStatus + "  Error: " + errorThrown +" Retrying...");
				setTimeout(XeraFeed.prototype.fetchStaticData.bind(this),1000);
			}
		});
	},
	changeImagePath: function (data){
		this.staticData.players[data[0]][data[1]].photo = data[2];
	},
	imageCheck: function(){
		var that=this;
		var x= this.unresolvedImages;
		this.unresolvedImages.forEach(function(row,index){
			var image=new Image();
			image.src=row[2];
			$(this.testdiv).append(image);
			$(image).on("error",function (e){
				that.changeImagePath([row[0],row[1],"images/unknown_player.gif"]);
				that.removeImageCheck(row[0],row[1]);
			});
			$(image).on("load", function(){
				that.changeImagePath(row);
				that.removeImageCheck(row[0],row[1]);
			});
		});
	},
	removeImageCheck: function (div,player){
		var x = this.unresolvedImages.filter(function(value){
			return value[0]!==div && value[1]!==player;
		});
		this.unresolvedImages = x;
	},
	checkImageCheckStatus: function(){
		clearTimeout(this.testTimer);
		if (this.unresolvedImages.length!==0){
			console.log("Unresolved Images: "+this.unresolvedImages.length);
			this.testTimer = setTimeout(XeraFeed.prototype.checkImageCheckStatus.bind(this),75);
		}
		else {
			delete this.testDiv;
			this.dataTarget.update({'view':'CO','data':this.staticData});
			console.log("Image Check Complete");
		}
	},

	checkStaticImages: function(){
		var that = this;
		var checkValues = new Array();
		console.log(this.staticData);
		this.staticData.players.forEach(function(div, index){
			div.forEach(function(player,indexB){
				if ((player.photo.length == 0) || (player.photo=="pix/w/withheld.gif") || (player.photo=="pix/u/unknown_player.gif")) {
					that.staticData.players[index][indexB].photo="images/unknown_player.gif";
				}
				else {
					checkValues.push([index,indexB,that.staticData.path+"/"+player.photo]);
				}
			});

		});
		this.unresolvedImages = checkValues;
		appendDebugLog("Checking "+checkValues.length+" Images");
		var checks = this.imageCheck();
		this.testTimer = setTimeout(XeraFeed.prototype.checkImageCheckStatus.bind(this),75);
	},

	getData: function(data){
		data.id = this.tournamentId;
		this.currentView = data.view;
		$.ajax({
			type: "POST",
			url: this.getPath,
			timeout: 1000,
			data: JSON.stringify(data),
			context: this,
			success: function(response, responseStatus) {
				var x = JSON.parse(response);
				if (typeof x.error!=='undefined'){
					console.log(x.error);
					appendDebugLog(x.error);
				}
				else {
					if (typeof this.currentQuery!=='undefined'){this.lastQuery = this.currentQuery;}
					this.currentQuery = data;
					this.data = x;
					this.dataTarget.update({'view':data.view,'data':x});
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log("Error retrieving Feeds. Status: " + textStatus + "  Error: " + errorThrown +" Retrying...");
				appendDebugLog("Error retrieving Feeds. Status: " + textStatus + "  Error: " + errorThrown +" Retrying...");
				setTimeout(XeraFeed.prototype.fetchStaticData.bind(this),1000);
			}
		});
	},
	populateStaticData: function(data){
		this.testDiv = document.createElement('div');
		this.staticData = data;
		this.checkStaticImages();
	},
	sendQuery: function(data){
		switch(data.view){
			case "CO": this.fetchStaticData();break;
			case "RE": case "ST": case "PL": this.getData(data);break;
		}
	},
	switchTournament: function(data){
		if (typeof data.tournamentId!=='undefined'){
			//clear old data, replace with new stuff
			this.tournamentId = data.tournamentId;
			delete this.lastQuery;
			delete this.currentQuery;
			delete this.data;
			delete this.staticData;
		}
	}
}
function XeraFeed(data){
	if (typeof data.tournamentId!=='undefined'){
		this.tournamentId =  Number(data.tournamentId);
		typeof data.getPath!=='undefined'? this.getPath = data.getPath : this.getPath = 'PHP/tshGetData.php';
		this.dataTarget = data.dataTarget;
	}
	else {console.log("XeraFeed Error: No Tournament Id specified.  Instance Aborted.");}
}
