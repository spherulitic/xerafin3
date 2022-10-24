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
