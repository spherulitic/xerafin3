async function showWordInfo(word) {
  if (typeof word !== 'undefined' && word !== '') {
    // Clean the input: uppercase and keep only A-Z
    word = word.toUpperCase().replace(/[^A-Z]/g, '');

    if (word === '') {
      displayWordInfo(null, { error: "Please enter a valid word (A-Z only)" });
      return;
    }

    const d = { word: word };
    try {
      const response = await fetchWithAuth('getWordInfo', {
        method: "POST",
        body: JSON.stringify(d)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.found === false || data.definition === null) {
        displayWordInfo(null, word, {error: data.message || `Word '${word}' not found in dictionary`});
      } else {
        displayWordInfo(data, word); // Pass the word to display
      }

    } catch (error) {
      console.log("Error getting word info: " + error.message);
      displayWordInfo(null, { error: "Could not retrieve definition. Please try again." });
    }
  } else {
    // Empty input - just show the empty panel
    displayWordInfo();
  }
}

function createWordInfoPanel() {
  if (!document.getElementById("pan_8")) {
    panelData = {
      "contentClass": "panelContentDefault",
      "title": "Word Definition",
      "refreshButton": false,
      "tooltip": "Look up word definitions"
    };

    generatePanel(8, panelData, "middleArea", displayWordInfo, hideWordInfo);

    // Create the main container
    var wordInfoContainer = document.createElement("div");
    wordInfoContainer.className = "wordInfoContainer";
    wordInfoContainer.id = "wordInfoContainer";

    // Create input row
    var inputRow = document.createElement("div");
    inputRow.className = "wordInfoInputRow";

    var inputLabel = document.createElement("span");
    inputLabel.className = "wordInfoLabel";
    inputLabel.innerHTML = "Word:";

    var wordInput = document.createElement("input");
    wordInput.type = "text";
    wordInput.className = "wordInfoInput";
    wordInput.id = "wordInfoInput";
    wordInput.placeholder = "Enter a word...";
    wordInput.maxLength = 15;

    // Clear the input when it gains focus
    wordInput.onfocus = function() {
      this.value = '';
    };

    // Handle Enter key
    wordInput.onkeypress = function(e) {
      if (e.key === 'Enter') {
        showWordInfo(this.value);
      }
    };

    // Lookup button
    var lookupButton = document.createElement("button");
    lookupButton.className = "wordInfoButton";
    lookupButton.innerHTML = "Look Up";
    lookupButton.onclick = function() {
      showWordInfo(document.getElementById("wordInfoInput").value);
    };

    inputRow.appendChild(inputLabel);
    inputRow.appendChild(wordInput);
    inputRow.appendChild(lookupButton);

    // Create word display area (for centered word)
    var wordDisplayArea = document.createElement("div");
    wordDisplayArea.className = "wordInfoWordDisplay";
    wordDisplayArea.id = "wordInfoWordDisplay";

    // Create definition display area
    var definitionArea = document.createElement("div");
    definitionArea.className = "wordInfoDefinition";
    definitionArea.id = "wordInfoDefinition";
    definitionArea.innerHTML = "Enter a word to see its definition";

    // Assemble the panel
    wordInfoContainer.appendChild(inputRow);
    wordInfoContainer.appendChild(wordDisplayArea);
    wordInfoContainer.appendChild(definitionArea);
    document.getElementById('content_pan_8').appendChild(wordInfoContainer);
  }
}

function displayWordInfo(response, searchedWord, errorInfo) {
  // Ensure panel exists
  createWordInfoPanel();

  // Get references to display areas
  var wordDisplayArea = document.getElementById("wordInfoWordDisplay");
  var definitionArea = document.getElementById("wordInfoDefinition");

  // Handle errors or empty states
  if (errorInfo && errorInfo.error) {
    // Show the word that wasn't found (if provided)
    if (searchedWord) {
      wordDisplayArea.innerHTML = `<div class="wordInfoDisplayWord wordNotFound">${searchedWord}</div>`;
    } else {
      wordDisplayArea.innerHTML = '';
    }
    definitionArea.innerHTML = `<span class="wordInfoError">${errorInfo.error}</span>`;
    return;
  }

  if (!response || !response.definition) {
    wordDisplayArea.innerHTML = ''; // Clear word display on empty state
    definitionArea.innerHTML = '<span class="wordInfoPlaceholder">Enter a word to see its definition</span>';
    return;
  }

  // Display the searched word centered above definition
  if (searchedWord) {
    wordDisplayArea.innerHTML = `<div class="wordInfoDisplayWord">${searchedWord}</div>`;
  } else {
    wordDisplayArea.innerHTML = '';
  }

  // Build the definition display
  var definitionHTML = '';

  // Add the definition
  definitionHTML += `<div class="wordInfoDefinitionText">${response.definition}</div>`;

  // Add hooks if they exist
  if (response.front_hooks && response.front_hooks.length > 0) {
    definitionHTML += `<div class="wordInfoHooks"><span class="wordInfoHookLabel">Front hooks:</span> ${response.front_hooks.split('').join(', ')}</div>`;
  }

  if (response.back_hooks && response.back_hooks.length > 0) {
    definitionHTML += `<div class="wordInfoHooks"><span class="wordInfoHookLabel">Back hooks:</span> ${response.back_hooks.split('').join(', ')}</div>`;
  }

  definitionArea.innerHTML = definitionHTML;
}

function hideWordInfo() {
  $('#pan_8').remove();
}

// Optional: Helper function to clear and reset
function clearWordInfo() {
  var input = document.getElementById("wordInfoInput");
  if (input) input.value = '';
  document.getElementById("wordInfoWordDisplay").innerHTML = '';
  displayWordInfo();
}
