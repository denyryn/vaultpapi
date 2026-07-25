package storage

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"vaultpapi/internal/config"
)

var (
	ErrNotFound      = errors.New("record not found")
	ErrAlreadyExists = errors.New("record already exists")
	ErrInvalidInput  = errors.New("invalid input")
)

type User struct {
	ID           uuid.UUID
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}

type Vault struct {
	ID            uuid.UUID
	UserID        uuid.UUID
	EncryptedBlob []byte
	Version       int
	UpdatedAt     time.Time
}

type Storage struct {
	pool *pgxpool.Pool
}

func New(ctx context.Context, cfg config.DatabaseConfig) (*Storage, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.ConnectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	poolConfig.MaxConns = cfg.MaxConns
	poolConfig.MinConns = cfg.MinConns

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	return &Storage{pool: pool}, nil
}

func NewWithRetry(ctx context.Context, cfg config.DatabaseConfig) (*Storage, error) {
	var s *Storage
	var err error

	for attempt := 1; ; attempt++ {
		s, err = New(ctx, cfg)
		if err == nil {
			return s, nil
		}

		backoff := time.Duration(attempt*2) * time.Second
		if backoff > 30*time.Second {
			backoff = 30 * time.Second
		}

		log.Printf("DB connection failed (attempt %d): %v — retrying in %v", attempt, err, backoff)

		select {
		case <-time.After(backoff):
		case <-ctx.Done():
			return nil, fmt.Errorf("db connection cancelled: %w", ctx.Err())
		}
	}
}

func (s *Storage) Close() {
	s.pool.Close()
}

func (s *Storage) RunMigrations(ctx context.Context, migrationsPath string) error {
	migrations := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE TABLE IF NOT EXISTS vaults (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			encrypted_blob BYTEA NOT NULL,
			version INTEGER NOT NULL DEFAULT 1,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_vaults_user_id ON vaults(user_id)`,
	}

	for _, migration := range migrations {
		_, err := s.pool.Exec(ctx, migration)
		if err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}

func (s *Storage) GetDBQueryTime(ctx context.Context) error {
	_, err := s.pool.Query(ctx, `SELECT 1`)
	return err
}

func (s *Storage) CreateUser(ctx context.Context, email string, passwordHash string) (*User, error) {
	if email == "" || passwordHash == "" {
		return nil, ErrInvalidInput
	}

	user := &User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now().UTC(),
	}

	_, err := s.pool.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, created_at)
		VALUES ($1, $2, $3, $4)
	`, user.ID, user.Email, user.PasswordHash, user.CreatedAt)

	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrAlreadyExists
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (s *Storage) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	if email == "" {
		return nil, ErrInvalidInput
	}

	user := &User{}
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (s *Storage) GetUserByID(ctx context.Context, userID uuid.UUID) (*User, error) {
	user := &User{}
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, created_at
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (s *Storage) UpsertVault(ctx context.Context, userID uuid.UUID, encryptedBlob []byte, expectedVersion *int) (*Vault, error) {
	if encryptedBlob == nil {
		return nil, ErrInvalidInput
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var vault *Vault
	var newVersion int

	if expectedVersion != nil {
		row := tx.QueryRow(ctx, `
			SELECT id, user_id, encrypted_blob, version, updated_at
			FROM vaults
			WHERE user_id = $1
			FOR UPDATE
		`, userID)

		existing := &Vault{}
		err := row.Scan(&existing.ID, &existing.UserID, &existing.EncryptedBlob, &existing.Version, &existing.UpdatedAt)

		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("failed to get existing vault: %w", err)
		}

		if errors.Is(err, pgx.ErrNoRows) {
			newVersion = 1
		} else {
			if existing.Version != *expectedVersion {
				return nil, fmt.Errorf("version conflict: expected %d, got %d", *expectedVersion, existing.Version)
			}
			newVersion = existing.Version + 1
		}
	} else {
		newVersion = 1
	}

	vault = &Vault{
		ID:            uuid.New(),
		UserID:        userID,
		EncryptedBlob: encryptedBlob,
		Version:       newVersion,
		UpdatedAt:     time.Now().UTC(),
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO vaults (id, user_id, encrypted_blob, version, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			encrypted_blob = EXCLUDED.encrypted_blob,
			version = EXCLUDED.version,
			updated_at = EXCLUDED.updated_at
	`, vault.ID, vault.UserID, vault.EncryptedBlob, vault.Version, vault.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to upsert vault: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return vault, nil
}

func (s *Storage) GetVault(ctx context.Context, userID uuid.UUID) (*Vault, error) {
	vault := &Vault{}
	err := s.pool.QueryRow(ctx, `
		SELECT id, user_id, encrypted_blob, version, updated_at
		FROM vaults
		WHERE user_id = $1
	`, userID).Scan(&vault.ID, &vault.UserID, &vault.EncryptedBlob, &vault.Version, &vault.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get vault: %w", err)
	}

	return vault, nil
}

func isUniqueViolation(err error) bool {
	return err != nil && (contains(err.Error(), "unique constraint") ||
		contains(err.Error(), "duplicate key"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
