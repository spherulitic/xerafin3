// Package handlers wires up the HTTP routes and implements the handler logic
// for the Xerafin Chat Service.
package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/xerafin/chat/internal/auth"
	"github.com/xerafin/chat/internal/db"
	"github.com/xerafin/chat/internal/spool"
)

// Handler holds injected dependencies for all route handlers
type Handler struct {
	db *db.DB
}

// ChatMessage is the outbound representation of a chat row
type ChatMessage struct {
	ChatDate int64   `json:"chatDate"`
	Photo    *string `json:"photo"`
	Name     *string `json:"name"`
	ChatText string  `json:"chatText"`
	ChatUser string  `json:"chatUser"`
	Expire   bool    `json:"expire"`
}

// UserInfo is the response shape from the login service
type UserInfo struct {
	UserID string  `json:"userid"`
	Photo  *string `json:"photo"`
	Name   *string `json:"name"`
}

// NewMux constructs the HTTP mux with all routes registered
func NewMux(database *db.DB, authMiddleware *auth.Middleware) http.Handler {
	h := &Handler{db: database}

	mux := http.NewServeMux()

	// Register routes
	mux.HandleFunc("/health", h.health)
	mux.HandleFunc("/getChatsInit", h.getChatsInit)
	mux.HandleFunc("/getChats", h.getChats)
	mux.HandleFunc("/submitChat", h.submitChat)

	// Wrap the entire mux with auth middleware
	// /health is declared as a public route — no token required
	return authMiddleware.Wrap(map[string]bool{
		"/health": true,
	}, mux)
}

