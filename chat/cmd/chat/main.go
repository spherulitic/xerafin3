// Entry point for the Xerafin Chat Service.
// Wires together the database connection, route handlers and HTTP server.
package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"

	"github.com/xerafin/chat/internal/auth"
	"github.com/xerafin/chat/internal/db"
	"github.com/xerafin/chat/internal/handlers"
)

func main() {
	// Structured JSON logging to stdout — compatible with log aggregators
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Initialise the MySQL connection pool using environment variables
	database, err := db.New(
		os.Getenv("MYSQL_USER"),
		os.Getenv("MYSQL_PWD"),
		os.Getenv("MYSQL_HOST"),
		os.Getenv("MYSQL_PORT"),
		os.Getenv("MYSQL_DB"),
	)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	// Build the auth middleware using the Keycloak public key endpoint
	authMiddleware := auth.NewMiddleware(
		"http://keycloak:8080/realms/Xerafin",
		"x-client",
	)

	// Register all route handlers, injecting dependencies
	mux := handlers.NewMux(database, authMiddleware)

	slog.Info("Xerafin Chat Service starting", "addr", ":5000")
	if err := http.ListenAndServe(":5000", mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
