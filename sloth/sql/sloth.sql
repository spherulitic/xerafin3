-- Main sloth_completed table
CREATE TABLE sloth_completed (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid INT NOT NULL,
    alphagram VARCHAR(15) NOT NULL,
    lex VARCHAR(5) NOT NULL,
    time_taken INT NOT NULL,
    correct INT NOT NULL,
    accuracy DECIMAL(5,2) NOT NULL,
    date DATETIME NOT NULL,
    token VARCHAR(40),
    INDEX idx_alphagram_lex (alphagram, lex),
    INDEX idx_userid (userid),
    INDEX idx_date (date)
);

-- If you also need the sloth_active table (from your earlier PHP)
CREATE TABLE sloth_active (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid INT NOT NULL,
    alphagram VARCHAR(15) NOT NULL,
    date DATETIME NOT NULL,
    start_time DOUBLE NOT NULL,
    token VARCHAR(40) NOT NULL,
    lex VARCHAR(5) NOT NULL,
    INDEX idx_token (token),
    INDEX idx_user_alpha (userid, alphagram)
);

-- Cardbox Invaders high scores
CREATE TABLE invaders_personal (
    userid VARCHAR(50) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    PRIMARY KEY (userid)
);

CREATE TABLE invaders_daily (
    userid VARCHAR(50) NOT NULL,
    dateStamp DATE NOT NULL,
    score INT NOT NULL DEFAULT 0,
    PRIMARY KEY (userid, dateStamp)
);
