
function countBugs(){
	$.ajax ({
		type: 'POST',
		url: '/PHP/logError.php',
		data: JSON.stringify({action:'CNT'}),
		success: function(response, responseStatus){
			var data=JSON.parse(response);
			console.log(data)
			$('#bugIconBadge').html(data);

		},
		error: function(jqXHR, textStatus, errorThrown) {
			appendDebugLog(jqXHR+" "+textStatus+" "+errorThrown);
		}
	});

}
bugTimer = setInterval(function(){countBugs();},30000);
$('#bugIconBadge').ready(function(){countBugs();});
