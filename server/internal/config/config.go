package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Database DatabaseConfig `yaml:"database"`
	Server   ServerConfig   `yaml:"server"`
	JWT      JWTConfig      `yaml:"jwt"`
	Security SecurityConfig `yaml:"security"`
}

type DatabaseConfig struct {
	ConnectionString string `yaml:"connection_string"`
	User             string `yaml:"user"`
	Password         string `yaml:"password"`
	Host             string `yaml:"host"`
	Port             string `yaml:"port"`
	DBName           string `yaml:"dbname"`
	SSLMode          string `yaml:"sslmode"`
	MaxConns         int32  `yaml:"max_conns"`
	MinConns         int32  `yaml:"min_conns"`
}

func (d *DatabaseConfig) BuildURL() string {
	if d.ConnectionString != "" {
		return d.ConnectionString
	}
	password := url.QueryEscape(d.Password)
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		d.User, password, d.Host, d.Port, d.DBName, d.SSLMode)
}

type ServerConfig struct {
	Host         string        `yaml:"host"`
	Port         string        `yaml:"port"`
	ReadTimeout  time.Duration `yaml:"read_timeout"`
	WriteTimeout time.Duration `yaml:"write_timeout"`
	IdleTimeout  time.Duration `yaml:"idle_timeout"`
	ShutdownTime time.Duration `yaml:"shutdown_time"`
}

type JWTConfig struct {
	Secret         string        `yaml:"secret"`
	ExpiryDuration time.Duration `yaml:"expiry_duration"`
	Issuer         string        `yaml:"issuer"`
}

type SecurityConfig struct {
	ExtensionID       string        `yaml:"extension_id"`
	RateLimitRequests int           `yaml:"rate_limit_requests"`
	RateLimitWindow   time.Duration `yaml:"rate_limit_window"`
	MaxRequestSize    int64         `yaml:"max_request_size"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	cfg := &Config{}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	if err := cfg.ApplyEnvOverrides(); err != nil {
		return nil, fmt.Errorf("failed to apply env overrides: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return cfg, nil
}

func (c *Config) ApplyEnvOverrides() error {
	var pgSet bool

	if dbUser := os.Getenv("POSTGRES_USER"); dbUser != "" {
		c.Database.User = dbUser
		pgSet = true
	}
	if dbPassword := os.Getenv("POSTGRES_PASSWORD"); dbPassword != "" {
		c.Database.Password = dbPassword
		pgSet = true
	}
	if dbHost := os.Getenv("POSTGRES_HOST"); dbHost != "" {
		c.Database.Host = dbHost
		pgSet = true
	}
	if dbPort := os.Getenv("POSTGRES_PORT"); dbPort != "" {
		c.Database.Port = dbPort
		pgSet = true
	}
	if dbName := os.Getenv("POSTGRES_DB"); dbName != "" {
		c.Database.DBName = dbName
		pgSet = true
	}
	if sslMode := os.Getenv("POSTGRES_SSLMODE"); sslMode != "" {
		c.Database.SSLMode = sslMode
		pgSet = true
	}

	if pgSet {
		c.Database.ConnectionString = ""
	}

	if dbConn := os.Getenv("DATABASE_URL"); dbConn != "" {
		c.Database.ConnectionString = dbConn
	}

	if extensionID := os.Getenv("EXTENSION_ID"); extensionID != "" {
		c.Security.ExtensionID = extensionID
	}

	if jwtSecret := os.Getenv("JWT_SECRET"); jwtSecret != "" {
		c.JWT.Secret = jwtSecret
	}

	if dbMaxConns := os.Getenv("DB_MAX_CONNS"); dbMaxConns != "" {
		val, err := strconv.Atoi(dbMaxConns)
		if err != nil {
			return fmt.Errorf("DB_MAX_CONNS must be an integer: %w", err)
		}
		c.Database.MaxConns = int32(val)
	}

	if port := os.Getenv("PORT"); port != "" {
		c.Server.Port = port
	}

	if host := os.Getenv("HOST"); host != "" {
		c.Server.Host = host
	}

	if rateLimit := os.Getenv("RATE_LIMIT_REQUESTS"); rateLimit != "" {
		val, err := strconv.Atoi(rateLimit)
		if err != nil {
			return fmt.Errorf("RATE_LIMIT_REQUESTS must be an integer: %w", err)
		}
		c.Security.RateLimitRequests = val
	}

	return nil
}

func (c *Config) Validate() error {
	if c.Database.ConnectionString != "" {
		// ponytail: already set via DATABASE_URL env or config.yaml
	} else if c.Database.Host != "" {
		c.Database.ConnectionString = c.Database.BuildURL()
	} else {
		return fmt.Errorf("database connection_string or POSTGRES_* vars are required")
	}
	if c.JWT.Secret == "" {
		return fmt.Errorf("JWT secret is required")
	}
	if len(c.JWT.Secret) < 32 {
		return fmt.Errorf("JWT secret must be at least 32 bytes")
	}
	if c.Server.Host == "" {
		c.Server.Host = "localhost"
	}
	if c.Server.Port == "" {
		c.Server.Port = "8080"
	}
	if c.Server.ReadTimeout == 0 {
		c.Server.ReadTimeout = 15 * time.Second
	}
	if c.Server.WriteTimeout == 0 {
		c.Server.WriteTimeout = 15 * time.Second
	}
	if c.Server.IdleTimeout == 0 {
		c.Server.IdleTimeout = 60 * time.Second
	}
	if c.Server.ShutdownTime == 0 {
		c.Server.ShutdownTime = 30 * time.Second
	}
	if c.JWT.ExpiryDuration == 0 {
		c.JWT.ExpiryDuration = 24 * time.Hour
	}
	if c.Security.MaxRequestSize == 0 {
		c.Security.MaxRequestSize = 1 << 20 // 1MB
	}
	if c.Security.RateLimitRequests == 0 {
		c.Security.RateLimitRequests = 100
	}
	if c.Security.RateLimitWindow == 0 {
		c.Security.RateLimitWindow = time.Minute
	}
	if c.Database.MaxConns == 0 {
		c.Database.MaxConns = 10
	}
	if c.Database.MinConns == 0 {
		c.Database.MinConns = 2
	}
	return nil
}

func DefaultConfig() *Config {
	return &Config{
		Database: DatabaseConfig{
			ConnectionString: "postgres://postgres:postgres@localhost:5432/vaultpapi?sslmode=disable",
			User:             "postgres",
			Password:         "postgres",
			Host:             "localhost",
			Port:             "5432",
			DBName:           "vaultpapi",
			SSLMode:          "disable",
			MaxConns:         10,
			MinConns:         2,
		},
		Server: ServerConfig{
			Port:         "8080",
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
			ShutdownTime: 30 * time.Second,
		},
		JWT: JWTConfig{
			ExpiryDuration: 24 * time.Hour,
			Issuer:         "vaultpapi",
		},
		Security: SecurityConfig{
			RateLimitRequests: 100,
			RateLimitWindow:   time.Minute,
			MaxRequestSize:    1 << 20,
		},
	}
}
