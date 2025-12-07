package handlers

import (
	"caddyadmin/caddy"
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RouteHandler handles route-related endpoints
type RouteHandler struct {
	caddyClient   *caddy.Client
	configBuilder *caddy.ConfigBuilder
}

// NewRouteHandler creates a new route handler
func NewRouteHandler(client *caddy.Client) *RouteHandler {
	return &RouteHandler{
		caddyClient:   client,
		configBuilder: caddy.NewConfigBuilder(client),
	}
}

// CreateRouteRequest represents a request to create a route
type CreateRouteRequest struct {
	Name          string   `json:"name"`
	PathMatcher   string   `json:"path_matcher" binding:"required"`
	MatchType     string   `json:"match_type"`
	Methods       []string `json:"methods"`
	HandlerType   string   `json:"handler_type" binding:"required"`
	HandlerConfig string   `json:"handler_config"`
	Order         int      `json:"order"`
}

// UpdateRouteRequest represents a request to update a route
type UpdateRouteRequest struct {
	Name          string   `json:"name"`
	PathMatcher   string   `json:"path_matcher"`
	MatchType     string   `json:"match_type"`
	Methods       []string `json:"methods"`
	HandlerType   string   `json:"handler_type"`
	HandlerConfig string   `json:"handler_config"`
	Order         *int     `json:"order"`
	Enabled       *bool    `json:"enabled"`
}

// ListRoutes returns all routes for a site
// GET /api/sites/:id/routes
func (h *RouteHandler) ListRoutes(c *gin.Context) {
	siteID := c.Param("id")

	// Verify site exists
	var site models.Site
	if result := database.GetDB().First(&site, "id = ?", siteID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	var routes []models.Route
	result := database.GetDB().Where("site_id = ?", siteID).Order("`order` ASC").Find(&routes)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Parse methods JSON
	for i := range routes {
		if routes[i].MethodsJSON != "" {
			json.Unmarshal([]byte(routes[i].MethodsJSON), &routes[i].Methods)
		}
	}

	c.JSON(http.StatusOK, gin.H{"routes": routes})
}

// GetRoute returns a specific route
// GET /api/routes/:id
func (h *RouteHandler) GetRoute(c *gin.Context) {
	id := c.Param("id")

	var route models.Route
	result := database.GetDB().First(&route, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
		return
	}

	if route.MethodsJSON != "" {
		json.Unmarshal([]byte(route.MethodsJSON), &route.Methods)
	}

	c.JSON(http.StatusOK, route)
}

// CreateRoute creates a new route for a site
// POST /api/sites/:id/routes
func (h *RouteHandler) CreateRoute(c *gin.Context) {
	siteID := c.Param("id")

	// Verify site exists
	var site models.Site
	if result := database.GetDB().First(&site, "id = ?", siteID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	var req CreateRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	methodsJSON, _ := json.Marshal(req.Methods)
	
	route := models.Route{
		SiteID:        siteID,
		Name:          req.Name,
		PathMatcher:   req.PathMatcher,
		MatchType:     req.MatchType,
		MethodsJSON:   string(methodsJSON),
		HandlerType:   req.HandlerType,
		HandlerConfig: req.HandlerConfig,
		Order:         req.Order,
		Enabled:       true,
	}

	if route.MatchType == "" {
		route.MatchType = "path"
	}

	result := database.GetDB().Create(&route)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(route)
	history := models.ConfigHistory{
		Action:       "create",
		ResourceType: "route",
		ResourceID:   route.ID,
		ResourceName: route.Name,
		NewState:     string(newState),
		Success:      true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	route.Methods = req.Methods
	c.JSON(http.StatusCreated, route)
}

// UpdateRoute updates an existing route
// PUT /api/routes/:id
func (h *RouteHandler) UpdateRoute(c *gin.Context) {
	id := c.Param("id")

	var route models.Route
	if result := database.GetDB().First(&route, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
		return
	}

	previousState, _ := json.Marshal(route)

	var req UpdateRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		route.Name = req.Name
	}
	if req.PathMatcher != "" {
		route.PathMatcher = req.PathMatcher
	}
	if req.MatchType != "" {
		route.MatchType = req.MatchType
	}
	if req.Methods != nil {
		methodsJSON, _ := json.Marshal(req.Methods)
		route.MethodsJSON = string(methodsJSON)
	}
	if req.HandlerType != "" {
		route.HandlerType = req.HandlerType
	}
	if req.HandlerConfig != "" {
		route.HandlerConfig = req.HandlerConfig
	}
	if req.Order != nil {
		route.Order = *req.Order
	}
	if req.Enabled != nil {
		route.Enabled = *req.Enabled
	}

	result := database.GetDB().Save(&route)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(route)
	history := models.ConfigHistory{
		Action:        "update",
		ResourceType:  "route",
		ResourceID:    route.ID,
		ResourceName:  route.Name,
		PreviousState: string(previousState),
		NewState:      string(newState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	json.Unmarshal([]byte(route.MethodsJSON), &route.Methods)
	c.JSON(http.StatusOK, route)
}

// DeleteRoute deletes a route
// DELETE /api/routes/:id
func (h *RouteHandler) DeleteRoute(c *gin.Context) {
	id := c.Param("id")

	var route models.Route
	if result := database.GetDB().First(&route, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
		return
	}

	previousState, _ := json.Marshal(route)

	result := database.GetDB().Delete(&route)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Record history
	history := models.ConfigHistory{
		Action:        "delete",
		ResourceType:  "route",
		ResourceID:    route.ID,
		ResourceName:  route.Name,
		PreviousState: string(previousState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	// Sync to Caddy
	h.syncToCaddy()

	c.JSON(http.StatusOK, gin.H{"message": "Route deleted successfully"})
}

// syncToCaddy is similar to the one in sites.go
func (h *RouteHandler) syncToCaddy() error {
	// Build configuration from database
	config, err := h.configBuilder.BuildFromDB()
	if err != nil {
		return err
	}

	return h.configBuilder.ApplyConfig(config)
}
