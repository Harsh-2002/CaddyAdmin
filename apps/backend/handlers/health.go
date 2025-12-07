package handlers

import (
	"caddyadmin/caddy"
	"net/http"
	"runtime"

	"github.com/gin-gonic/gin"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	caddyClient *caddy.Client
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(client *caddy.Client) *HealthHandler {
	return &HealthHandler{
		caddyClient: client,
	}
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status     string            `json:"status"`
	Version    string            `json:"version"`
	GoVersion  string            `json:"go_version"`
	NumCPU     int               `json:"num_cpu"`
	Components map[string]string `json:"components"`
}

// Health returns the health status of the API
// GET /api/health
func (h *HealthHandler) Health(c *gin.Context) {
	response := HealthResponse{
		Status:    "healthy",
		Version:   "1.0.0",
		GoVersion: runtime.Version(),
		NumCPU:    runtime.NumCPU(),
		Components: map[string]string{
			"database": "healthy",
			"caddy":    "unknown",
		},
	}

	// Check Caddy health
	if err := h.caddyClient.Health(); err == nil {
		response.Components["caddy"] = "healthy"
	} else {
		response.Components["caddy"] = "unhealthy: " + err.Error()
	}

	c.JSON(http.StatusOK, response)
}

// Ready returns the readiness status
// GET /api/ready
func (h *HealthHandler) Ready(c *gin.Context) {
	// Check if Caddy is reachable
	if err := h.caddyClient.Health(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not ready",
			"error":  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// Live returns the liveness status
// GET /api/live
func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "alive"})
}
