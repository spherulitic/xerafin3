class WordSiege {
    constructor() {
        // Game constants
        this.maxWidth = 360;
        this.targetDiv = 'content_pan_1_h';
        this.canvasIndent = 20;

        // Game state
        this.gameState = "menu";
        this.isPaused = false;

        // Game data
        this.wave = 1;
        this.score = 0;
        this.towerHealth = 100;
        this.maxHealth = 100;
        this.enemies = [];
        this.enemiesPerWave = 5;
        this.enemiesDefeated = 0;
        this.currentEnemy = null;
        this.currentQuestion = null;
        this._completingWave = false;

        // Visual effects
        this.particles = [];
        this.damageFlash = 0;

        // Canvas dimensions
        this.INVW = 360;
        this.INVH = 360;

        // Quiz integration
        this.q = null;
        this.quizid = null;
        this.quizname = null;
        this.pathY = 0;

        // UI Components
        this.answerArea = new AnswerArea(this);

        // Menu will be initialized later
        this.menu = null;

        // Pause button
    this.isPaused = false;
    this.pauseButton = {
        box: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        color: "grey",
        display: () => {
            const ctx = document.getElementById("wordSiegeCanvas").getContext('2d');
            if (!ctx) return;
            ctx.font = "14pt Alegreya SC";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this.pauseButton.color;
            const pauseText = this.isPaused ? "▶️" : "⏸️";
            const width = ctx.measureText(pauseText).width;
            this.pauseButton.box.minX = 10;
            this.pauseButton.box.maxX = 10 + width;
            this.pauseButton.box.minY = this.INVH - 30;
            this.pauseButton.box.maxY = this.INVH - 10;
            ctx.fillText(pauseText, 10, this.INVH - 20);
        },
        eventOver: (pos) => {
            if (pos.x > this.pauseButton.box.minX && pos.x < this.pauseButton.box.maxX &&
                pos.y > this.pauseButton.box.minY && pos.y < this.pauseButton.box.maxY) {
                return "Pause";
            }
            return undefined;
        },
        click: () => {
            this.isPaused = !this.isPaused;
            if (!this.isPaused) {
                // Unpaused - refocus answer box
                const answerBox = document.getElementById("answerBox");
                if (answerBox) answerBox.focus();
            }
        }
    };

      // Next Wave Button
      // In constructor, add nextWaveButton
this.nextWaveButton = {
    enabled: false,
    box: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    color: "grey",
    display: () => {
        if (!this.nextWaveButton.enabled) return;
        const ctx = document.getElementById("wordSiegeCanvas").getContext('2d');
        if (!ctx) return;
        ctx.font = "16pt Alegreya SC";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.nextWaveButton.color;
        const text = "NEXT WAVE →";
        const width = ctx.measureText(text).width;
        this.nextWaveButton.box.minX = (this.INVW / 2) - (width / 2);
        this.nextWaveButton.box.maxX = (this.INVW / 2) + (width / 2);
        this.nextWaveButton.box.minY = this.INVH - 80;
        this.nextWaveButton.box.maxY = this.INVH - 50;
        ctx.fillText(text, this.INVW / 2, this.INVH - 65);
    },
    eventOver: (pos) => {
        if (!this.nextWaveButton.enabled) return undefined;
        if (pos.x > this.nextWaveButton.box.minX && pos.x < this.nextWaveButton.box.maxX &&
            pos.y > this.nextWaveButton.box.minY && pos.y < this.nextWaveButton.box.maxY) {
            return "NextWave";
        }
        return undefined;
    },
    click: () => {
        if (!this.nextWaveButton.enabled) return;
        this.nextWaveButton.enabled = false;
        this.startNextWave();
    }
};

        // Quit button
        this.quitButton = {
            box: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
            color: "grey",
            display: () => {
                const ctx = document.getElementById("wordSiegeCanvas").getContext('2d');
                if (!ctx) return;
                ctx.font = "14pt Alegreya SC";
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = this.quitButton.color;
                const width = ctx.measureText("❌").width;
                this.quitButton.box.minX = (this.INVW / 2) - (width / 2);
                this.quitButton.box.maxX = this.quitButton.box.minX + width;
                this.quitButton.box.maxY = this.INVH - 20;
                this.quitButton.box.minY = this.quitButton.box.maxY - 20;
                ctx.fillText("❌", this.INVW / 2, this.INVH - 20);
            },
            eventOver: (pos) => {
                if (pos.x > this.quitButton.box.minX && pos.x < this.quitButton.box.maxX &&
                    pos.y > this.quitButton.box.minY && pos.y < this.quitButton.box.maxY) {
                    return "Quit";
                }
                return undefined;
            }
        };

        // Game over object
        this.gameover = {
            okcolor: 'grey',
            okbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
            display: () => {
                const ctx = document.getElementById("wordSiegeCanvas").getContext('2d');
                if (!ctx) return;
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(0, 0, this.INVW, this.INVH);
                ctx.fillStyle = "chocolate";
                ctx.textAlign = "center";
                ctx.font = "20pt Alegreya SC";
                ctx.fillText("Game Over", this.INVW / 2, this.INVH / 3);

                ctx.font = "12pt Alegreya SC";
                ctx.fillText(`Score: ${this.score}`, this.INVW / 2, this.INVH / 2);
                ctx.fillText(`Wave: ${this.wave - 1}`, this.INVW / 2, this.INVH / 2 + 30);

                ctx.font = "14pt Alegreya SC";
                const okWidth = ctx.measureText("OK").width;
                this.gameover.okbox.minX = this.INVW / 2 - okWidth / 2;
                this.gameover.okbox.maxX = this.INVW / 2 + okWidth / 2;
                this.gameover.okbox.minY = this.INVH * 0.7;
                this.gameover.okbox.maxY = this.gameover.okbox.minY + 25;
                ctx.fillStyle = this.gameover.okcolor;
                ctx.fillText("OK", this.INVW / 2, this.INVH * 0.7);
            },
            eventOver: (pos) => {
                if (pos.x > this.gameover.okbox.minX && pos.x < this.gameover.okbox.maxX &&
                    pos.y > this.gameover.okbox.minY && pos.y < this.gameover.okbox.maxY) {
                    return "OK";
                }
                return undefined;
            },
            click: (e) => {
                if (this.gameover.eventOver(this.getPosition(e)) === 'OK') {
                    initWordSiege();
                }
            }
        };

        // Tower position
        this.tower = {
            x: 0,
            y: 0,
            width: 30,
            height: 50
        };
    }

    generateDOM() {
        console.log("generateDOM called");
        const targetContainer = document.getElementById(this.targetDiv);
        if (targetContainer) {
            targetContainer.innerHTML = '';
        }

        gCreateElemArray([
            ['a', 'div', 'quizContent invWrapper wordWrapper', 'wordSiegeWrapper', this.targetDiv, ''],
            ['a1', 'div', 'canvasWrapper', 'wordSiegeCanvasWrapper', 'a', ''],
            ['a1a', 'canvas', 'invCanvas canvas', 'wordSiegeCanvas', 'a1', ''],
            ['a1b', 'canvas', 'invCanvas canvas', 'wordSiegeBgCanvas', 'a1', ''],
        ]);

        const canvas = document.getElementById("wordSiegeCanvas");
        const bgCanvas = document.getElementById("wordSiegeBgCanvas");
        if (canvas) {
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '2';
        }
        if (bgCanvas) {
            bgCanvas.style.position = 'absolute';
            bgCanvas.style.top = '0';
            bgCanvas.style.left = '0';
            bgCanvas.style.zIndex = '1';
        }

        const wrapper = document.getElementById('wordSiegeCanvasWrapper');
        if (wrapper) {
            wrapper.style.position = 'relative';
            wrapper.style.width = (this.INVW + 4) + 'px';
            wrapper.style.height = (this.INVH + 4) + 'px';
            wrapper.style.margin = '0 auto';
        }

        this.answerArea.addDOM('wordSiegeWrapper');
        this.answerArea.setButtonText("New Wave", "🏰");

        console.log("DOM generated, canvas exists:", !!document.getElementById("wordSiegeCanvas"));
    }

    initEvents() {
        console.log("initEvents called");
        const self = this;
        const canvas = document.getElementById("wordSiegeCanvas");
        if (!canvas) {
            console.error("Canvas not found in initEvents");
            return;
        }

        canvas.tabIndex = '1';
        canvas.focus();

canvas.onclick = function(e) {
    const pos = self.getPosition(e);
    switch(self.gameState) {
        case "menu":
            if (self.menu && self.menu.click) {
                self.menu.click(e);
            }
            break;
        case "active":
            // Check pause button first
            if (self.pauseButton && self.pauseButton.eventOver(pos) === "Pause") {
                self.pauseButton.click();
                return;
            }
 // Check next wave button
            if (self.nextWaveButton && self.nextWaveButton.eventOver(pos) === "NextWave") {
                self.nextWaveButton.click();
                return;
            }
            self.canvasClick(e);
            break;
        case "inactive":
            if (self.gameover && self.gameover.click) self.gameover.click(e);
            break;
    }
};

        canvas.addEventListener('mousemove', function(e) {
            switch(self.gameState) {
                case "menu":
                    if (self.menu && self.menu.mouseover) self.menu.mouseover(e);
                    break;
                case "active":
                    if (self.quitButton && self.quitButton.eventOver) self.quitButton.eventOver(self.getPosition(e));
                    break;
            }
        });

        const box = document.getElementById("answerBox");
        if (box) {
            box.addEventListener('keydown', function(e) {
                if (e.keyCode === 13 && self.gameState === "active" && !self.isPaused) {
                    self.processAnswer(box.value.trim().toUpperCase());
                    box.value = '';
                }
            });
        }

        const leftBtn = document.getElementById("leftButton");
        if (leftBtn) {
            leftBtn.addEventListener('click', function() {
                if (self.gameState === "active" && !self.isPaused) {
                    self.forceNextWave();
                }
            });
        }

        const rightBtn = document.getElementById("rightButton");
        if (rightBtn) {
            rightBtn.addEventListener('click', function() {
                if (self.gameState === "active") {
                    self.endgame();
                }
            });
        }

        console.log("Events initialized");
    }

    setDimensions() {
        console.log("setDimensions called");
        const container = document.getElementById(this.targetDiv);
        if (container) {
            this.INVW = this.INVH = Math.min(
                this.maxWidth,
                container.offsetWidth - this.canvasIndent
            );
            console.log("Dimensions set to:", this.INVW, "x", this.INVH);
        } else {
            console.error("Container not found:", this.targetDiv);
            this.INVW = this.INVH = this.maxWidth;
        }

        this.tower.x = this.INVW - 40;
        this.tower.y = this.INVH / 2;
        this.pathY = this.INVH / 2;
    }

    setCanvasDimensions() {
        const canvas = document.getElementById("wordSiegeCanvas");
        const bgCanvas = document.getElementById("wordSiegeBgCanvas");

        if (canvas) {
            canvas.width = this.INVW;
            canvas.height = this.INVH;
            console.log("Canvas dimensions set to:", canvas.width, "x", canvas.height);
        }
        if (bgCanvas) {
            bgCanvas.width = this.INVW;
            bgCanvas.height = this.INVH;
        }

        const wrapper = $('#wordSiegeCanvasWrapper');
        if (wrapper.length) {
            wrapper.css({
                width: (this.INVW + 4) + 'px',
                height: (this.INVH + 4) + 'px',
                margin: '0 auto'
            });
        }
    }

initMenu() {
    console.log("initMenu called");
    const self = this;
    this.menu = {
        selectedType: 0,
        displayTypes: ["Start Game", "How to Play"],
        menuTop: 0,
        menuItemHeight: 0,
        fontSize: 0,

        init: function() {
            this.menuTop = self.INVH / 2;
            this.menuItemHeight = self.INVH / 12;
            this.fontSize = Math.ceil(self.INVH / 23);
            console.log("Menu initialized with dimensions:", this.menuTop, this.menuItemHeight);
        },

        getSelectedFromPosition: function(pos) {
            const relativeY = pos.y - this.menuTop;
            if (relativeY >= 0 && relativeY < this.displayTypes.length * this.menuItemHeight) {
                return Math.floor(relativeY / this.menuItemHeight);
            }
            return -1;
        },

        mouseover: function(e) {
            const pos = self.getPosition(e);
            const selected = this.getSelectedFromPosition(pos);
            if (selected !== -1 && selected !== this.selectedType) {
                this.selectedType = selected;
                return true;
            }
            return false;
        },

        click: function(e) {
            const pos = self.getPosition(e);
            const selected = this.getSelectedFromPosition(pos);
            console.log("Menu click detected, selected index:", selected);
            if (selected !== -1) {
                this.selectedType = selected;
                this.transition();
            }
        },

        transition: function() {
            console.log("Menu transition, selectedType:", this.selectedType);
            if (this.selectedType === 0) {
                self.gameState = "active";
                self.initGame();
            } else if (this.selectedType === 1) {
                alert("Defend the tower by unscrambling words! Type answers for any enemy on screen. Wrong answers damage the tower!");
            }
        }
    };
    this.menu.init();
}

initGame() {
    console.log("initGame called");

    this.wave = 1;
    this.score = 0;
    this.towerHealth = this.maxHealth;
    this.enemies = [];
    this.enemiesDefeated = 0;
    this.enemiesPerWave = 3;
    this.isPaused = false;

    // Initialize quiz but don't load all questions upfront
    this.q = new Quiz(false, this.quizid === -1, false, this.quizid);

    const self = this;
    const checkInterval = setInterval(function() {
        if (self.q.initialized) {
            clearInterval(checkInterval);
            console.log("Quiz initialized, loading initial questions");

            // Load only as many as needed for first wave
            self.q.loadQuestions(self.enemiesPerWave);

            setTimeout(function() {
                if (self.q.questions && self.q.questions.length > 0) {
                    console.log("Questions loaded:", self.q.questions.length);

                    // Setup each question in the answer area
                    for (let i = 0; i < self.q.questions.length; i++) {
                        self.answerArea.setupWord(self.q.questions[i]);
                    }

                    self.spawnWave();

                    const leftBtn = document.getElementById("leftButton");
                    const rightBtn = document.getElementById("rightButton");
                    const answerBox = document.getElementById("answerBox");

                    if (leftBtn) leftBtn.disabled = false;
                    if (rightBtn) rightBtn.disabled = false;
                    if (answerBox) {
                        answerBox.disabled = false;
                        answerBox.focus();
                    }
                } else {
                    console.log("No questions loaded yet, retrying...");
                    setTimeout(function() { self.initGame(); }, 500);
                }
            }, 500);
        }
    }, 100);
}

spawnWave() {
    console.log("spawnWave called, wave:", this.wave);
    this.enemies = [];

    const questionsNeeded = this.enemiesPerWave;

    // Get available questions (uncompleted)
    let availableQuestions = this.q.questions.filter(q => !q.complete);

    // If we don't have enough questions, load more
    if (availableQuestions.length < questionsNeeded) {
        const needed = questionsNeeded - availableQuestions.length;
        console.log("Loading", needed, "more questions");
        this.q.loadQuestions(needed);

        // Wait for questions to load
        const self = this;
        const checkInterval = setInterval(function() {
            availableQuestions = self.q.questions.filter(q => !q.complete);
            if (availableQuestions.length >= questionsNeeded) {
                clearInterval(checkInterval);
                self.createEnemiesFromQuestions(availableQuestions, questionsNeeded);
            }
        }, 100);
        return;
    }

    this.createEnemiesFromQuestions(availableQuestions, questionsNeeded);
}

createEnemiesFromQuestions(availableQuestions, questionsNeeded) {
    // Define lanes (Y positions) that can be reused
    const laneHeight = 70;
    const startY = this.INVH * 0.35;
    const maxLanes = Math.ceil(this.INVH / laneHeight) - 2;

    // Create lanes with slight Y variation
    let lanes = [];
    for (let i = 0; i < maxLanes; i++) {
        lanes.push(startY + (i * laneHeight));
    }

    const enemyCount = Math.min(questionsNeeded, availableQuestions.length);

    // Calculate minimum spacing needed between X positions
    // Each enemy needs about 80px of width, so we want at least 100px between start positions
    const minSpacing = 100;
    const startXRange = { min: -180, max: -30 };
    const totalRange = startXRange.max - startXRange.min;

    // Calculate how many enemies can fit with min spacing
    const maxFit = Math.floor(totalRange / minSpacing);

    let startXPositions = [];

    if (enemyCount <= maxFit) {
        // Evenly space them
        const step = totalRange / (enemyCount + 1);
        for (let i = 1; i <= enemyCount; i++) {
            startXPositions.push(startXRange.min + (i * step));
        }
    } else {
        // More enemies than can fit with min spacing - create multiple clusters
        const clusters = Math.ceil(enemyCount / maxFit);
        const clusterWidth = totalRange / clusters;

        for (let i = 0; i < enemyCount; i++) {
            const clusterIndex = Math.floor(i / maxFit);
            const clusterStart = startXRange.min + (clusterIndex * clusterWidth);
            const clusterEnd = clusterStart + (clusterWidth * 0.8);

            // Random position within cluster
            const randomX = clusterStart + (Math.random() * (clusterEnd - clusterStart));
            startXPositions.push(randomX);
        }
    }

    // Shuffle to randomize order
    for (let i = startXPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [startXPositions[i], startXPositions[j]] = [startXPositions[j], startXPositions[i]];
    }

    for (let i = 0; i < enemyCount; i++) {
        const question = availableQuestions[i];
        const remainingCount = question.unanswered ? question.unanswered.length : question.answers.length;
        const colors = ["black", "azure", "plum", "palegreen", "yellowgreen", "khaki", "salmon", "hotpink", "crimson", "magenta", "chocolate", "peachpuff", "mistyrose", "floralwhite"];
        const textColor = colors[Math.min(remainingCount, colors.length - 1)];

        const displayAlpha = question.displayAlpha || question.alpha;

        // Get dynamic X position
        const startX = startXPositions[i];

        // Assign lane with Y variation
        const laneIndex = i % lanes.length;
        let yPos = lanes[laneIndex];
        yPos = yPos + (Math.random() * 20) - 10; // Random Y variation

        const baseSpeed = 0.03;
        const speedIncrease = 0.02;
        const speedVariation = 0.85 + (Math.random() * 0.3);
        const speed = Math.min(2.0, (baseSpeed + ((this.wave - 1) * speedIncrease)) * speedVariation);

        this.enemies.push({
            id: i,
            x: startX,
            y: yPos,
            width: 80,
            height: 40,
            health: question.answers.length,
            maxHealth: question.answers.length,
            question: question,
            displayAlpha: displayAlpha,
            textColor: textColor,
            speed: speed,
            isDefeated: false,
            defeatAnimation: 0,
            originalY: yPos,
            startX: startX
        });
    }

    // Sort by X position
    this.enemies.sort((a, b) => a.startX - b.startX);

    if (this.enemies.length > 0) {
        this.currentEnemy = this.enemies[0];
        this.currentQuestion = this.currentEnemy.question;
        this.updateQuestionDisplay();
    }

    console.log("Created", this.enemies.length, "enemies with guaranteed spacing");
}

updateQuestionDisplay() {
    if (this.currentQuestion && this.answerArea) {
        // Display the current word in the answer area with its answers
        // The AnswerArea class handles displaying the word and tracking progress
        this.answerArea.displayWord(
            this.currentQuestion,
            this.currentQuestion.answers,
            'CURRENT'  // This might be a status that shows it's the current word
        );

        const answerBox = document.getElementById("answerBox");
        if (answerBox) {
            answerBox.placeholder = "Type answer...";
        }
    }
}

processAnswer(answer) {
    if (!this.enemies || this.enemies.length === 0) return;

    const answerBox = document.getElementById("answerBox");

    // First, find which enemy's alphagram matches the answer
    let matchingEnemy = null;
    for (let enemy of this.enemies) {
        if (enemy.isDefeated) continue;

        // Check if the answer's alphagram matches this enemy's alphagram
        if (toAlpha(answer) === enemy.question.alpha) {
            matchingEnemy = enemy;
            break;
        }
    }

    // If answer doesn't match any alphagram on screen, flash yellow and ignore
    if (!matchingEnemy) {
        console.log("Answer doesn't match any alphagram, ignoring:", answer);
        this.flashAnswerBox('no-match');
        if (answerBox) {
            answerBox.value = '';
            answerBox.focus();
        }
        return;
    }

    // We have a matching enemy - now check if the answer is correct for that enemy
    const question = matchingEnemy.question;
    const result = question.submitAnswer(answer);

    if (result === 1) {
        // CORRECT answer - no flash
        this.addParticleEffect('correct', matchingEnemy.x + matchingEnemy.width/2, matchingEnemy.y);

        // Decrease health (one less answer needed)
        matchingEnemy.health--;

        // Update the enemy's color based on remaining answers
        const remainingCount = question.unanswered ? question.unanswered.length : question.answers.length;
        const colors = ["black", "azure", "plum", "palegreen", "yellowgreen", "khaki", "salmon", "hotpink", "crimson", "magenta", "chocolate", "peachpuff", "mistyrose", "floralwhite"];
        matchingEnemy.textColor = colors[Math.min(remainingCount, colors.length - 1)];

        // Show correct answer in answer area - this works with the real question object
        if (this.answerArea) {
            this.answerArea.displayWord(question, [answer], 'CURRENT');
        }

        // Check if all answers have been given
        if (question.complete || matchingEnemy.health <= 0) {
            this.defeatEnemy(matchingEnemy);
        } else {
            // Not defeated yet - update display
            this.updateEnemyDisplay(matchingEnemy);
            if (this.currentEnemy === matchingEnemy) {
                this.updateQuestionDisplay();
            }
        }

        if (answerBox) {
            answerBox.value = '';
            answerBox.focus();
        }
    } else if (result === 2) {
        // Already answered correctly for this enemy - flash blue
        this.flashAnswerBox('already');
        this.addParticleEffect('already', matchingEnemy.x + matchingEnemy.width/2, matchingEnemy.y);
        if (this.answerArea) {
            // Use the same pattern as Wall of Words for duplicate answers
            $('#answerBox').toggleClass('flashDuplicate', 200).delay(100).toggleClass('flashDuplicate', 200);
        }

        if (answerBox) {
            answerBox.value = '';
            answerBox.focus();
        }
    } else {
        // WRONG answer - answer matches alphagram but is incorrect - flash red
        this.flashAnswerBox('wrong');
        this.addParticleEffect('damage', matchingEnemy.x + matchingEnemy.width/2, matchingEnemy.y);
        this.damageTower(2);

        // Show wrong answer in answer area - mimic Wall of Words behavior
        if (this.answerArea) {
            // Add the wrong answer to the missed div (like Wall of Words does)
            const wrongDiv = document.getElementById("invWordsWrong" + question.alpha);
            if (wrongDiv) {
                wrongDiv.append(" " + answer);
                wrongDiv.style.visibility = 'visible';
            }
            // Switch to Missed tab
            $('.nav-pills a[href="#invMissedDiv"]').tab('show');
        }

        if (answerBox) {
            answerBox.value = '';
            answerBox.focus();
        }
    }
}

updateEnemyDisplay(enemy) {
    if (!enemy) return;

    const remainingCount = enemy.question.unanswered ? enemy.question.unanswered.length : enemy.question.answers.length;
    const colors = ["black", "azure", "plum", "palegreen", "yellowgreen", "khaki", "salmon", "hotpink", "crimson", "magenta", "chocolate", "peachpuff", "mistyrose", "floralwhite"];
    enemy.textColor = colors[Math.min(remainingCount, colors.length - 1)];

    // Update the answer area to show progress on this word
    if (this.answerArea && this.currentEnemy === enemy) {
        this.updateQuestionDisplay();
    }

}

defeatEnemy(enemy) {
    if (!enemy || enemy.isDefeated) return;

    // Find the index of this enemy
    const index = this.enemies.findIndex(e => e.id === enemy.id);
    if (index === -1) return;

    enemy.isDefeated = true;
    enemy.defeatAnimation = 20;

    // Score based on original answer count (more answers = more points)
    const answerCount = enemy.question.answers.length;
    this.score += 10 * answerCount;

    if (enemy.question && !enemy.question.submitted) {
        enemy.question.markCorrect();
    }

    // Add to answer area as solved
    if (this.answerArea) {
        this.answerArea.displayWord(enemy.question, enemy.question.answers, 'SOLVED');
    }

    // Create explosion particle effect
    for (let i = 0; i < 15; i++) {
        this.addParticleEffect('defeat',
            enemy.x + enemy.width/2,
            enemy.y,
            Math.random() * 8 - 4,
            Math.random() * 8 - 4
        );
    }

    // Remove the enemy from the array after animation
    setTimeout(() => {
        const currentIndex = this.enemies.findIndex(e => e.id === enemy.id);
        if (currentIndex !== -1) {
            this.enemies.splice(currentIndex, 1);
        }

        // Check if wave is complete (no enemies left)
        if (this.enemies.length === 0) {
            this.completeWave();
        } else if (this.currentEnemy === enemy) {
            // Select a new current enemy
            this.currentEnemy = this.enemies[0];
            if (this.currentEnemy) {
                this.currentQuestion = this.currentEnemy.question;
                this.updateQuestionDisplay();
            }
        }
    }, 200);
}

    damageTower(amount) {
        this.towerHealth = Math.max(0, this.towerHealth - amount);
        this.damageFlash = 10;

        if (this.towerHealth <= 0) {
            this.endgame();
        }
    }

completeWave() {
    // Only complete if no enemies left and we're not already completing
    if (this.enemies.length > 0 || this._completingWave) {
        return;
    }

    this._completingWave = true;
    this.isPaused = true;
    this.addParticleEffect('waveComplete', this.INVW / 2, this.INVH / 2);

    // Show next wave button
    this.nextWaveButton.enabled = true;
    this.nextWaveButton.color = "chocolate";

    // Update wave stats
    this.wave++;
    this.score += 50 * this.wave;
    this.towerHealth = Math.min(this.maxHealth, this.towerHealth + 20);
    this.enemiesPerWave = Math.min(12, this.enemiesPerWave + 1);

    this._completingWave = false;
}

startNextWave() {
    console.log("Starting next wave", this.wave);

    // Get fresh questions for the next wave
    const questionsNeeded = this.enemiesPerWave;
    const currentQuestions = this.q.questions.filter(q => !q.complete);

    if (currentQuestions.length < questionsNeeded) {
        // Load only the number of questions needed
        const needed = questionsNeeded - currentQuestions.length;
        console.log("Loading", needed, "more questions for wave", this.wave);
        this.q.loadQuestions(needed);

        // Wait for questions to load
        const checkInterval = setInterval(() => {
            if (this.q.questions.filter(q => !q.complete).length >= questionsNeeded) {
                clearInterval(checkInterval);

                // Setup new questions in answer area
                const newQuestions = this.q.questions.filter(q => !q.complete);
                for (let i = currentQuestions.length; i < newQuestions.length; i++) {
                    this.answerArea.setupWord(newQuestions[i]);
                }

                this.spawnWave();
                this.isPaused = false;
            }
        }, 100);
    } else {
        this.spawnWave();
        this.isPaused = false;
    }
}

    forceNextWave() {
        for (let enemy of this.enemies) {
            if (!enemy.isDefeated && enemy.question && !enemy.question.submitted) {
                enemy.question.markWrong();
            }
        }
        this.completeWave();
    }

addParticleEffect(type, x, y, customVx = null, customVy = null) {
    const colors = {
        correct: '#4caf50',
        already: '#ffc107',
        damage: '#f44336',
        defeat: '#ff9800',
        towerDamage: '#ff5722',
        waveComplete: '#9c27b0'
    };

    const particleCount = type === 'defeat' ? 15 : 5;

    for (let i = 0; i < particleCount; i++) {
        this.particles.push({
            x: x, y: y,
            vx: customVx !== null ? customVx + (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 4,
            vy: customVy !== null ? customVy + (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 4,
            life: type === 'defeat' ? 40 : 30,
            color: colors[type] || '#ffffff',
            size: type === 'defeat' ? 2 + Math.random() * 4 : 2 + Math.random() * 3
        });
    }
}

update() {
    if (this.gameState !== "active" || this.isPaused) return;

    if (this.damageFlash > 0) this.damageFlash--;

    // Update enemies
    for (let i = 0; i < this.enemies.length; i++) {
        const enemy = this.enemies[i];

        // Handle defeat animation
        if (enemy.defeatAnimation > 0) {
            enemy.defeatAnimation--;
            // Make defeated enemy float upward during animation
            if (enemy.defeatAnimation > 0) {
                enemy.y = enemy.originalY - (20 - enemy.defeatAnimation) * 0.5;
            }
            continue; // Skip movement and collision for defeated enemies
        }

        if (!enemy.isDefeated) {
            enemy.x += enemy.speed;

            // Check if enemy reached tower
            if (enemy.x + enemy.width >= this.tower.x) {
                this.damageTower(Math.ceil(enemy.health));

                if (enemy.question && !enemy.question.submitted) {
                    enemy.question.markWrong();
                    if (this.answerArea && enemy.question) {
                        this.answerArea.displayWord(enemy.question, enemy.question.answers, 'WRONG');
                    }
                }

                this.addParticleEffect('towerDamage', this.tower.x, enemy.y);

                const enemyIndex = this.enemies.findIndex(e => e.id === enemy.id);
                if (enemyIndex !== -1) {
                    this.enemies.splice(enemyIndex, 1);
                }

                // Check if this was the current enemy
                if (this.currentEnemy === enemy) {
                    const nextEnemy = this.enemies[0];
                    if (nextEnemy) {
                        this.currentEnemy = nextEnemy;
                        this.currentQuestion = this.currentEnemy.question;
                        this.updateQuestionDisplay();
                    } else {
                        this.currentEnemy = null;
                        this.currentQuestion = null;
                    }
                }

                // Check if wave is complete (no enemies left)
                if (this.enemies.length === 0) {
                    this.completeWave();
                }
            }
        }
    }

    // Remove enemies with completed animations
    this.enemies = this.enemies.filter(e => !(e.isDefeated && e.defeatAnimation === 0));

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].x += this.particles[i].vx;
        this.particles[i].y += this.particles[i].vy;
        this.particles[i].life--;
        if (this.particles[i].life <= 0) {
            this.particles.splice(i, 1);
        }
    }
}

render() {
    const ctx = document.getElementById("wordSiegeCanvas").getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.INVW, this.INVH);

    // Draw path lines only for active enemies
    for (const enemy of this.enemies) {
        ctx.beginPath();
        ctx.strokeStyle = '#4a4a6e';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, enemy.y);
        ctx.lineTo(this.INVW, enemy.y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw tower - full height
    ctx.fillStyle = '#5a6e8a';
    ctx.fillRect(this.tower.x - 15, 0, 30, this.INVH);
    ctx.fillStyle = '#8a9eb0';
    ctx.fillRect(this.tower.x - 10, 0, 20, this.INVH);

    // Draw tower windows
    ctx.fillStyle = '#ffeb3b';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(this.tower.x - 8, 20 + (i * 60), 16, 30);
    }

    // Health bar at top of tower
    const healthPercent = this.towerHealth / this.maxHealth;
    ctx.fillStyle = '#333';
    ctx.fillRect(this.tower.x - 20, 10, 40, 8);
    ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : (healthPercent > 0.2 ? '#ff9800' : '#f44336');
    ctx.fillRect(this.tower.x - 20, 10, 40 * healthPercent, 8);

    if (this.damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 87, 34, ${this.damageFlash / 20})`;
        ctx.fillRect(0, 0, this.INVW, this.INVH);
    }

    // Draw all active enemies (not defeated)
    for (const enemy of this.enemies) {
        // Skip if in defeat animation (handled separately)
        if (enemy.defeatAnimation > 0) {
            const alpha = Math.min(1, enemy.defeatAnimation / 20);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff9800';
            ctx.fillRect(enemy.x, enemy.y - 15, enemy.width, enemy.height);
            ctx.fillStyle = '#fff';
            ctx.font = "10pt Arial";
            ctx.textAlign = "center";
            ctx.fillText("💀", enemy.x + enemy.width/2, enemy.y);
            ctx.globalAlpha = 1;
            continue;
        }

        // Draw enemy body
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(enemy.x, enemy.y - 15, enemy.width, enemy.height);

// In the render method, update the health bar section:
// Draw health bar - now shows remaining answers
const remainingAnswers = enemy.question.unanswered ? enemy.question.unanswered.length : enemy.question.answers.length;
const totalAnswers = enemy.question.answers.length;
const healthPercentEnemy = remainingAnswers / totalAnswers;

ctx.fillStyle = '#333';
ctx.fillRect(enemy.x, enemy.y - 20, enemy.width, 4);
ctx.fillStyle = '#4caf50';
ctx.fillRect(enemy.x, enemy.y - 20, enemy.width * healthPercentEnemy, 4);

        // Draw the scrambled word
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        let fontSize = 12;
        ctx.font = fontSize + "pt Arial";
        while (ctx.measureText(enemy.displayAlpha).width > enemy.width - 10 && fontSize > 8) {
            fontSize--;
            ctx.font = fontSize + "pt Arial";
        }

        ctx.fillStyle = enemy.textColor;
        ctx.fillText(enemy.displayAlpha, enemy.x + (enemy.width / 2), enemy.y - 18);

//        // Draw remaining answers count
//        const remainingCount = enemy.question.unanswered ? enemy.question.unanswered.length : enemy.question.answers.length;
//        ctx.font = "8pt Arial";
//        ctx.fillStyle = "#ccc";
//        ctx.fillText(`${remainingCount} left`, enemy.x + (enemy.width / 2), enemy.y - 5);
    }

    // Draw particles
    for (const particle of this.particles) {
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Wave: ${this.wave}`, 10, 20);
    ctx.fillText(`Score: ${this.score}`, 10, 35);
    ctx.fillText(`Health: ${this.towerHealth}`, 10, 50);
    ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 65);

    // Show overlay messages (only one at a time)
    if (this.isPaused && this.gameState === "active") {
        // If next wave button is showing, show wave complete message instead of paused
        if (this.nextWaveButton && this.nextWaveButton.enabled) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.INVW, this.INVH);
            ctx.fillStyle = '#ffeb3b';
            ctx.font = 'bold 20pt Alegreya SC';
            ctx.textAlign = 'center';
            ctx.fillText('WAVE COMPLETE!', this.INVW / 2, this.INVH / 2 - 30);
            ctx.font = '14pt Alegreya SC';
            ctx.fillStyle = '#fff';
            ctx.fillText('Click NEXT WAVE to continue', this.INVW / 2, this.INVH / 2 + 20);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.INVW, this.INVH);
            ctx.fillStyle = '#fff';
            ctx.font = '20pt Alegreya SC';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', this.INVW / 2, this.INVH / 2);
        }
    }

    // Draw pause button
    if (this.pauseButton) {
        this.pauseButton.display();
    }

    // Draw next wave button
    if (this.nextWaveButton) {
        this.nextWaveButton.display();
    }
}

