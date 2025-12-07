package handlers

import (
	"caddyadmin/caddy"
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// UpstreamHandler handles upstream-related endpoints
type UpstreamHandler struct {
	caddyClient   *caddy.Client
	configBuilder *caddy.ConfigBuilder
}

// NewUpstreamHandler creates a new upstream handler
func NewUpstreamHandler(client *caddy.Client) *UpstreamHandler {
	return &UpstreamHandler{
		caddyClient:   client,
		configBuilder: caddy.NewConfigBuilder(client),
	}
}

// CreateUpstreamRequest represents a request to create an upstream
type CreateUpstreamRequest struct {
	Name              string `json:"name" binding:"required"`
	Address           string `json:"address" binding:"required"`
	Scheme            string `json:"scheme"`
	Weight            int    `json:"weight"`
	MaxRequests       int    `json:"max_requests"`
	MaxConnections    int    `json:"max_connections"`
	HealthCheckPath   string `json:"health_check_path"`
	HealthCheckInterval int  `json:"health_check_interval"`
}

// CreateUpstreamGroupRequest represents a request to create an upstream group
type CreateUpstreamGroupRequest struct {
	Name          string   `json:"name" binding:"required"`
	LoadBalancing string   `json:"load_balancing"`
	TryDuration   int      `json:"try_duration"`
	TryInterval   int      `json:"try_interval"`
	HealthChecks  bool     `json:"health_checks"`
	PassiveHealth bool     `json:"passive_health"`
	Retries       int      `json:"retries"`
	UpstreamIDs   []string `json:"upstream_ids"`
}

// ListUpstreams returns all upstreams
// GET /api/upstreams
func (h *UpstreamHandler) ListUpstreams(c *gin.Context) {
	var upstreams []models.Upstream
	result := database.GetDB().Find(&upstreams)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"upstreams": upstreams})
}

// GetUpstream returns a specific upstream
// GET /api/upstreams/:id
func (h *UpstreamHandler) GetUpstream(c *gin.Context) {
	id := c.Param("id")

	var upstream models.Upstream
	result := database.GetDB().First(&upstream, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upstream not found"})
		return
	}
	c.JSON(http.StatusOK, upstream)
}

// CreateUpstream creates a new upstream
// POST /api/upstreams
func (h *UpstreamHandler) CreateUpstream(c *gin.Context) {
	var req CreateUpstreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	upstream := models.Upstream{
		Name:              req.Name,
		Address:           req.Address,
		Scheme:            req.Scheme,
		Weight:            req.Weight,
		MaxRequests:       req.MaxRequests,
		MaxConnections:    req.MaxConnections,
		HealthCheckPath:   req.HealthCheckPath,
		HealthCheckInterval: req.HealthCheckInterval,
		Healthy:           true,
		Enabled:           true,
	}

	if upstream.Scheme == "" {
		upstream.Scheme = "http"
	}
	if upstream.Weight == 0 {
		upstream.Weight = 1
	}

	result := database.GetDB().Create(&upstream)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(upstream)
	history := models.ConfigHistory{
		Action:       "create",
		ResourceType: "upstream",
		ResourceID:   upstream.ID,
		ResourceName: upstream.Name,
		NewState:     string(newState),
		Success:      true,
	}
	database.GetDB().Create(&history)

	c.JSON(http.StatusCreated, upstream)
}

