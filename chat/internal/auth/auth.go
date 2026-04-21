// Package auth provides JWT verification middleware using a Keycloak
// public key fetched from the realm's well-known endpoint.
// The public key is fetched once and cached for the lifetime of the process.
package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// contextKey is an unexported type for context keys in this package
type contextKey string

const (
	ContextKeyUUID    contextKey = "uuid"
	ContextKeyName    contextKey = "name"
	ContextKeyHeaders contextKey = "headers"
)

// Claims represents the JWT payload fields we care about
type Claims struct {
	Sub  string `json:"sub"`
	Name string `json:"name"`
	jwt.RegisteredClaims
}

// Middleware holds the configuration and cached public key for JWT verification
type Middleware struct {
	keycloakURL string
	audience    string
	publicKey   string
	once        sync.Once // ensures the public key is only fetched once
	fetchErr    error
}

// NewMiddleware creates a new auth middleware instance
func NewMiddleware(keycloakURL, audience string) *Middleware {
	return &Middleware{
		keycloakURL: keycloakURL,
		audience:    audience,
	}
}

// getPublicKey fetches and caches the Keycloak realm public key.
// Implements retry logic with exponential backoff for startup resilience.
func (m *Middleware) getPublicKey() (string, error) {
	m.once.Do(func() {
		maxRetries := 10
		baseDelay := 1 * time.Second

		for attempt := 0; attempt < maxRetries; attempt++ {
			// Attempt to fetch the public key
			err := m.doFetchPublicKey()
			if err == nil {
				slog.Info("keycloak public key fetched and cached")
				return
			}

			// Calculate exponential backoff (1s, 2s, 4s, 8s, ... up to 30s max)
			delay := baseDelay * time.Duration(1<<attempt) // 2^attempt
			if delay > 30*time.Second {
				delay = 30 * time.Second
			}

			if attempt < maxRetries-1 {
				slog.Warn("failed to fetch keycloak public key, retrying",
					"attempt", attempt+1,
					"max_retries", maxRetries,
					"delay_seconds", delay.Seconds(),
					"err", err)
				time.Sleep(delay)
			} else {
				m.fetchErr = fmt.Errorf("failed to fetch keycloak public key after %d attempts: %w", maxRetries, err)
				slog.Error("keycloak public key fetch failed permanently",
					"max_retries", maxRetries,
					"err", m.fetchErr)
			}
		}
	})

	return m.publicKey, m.fetchErr
}

// doFetchPublicKey performs the actual HTTP request to fetch the public key
func (m *Middleware) doFetchPublicKey() error {
	resp, err := http.Get(m.keycloakURL)
	if err != nil {
		return fmt.Errorf("cannot reach keycloak: %w", err)
	}
	defer resp.Body.Close()

	// Check for non-200 status codes
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("keycloak returned non-200 status: %d", resp.StatusCode)
	}

	var payload struct {
		PublicKey string `json:"public_key"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return fmt.Errorf("decode keycloak response: %w", err)
	}

	if payload.PublicKey == "" {
		return fmt.Errorf("keycloak response missing public_key field")
	}

	// Wrap the raw base64 key in PEM headers so jwt can parse it
	m.publicKey = fmt.Sprintf(
		"-----BEGIN PUBLIC KEY-----\n%s\n-----END PUBLIC KEY-----",
		payload.PublicKey,
	)

	return nil
}

// Wrap applies JWT authentication to a handler, skipping public routes.
// On success it injects uuid, name and auth headers into the request context.
func (m *Middleware) Wrap(publicRoutes map[string]bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow public routes through without authentication
		if publicRoutes[r.URL.Path] {
			next.ServeHTTP(w, r)
			return
		}

		publicKey, err := m.getPublicKey()
		if err != nil {
			writeJSON(w, http.StatusServiceUnavailable,
				map[string]string{"error": fmt.Sprintf("cannot reach authentication service: %v", err)})
			return
		}

		// Extract the Bearer token from the Authorization header
		rawToken := r.Header.Get("Authorization")
		if rawToken == "" {
			writeJSON(w, http.StatusUnauthorized,
				map[string]string{"error": "Authorization header missing"})
			return
		}
		rawToken = strings.TrimPrefix(rawToken, "Bearer ")

		// Parse and validate the JWT using the Keycloak public key
		key, err := jwt.ParseRSAPublicKeyFromPEM([]byte(publicKey))
		if err != nil {
			writeJSON(w, http.StatusUnauthorized,
				map[string]string{"error": fmt.Sprintf("invalid public key: %v", err)})
			return
		}

		claims := &Claims{}
		_, err = jwt.ParseWithClaims(rawToken, claims, func(t *jwt.Token) (interface{}, error) {
			// Enforce RS256 algorithm to prevent algorithm confusion attacks
			if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return key, nil
		}, jwt.WithAudience(m.audience))

		if err != nil {
			writeJSON(w, http.StatusUnauthorized,
				map[string]string{"error": fmt.Sprintf("invalid token: %v", err)})
			return
		}

		// Inject verified claims into the request context
		ctx := context.WithValue(r.Context(), ContextKeyUUID, claims.Sub)
		ctx = context.WithValue(ctx, ContextKeyName, claims.Name)
		ctx = context.WithValue(ctx, ContextKeyHeaders, map[string]string{
			"Accept":        "application/json",
			"Authorization": rawToken,
		})

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// writeJSON is a helper to write a JSON response with a given status code
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
