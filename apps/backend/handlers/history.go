package handlers

import (
	"caddyadmin/caddy"
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// HistoryHandler handles configuration history endpoints
type HistoryHandler struct {
	caddyClient   *caddy.Client
	configBuilder *caddy.ConfigBuilder
}

// NewHistoryHandler creates a new history handler
func NewHistoryHandler(client *caddy.Client) *HistoryHandler {
	return &HistoryHandler{
		caddyClient:   client,
		configBuilder: caddy.NewConfigBuilder(client),
	}
}

// ListHistory returns configuration change history
// GET /api/history
func (h *HistoryHandler) ListHistory(c *gin.Context) {
	var history []models.ConfigHistory
	
	// Pagination
	limit := 50
	offset := 0
	if l := c.Query("limit"); l != "" {
		json.Unmarshal([]byte(l), &limit)
	}
	if o := c.Query("offset"); o != "" {
		json.Unmarshal([]byte(o), &offset)
	}

	// Filter by resource type
	query := database.GetDB().Order("timestamp DESC")
	if resourceType := c.Query("resource_type"); resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}
	if resourceID := c.Query("resource_id"); resourceID != "" {
		query = query.Where("resource_id = ?", resourceID)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action = ?", action)
	}

	var total int64
	query.Model(&models.ConfigHistory{}).Count(&total)

	result := query.Limit(limit).Offset(offset).Find(&history)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"history": history,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetHistoryEntry returns a specific history entry
// GET /api/history/:id
func (h *HistoryHandler) GetHistoryEntry(c *gin.Context) {
	id := c.Param("id")

	var entry models.ConfigHistory
	result := database.GetDB().First(&entry, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "History entry not found"})
		return
	}
	c.JSON(http.StatusOK, entry)
}

// RollbackToHistory restores configuration from a history entry
// POST /api/history/:id/rollback
func (h *HistoryHandler) RollbackToHistory(c *gin.Context) {
	id := c.Param("id")

	var entry models.ConfigHistory
	result := database.GetDB().First(&entry, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "History entry not found"})
		return
	}

	// Determine what to restore based on resource type
	switch entry.ResourceType {
	case "config":
		// Restore full Caddy config
		if entry.CaddyConfig != "" {
			var config interface{}
			if err := json.Unmarshal([]byte(entry.CaddyConfig), &config); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid config in history"})
				return
			}
			resp, err := h.caddyClient.LoadConfig(config)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if resp.StatusCode != http.StatusOK {
				c.JSON(http.StatusInternalServerError, gin.H{"error": string(resp.Body)})
				return
			}
		} else if entry.PreviousState != "" {
			// Use previous state
			var config interface{}
			if err := json.Unmarshal([]byte(entry.PreviousState), &config); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid previous state in history"})
				return
			}
			resp, err := h.caddyClient.LoadConfig(config)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if resp.StatusCode != http.StatusOK {
				c.JSON(http.StatusInternalServerError, gin.H{"error": string(resp.Body)})
				return
			}
		}

	case "site":
		if entry.PreviousState != "" {
			var site models.Site
			if err := json.Unmarshal([]byte(entry.PreviousState), &site); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid site data in history"})
				return
			}
			// Restore site
			database.GetDB().Save(&site)
		}

	case "route":
		if entry.PreviousState != "" {
			var route models.Route
			if err := json.Unmarshal([]byte(entry.PreviousState), &route); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid route data in history"})
				return
			}
			// Restore route
			database.GetDB().Save(&route)
		}

	case "upstream":
		if entry.PreviousState != "" {
			var upstream models.Upstream
			if err := json.Unmarshal([]byte(entry.PreviousState), &upstream); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid upstream data in history"})
				return
			}
			// Restore upstream
			database.GetDB().Save(&upstream)
		}
	}

	// Record rollback action
	history := models.ConfigHistory{
		Action:        "rollback",
		ResourceType:  entry.ResourceType,
		ResourceID:    entry.ResourceID,
		ResourceName:  entry.ResourceName,
		PreviousState: entry.NewState,
		NewState:      entry.PreviousState,
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy if not a full config rollback
	if entry.ResourceType != "config" {
		h.syncToCaddy()
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Rollback completed successfully",
		"entry":   entry,
	})
}

// CompareHistory compares two history entries
// GET /api/history/compare
func (h *HistoryHandler) CompareHistory(c *gin.Context) {
	id1 := c.Query("id1")
	id2 := c.Query("id2")

	var entry1, entry2 models.ConfigHistory
	if result := database.GetDB().First(&entry1, "id = ?", id1); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "First history entry not found"})
		return
	}
	if result := database.GetDB().First(&entry2, "id = ?", id2); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Second history entry not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"entry1": entry1,
		"entry2": entry2,
	})
}

// syncToCaddy rebuilds and applies configuration to Caddy
func (h *HistoryHandler) syncToCaddy() error {
	// Build configuration from database
	currentConfig, err := h.configBuilder.BuildFromDB()
	if err != nil {
		return err
	}

	return h.configBuilder.ApplyConfig(currentConfig)
}
