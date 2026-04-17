// Package spool manages the per-user chat spool files used for long polling.
// Each logged-in user has a file at CHAT_DIR/<uuid>.chat
// New chat lines are appended to all active users' spool files by submitChat.
package spool

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const chatDir = "/app/chat-data"

// Reset creates or truncates the user's spool file.
// Called by getChatsInit to start a fresh session.
func Reset(uuid string) error {
	path := filepath.Join(chatDir, fmt.Sprintf("%s.chat", uuid))
	f, err := os.Create(path) // Create truncates if exists
	if err != nil {
		return fmt.Errorf("reset spool file: %w", err)
	}
	return f.Close()
}

// EnsureExists creates the spool file if it does not already exist
func EnsureExists(uuid string) error {
	path := filepath.Join(chatDir, fmt.Sprintf("%s.chat", uuid))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("ensure spool exists: %w", err)
	}
	return f.Close()
}

// LongPoll reads the user's spool file starting from lastRow,
// blocking for up to maxWait seconds until new lines appear.
// Returns the lines read and the updated row counter.
// Use the polling version (no fsnotify) which works reliably with containers
func LongPoll(uuid string, lastRow int, maxWait time.Duration) ([]string, int, error) {
    path := filepath.Join(chatDir, fmt.Sprintf("%s.chat", uuid))
    deadline := time.Now().Add(maxWait)
    var lines []string

    for time.Now().Before(deadline) {
        f, err := os.Open(path)
        if err != nil {
            return nil, lastRow, err
        }

        scanner := bufio.NewScanner(f)
        lineCounter := 0
        for lineCounter < lastRow && scanner.Scan() {
            lineCounter++
        }
        for scanner.Scan() {
            lines = append(lines, scanner.Text())
            lastRow++
        }
        f.Close()

        if len(lines) > 0 {
            return lines, lastRow, nil
        }
        time.Sleep(1 * time.Second)
    }
    return lines, lastRow, nil
}

// AppendToUsers writes chat lines to the spool files of all active users
func AppendToUsers(userIDs []string, lines []string) error {
	for _, uid := range userIDs {
		path := filepath.Join(chatDir, fmt.Sprintf("%s.chat", uid))
		f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
		if err != nil {
			// Log but don't fail — a missing spool file is non-fatal
			continue
		}
		for _, line := range lines {
			fmt.Fprintln(f, line)
		}
		f.Close()
	}
	return nil
}
