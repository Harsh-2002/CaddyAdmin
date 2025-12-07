package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"caddyadmin/auth"
	"caddyadmin/sse"

	"github.com/gin-gonic/gin"
)

// SSEHandler handles Server-Sent Events connections
type SSEHandler struct{}

// NewSSEHandler creates a new SSE handler
func NewSSEHandler() *SSEHandler {
	return &SSEHandler{}
}

// Stream handles the SSE connection endpoint
// @Summary SSE event stream
// @Description Server-Sent Events endpoint for real-time updates
// @Tags SSE
// @Produce text/event-stream
// @Param subscribe query string false "Comma-separated event types to subscribe (metrics,logs,sites,config)"
// @Success 200 {string} string "SSE stream"
// @Failure 401 {object} map[string]string
// @Router /api/events/stream [get]
func (h *SSEHandler) Stream(c *gin.Context) {
	// Validate authentication from cookie
	cookie, err := c.Cookie("caddyadmin_session")
	if err != nil || cookie == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	claims, err := auth.ValidateToken(cookie)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	// Generate unique client ID
	clientID := generateClientID()
	
	// Create client
	client := sse.NewClient(clientID, claims.Username)

	// Parse subscriptions from query param
	subscriptions := c.DefaultQuery("subscribe", "metrics,sites")
	for _, sub := range strings.Split(subscriptions, ",") {
		sub = strings.TrimSpace(sub)
		switch sub {
		case "metrics":
			client.Subscribe(sse.EventMetrics)
		case "logs":
			client.Subscribe(sse.EventLogs)
		case "sites":
			client.Subscribe(sse.EventSites)
		case "config":
			client.Subscribe(sse.EventConfig)
		}
	}

	// Register client with hub
	hub := sse.GetHub()
	hub.Register(client)

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering
	c.Header("Access-Control-Allow-Origin", "*")

	// Send initial connection event
	c.SSEvent("connected", gin.H{
		"clientId":      clientID,
		"subscriptions": subscriptions,
		"message":       "SSE connection established",
	})
	c.Writer.Flush()

	// Create context for cleanup
	ctx := c.Request.Context()

	// Stream events
	for {
		select {
		case event, ok := <-client.Channel:
			if !ok {
				// Channel closed (client was replaced or disconnected)
				return
			}
			c.SSEvent(string(event.Type), event)
			c.Writer.Flush()

		case <-ctx.Done():
			// Client disconnected
			hub.Unregister(client)
			return
		}
	}
}

// GetStatus returns SSE hub status
// @Summary Get SSE status
// @Description Returns current SSE connection statistics
// @Tags SSE
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/events/status [get]
func (h *SSEHandler) GetStatus(c *gin.Context) {
	hub := sse.GetHub()
	c.JSON(http.StatusOK, gin.H{
		"connected_clients": hub.ClientCount(),
		"status":            "active",
	})
}

func generateClientID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
