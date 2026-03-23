package crypto

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"runtime"

	"github.com/alexedwards/argon2id"
)

func HashPassword(password string) (string, error) {
	return argon2id.CreateHash(password, argon2id.DefaultParams)
}

func VerifyPassword(password string, hash string) bool {
	match, err := argon2id.ComparePasswordAndHash(password, hash)
	if err != nil {
		return false
	}
	return match
}

func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

func GetNumCPU() int {
	return runtime.NumCPU()
}
