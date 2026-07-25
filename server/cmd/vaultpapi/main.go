package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"vaultpapi/internal/auth"
	"vaultpapi/internal/config"
	httphandlers "vaultpapi/internal/httphandlers"
	"vaultpapi/internal/storage"
	"vaultpapi/internal/vault"

	"github.com/joho/godotenv"
)

func main() {
	// ponytail: .env optional, container gets env vars from compose
	_ = godotenv.Load()

	configPath := flag.String("config", "config.yaml", "Path to configuration file")
	runMigrations := flag.Bool("migrate", false, "Run database migrations")
	flag.Parse()

	cfg, err := loadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	store, err := storage.NewWithRetry(ctx, cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	if *runMigrations {
		log.Println("Running migrations...")
		if err := store.RunMigrations(ctx, "migrations"); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		log.Println("Migrations completed successfully")
	}

	authService := auth.NewAuthService(store, cfg.JWT)
	vaultService := vault.NewVaultService(store)

	handler := httphandlers.NewHandler(authService, vaultService, cfg.Security.MaxRequestSize)

	rateLimiter := httphandlers.NewRateLimiter(cfg.Security.RateLimitRequests, cfg.Security.RateLimitWindow)
	defer rateLimiter.Stop()

	mux := http.NewServeMux()
	mux.HandleFunc("/v1/auth/register", handler.Register)
	mux.HandleFunc("/v1/auth/login", handler.Login)
	mux.Handle("/v1/vault", httphandlers.AuthMiddleware(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handler.GetVault(w, r)
		case http.MethodPut:
			handler.SaveVault(w, r)
		default:
			handler.RespondError(w, http.StatusMethodNotAllowed, "method_not_allowed")
		}
	})))

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "ok",
		})
	})

	wrappedMux := httphandlers.LoggingMiddleware(mux) // add logging for each request

	var handlerStack http.Handler = wrappedMux
	handlerStack = httphandlers.SecurityHeadersMiddleware(handlerStack, cfg)
	handlerStack = httphandlers.RateLimitMiddleware(rateLimiter)(handlerStack)
	handlerStack = httphandlers.RequestLoggerMiddleware(handlerStack)

	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port),
		Handler:      handlerStack,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Starting server on port %s", cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTime)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped gracefully")
}

func loadConfig(path string) (*config.Config, error) {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		log.Printf("Config file not found at %s, using defaults with env overrides", path)
		cfg := config.DefaultConfig()
		if err := cfg.ApplyEnvOverrides(); err != nil {
			return nil, err
		}
		if err := cfg.Validate(); err != nil {
			return nil, err
		}
		return cfg, nil
	}

	return config.Load(path)
}
