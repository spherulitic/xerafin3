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

function toAlpha(word) {return word.split('').sort().join('');}

// A blank question key is a canonical alphagram with a trailing wildcard,
// e.g. AAIINR?. Its answers are every word built from the core plus one letter.
function isBlankAlpha(alpha) {
    return typeof alpha === 'string' && alpha.charAt(alpha.length - 1) === '?';
}

// The letter the blank supplies for `word`, or null if the word does not fit.
// The word is sorted, as is the core, so one left-to-right pass that tolerates
// a single extra character decides whether it matches.
function blankExtraLetter(word, alpha) {
    if (!isBlankAlpha(alpha)) { return null; }
    var core = alpha.slice(0, -1);
    if (word.length !== core.length + 1) { return null; }
    var sorted = toAlpha(word);
    var extra = null;
    var j = 0;
    for (var i = 0; i < sorted.length && j < core.length; i++) {
        if (sorted[i] === core[j]) { j++; }
        else if (extra === null) { extra = sorted[i]; }
        else { return null; } // a second mismatch means the word does not fit
    }
    if (j !== core.length) { return null; }
    // An extra letter that sorts after every core letter is never compared.
    return extra !== null ? extra : sorted.charAt(sorted.length - 1);
}

function answerFitsAlpha(word, alpha) {
    if (!isBlankAlpha(alpha)) { return toAlpha(word) === alpha; }
    return blankExtraLetter(word, alpha) !== null;
}

// Render `word` with the letter supplied by the blank in red, so answer tables
// show what the wildcard contributed.
function highlightBlankLetter(word, alpha) {
    var extra = blankExtraLetter(word, alpha);
    if (extra === null) { return word; }
    var i = word.indexOf(extra);
    return word.slice(0, i) + '<span class="blankLetter">' + word.charAt(i) + '</span>' + word.slice(i + 1);
}

function alphaSortVC(content, type) {
    var vowels = '';
    var consonants = '';
    var other = '';
    content.split('').forEach(function(c) {
        if (/[aeiou]/i.test(c)) { vowels += c; }
        else if (/[a-z]/i.test(c)) { consonants += c; }
        // '?' (and anything unexpected) is neither, so it is kept once and last
        else { other += c; }
    });
    if (type === 0) {
        return vowels + consonants + other;
    }
    else {
        return consonants + vowels + other;
    }
}

function alphaShuffle(content) {
    return content.split('').sort(function() {
        return 0.5 - Math.random();
    }).join('');
}

function alphaSortMethod(content, type) {
    var output = content;
    switch (type) {
    case 0: output = content; break;
    case 1: output = alphaSortVC(content, 0);break;
    case 2: output = alphaSortVC(content, 1);break;
    case 3: output = alphaShuffle(content);break;
    default:output = content;break;
    }
    return output;
}

function getDivisor(item, divideBy) {
    if (divideBy !== 0) {
        return Math.ceil(item.length / divideBy);
    }
}

function addLineBreaks(item, divideBy) {
    var divisor = getDivisor(item, divideBy);
    if (divisor > 1) {
        var splitUp = item;
        var splitPos = Math.ceil(item.length / divisor);
        for (var i = 1; i < divisor; i++) {
            splitUp = splitUp.substr(0, (i * splitPos) + (4 * (i - 1))) + '<br>' + splitUp.substr((i * splitPos) + (4 * (i - 1)));
        }
        return splitUp;
    }
    return item;
}

function resizeHookFontQuiz () {
    var hookFont = $('#alphaSuper').width()/18;
    if (hookFont>30){hookFont=30;}
    $('#leftHook').css({'font-size':hookFont+'px','line-height':'0.7'});
    $('#rightHook').css({'font-size':hookFont+'px','line-height':'0.7'});
}

function resetHookWidthsQuiz () {
    hookWidth = 0;
        $('#rightHook').width(0);
        $('#leftHook').width(0);
        resizeHookFontQuiz();
    if (typeof allAnswers!=="undefined"){
      for (i=0;i<allAnswers.length;i++){
        $('#leftHook').html(addLineBreaks(eval('wordData.'+allAnswers[i]+'[0]'), 7));
        var x=$('#leftHook').width();
        if (x>hookWidth){hookWidth=x;}
        $('#leftHook').html(addLineBreaks(eval('wordData.'+allAnswers[i]+'[1]'), 7));
        var x=$('#leftHook').width();
        if (x>hookWidth){hookWidth=x;}
      }
    }
        $('#rightHook').width(hookWidth);
        $('#leftHook').width(hookWidth);
        $('#leftHook').html('');
        $('#rightHook').html('');

}

function stopScrollTimer() {
// scrollTimer is a global
    if (typeof scrollTimer !== 'undefined' && scrollTimer !== null )
        clearInterval(scrollTimer);
}

function getTableLineData(word, auxWordData, alpha) {
// auxWordData is the list [ front hooks, back hooks, definition, [frontDot, backDot], lexiconSymbol ]
   // Blank questions show which letter the wildcard supplied.
   if (isBlankAlpha(alpha)) {
      word = highlightBlankLetter(word, alpha);
   }

   // make definitions clickable
   var definition = " " + auxWordData[2]; // hack so my regexp works
   var inlineWordsExp = new RegExp('[A-Z]{4,}', 'g');
   var inlineWords = auxWordData[2].match(inlineWordsExp);
   if (inlineWords)
   for (var i=0;i<inlineWords.length;i++) {
       var r = new RegExp('([^A-Z])(' + inlineWords[i] + ')([^A-Z])');
       definition = definition.replace(r, '$1<span onclick="showAlphaStats(\''+toAlpha(inlineWords[i])+'\')">$2</span>$3');
   }

   return [auxWordData[0], (auxWordData[3][0] ? dot : ""), word, (auxWordData[3][1] ? dot : ""), (auxWordData[4]? auxWordData[4]:"") , auxWordData[1], definition];

}
