package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	ServerPort        string
	CaddyAPIURL       string
	DatabasePath      string
	Environment       string
	AdminUser         string
	AdminPasswordHash string
	JWTSecret         string
	SessionDuration   int  // hours
	CookieSecure      bool // true for HTTPS, false for HTTP
}

// Load creates a new Config with environment variables or defaults
func Load() *Config {
	// Load .env file from project root (2 levels up from backend)
	envPath := filepath.Join("..", "..", ".env")
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("⚠️  .env file not found at %s, using system environment variables", envPath)
	} else {
		log.Printf("✅ Loaded environment from %s", envPath)
	}

	sessionDuration, _ := strconv.Atoi(getEnv("SESSION_DURATION", "8"))
	if sessionDuration <= 0 {
		sessionDuration = 8
	}

	// Cookie secure defaults to false (works on HTTP)
	// Set COOKIE_SECURE=true in production with HTTPS
	cookieSecure := getEnv("COOKIE_SECURE", "false") == "true"

	cfg := &Config{
		ServerPort:        getEnv("SERVER_PORT", "4000"),
		CaddyAPIURL:       getEnv("CADDY_API_URL", "http://localhost:2019"),
		DatabasePath:      getEnv("DATABASE_PATH", "./caddyadmin.db"),
		Environment:       getEnv("ENVIRONMENT", "development"),
		AdminUser:         getEnv("ADMIN_USER", "admin"),
		AdminPasswordHash: getEnv("ADMIN_PASSWORD_HASH", ""),
		JWTSecret:         getEnv("JWT_SECRET", ""),
		SessionDuration:   sessionDuration,
		CookieSecure:      cookieSecure,
	}

	// Log loaded configuration (mask sensitive data)
	log.Println("📋 Configuration loaded:")
	log.Printf("  - ADMIN_USER: %s", cfg.AdminUser)
	log.Printf("  - ADMIN_PASSWORD_HASH: %s", maskSensitive(cfg.AdminPasswordHash))
	log.Printf("  - CADDY_API_URL: %s", cfg.CaddyAPIURL)
	log.Printf("  - SERVER_PORT: %s", cfg.ServerPort)
	log.Printf("  - DATABASE_PATH: %s", cfg.DatabasePath)
	log.Printf("  - SESSION_DURATION: %d hours", cfg.SessionDuration)
	log.Printf("  - COOKIE_SECURE: %v", cfg.CookieSecure)
	log.Printf("  - JWT_SECRET: %s", maskSensitive(cfg.JWTSecret))
	log.Printf("  - ENVIRONMENT: %s", cfg.Environment)

	// Validate required configuration
	if err := cfg.Validate(); err != nil {
		log.Fatalf("❌ Configuration error: %v", err)
	}

	return cfg
}

// maskSensitive masks sensitive data for logging
func maskSensitive(value string) string {
	if value == "" {
		return "<not set>"
	}
	if len(value) <= 8 {
		return "***"
	}
	return value[:4] + "..." + value[len(value)-4:]
}

// Validate checks that required configuration is present
func (c *Config) Validate() error {
	if c.AdminPasswordHash == "" {
		return fmt.Errorf("ADMIN_PASSWORD_HASH is required. Generate one with: ./scripts/generate-password-hash.sh yourpassword")
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