renderMenu() {
    console.log("DEBUG: starting renderMenu()");
    const ctx = document.getElementById("wordSiegeCanvas").getContext('2d');
    const bgCtx = document.getElementById("wordSiegeBgCanvas").getContext('2d');

    if (!ctx || !bgCtx) {
        console.error("Canvas contexts not found");
        return;
    }

    // Clear background canvas (should only have static background elements)
    bgCtx.fillStyle = "#1a1a2e";
    bgCtx.fillRect(0, 0, this.INVW, this.INVH);

    // Clear the main canvas completely
    ctx.clearRect(0, 0, this.INVW, this.INVH);

    // Draw all menu elements on the main canvas
    ctx.fillStyle = "chocolate";
    ctx.font = "24pt Alegreya SC";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("Word Siege", this.INVW / 2, this.INVH / 5);

    ctx.font = "12pt Alegreya SC";
    ctx.fillStyle = "#aaa";
    ctx.textBaseline = "bottom";
    ctx.fillText("Defend the tower by unscrambling words!", this.INVW / 2, this.INVH / 3);

    // Draw menu items using the same context
    if (this.menu) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = this.menu.fontSize + 'pt Alegreya SC';

        for (let i = 0; i < this.menu.displayTypes.length; i++) {
            ctx.fillStyle = (i === this.menu.selectedType) ? "chocolate" : "grey";
            ctx.fillText(
                this.menu.displayTypes[i],
                this.INVW / 2,
                this.menu.menuTop + (this.menu.menuItemHeight * i)
            );
        }
    }
}

    renderGameOver() {
        const ctx = document.getElementById("wordSiegeCanvas").getContext('2d');
        const bgCtx = document.getElementById("wordSiegeBgCanvas").getContext('2d');

        if (!ctx || !bgCtx) return;

        bgCtx.fillStyle = "#1a1a2e";
        bgCtx.fillRect(0, 0, this.INVW, this.INVH);

        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, this.INVW, this.INVH);
        ctx.fillStyle = "chocolate";
        ctx.textAlign = "center";
        ctx.font = "20pt Alegreya SC";
        ctx.fillText("Game Over", this.INVW / 2, this.INVH / 3);

        ctx.font = "12pt Alegreya SC";
        ctx.fillText(`Score: ${this.score}`, this.INVW / 2, this.INVH / 2);
        ctx.fillText(`Wave: ${this.wave - 1}`, this.INVW / 2, this.INVH / 2 + 30);

        ctx.font = "14pt Alegreya SC";
        const okWidth = ctx.measureText("OK").width;
        ctx.fillStyle = "grey";
        ctx.fillText("OK", this.INVW / 2, this.INVH * 0.7);
    }

    canvasClick(e) {
        const pos = this.getPosition(e);

        for (let enemy of this.enemies) {
            if (!enemy.isDefeated &&
                pos.x > enemy.x && pos.x < enemy.x + enemy.width &&
                pos.y > enemy.y - 15 && pos.y < enemy.y - 15 + enemy.height) {

                if (this.currentEnemy) {
                    this.currentEnemy.isActive = false;
                }
                this.currentEnemy = enemy;
                this.currentEnemy.isActive = true;
                this.currentQuestion = this.currentEnemy.question;
                this.updateQuestionDisplay();
                break;
            }
        }
    }

    getPosition(event) {
        return { x: event.offsetX, y: event.offsetY };
    }

