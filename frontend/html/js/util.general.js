function isBool(val){
	return val === false || val === true;
}

function getRandomInt(max) {
 return Math.floor(Math.random() * Math.floor(max));
}

function getOrdinal(n) {
	  return["st","nd","rd"][((n+90)%100-10)%10-1]||"th"
};

function isEven(n) {
   return n % 2 == 0;
}

function isOdd(n) {
   return Math.abs(n % 2) == 1;
}

function getBool(str) {
  return str === 'true';
}

function logoutUser() {
  window.keycloak.logout();
}

async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Authorization': keycloak.token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Token invalid - handle reauth
        try {
            await keycloak.updateToken(30);
            // Retry with new token
            headers.Authorization = keycloak.token;
            return await fetch(url, { ...options, headers });
        } catch (error) {
            // Refresh failed - force login
            keycloak.login();
            throw new Error('Authentication required');
        }
    }

    return response;
}

// Usage - replace all your fetch calls:
// BEFORE: fetch('/api/data', { method: 'POST', body: JSON.stringify(data) })
// AFTER: fetchWithAuth('/api/data', { method: 'POST', body: JSON.stringify(data) })
