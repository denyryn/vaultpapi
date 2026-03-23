package httphandlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"vaultpapi/internal/auth"
	"vaultpapi/internal/config"
	"vaultpapi/internal/vault"
)

type contextKey string

const UserContextKey contextKey = "user"

type ErrorResponse struct {
	Error string `json:"error"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  struct {
		ID        string `json:"id"`
		Email     string `json:"email"`
		CreatedAt string `json:"created_at"`
	} `json:"user"`
}

type VaultResponse struct {
	ID            string `json:"id"`
	EncryptedBlob []byte `json:"encrypted_blob"`
	Version       int    `json:"version"`
	UpdatedAt     string `json:"updated_at"`
}

type SaveVaultRequest struct {
	EncryptedBlob []byte `json:"encrypted_blob"`
	Version       *int   `json:"version,omitempty"`
}

type Handler struct {
	authService    *auth.AuthService
	vaultService   *vault.VaultService
	maxRequestSize int64
	shutdown       chan struct{}
}

func NewHandler(authSvc *auth.AuthService, vaultSvc *vault.VaultService, maxRequestSize int64) *Handler {
	return &Handler{
		authService:    authSvc,
		vaultService:   vaultSvc,
		maxRequestSize: maxRequestSize,
		shutdown:       make(chan struct{}),
	}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.RespondError(w, http.StatusMethodNotAllowed, "method_not_allowed")
		return
	}

	if err := h.enforceMaxSize(r); err != nil {
		h.RespondError(w, http.StatusRequestEntityTooLarge, "request_too_large")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.RespondError(w, http.StatusBadRequest, "invalid_request")
		return
	}

	if req.Email == "" || req.Password == "" {
		h.RespondError(w, http.StatusBadRequest, "missing_fields")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	user, err := h.authService.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidEmail):
			h.RespondError(w, http.StatusBadRequest, "invalid_email")
		case errors.Is(err, auth.ErrWeakPassword):
			h.RespondError(w, http.StatusBadRequest, "weak_password")
		case errors.Is(err, auth.ErrUserExists):
			h.RespondError(w, http.StatusConflict, "user_exists")
		default:
			log.Printf("internal error: %s", err.Error())
			h.RespondError(w, http.StatusInternalServerError, "internal_error")
		}
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"id":    user.ID.String(),
		"email": user.Email,
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.RespondError(w, http.StatusMethodNotAllowed, "method_not_allowed")
		return
	}

	if err := h.enforceMaxSize(r); err != nil {
		h.RespondError(w, http.StatusRequestEntityTooLarge, "request_too_large")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.RespondError(w, http.StatusBadRequest, "invalid_request")
		return
	}

	if req.Email == "" || req.Password == "" {
		h.RespondError(w, http.StatusBadRequest, "missing_fields")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	token, user, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			h.RespondError(w, http.StatusUnauthorized, "invalid_credentials")
			return
		}
		log.Println("login err: %s", err.Error())
		h.RespondError(w, http.StatusInternalServerError, "internal_error")
		return
	}

	resp := LoginResponse{
		Token: token,
	}
	resp.User.ID = user.ID.String()
	resp.User.Email = user.Email
	resp.User.CreatedAt = user.CreatedAt.Format(time.RFC3339)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) GetVault(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.RespondError(w, http.StatusMethodNotAllowed, "method_not_allowed")
		return
	}

	user, ok := r.Context().Value(UserContextKey).(*UserClaims)
	if !ok {
		h.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	vaultData, err := h.vaultService.GetVault(r.Context(), user.UserID)
	if err != nil {
		if errors.Is(err, vault.ErrVaultNotFound) {
			h.RespondError(w, http.StatusNotFound, "vault_not_found")
			return
		}
		h.RespondError(w, http.StatusInternalServerError, "internal_error")
		return
	}

	resp := VaultResponse{
		ID:            vaultData.ID.String(),
		EncryptedBlob: vaultData.EncryptedBlob,
		Version:       vaultData.Version,
		UpdatedAt:     vaultData.UpdatedAt.Format(time.RFC3339),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) SaveVault(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		h.RespondError(w, http.StatusMethodNotAllowed, "method_not_allowed")
		return
	}

	user, ok := r.Context().Value(UserContextKey).(*UserClaims)
	if !ok {
		h.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := h.enforceMaxSize(r); err != nil {
		h.RespondError(w, http.StatusRequestEntityTooLarge, "request_too_large")
		return
	}

	var req SaveVaultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.RespondError(w, http.StatusBadRequest, "invalid_request")
		return
	}

	if req.EncryptedBlob == nil {
		h.RespondError(w, http.StatusBadRequest, "missing_encrypted_blob")
		return
	}

	vaultData, err := h.vaultService.SaveVault(r.Context(), user.UserID, req.EncryptedBlob, req.Version)
	if err != nil {
		if errors.Is(err, vault.ErrEmptyVault) {
			h.RespondError(w, http.StatusBadRequest, "empty_vault")
			return
		}
		if errors.Is(err, vault.ErrSizeLimit) {
			h.RespondError(w, http.StatusRequestEntityTooLarge, "vault_too_large")
			return
		}
		log.Println("save vault error: ", err.Error())
		h.RespondError(w, http.StatusInternalServerError, "internal_error")
		return
	}

	resp := VaultResponse{
		ID:            vaultData.ID.String(),
		EncryptedBlob: vaultData.EncryptedBlob,
		Version:       vaultData.Version,
		UpdatedAt:     vaultData.UpdatedAt.Format(time.RFC3339),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) enforceMaxSize(r *http.Request) error {
	if r.ContentLength > h.maxRequestSize {
		return errors.New("request too large")
	}
	r.Body = http.MaxBytesReader(nil, r.Body, h.maxRequestSize)
	return nil
}

func (h *Handler) RespondError(w http.ResponseWriter, status int, message string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

type UserClaims struct {
	UserID   uuid.UUID
	Email    string
	IssuedAt time.Time
}

// LoggingMiddleware logs request method, path, status code, and duration.
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w}
		next.ServeHTTP(rw, r)
		log.Printf("[%s]\t%s\t%d\t%v", r.Method, r.URL.Path, rw.status, time.Since(start))
	})
}

func AuthMiddleware(authSvc *auth.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing_token"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"error":"invalid_token_format"}`, http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]
			claims, err := authSvc.ValidateToken(tokenString)
			if err != nil {
				if errors.Is(err, auth.ErrTokenExpired) {
					http.Error(w, `{"error":"token_expired"}`, http.StatusUnauthorized)
					return
				}
				http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, &UserClaims{
				UserID:   claims.UserID,
				Email:    claims.Email,
				IssuedAt: time.Unix(claims.IssuedAt, 0),
			})

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