flashAnswerBox(type) {
    const answerBox = document.getElementById("answerBox");
    if (!answerBox) return;

    // Remove any existing flash classes
    answerBox.classList.remove('flashTypo', 'flashWrong', 'flashDuplicate', 'flashCorrect');

    // Add the appropriate class based on the type
    switch(type) {
        case 'wrong':
            // Answer matches alphagram but is incorrect
            answerBox.classList.add('flashWrong');
            break;
        case 'already':
            // Answer already given correctly for this enemy
            answerBox.classList.add('flashDuplicate');
            break;
        case 'no-match':
            // Answer doesn't match any alphagram on screen
            answerBox.classList.add('flashTypo');
            break;
        case 'correct':
            // Correct answer - no flash needed
            return;
    }

    // Remove the color after 300ms
    setTimeout(() => {
        if (answerBox) {
            answerBox.classList.remove('flashWrong', 'flashDuplicate', 'flashTypo', 'flashCorrect');
        }
    }, 300);
}

    endgame() {
        this.gameState = "inactive";

        for (let enemy of this.enemies) {
            if (enemy.question && !enemy.question.submitted && !enemy.isDefeated) {
                enemy.question.markWrong();
            }
        }
    }

    animationLoop(previousTime, currentTime) {
        if (!document.getElementById("wordSiegeCanvas")) {
            console.log("Canvas removed, stopping animation");
            this.gameState = "inactive";
            return;
        }

        switch(this.gameState) {
            case "menu":
                this.renderMenu();
                break;
            case "active":
                this.update();
                this.render();
                break;
            case "inactive":
                this.renderGameOver();
                break;
        }

        const self = this;
        requestAnimationFrame(function(now) {
            self.animationLoop(currentTime, now);
        });
    }

    main(quizinfo) {
        console.log("WordSiege main called");

        this.gameState = "menu";

        if (quizinfo) {
            this.quizid = quizinfo.quizid;
            this.quizname = quizinfo.quizname;
        } else if (typeof xerafin !== 'undefined' && xerafin.storage && xerafin.storage.data && xerafin.storage.data.overview) {
            this.quizid = xerafin.storage.data.overview.currentQuiz;
            this.quizname = xerafin.storage.data.overview.currentQuizName;
        }

        this.setDimensions();
        this.setCanvasDimensions();
        this.initMenu();

        const canvas = document.getElementById("wordSiegeCanvas");
        if (canvas) {
            canvas.focus();
            console.log("Canvas focused");
        }

        const leftBtn = document.getElementById("leftButton");
        const rightBtn = document.getElementById("rightButton");
        if (leftBtn) leftBtn.disabled = true;
        if (rightBtn) rightBtn.disabled = true;

        const bgCtx = document.getElementById("wordSiegeBgCanvas").getContext("2d");
        if (bgCtx) {
            bgCtx.fillStyle = "#1a1a2e";
            bgCtx.fillRect(0, 0, this.INVW, this.INVH);
        }

        console.log("Starting animation loop, gameState:", this.gameState);
        const self = this;
        requestAnimationFrame(function(now) {
            self.animationLoop(now, now);
        });
    }
}