// UpdateUpstream updates an existing upstream
// PUT /api/upstreams/:id
func (h *UpstreamHandler) UpdateUpstream(c *gin.Context) {
	id := c.Param("id")

	var upstream models.Upstream
	if result := database.GetDB().First(&upstream, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upstream not found"})
		return
	}

	previousState, _ := json.Marshal(upstream)

	if err := c.ShouldBindJSON(&upstream); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := database.GetDB().Save(&upstream)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(upstream)
	history := models.ConfigHistory{
		Action:        "update",
		ResourceType:  "upstream",
		ResourceID:    upstream.ID,
		ResourceName:  upstream.Name,
		PreviousState: string(previousState),
		NewState:      string(newState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	c.JSON(http.StatusOK, upstream)
}

// DeleteUpstream deletes an upstream
// DELETE /api/upstreams/:id
func (h *UpstreamHandler) DeleteUpstream(c *gin.Context) {
	id := c.Param("id")

	var upstream models.Upstream
	if result := database.GetDB().First(&upstream, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upstream not found"})
		return
	}

	previousState, _ := json.Marshal(upstream)

	result := database.GetDB().Delete(&upstream)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	history := models.ConfigHistory{
		Action:        "delete",
		ResourceType:  "upstream",
		ResourceID:    upstream.ID,
		ResourceName:  upstream.Name,
		PreviousState: string(previousState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	c.JSON(http.StatusOK, gin.H{"message": "Upstream deleted successfully"})
}

// ListUpstreamGroups returns all upstream groups
// GET /api/upstream-groups
func (h *UpstreamHandler) ListUpstreamGroups(c *gin.Context) {
	var groups []models.UpstreamGroup
	result := database.GetDB().Preload("Upstreams").Find(&groups)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"upstream_groups": groups})
}

// GetUpstreamGroup returns a specific upstream group
// GET /api/upstream-groups/:id
func (h *UpstreamHandler) GetUpstreamGroup(c *gin.Context) {
	id := c.Param("id")

	var group models.UpstreamGroup
	result := database.GetDB().Preload("Upstreams").First(&group, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upstream group not found"})
		return
	}
	c.JSON(http.StatusOK, group)
}

// CreateUpstreamGroup creates a new upstream group
// POST /api/upstream-groups
func (h *UpstreamHandler) CreateUpstreamGroup(c *gin.Context) {
	var req CreateUpstreamGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group := models.UpstreamGroup{
		Name:          req.Name,
		LoadBalancing: req.LoadBalancing,
		TryDuration:   req.TryDuration,
		TryInterval:   req.TryInterval,
		HealthChecks:  req.HealthChecks,
		PassiveHealth: req.PassiveHealth,
		Retries:       req.Retries,
	}

	if group.LoadBalancing == "" {
		group.LoadBalancing = "round_robin"
	}
	if group.TryInterval == 0 {
		group.TryInterval = 250
	}
	if group.Retries == 0 {
		group.Retries = 3
	}

	result := database.GetDB().Create(&group)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Add upstreams to group
	if len(req.UpstreamIDs) > 0 {
		var upstreams []models.Upstream
		database.GetDB().Where("id IN ?", req.UpstreamIDs).Find(&upstreams)
		database.GetDB().Model(&group).Association("Upstreams").Append(&upstreams)
	}

	// Record history
	newState, _ := json.Marshal(group)
	history := models.ConfigHistory{
		Action:       "create",
		ResourceType: "upstream_group",
		ResourceID:   group.ID,
		ResourceName: group.Name,
		NewState:     string(newState),
		Success:      true,
	}
	database.GetDB().Create(&history)

	c.JSON(http.StatusCreated, group)
}

// UpdateUpstreamGroup updates an upstream group
// PUT /api/upstream-groups/:id
func (h *UpstreamHandler) UpdateUpstreamGroup(c *gin.Context) {
	id := c.Param("id")

	var group models.UpstreamGroup
	if result := database.GetDB().First(&group, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upstream group not found"})
		return
	}

	previousState, _ := json.Marshal(group)

	var req CreateUpstreamGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group.Name = req.Name
	group.LoadBalancing = req.LoadBalancing
	group.TryDuration = req.TryDuration
	group.TryInterval = req.TryInterval
	group.HealthChecks = req.HealthChecks
	group.PassiveHealth = req.PassiveHealth
	group.Retries = req.Retries

	result := database.GetDB().Save(&group)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Update upstreams association
	if len(req.UpstreamIDs) > 0 {
		database.GetDB().Model(&group).Association("Upstreams").Clear()
		var upstreams []models.Upstream
		database.GetDB().Where("id IN ?", req.UpstreamIDs).Find(&upstreams)
		database.GetDB().Model(&group).Association("Upstreams").Append(&upstreams)
	}

	// Record history
	newState, _ := json.Marshal(group)
	history := models.ConfigHistory{
		Action:        "update",
		ResourceType:  "upstream_group",
		ResourceID:    group.ID,
		ResourceName:  group.Name,
		PreviousState: string(previousState),
		NewState:      string(newState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	c.JSON(http.StatusOK, group)
}

// DeleteUpstreamGroup deletes an upstream group
// DELETE /api/upstream-groups/:id
func (h *UpstreamHandler) DeleteUpstreamGroup(c *gin.Context) {
	id := c.Param("id")

	var group models.UpstreamGroup
	if result := database.GetDB().First(&group, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upstream group not found"})
		return
	}

	previousState, _ := json.Marshal(group)

	// Clear associations
	database.GetDB().Model(&group).Association("Upstreams").Clear()

	result := database.GetDB().Delete(&group)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	history := models.ConfigHistory{
		Action:        "delete",
		ResourceType:  "upstream_group",
		ResourceID:    group.ID,
		ResourceName:  group.Name,
		PreviousState: string(previousState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	c.JSON(http.StatusOK, gin.H{"message": "Upstream group deleted successfully"})
}

// GetUpstreamStatus returns the current status of upstreams from Caddy
// GET /api/upstreams/status
func (h *UpstreamHandler) GetUpstreamStatus(c *gin.Context) {
	status, err := h.caddyClient.GetUpstreams()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"upstreams": status})
}

// syncToCaddy rebuilds and applies configuration to Caddy
func (h *UpstreamHandler) syncToCaddy() error {
	// Build configuration from database
	config, err := h.configBuilder.BuildFromDB()
	if err != nil {
		return err
	}

	return h.configBuilder.ApplyConfig(config)
}
