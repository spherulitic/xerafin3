function populateCountries(){
	$.ajax({
		type: "POST",
		url: "PHP/countries.php",
		success: function(response, responseStatus){
			country=JSON.parse(response);
		}
	});
}
populateCountries();