// Global function to initialize the game
function initWordSiege(quizinfo) {
    console.log("initWordSiege called");

    if (typeof wordSiege !== 'undefined' && wordSiege.gameState === 'active') {
        if (!confirm("A new quiz has been sent to Word Siege. Abort current game?")) {
            return;
        }
        const contentPanel = document.getElementById("content_pan_1_h");
        if (contentPanel) {
            contentPanel.innerHTML = '';
        }
    }

    if (!document.getElementById("pan_1_h")) {
        console.log("Creating panel pan_1_h");
        const panel_data = {
            contentClass: "panelContentDefault",
            title: "Word Siege - Tower Defense",
            minimizeObject: "content_pan_1_h",
            variant: "h",
            closeButton: false,
            refreshButton: false,
            tooltip: "NEW WAVE forces next wave. QUIT ends the game."
        };
        generatePanel(1, panel_data, "leftArea");
    }

    const panel = document.getElementById("pan_1_h");
    if (panel) {
        panel.style.display = "block";
        console.log("Panel found and set to block");
    }

    const contentPanel = document.getElementById("content_pan_1_h");
    if (contentPanel) {
        contentPanel.style.display = "block";
        console.log("Content panel found");
    }

    wordSiege = new WordSiege();
    wordSiege.generateDOM();
    wordSiege.initEvents();
    wordSiege.main(quizinfo);
}
