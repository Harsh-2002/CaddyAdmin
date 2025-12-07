package handlers

import (
	"caddyadmin/caddy"
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ConfigHandler handles configuration-related endpoints
type ConfigHandler struct {
	caddyClient   *caddy.Client
	configBuilder *caddy.ConfigBuilder
}

// NewConfigHandler creates a new config handler
func NewConfigHandler(client *caddy.Client) *ConfigHandler {
	return &ConfigHandler{
		caddyClient:   client,
		configBuilder: caddy.NewConfigBuilder(client),
	}
}

// GetCaddyConfig gets the current Caddy configuration
// GET /api/config
func (h *ConfigHandler) GetCaddyConfig(c *gin.Context) {
	config, err := h.caddyClient.GetFullConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

// GetCaddyConfigPath gets configuration at a specific path
// GET /api/config/path/*path
func (h *ConfigHandler) GetCaddyConfigPath(c *gin.Context) {
	path := c.Param("path")
	resp, err := h.caddyClient.GetConfig(path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if resp.StatusCode != http.StatusOK {
		c.Data(resp.StatusCode, "application/json", resp.Body)
		return
	}
	c.Data(http.StatusOK, "application/json", resp.Body)
}

// LoadCaddyConfig loads a full configuration into Caddy
// POST /api/config
func (h *ConfigHandler) LoadCaddyConfig(c *gin.Context) {
	var config interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.caddyClient.LoadConfig(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Record history
	configJSON, _ := json.Marshal(config)
	history := models.ConfigHistory{
		Action:       "load",
		ResourceType: "config",
		NewState:     string(configJSON),
		Success:      resp.StatusCode == http.StatusOK,
	}
	if resp.StatusCode != http.StatusOK {
		history.ErrorMessage = string(resp.Body)
	}
	database.GetDB().Create(&history)

	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{"error": string(resp.Body)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Configuration loaded successfully"})
}

// SetCaddyConfigPath sets configuration at a specific path
// POST /api/config/path/*path
func (h *ConfigHandler) SetCaddyConfigPath(c *gin.Context) {
	path := c.Param("path")
	var value interface{}
	if err := c.ShouldBindJSON(&value); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.caddyClient.SetConfig(path, value)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if resp.StatusCode != http.StatusOK {
		c.Data(resp.StatusCode, "application/json", resp.Body)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Configuration set successfully"})
}

// DeleteCaddyConfigPath deletes configuration at a specific path
// DELETE /api/config/path/*path
func (h *ConfigHandler) DeleteCaddyConfigPath(c *gin.Context) {
	path := c.Param("path")
	resp, err := h.caddyClient.DeleteConfig(path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if resp.StatusCode != http.StatusOK {
		c.Data(resp.StatusCode, "application/json", resp.Body)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Configuration deleted successfully"})
}

// SyncConfig rebuilds and applies configuration from database to Caddy
// POST /api/config/sync
func (h *ConfigHandler) SyncConfig(c *gin.Context) {
	// Get all sites
	var sites []models.Site
	database.GetDB().Where("enabled = ?", true).Find(&sites)

	// Get routes for each site
	routesMap := make(map[string][]models.Route)
	for _, site := range sites {
		var routes []models.Route
		database.GetDB().Where("site_id = ? AND enabled = ?", site.ID, true).Order("`order` ASC").Find(&routes)
		routesMap[site.ID] = routes
	}

	// Get redirect rules
	redirectsMap := make(map[string][]models.RedirectRule)
	for _, site := range sites {
		var rules []models.RedirectRule
		database.GetDB().Where("site_id = ? AND enabled = ?", site.ID, true).Order("priority DESC, created_at DESC").Find(&rules)
		redirectsMap[site.ID] = rules
	}

	// Get upstream groups
	var upstreamGroups []models.UpstreamGroup
	database.GetDB().Find(&upstreamGroups)
	groupsMap := make(map[string]*models.UpstreamGroup)
	upstreamsMap := make(map[string][]models.Upstream)
	for i := range upstreamGroups {
		groupsMap[upstreamGroups[i].Name] = &upstreamGroups[i]
		var upstreams []models.Upstream
		database.GetDB().Model(&upstreamGroups[i]).Association("Upstreams").Find(&upstreams)
		upstreamsMap[upstreamGroups[i].Name] = upstreams
	}

	// Get global settings
	var settings models.GlobalSettings
	database.GetDB().First(&settings)

	// Get custom certificates
	var certificates []models.CustomCertificate
	database.GetDB().Find(&certificates)

	// Build configuration
	config, err := h.configBuilder.BuildFullConfig(sites, routesMap, redirectsMap, groupsMap, upstreamsMap, certificates, &settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Apply to Caddy
	if err := h.configBuilder.ApplyConfig(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Record history
	configJSON, _ := json.Marshal(config)
	history := models.ConfigHistory{
		Action:       "sync",
		ResourceType: "config",
		NewState:     string(configJSON),
		Success:      true,
	}
	database.GetDB().Create(&history)

	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration synchronized successfully",
		"config":  config,
	})
}

// AdaptConfig adapts a configuration format to JSON
// POST /api/config/adapt
func (h *ConfigHandler) AdaptConfig(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	if contentType == "" {
		contentType = "text/caddyfile"
	}

	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.caddyClient.AdaptConfig(string(body), contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if resp.StatusCode != http.StatusOK {
		c.Data(resp.StatusCode, "application/json", resp.Body)
		return
	}
	c.Data(http.StatusOK, "application/json", resp.Body)
}

// StopCaddy stops the Caddy server
// POST /api/config/stop
func (h *ConfigHandler) StopCaddy(c *gin.Context) {
	resp, err := h.caddyClient.Stop()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if resp.StatusCode != http.StatusOK {
		c.Data(resp.StatusCode, "application/json", resp.Body)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Caddy stopped successfully"})
}

// GetGlobalSettings gets global settings
// GET /api/settings
func (h *ConfigHandler) GetGlobalSettings(c *gin.Context) {
	var settings models.GlobalSettings
	result := database.GetDB().First(&settings)
	if result.Error != nil {
		// Return default settings if none exist
		settings = models.GlobalSettings{
			HTTPPort:         80,
			HTTPSPort:        443,
			GracePeriod:      10,
			LogLevel:         "debug",
			AccessLogEnabled: true,
			ErrorLogEnabled:  true,
		}
	}
	c.JSON(http.StatusOK, settings)
}

// UpdateGlobalSettings updates global settings
// PUT /api/settings
func (h *ConfigHandler) UpdateGlobalSettings(c *gin.Context) {
	var settings models.GlobalSettings
	database.GetDB().First(&settings)

	previousState, _ := json.Marshal(settings)

	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var result error
	if settings.ID == "" {
		result = database.GetDB().Create(&settings).Error
	} else {
		result = database.GetDB().Save(&settings).Error
	}
	if result != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(settings)
	history := models.ConfigHistory{
		Action:        "update",
		ResourceType:  "settings",
		ResourceID:    settings.ID,
		PreviousState: string(previousState),
		NewState:      string(newState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	c.JSON(http.StatusOK, settings)
}
