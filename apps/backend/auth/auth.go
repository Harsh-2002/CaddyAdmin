package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"caddyadmin/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	jwtSecret       []byte
	sessionDuration time.Duration
	cfg             *config.Config
	ErrInvalidToken = errors.New("invalid token")
)

// Initialize sets up auth with config
func Initialize(c *config.Config) {
	cfg = c
	
	// Use configured JWT secret or generate one
	if c.JWTSecret != "" {
		jwtSecret = []byte(c.JWTSecret)
	} else {
		jwtSecret = []byte(generateSecret())
	}
	
	// Set session duration (default 8 hours)
	sessionDuration = time.Duration(c.SessionDuration) * time.Hour
}

func generateSecret() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Claims represents JWT claims
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token
func GenerateToken(username string) (string, time.Time, error) {
	expiresAt := time.Now().Add(sessionDuration)
	
	claims := Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "caddyadmin",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	return tokenString, expiresAt, err
}

// ValidateToken validates a JWT token and returns claims
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// ValidateCredentials checks username and password against environment config
func ValidateCredentials(username, password string) bool {
	log.Printf("🔐 Attempting login for user: %s", username)
	
	if cfg == nil || cfg.AdminUser == "" {
		log.Printf("❌ Login failed: config not initialized or admin user not set")
		return false
	}
	
	// Check username
	if username != cfg.AdminUser {
		log.Printf("❌ Login failed: username mismatch (expected: %s, got: %s)", cfg.AdminUser, username)
		return false
	}
	
	// If no password hash configured, deny access (security)
	if cfg.AdminPasswordHash == "" {
		log.Printf("❌ Login failed: no password hash configured")
		return false
	}
	
	// Check password against bcrypt hash
	err := bcrypt.CompareHashAndPassword([]byte(cfg.AdminPasswordHash), []byte(password))
	if err != nil {
		log.Printf("❌ Login failed: password mismatch (bcrypt error: %v)", err)
		return false
	}
	
	log.Printf("Login successful")
	return true
}

// GetAdminUsername returns the configured admin username
func GetAdminUsername() string {
	if cfg != nil {
		return cfg.AdminUser
	}
	return ""
}

// IsCookieSecure returns whether cookies should use Secure flag
// Returns false by default (works on HTTP), true when COOKIE_SECURE=true
func IsCookieSecure() bool {
	if cfg != nil {
		return cfg.CookieSecure
	}
	return false
}

// AuthMiddleware checks for valid JWT in HTTP-only cookie
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for public endpoints
		path := c.Request.URL.Path
		if path == "/api/health" || path == "/api/auth/login" || path == "/health" {
			c.Next()
			return
		}
		
		// Skip auth for static files
		if !strings.HasPrefix(path, "/api/") {
			c.Next()
			return
		}

		// Get token from cookie
		tokenString, err := c.Cookie("caddyadmin_session")
		if err != nil || tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired session"})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("username", claims.Username)
		c.Set("authenticated", true)

		c.Next()
	}
}

// HashPassword creates a bcrypt hash of a password
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

// CheckPassword compares a password with a hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GetSessionDuration returns configured session duration in seconds
func GetSessionDuration() int {
	return int(sessionDuration.Seconds())
}
