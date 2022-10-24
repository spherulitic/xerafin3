function initTSHFeedList (){
	if (typeof localStorage.tshFeedPagNumResults=='undefined'){localStorage.setItem('tshFeedPagNumResults','5');}

	if (!document.getElementById("pan_9")) {
		panelData = {
					"contentClass" : "panelContentDefault",
					"title": "TSH Feed List",
					"style": "Dark",
					"tooltip": "<p>Shows all available tournament feeds and their statuses.</p>"
		};
		generatePanel(9,panelData,"leftArea",getTSHFeeds,closeTSHFeeds);
		createElemArray([
			['a0','div','','feedContent','content_pan_9',''],
			['a1','div','','tshPagContain','content_pan_9','']

		]);
		tshFeedPagin = new Paginator({
			'id':'tshFeedPag',
			'pare':'tshPagContain',
			'totalResults':0,
			'action':getTSHFeeds,
			'numResults':Number(localStorage.tshFeedPagNumResults)
		});
		tshFeeds = new TshFeedList({
			'sourceFunc': getTSHFeeds,
			'targetFunc': initXeraFeed,
			'updateFrequency':60000,
			'pare':'feedContent',
			'id':'feedList'});
	}
}
function getTSHFeeds(){
	var data = {'pageNumber' : tshFeedPagin.currentPage, 'pageSize' : tshFeedPagin.numResults};
	localStorage.tshFeedPagNumResults = tshFeedPagin.numResults;
	$.ajax({
		type: "POST",
		url: "PHP/tshGet.php",
		data: JSON.stringify(data),
		timeout: 3000,
		beforeSend: function(){
			$("#heading_text_pan_9").html('TSH Feed List <img src="images/ajaxLoad.gif" style="height:0.8em">');
		},
		success: function(response,responseStatus){
			$("#heading_text_pan_9").html('TSH Feed List');
			var d = JSON.parse(response);
			if (typeof d.error!=='undefined'){
				appendDebugLog("PHP/Data Error Fetching Feeds List: "+d.error);
			}
			else {
				appendDebugLog("Feeds List Results:"+d.results);
				tshFeedPagin.update({'totalResults':Number(d.results)});
				tshFeeds.update(d.feeds);
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Error retrieving Feeds. Status: " + textStatus + "  Error: " + errorThrown);
			appendDebugLog("Error retrieving Feeds. Status: " + textStatus + "  Error: " + errorThrown);
			if (textStatus ==='timeout'){
				getTSHFeeds();
			}
		}
	});
}

function closeTSHFeeds(){
	$('#pan_9').remove();
	tshFeeds.delete;
	tshFeedPagin.delete;

}
