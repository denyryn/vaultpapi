package auth

import (
	"context"
	"errors"
	"fmt"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"vaultpapi/internal/config"
	"vaultpapi/internal/crypto"
	"vaultpapi/internal/storage"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrWeakPassword       = errors.New("password does not meet requirements")
	ErrTokenExpired       = errors.New("token expired")
	ErrInvalidToken       = errors.New("invalid token")
)

type Claims struct {
	UserID    uuid.UUID `json:"user_id"`
	Email     string    `json:"email"`
	IssuedAt  int64     `json:"iat"`
	ExpiresAt int64     `json:"exp"`
	jwt.RegisteredClaims
}

type AuthService struct {
	storage *storage.Storage
	config  config.JWTConfig
}

func NewAuthService(store *storage.Storage, cfg config.JWTConfig) *AuthService {
	return &AuthService{
		storage: store,
		config:  cfg,
	}
}

func (s *AuthService) Register(ctx context.Context, email, password string) (*storage.User, error) {
	if err := validateEmail(email); err != nil {
		return nil, err
	}

	if err := validatePassword(password); err != nil {
		return nil, err
	}

	hashedPassword, err := crypto.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user, err := s.storage.CreateUser(ctx, email, hashedPassword)
	if err != nil {
		if errors.Is(err, storage.ErrAlreadyExists) {
			return nil, ErrUserExists
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (string, *storage.User, error) {
	if email == "" || password == "" {
		return "", nil, ErrInvalidCredentials
	}

	user, err := s.storage.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			time.Sleep(100 * time.Millisecond)
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, fmt.Errorf("failed to get user: %w", err)
	}

	if !crypto.VerifyPassword(password, user.PasswordHash) {
		time.Sleep(100 * time.Millisecond)
		return "", nil, ErrInvalidCredentials
	}

	token, err := s.generateToken(user)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, user, nil
}

func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.Secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (s *AuthService) generateToken(user *storage.User) (string, error) {
	now := time.Now().UTC()
	claims := &Claims{
		UserID:    user.ID,
		Email:     user.Email,
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(s.config.ExpiryDuration).Unix(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.config.Issuer,
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.ExpiryDuration)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.Secret))
}

func validateEmail(email string) error {
	if len(email) < 3 || len(email) > 255 {
		return ErrInvalidEmail
	}

	atIndex := -1
	dotIndex := -1
	for i, c := range email {
		if c == '@' {
			if atIndex != -1 {
				return ErrInvalidEmail
			}
			atIndex = i
		} else if c == '.' && atIndex != -1 {
			dotIndex = i
		}
	}

	if atIndex < 1 || dotIndex < atIndex+2 || dotIndex >= len(email)-1 {
		return ErrInvalidEmail
	}

	return nil
}

func validatePassword(password string) error {
	if len(password) < 12 {
		return ErrWeakPassword
	}

	if len(password) > 128 {
		return ErrWeakPassword
	}

	hasLower := false
	hasUpper := false
	hasDigit := false
	hasSpecial := false

	for _, c := range password {
		switch {
		case c >= 'a' && c <= 'z':
			hasLower = true
		case c >= 'A' && c <= 'Z':
			hasUpper = true
		case c >= '0' && c <= '9':
			hasDigit = true
		case c < 32 || c == 127:
			return ErrWeakPassword
		}
	}

	hasSpecial = false
	for _, c := range password {
		if unicode.IsPunct(c) || unicode.IsSymbol(c) {
			hasSpecial = true
		}
	}

	if !hasLower || !hasUpper || !hasDigit || !hasSpecial {
		return ErrWeakPassword
	}

	return nil
}
