function URLExists(url) {
   var http = new XMLHttpRequest();
   http.open('HEAD', url, false);
   http.send();
   return http.status != 404;
}

function showManageCardbox() {

  if (!document.getElementById("pan_1_f")) {
		panelData = {
					"contentClass" : "panelContentDefault",
					"title": "Cardbox File Management",
					"minimizeObject": "content_pan_1_f",
					"variant": "f",
					"closeButton": false,
					"refreshButton" : false,
					"style" : 'Dark',
					"tooltip": "<p>Something helpful will go here.</p>"
					};
		generatePanel(1,panelData,"leftArea");
		gCreateElemArray([
			['a0','div','well well-sm quizContent','manageBoxDiv','content_pan_1_f', ''],
			['a1','div','prefPar','uploadCustomWordList','a0',''],
			['a1a','div','prefHead','uploadCustomHead','a1','Upload Custom Word List'],
			['a1b','div','manageCardboxDiv','uploadCustomText','a1',''],
			['a1b1','p','managePar','uploadCustomTextP1','a1b','Upload a .txt file with one alphagram or word per line.'],
			['a1b2','p','manageCardboxPar','uploadCustomTextP2','a1b','These words will be added to your cardbox ahead of the default study list.'],
			['a1b3','div','manageCardboxGroupWrap','manageGroup1','a1b',''],
			['a1b3_1','div','manageSpacer','spacerDiv1','a1b3',''],
			['a1b3a','input','uploadBox','wlistFile','a1b3_1',''],
			['a1b3_2','div','manageSpacer','spacerDiv2','a1b3',''],
			['a1b3b','button','btn btn-default','listUploadButton','a1b3_2','Submit'],
			['a2','div','prefPar','uploadCustomWordList','a0',''],
			['a2a','div','prefHead','uploadCardboxHead','a2','Upload Cardbox'],
			['a2b','div','manageCardboxDiv','uploadCardboxText','a2',''],
			['a2b1','p','managePar','uploadCardboxTextP1','a2b','<span style="color: red">Caution: This will replace your existing cardbox</span>'],
			['a2b3','div','manageCardboxGroupWrap','manageGroup2','a2b',''],
			['a2b3_1','div','manageSpacer','spacerDiv3','a2b3',''],
			['a2b3a','input','uploadBox','cboxFile','a2b3_1',''],
			['a2b3_2','div','manageSpacer','spacerDiv4','a2b3',''],
			['a2b3b','button','btn btn-default uploadButton','uploadButton','a2b3_2','Upload']
		]);
		$('#wlistFile').prop('type','file');
		$('#wlistFile').prop('accept','.txt');
		$('#cboxFile').prop('type','file');
		$('#cboxFile').prop('accept','.db');
		$('#listUploadButton').on('click', function(){uploadNewWordList();});
		$('#uploadButton').on('click', function(){uploadCardbox();});
		if (URLExists('cardboxes/' + userid + '.db')) {
			$('#manageBoxDiv').append('<div class="prefPar"><a href="cardboxes/' + userid + '.db">Download Cardbox Here</a> <br> (Right Click and Save As...)</div>');
        } else {  // no userid in environment
			$('#manageBoxDiv').append('<div class="prefPar"><a href="downloadCardbox.py">Download Cardbox Here</a></div>');
    } // end if ... display download link
  }
}



function uploadCardbox() {
  var fileList = document.getElementById('cboxFile').files;
  if (fileList.length == 0) {
    alert("Please select a cardbox file to upload"); }
  else {
    var file = fileList[0];
    $( "#uploadButton" ).prop("disabled", true);
    $( "#uploadButton" ).val("Uploading...");
    var formdata = new FormData();
    formdata.append(userid, file, 'cardbox.db');
    $.ajax({
	type: 'POST',
	url: 'uploadCardbox.py',
	data: formdata,
	processData: false,
	contentType: false,
 	success: cardboxUploadCallback}); }
}

function cardboxUploadCallback(response, responseStatus) {
  $( "#uploadButton" ).prop("disabled", false);
  $( "#uploadButton" ).val("Upload");
  console.log("Cardbox upload script status is " + response.status);
  gFloatingAlert("cardboxUploadAlert",3000,"Cardbox File Management", "Cardbox Upload Complete!",500);
}

function uploadNewWordList() {
  $("#listUploadButton").prop("disabled", true);
  $("#listUploadButton").val("Uploading...");
  var file = document.getElementById('wlistFile').files[0];
  var formdata = new FormData();
  formdata.append(userid, file, 'list.txt');
  $.ajax({ type: 'POST',
	   url: 'uploadNewWordList.py',
          data: formdata,
          processData: false,
          contentType: false,
          success: function(response, responseStatus) {
		$('#listUploadButton').prop('disabled', false);
                $('#listUploadButton').val('Success');
				gFloatingAlert("wordlistUploadAlert",3000,"Cardbox File Management", "New Wordlist Uploaded!",500);
          console.log("Word List Upload Status: " + response); }});
}