// health is a public liveness probe endpoint
func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// getChatsInit resets the user's spool file and returns recent chat history
func (h *Handler) getChatsInit(w http.ResponseWriter, r *http.Request) {
	// Extract verified identity from context (set by auth middleware)
	uuid := r.Context().Value(auth.ContextKeyUUID).(string)
	headers := r.Context().Value(auth.ContextKeyHeaders).(map[string]string)

	// Parse request body
	var params struct {
		MostRecent *int64 `json:"mostRecent"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	// Default mostRecent to now if not provided
	now := time.Now().UnixMilli()
	if params.MostRecent != nil {
		now = *params.MostRecent
	}

	// Reset the user's spool file for this session
	if err := spool.Reset(uuid); err != nil {
		slog.Error("failed to reset spool file", "uuid", uuid, "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "spool error"})
		return
	}

	// Fetch chats from the database newer than the requested timestamp
	chats, err := h.db.GetChatsAfter(now)
	if err != nil {
		slog.Error("GetChatsAfter failed", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}

	// Collect unique user IDs to batch-fetch names and photos
	userIDs := make([]string, 0, len(chats))
	for _, c := range chats {
		userIDs = append(userIDs, c.UserID)
	}

	userInfoMap, err := fetchUserInfo("http://login:5000/getUserNamesAndPhotos", userIDs, headers)
	if err != nil {
		slog.Warn("failed to fetch user info", "err", err)
		// Non-fatal — we continue with nil photo/name
	}

	// Build the response messages
	result := make([]ChatMessage, 0, len(chats))
	for _, c := range chats {
		info := userInfoMap[c.UserID]
		msg := ChatMessage{
			ChatDate: c.TimeStamp,
			ChatText: c.Message,
			ChatUser: c.UserID,
			Expire:   false,
		}
		if info != nil {
			msg.Photo = info.Photo
			msg.Name = info.Name
		}
		result = append(result, msg)
	}

	// Response envelope matches the original Python format:
	// [messages, rownum, serverTimestampMs, statusObject]
	writeJSON(w, http.StatusOK, []any{
		result,
		0,
		time.Now().UnixMilli(),
		map[string]string{"status": "success"},
	})
}

// getChats is the long-poll endpoint. It blocks up to 45 seconds waiting
// for new lines in the user's spool file.
func (h *Handler) getChats(w http.ResponseWriter, r *http.Request) {
	uuid := r.Context().Value(auth.ContextKeyUUID).(string)
	headers := r.Context().Value(auth.ContextKeyHeaders).(map[string]string)

	var params struct {
		RowNum int `json:"rownum"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	// Preserve the original 4-second initial delay before polling begins
	time.Sleep(4 * time.Second)

	// Ensure the spool file exists before we try to read it
	if err := spool.EnsureExists(uuid); err != nil {
		slog.Error("failed to ensure spool exists", "uuid", uuid, "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "spool error"})
		return
	}

	// Block up to 45 seconds for new chat lines
	lines, lastRow, err := spool.LongPoll(uuid, params.RowNum, 45*time.Second)
	if err != nil {
		slog.Error("long poll error", "uuid", uuid, "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "spool read error"})
		return
	}

	// Enrich each spool line with user info from the login service
	result := make([]ChatMessage, 0, len(lines))
	for _, line := range lines {
		msg, err := parseSpoolLine(line, headers)
		if err != nil {
			slog.Error("failed to parse spool line", "line", line, "err", err)
                        writeJSON(w, http.StatusInternalServerError, map[string]string{"error":err.Error()})
                        return
		}
		result = append(result, msg)
	}

	writeJSON(w, http.StatusOK, []any{
		result,
		lastRow,
		time.Now().UnixMilli(),
		map[string]string{"status": "success"},
	})
}

// submitChat writes a new chat to the database and spools it to all active users
func (h *Handler) submitChat(w http.ResponseWriter, r *http.Request) {
	uuid := r.Context().Value(auth.ContextKeyUUID).(string)
	headers := r.Context().Value(auth.ContextKeyHeaders).(map[string]string)

	var params struct {
		UserID        string  `json:"userid"`
		ChatText      string  `json:"chatText"`
		ChatTime      *int64  `json:"chatTime"`
		Expire        bool    `json:"expire"`
		MilestoneType *string `json:"milestoneType"`
		MilestoneOf   *string `json:"milestoneOf"`
	}
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	// Default userid to the authenticated user if not overridden
	userID := uuid
	if params.UserID != "" {
		userID = params.UserID
	}

	// Default chatTime to now in milliseconds
	chatTime := time.Now().UnixMilli()
	if params.ChatTime != nil {
		chatTime = *params.ChatTime
	}

	var spoolLines []string

	// If expire is set, delete milestone chats and generate expiry spool signals
	if params.Expire && params.MilestoneType != nil && params.MilestoneOf != nil {
		deleted, err := h.db.GetAndDeleteMilestoneChats(*params.MilestoneType, *params.MilestoneOf)
		if err != nil {
			slog.Error("GetAndDeleteMilestoneChats failed", "err", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
			return
		}
		// Expiry signal format: "0,<timestamp>," — empty message signals deletion
		for _, row := range deleted {
			spoolLines = append(spoolLines, fmt.Sprintf("0,%d,", row.TimeStamp))
		}
	}

	// Insert the new chat row
	chat := db.Chat{
		UserID:    userID,
		TimeStamp: chatTime,
		Message:   params.ChatText,
	}
	if params.MilestoneType != nil {
		chat.MilestoneType.String = *params.MilestoneType
		chat.MilestoneType.Valid = true
	}
	if params.MilestoneOf != nil {
		chat.MilestoneOf.String = *params.MilestoneOf
		chat.MilestoneOf.Valid = true
	}

	if err := h.db.InsertChat(chat); err != nil {
		slog.Error("InsertChat failed", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}

	// Append the new chat line to the spool
	spoolLines = append(spoolLines, fmt.Sprintf("%s,%d,%s", userID, chatTime, params.ChatText))

	// Fetch all currently logged-in users to spool the message to them
	loggedInUsers, err := fetchLoggedInUsers("http://login:5000/getLoggedInUsers", headers)
	if err != nil {
		slog.Warn("failed to fetch logged in users", "err", err)
		// Non-fatal — we still return success
	} else {
		if err := spool.AppendToUsers(loggedInUsers, spoolLines); err != nil {
			slog.Error("AppendToUsers failed", "err", err)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"msg":    spoolLines,
	})
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// parseSpoolLine parses a CSV spool line and enriches it with user info
// Spool line format: "userid,timestampMs,message text"
func parseSpoolLine(line string, headers map[string]string) (ChatMessage, error) {
    parts := strings.SplitN(line, ",", 3)
    if len(parts) < 3 {
        return ChatMessage{}, fmt.Errorf("malformed spool line: %q", line)
    }

    userID := parts[0]
    message := strings.TrimSpace(parts[2])
    expire := message == ""

    var ts int64
    fmt.Sscanf(parts[1], "%d", &ts)

    // Fetch user info for this single user
    infoMap, err := fetchUserInfo("http://login:5000/getUserNamesAndPhotos", []string{userID}, headers)
    if err != nil {
        slog.Error("parseSpoolLine: failed to fetch user info", "userID", userID, "err", err)
        // Return the error so getChats knows something went wrong
        return ChatMessage{}, fmt.Errorf("failed to fetch user info for %s: %w", userID, err)
    }

	msg := ChatMessage{
		ChatDate: ts,
		ChatText: message,
		ChatUser: userID,
		Expire:   expire,
	}

	if err == nil {
		if info, ok := infoMap[userID]; ok {
			msg.Photo = info.Photo
			msg.Name = info.Name
		}
	}

	// Fallback values match the original Python defaults
	if msg.Photo == nil {
		fallback := "images/unknown_player.gif"
		msg.Photo = &fallback
	}
	if msg.Name == nil {
		fallback := "Unknown Player"
		msg.Name = &fallback
	}

	return msg, nil
}

// fetchUserInfo calls the login service to get names and photos for a list of userIDs.
// Returns a map keyed by userid for O(1) lookup.
func fetchUserInfo(url string, userIDs []string, headers map[string]string) (map[string]*UserInfo, error) {
    body, _ := json.Marshal(map[string]any{"userList": userIDs})
    req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(string(body)))
    if err != nil {
        slog.Error("fetchUserInfo: failed to create request", "url", url, "err", err)
        return nil, err
    }
    for k, v := range headers {
        req.Header.Set(k, v)
    }
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        slog.Error("fetchUserInfo: HTTP request failed", "url", url, "err", err)
        return nil, err
    }
    defer resp.Body.Close()

    // Log the status code
    slog.Debug("fetchUserInfo response", "status", resp.StatusCode, "url", url)

    if resp.StatusCode != http.StatusOK {
        slog.Error("fetchUserInfo: non-200 response", "status", resp.StatusCode, "url", url)
        return nil, fmt.Errorf("login service returned %d", resp.StatusCode)
    }

    var users []UserInfo
    if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
        slog.Error("fetchUserInfo: failed to decode response", "err", err)
        return nil, err
    }

    result := make(map[string]*UserInfo, len(users))
    for i := range users {
        result[users[i].UserID] = &users[i]
    }
    return result, nil
}

// fetchLoggedInUsers calls the login service and returns a slice of active userIDs
func fetchLoggedInUsers(url string, headers map[string]string) ([]string, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var users []struct {
		UserID string `json:"userId"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(users))
	for _, u := range users {
		ids = append(ids, u.UserID)
	}
	return ids, nil
}

// writeJSON writes a JSON-encoded response with the given status code
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
