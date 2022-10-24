function initOldManageUsers() {
	showManageUsers();
}
if (!Object.entries)
  Object.entries = function( obj ){
    var ownProps = Object.keys( obj ),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];

    return resArray;
  };

function hideManageUsers(){
	$('#pan_500').remove();
}
function showManageUsers() {
	if (!document.getElementById("pan_500")) {
		var panelData = {
			"title": "Manage Users",
			"tooltip": "<p>Primarily to set privs, but will increase in functionality over time</p>",
			"contentClass" : "panelContentDefault",
			"refreshButton" : false
		};
		generatePanel(500,panelData,"leftArea","",hideManageUsers);
		var searchWrap=document.createElement("div");
		searchWrap.id="manageSearchWrap";
		var searchMethods=[["Name","name"],["User Id","userid"],["Priv Value","secLevel"]];
		var searchInput=document.createElement("input");
		searchInput.id="manageSearchInput";
		$('#content_pan_500').append(searchWrap);
		gGenerateListBox("searchBox",searchMethods,"manageSearchWrap");
		$(searchWrap).append(searchInput);
		var searchResultsWrap=document.createElement("div");
		searchResultsWrap.id="searchResultsWrap";
		searchResultsWrap.className+=" well well-sm pre-scrollable quizContent";
		$(searchInput).on("keyup",function(event){$(formWrap).hide();if (($(searchInput).val().length>2) || ($(searchBox).val()=="secLevel")){getSearchResults($('#manageSearchInput').val(),$('#searchBox').val());};});
		var formWrap=document.createElement("div");
		formWrap.id="formWrap";
		formWrap.className+=" well well-sm pre-scrollable quizContent";
		$(formWrap).hide();
		$('#content_pan_500').append(searchResultsWrap,formWrap);
		gGenerateTable(["","Name","User Id","Priv"],"searchResultsWrap","userSearch","userSearchTable","searchContent");
	}
}
function getSearchResults(value,type){
	if ((typeof value == 'undefined') || (typeof value == 'null') || typeof value == 'boolean') {value = 0;}
 	if (type=='secLevel') {value = Number(value);}
	var da={user:userid,queryType:type,val:value};
	$.ajax ({
		url:'PHP/getUsers.php',
		dataType: 'json',
		data: JSON.stringify(da),
		type: "POST",
		beforeSend: function(){$("#heading_text_pan_500").html('Manage Users <img src="images/ajaxLoad.gif" style="height:0.8em">');},
		success: function(response,responseStatus){
			$("#heading_text_pan_500").html('Manage Users');
			//console.log(response);
			displaySearchResults(response);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Error, status = " + textStatus + " error: " + errorThrown);
			$("#heading_text_pan_500").html('Manage Users');
		}
	});
}
function displaySearchResults(data){
	console.log(data);
	var img;
	$("#searchContent").empty();
	data.forEach(function(row,index){
		img =new Image();
		img.src=row.photo;
		$(img).css('height','25px');
		$(img).css('width','25px');
		img.id='searchImg'+index;
		gGenerateTableRow(["searchImg"+index,"searchName"+index,"userid_"+index,"privs"+index],[img,row.name,row.userid,row.secLevel],"searchContent","searchTableRow"+index);
		$("#searchTableRow"+index).on('click',function(data){userHighlightAction(index,row);});
	});
	gGenerateTableRow(["","",""],["","",""],"searchContent","");

}

function userHighlightAction(row,data){

	$('[id^=searchTableRow]').each(function(){
		$(this).removeClass("highlightRow");
	});
	$("#searchTableRow"+row).addClass("highlightRow");
	getUserAdminData(data.userid);
}

