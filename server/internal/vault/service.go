package vault

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"vaultpapi/internal/storage"
)

var (
	ErrVaultNotFound = errors.New("vault not found")
	ErrEmptyVault    = errors.New("vault cannot be empty")
	ErrSizeLimit     = errors.New("vault exceeds size limit")
)

const MaxVaultSize = 10 * 1024 * 1024

type VaultService struct {
	storage *storage.Storage
}

func NewVaultService(store *storage.Storage) *VaultService {
	return &VaultService{
		storage: store,
	}
}

func (s *VaultService) GetVault(ctx context.Context, userID uuid.UUID) (*storage.Vault, error) {
	vault, err := s.storage.GetVault(ctx, userID)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return nil, ErrVaultNotFound
		}
		return nil, fmt.Errorf("failed to get vault: %w", err)
	}
	return vault, nil
}

func (s *VaultService) SaveVault(ctx context.Context, userID uuid.UUID, encryptedBlob []byte, version *int) (*storage.Vault, error) {
	if len(encryptedBlob) == 0 {
		return nil, ErrEmptyVault
	}

	if len(encryptedBlob) > MaxVaultSize {
		return nil, ErrSizeLimit
	}

	vault, err := s.storage.UpsertVault(ctx, userID, encryptedBlob, version)
	if err != nil {
		return nil, fmt.Errorf("failed to save vault: %w", err)
	}

	return vault, nil
}
