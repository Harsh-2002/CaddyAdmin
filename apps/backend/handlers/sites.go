package handlers

import (
	"caddyadmin/caddy"
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// SiteHandler handles site-related endpoints
type SiteHandler struct {
	configBuilder *caddy.ConfigBuilder
	client        *caddy.Client
	sitesPath     string
}

// NewSiteHandler creates a new site handler
func NewSiteHandler(client *caddy.Client, sitesPath string) *SiteHandler {
	return &SiteHandler{
		configBuilder: caddy.NewConfigBuilder(client),
		client:        client,
		sitesPath:     sitesPath,
	}
}

// CreateSiteRequest represents a request to create a site
type CreateSiteRequest struct {
	Name       string   `json:"name" binding:"required"`
	Hosts      []string `json:"hosts" binding:"required"`
	ListenPort int      `json:"listen_port"`
	AutoHTTPS  *bool    `json:"auto_https"`
	TLSEnabled *bool    `json:"tls_enabled"`
}

// UpdateSiteRequest represents a request to update a site
type UpdateSiteRequest struct {
	Name       string   `json:"name"`
	Hosts      []string `json:"hosts"`
	ListenPort int      `json:"listen_port"`
	AutoHTTPS  *bool    `json:"auto_https"`
	TLSEnabled *bool    `json:"tls_enabled"`
	Enabled    *bool    `json:"enabled"`
}

// ListSites returns all sites
// GET /api/sites
// ListSites returns all sites
// @Summary      List all sites
// @Description  Get a list of all configured sites
// @Tags         sites
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string][]models.Site
// @Router       /sites [get]
func (h *SiteHandler) ListSites(c *gin.Context) {
	var sites []models.Site
	result := database.GetDB().Preload("Routes").Find(&sites)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Parse JSON fields
	for i := range sites {
		if sites[i].HostsJSON != "" {
			json.Unmarshal([]byte(sites[i].HostsJSON), &sites[i].Hosts)
		}
	}

	c.JSON(http.StatusOK, gin.H{"sites": sites})
}

// GetSite returns a specific site
// GET /api/sites/:id
func (h *SiteHandler) GetSite(c *gin.Context) {
	id := c.Param("id")

	var site models.Site
	result := database.GetDB().Preload("Routes").First(&site, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	if site.HostsJSON != "" {
		json.Unmarshal([]byte(site.HostsJSON), &site.Hosts)
	}

	c.JSON(http.StatusOK, site)
}

// CreateSite creates a new site
// POST /api/sites
// CreateSite creates a new site
// @Summary      Create a site
// @Description  Create a new site configuration
// @Tags         sites
// @Accept       json
// @Produce      json
// @Param        site  body      models.Site  true  "Site JSON"
// @Success      201   {object}  models.Site
// @Failure      400   {object}  map[string]string
// @Router       /sites [post]
func (h *SiteHandler) CreateSite(c *gin.Context) {
	var req CreateSiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hostsJSON, _ := json.Marshal(req.Hosts)
	autoHTTPS := true
	if req.AutoHTTPS != nil {
		autoHTTPS = *req.AutoHTTPS
	}
	tlsEnabled := true
	if req.TLSEnabled != nil {
		tlsEnabled = *req.TLSEnabled
	}

	site := models.Site{
		Name:       req.Name,
		HostsJSON:  string(hostsJSON),
		ListenPort: req.ListenPort,
		AutoHTTPS:  autoHTTPS,
		TLSEnabled: tlsEnabled,
		Enabled:    true,
	}

	if site.ListenPort == 0 {
		site.ListenPort = 443
	}

	// Save to database
	result := database.GetDB().Create(&site)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(site)
	history := models.ConfigHistory{
		Action:       "create",
		ResourceType: "site",
		ResourceID:   site.ID,
		ResourceName: site.Name,
		NewState:     string(newState),
		Success:      true,
	}
	database.GetDB().Create(&history)

	// Apply to Caddy
	if err := h.syncToCaddy(); err != nil {
		c.JSON(http.StatusCreated, gin.H{
			"site":    site,
			"warning": "Site created but failed to sync to Caddy: " + err.Error(),
		})
		return
	}

	site.Hosts = req.Hosts
	c.JSON(http.StatusCreated, site)
}

// UpdateSite updates an existing site
// PUT /api/sites/:id
func (h *SiteHandler) UpdateSite(c *gin.Context) {
	id := c.Param("id")

	var site models.Site
	if result := database.GetDB().First(&site, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	// Capture previous state
	previousState, _ := json.Marshal(site)

	var req UpdateSiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		site.Name = req.Name
	}
	if req.Hosts != nil {
		hostsJSON, _ := json.Marshal(req.Hosts)
		site.HostsJSON = string(hostsJSON)
	}
	if req.ListenPort != 0 {
		site.ListenPort = req.ListenPort
	}
	if req.AutoHTTPS != nil {
		site.AutoHTTPS = *req.AutoHTTPS
	}
	if req.TLSEnabled != nil {
		site.TLSEnabled = *req.TLSEnabled
	}
	if req.Enabled != nil {
		site.Enabled = *req.Enabled
	}

	result := database.GetDB().Save(&site)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(site)
	history := models.ConfigHistory{
		Action:        "update",
		ResourceType:  "site",
		ResourceID:    site.ID,
		ResourceName:  site.Name,
		PreviousState: string(previousState),
		NewState:      string(newState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	json.Unmarshal([]byte(site.HostsJSON), &site.Hosts)
	c.JSON(http.StatusOK, site)
}

// DeleteSite deletes a site
// DELETE /api/sites/:id
// DeleteSite deletes a site
// @Summary      Delete a site
// @Description  Delete a site by ID
// @Tags         sites
// @Param        id   path      string  true  "Site ID"
// @Success      200  {object}  map[string]string
// @Router       /sites/{id} [delete]
func (h *SiteHandler) DeleteSite(c *gin.Context) {
	id := c.Param("id")

	var site models.Site
	if result := database.GetDB().First(&site, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	// Capture state before deletion
	previousState, _ := json.Marshal(site)

	// Delete associated routes first
	database.GetDB().Where("site_id = ?", id).Delete(&models.Route{})

	// Delete site
	result := database.GetDB().Delete(&site)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Remove site directory
	sitePath := filepath.Join(h.sitesPath, site.ID)
	if err := os.RemoveAll(sitePath); err != nil {
		// Just log error, don't fail the request as the DB record is gone
		// In a real logger, we would log this.
		fmt.Printf("Failed to remove site directory %s: %v\n", sitePath, err)
	}

	// Record history
	history := models.ConfigHistory{
		Action:        "delete",
		ResourceType:  "site",
		ResourceID:    site.ID,
		ResourceName:  site.Name,
		PreviousState: string(previousState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	c.JSON(http.StatusOK, gin.H{"message": "Site deleted successfully"})
}

// syncToCaddy rebuilds and applies the full configuration to Caddy
func (h *SiteHandler) syncToCaddy() error {
	// Build configuration from database
	config, err := h.configBuilder.BuildFromDB()
	if err != nil {
		return err
	}

	// Apply to Caddy
	return h.configBuilder.ApplyConfig(config)
}
