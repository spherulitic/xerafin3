// Package db provides a thin wrapper around the MySQL connection pool
// and all raw SQL query functions used by the chat service.
package db

import (
	"database/sql"
	"fmt"
	"log/slog"

	_ "github.com/go-sql-driver/mysql" // registers the mysql driver
)

// DB wraps the standard sql.DB connection pool
type DB struct {
	conn *sql.DB
}

// Chat represents a row in the chat table
type Chat struct {
	UserID        string
	TimeStamp     int64
	Message       string
	MilestoneType sql.NullString
	MilestoneOf   sql.NullString
}

// New creates and validates a new MySQL connection pool
func New(user, pwd, host, port, dbName string) (*DB, error) {
	// Build the DSN (Data Source Name) for the MySQL driver
	// parseTime=true ensures DATETIME columns are scanned into time.Time
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		user, pwd, host, port, dbName,
	)

	conn, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("sql.Open: %w", err)
	}

	// Ping validates the connection is actually reachable
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("db ping: %w", err)
	}

	slog.Info("database connection established")
	return &DB{conn: conn}, nil
}

// Close releases the connection pool
func (d *DB) Close() error {
	return d.conn.Close()
}

// GetChatsAfter returns all chat rows with a timestamp greater than sinceMs
// ordered ascending by timestamp
func (d *DB) GetChatsAfter(sinceMs int64) ([]Chat, error) {
	const query = `
		SELECT userid, timeStamp, message, milestoneType, milestoneOf
		FROM chat
		WHERE timeStamp > ?
		ORDER BY timeStamp ASC`

	rows, err := d.conn.Query(query, sinceMs)
	if err != nil {
		return nil, fmt.Errorf("GetChatsAfter query: %w", err)
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var c Chat
		if err := rows.Scan(
			&c.UserID,
			&c.TimeStamp,
			&c.Message,
			&c.MilestoneType,
			&c.MilestoneOf,
		); err != nil {
			return nil, fmt.Errorf("GetChatsAfter scan: %w", err)
		}
		chats = append(chats, c)
	}
	return chats, rows.Err()
}

// InsertChat writes a new chat row to the database
func (d *DB) InsertChat(c Chat) error {
	const query = `
		INSERT INTO chat (userid, timeStamp, message, milestoneType, milestoneOf)
		VALUES (?, ?, ?, ?, ?)`

	_, err := d.conn.Exec(query,
		c.UserID,
		c.TimeStamp,
		c.Message,
		c.MilestoneType,
		c.MilestoneOf,
	)
	if err != nil {
		return fmt.Errorf("InsertChat: %w", err)
	}
	return nil
}

// GetAndDeleteMilestoneChats fetches all chats matching a milestone type and
// target, deletes them, and returns the deleted rows so expiry signals can
// be spooled. Uses a transaction to keep fetch and delete atomic.
func (d *DB) GetAndDeleteMilestoneChats(milestoneType, milestoneOf string) ([]Chat, error) {
	// Begin a transaction so we don't delete rows we failed to read
	tx, err := d.conn.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback() // no-op if committed

	const selectQuery = `
		SELECT userid, timeStamp, message, milestoneType, milestoneOf
		FROM chat
		WHERE milestoneType = ? AND milestoneOf = ?`

	rows, err := tx.Query(selectQuery, milestoneType, milestoneOf)
	if err != nil {
		return nil, fmt.Errorf("GetAndDeleteMilestoneChats select: %w", err)
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var c Chat
		if err := rows.Scan(
			&c.UserID,
			&c.TimeStamp,
			&c.Message,
			&c.MilestoneType,
			&c.MilestoneOf,
		); err != nil {
			return nil, fmt.Errorf("GetAndDeleteMilestoneChats scan: %w", err)
		}
		chats = append(chats, c)
	}
	rows.Close()

	// Delete the matched rows within the same transaction
	const deleteQuery = `
		DELETE FROM chat
		WHERE milestoneType = ? AND milestoneOf = ?`

	if _, err := tx.Exec(deleteQuery, milestoneType, milestoneOf); err != nil {
		return nil, fmt.Errorf("GetAndDeleteMilestoneChats delete: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("GetAndDeleteMilestoneChats commit: %w", err)
	}

	return chats, nil
}
