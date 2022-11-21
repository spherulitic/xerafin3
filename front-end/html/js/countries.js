function populateCountries(){
  $.ajax({
    type: "GET",
    url: "getCountries",
    headers: {"Accept": "application/json", "Authorization": keycloak.token},
    success: function(response, responseStatus){
      country=response;
    }
  });
}
populateCountries();
