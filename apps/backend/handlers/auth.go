package handlers

import (
	"net/http"
	"time"

	"caddyadmin/auth"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct{}

// NewAuthHandler creates a new auth handler
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	ExpiresIn int    `json:"expires_in"`
	User      struct {
		Username string `json:"username"`
	} `json:"user"`
}

// Login authenticates a user and sets HTTP-only cookie
// @Summary Login to CaddyAdmin
// @Description Authenticate with username and password
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body LoginRequest true "Login credentials"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	// Validate against environment credentials
	if !auth.ValidateCredentials(req.Username, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, expiresAt, err := auth.GenerateToken(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Set HTTP-only cookie
	// Secure flag is controlled by COOKIE_SECURE env (defaults to false for HTTP)
	maxAge := int(time.Until(expiresAt).Seconds())
	c.SetCookie(
		"caddyadmin_session", // name
		token,                // value
		maxAge,               // max age in seconds
		"/",                  // path
		"",                   // domain (empty = current domain)
		auth.IsCookieSecure(), // secure (false for HTTP, true for HTTPS)
		true,                 // httpOnly
	)

	resp := LoginResponse{
		Success:   true,
		Message:   "Login successful",
		ExpiresIn: auth.GetSessionDuration(),
	}
	resp.User.Username = req.Username

	c.JSON(http.StatusOK, resp)
}

// Logout clears the session cookie
// @Summary Logout from CaddyAdmin
// @Description Clear session and logout
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]string
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// Clear cookie by setting expired
	c.SetCookie(
		"caddyadmin_session",
		"",
		-1,    // negative max age = delete
		"/",
		"",
		auth.IsCookieSecure(),
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

// GetCurrentUser returns the current authenticated user
// @Summary Get current user
// @Description Returns the currently authenticated user info
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /auth/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"user": gin.H{
			"username": username,
		},
	})
}