function getUserAdminData (user){

	$.ajax ({
		url:'PHP/getUserAdminData.php',
		dataType: 'json',
		data:{userid: user},
		type: "POST",
		beforeSend: function(){$("#heading_text_pan_500").html('Manage Users <img src="images/ajaxLoad.gif" style="height:0.8em">');},
		success: function(response,responseStatus){
			displayAdminManageForm(response[0]);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Error, status = " + textStatus + " error: " + errorThrown);
		},
		complete: function(){
			$("#heading_text_pan_500").html('Manage Users');
		}

	});
}
function displayAdminManageForm (data){
	var userVal=data["userid"];
	var rowData = new Array()
	console.log(data);
	delete data["token"];
	$('#formWrap').empty();
	var userImpWrap = document.createElement('div');
	userImpWrap.id="userImpWrap";
	userImpWrap.className+=" userImpWrap";
	var userImpPic = document.createElement('img');
	userImpPic.src = data["photo"];
	userImpPic.className+=" userImpPic";
	var userImpPicWrap = document.createElement('div');
	userImpPicWrap.id='userImpPicWrap';
	userImpPicWrap.className+=" userImpPicWrap";
	userImpMainData = document.createElement('div');
	userImpMainData.id="userImpMainData";
	userImpDates = document.createElement('div');
	var userImpName = document.createElement('div');
	userImpName.id="userImpName";
	userImpName.className+=" userImpName";
	$(userImpName).html(data["name"]+" <span style='color:rgba(128,128,128,1);font-size:0.8em;'>("+data["userid"]+")</span>");
	userImpDates.id = "userImpDates";
	userImpDates.className+= " userImpDates";
	$(userImpDates).html("Last Login: "+gFormatDateForDisplay(new Date(Number(data["last_login"]*1000)))+" Last Active: "+gFormatDateForDisplay(new Date(Number(data["last_active"]*1000))));
	$(userImpPicWrap).append(userImpPic);
	$(userImpMainData).append(userImpName,userImpDates);
	$(userImpWrap).append(userImpPicWrap,userImpMainData);
	$("#formWrap").append(userImpWrap);

	delete data["photo"];delete data["name"];delete data["showHints"];delete data["last_login"];delete data["last_active"];delete data["userid"];
	gGenerateTable(["Variable","Value","Variable","Value"],"formWrap","userSearch","formTable","formContent");
	for (var row in Object.keys(data)){
		rowData[row]=Object.entries(data)[row];
	}
	var x = 0;
	var z = Math.ceil(rowData.length/2);
	for (x=0;x<z;x++){
		if (x<z-1){
			console.log(x+":"+z);
			console.log(rowData[x+z][0]+" "+rowData[x+z][1]);
			gGenerateTableRow(['userVar'+x,'userVarValue'+x,'userVar'+(x+z),'userVarValue'+(x+z)],
				[rowData[x][0],rowData[x][1],rowData[x+z][0],rowData[x+z][1]],'formContent','formContentRow'+x);

		}
		else {
			if (isOdd(rowData.length)==true){
				gGenerateTableRow(['userVar'+x,'userVarValue'+x,"",""],[rowData[x][0],rowData[x][1],"",""],"formContent","formContentRow"+x);
			}
			else {
				gGenerateTableRow(['userVar'+x,'userVarValue'+x,'userVar'+(x+z),'userVarValue'+(x+z)],
				[rowData[x][0],rowData[x][1],rowData[x+z][0],rowData[x+z][1]],'formContent','formContentRow'+x);
			}
		}
	}
	var secLabel = document.createElement('label');
	secLabel.id="secLabel";
	$(secLabel).html("New Sec Level:");
	var secInput = document.createElement('input');
	secInput.id="secInput";
	secInput.value = data["secLevel"];
	$(secInput).on("keyup",function(e){
		if (e.keyCode==13){
			updateSecLevel(userVal,$('#secInput').val());
		}
	});
	$('#formWrap').append(secLabel,secInput);
	$('#formWrap').show();
}
function updateSecLevel(user,newValue){
		$.ajax ({
		url:'PHP/updateSecLevel.php',
		data:{userid: user, newPriv: newValue},
		type: "POST",
		beforeSend: function(){$("#heading_text_pan_500").html('Manage Users <img src="images/ajaxLoad.gif" style="height:0.8em">');},
		success: function(response,responseStatus){
			getUserAdminData(user);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Error, status = " + textStatus + " error: " + errorThrown);
		},
		complete: function(){
			$("#heading_text_pan_500").html('Manage Users');
		}
	});
}