type responseWriter struct {
	http.ResponseWriter
	status int
	length int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.status == 0 {
		rw.status = http.StatusOK
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.length += n
	return n, err
}

func RequestLoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		_ = duration
		_ = rw.length
	})
}

type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

type RateLimiter struct {
	requests        map[string]*rateLimitEntry
	limit           int
	window          time.Duration
	cleanupInterval time.Duration
	stopCleanup     chan struct{}
}

func NewRateLimiter(requestsPerWindow int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests:        make(map[string]*rateLimitEntry),
		limit:           requestsPerWindow,
		window:          window,
		cleanupInterval: 5 * time.Minute,
		stopCleanup:     make(chan struct{}),
	}

	go rl.cleanup()

	return rl
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			now := time.Now()
			for key, entry := range rl.requests {
				if now.After(entry.resetTime) {
					delete(rl.requests, key)
				}
			}
		case <-rl.stopCleanup:
			return
		}
	}
}

func (rl *RateLimiter) Stop() {
	close(rl.stopCleanup)
}

func (rl *RateLimiter) Allow(ip string) bool {
	now := time.Now()

	entry, exists := rl.requests[ip]
	if !exists || now.After(entry.resetTime) {
		rl.requests[ip] = &rateLimitEntry{
			count:     1,
			resetTime: now.Add(rl.window),
		}
		return true
	}

	if entry.count >= rl.limit {
		return false
	}

	entry.count++
	return true
}

func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			clientIP := getClientIP(r)

			if !limiter.Allow(clientIP) {
				http.Error(w, `{"error":"rate_limit_exceeded"}`, http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func getClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	return r.RemoteAddr
}

func SecurityHeadersMiddleware(next http.Handler, cfg *config.Config) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", cfg.Security.ExtensionID)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		next.ServeHTTP(w, r)
	})
}

func BodyLimitMiddleware(limit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}

type limitedReader struct {
	reader io.Reader
	limit  int64
	n      int64
}

func (lr *limitedReader) Read(p []byte) (int, error) {
	if lr.n >= lr.limit {
		return 0, io.EOF
	}
	if int64(len(p)) > lr.limit-lr.n {
		p = p[:lr.limit-lr.n]
	}
	n, err := lr.reader.Read(p)
	lr.n += int64(n)
	return n, err
}
