package handlers

import (
	"net/http"

	"caddyadmin/database"
	"caddyadmin/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// MiddlewareHandler handles middleware configuration endpoints
type MiddlewareHandler struct{}

// NewMiddlewareHandler creates a new middleware handler
func NewMiddlewareHandler() *MiddlewareHandler {
	return &MiddlewareHandler{}
}

// GetMiddlewareSettings retrieves middleware settings for a site
func (h *MiddlewareHandler) GetMiddlewareSettings(c *gin.Context) {
	siteID := c.Param("id")

	var settings models.MiddlewareSettings
	if err := database.DB.Where("site_id = ?", siteID).First(&settings).Error; err != nil {
		// Return default settings if none exist
		settings = models.MiddlewareSettings{
			SiteID:               siteID,
			CompressionEnabled:   false,
			CompressionTypes:     "gzip",
			CompressionLevel:     5,
			BasicAuthEnabled:     false,
			BasicAuthRealm:       "Restricted",
			AccessControlEnabled: false,
			AccessControlDefault: "allow",
		}
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateMiddlewareSettings updates middleware settings for a site
func (h *MiddlewareHandler) UpdateMiddlewareSettings(c *gin.Context) {
	siteID := c.Param("id")

	var req models.MiddlewareSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var settings models.MiddlewareSettings
	result := database.DB.Where("site_id = ?", siteID).First(&settings)
	
	if result.Error != nil {
		// Create new settings
		req.SiteID = siteID
		if err := database.DB.Create(&req).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, req)
		return
	}

	// Update existing settings
	settings.CompressionEnabled = req.CompressionEnabled
	settings.CompressionTypes = req.CompressionTypes
	settings.CompressionLevel = req.CompressionLevel
	settings.BasicAuthEnabled = req.BasicAuthEnabled
	settings.BasicAuthRealm = req.BasicAuthRealm
	settings.AccessControlEnabled = req.AccessControlEnabled
	settings.AccessControlDefault = req.AccessControlDefault

	if err := database.DB.Save(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// --- Basic Auth Users ---

// ListBasicAuthUsers lists all basic auth users for a site
func (h *MiddlewareHandler) ListBasicAuthUsers(c *gin.Context) {
	siteID := c.Param("id")

	var users []models.BasicAuthUser
	if err := database.DB.Where("site_id = ?", siteID).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Don't return password hashes
	for i := range users {
		users[i].PasswordHash = "[hidden]"
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

// CreateBasicAuthUserRequest is the request body for creating a basic auth user
type CreateBasicAuthUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Realm    string `json:"realm"`
}

// CreateBasicAuthUser creates a new basic auth user
func (h *MiddlewareHandler) CreateBasicAuthUser(c *gin.Context) {
	siteID := c.Param("id")

	var req CreateBasicAuthUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash the password with bcrypt
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.BasicAuthUser{
		SiteID:       siteID,
		Username:     req.Username,
		PasswordHash: string(hash),
		Realm:        req.Realm,
		Enabled:      true,
	}

	if user.Realm == "" {
		user.Realm = "Restricted"
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user.PasswordHash = "[hidden]"
	c.JSON(http.StatusCreated, user)
}

// DeleteBasicAuthUser deletes a basic auth user
func (h *MiddlewareHandler) DeleteBasicAuthUser(c *gin.Context) {
	id := c.Param("userId")

	if err := database.DB.Delete(&models.BasicAuthUser{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

// --- Header Rules ---

// ListHeaderRules lists all header rules for a site
func (h *MiddlewareHandler) ListHeaderRules(c *gin.Context) {
	siteID := c.Param("id")

	var rules []models.HeaderRule
	if err := database.DB.Where("site_id = ?", siteID).Order("priority").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

// CreateHeaderRuleRequest is the request body for creating a header rule
type CreateHeaderRuleRequest struct {
	Direction   string `json:"direction" binding:"required"` // request, response
	Operation   string `json:"operation" binding:"required"` // set, add, delete
	HeaderName  string `json:"header_name" binding:"required"`
	HeaderValue string `json:"header_value"`
	Priority    int    `json:"priority"`
}

// CreateHeaderRule creates a new header rule
func (h *MiddlewareHandler) CreateHeaderRule(c *gin.Context) {
	siteID := c.Param("id")

	var req CreateHeaderRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule := models.HeaderRule{
		SiteID:      siteID,
		Direction:   req.Direction,
		Operation:   req.Operation,
		HeaderName:  req.HeaderName,
		HeaderValue: req.HeaderValue,
		Priority:    req.Priority,
		Enabled:     true,
	}

	if err := database.DB.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

// DeleteHeaderRule deletes a header rule
func (h *MiddlewareHandler) DeleteHeaderRule(c *gin.Context) {
	id := c.Param("userId")

	if err := database.DB.Delete(&models.HeaderRule{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Header rule deleted"})
}

// --- Access Rules ---

// ListAccessRules lists all access rules for a site
func (h *MiddlewareHandler) ListAccessRules(c *gin.Context) {
	siteID := c.Param("id")

	var rules []models.AccessRule
	if err := database.DB.Where("site_id = ?", siteID).Order("priority").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

// CreateAccessRuleRequest is the request body for creating an access rule
type CreateAccessRuleRequest struct {
	RuleType string `json:"rule_type" binding:"required"` // allow, deny
	CIDR     string `json:"cidr" binding:"required"`
	Priority int    `json:"priority"`
}

// CreateAccessRule creates a new access rule
func (h *MiddlewareHandler) CreateAccessRule(c *gin.Context) {
	siteID := c.Param("id")

	var req CreateAccessRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule := models.AccessRule{
		SiteID:   siteID,
		RuleType: req.RuleType,
		CIDR:     req.CIDR,
		Priority: req.Priority,
		Enabled:  true,
	}

	if err := database.DB.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

// DeleteAccessRule deletes an access rule
func (h *MiddlewareHandler) DeleteAccessRule(c *gin.Context) {
	id := c.Param("userId")

	if err := database.DB.Delete(&models.AccessRule{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Access rule deleted"})
}

// --- Rewrite Rules ---

// ListRewriteRules lists all rewrite rules for a site
func (h *MiddlewareHandler) ListRewriteRules(c *gin.Context) {
	siteID := c.Param("id")

	var rules []models.RewriteRule
	if err := database.DB.Where("site_id = ?", siteID).Order("priority").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

// CreateRewriteRuleRequest is the request body for creating a rewrite rule
type CreateRewriteRuleRequest struct {
	MatchType   string `json:"match_type"`              // prefix, exact, regexp
	Pattern     string `json:"pattern" binding:"required"`
	Replacement string `json:"replacement" binding:"required"`
	StripPrefix string `json:"strip_prefix"`
	Priority    int    `json:"priority"`
}

// CreateRewriteRule creates a new rewrite rule
func (h *MiddlewareHandler) CreateRewriteRule(c *gin.Context) {
	siteID := c.Param("id")

	var req CreateRewriteRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule := models.RewriteRule{
		SiteID:      siteID,
		MatchType:   req.MatchType,
		Pattern:     req.Pattern,
		Replacement: req.Replacement,
		StripPrefix: req.StripPrefix,
		Priority:    req.Priority,
		Enabled:     true,
	}

	if rule.MatchType == "" {
		rule.MatchType = "prefix"
	}

	if err := database.DB.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

// DeleteRewriteRule deletes a rewrite rule
func (h *MiddlewareHandler) DeleteRewriteRule(c *gin.Context) {
	ruleID := c.Param("id")
	if err := database.DB.Delete(&models.RewriteRule{}, "id = ?", ruleID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rewrite rule deleted"})
}

// Redirect Rules

// ListRedirectRules returns redirect rules for a site
// @Summary      List redirect rules
// @Description  Get a list of redirect rules for a specific site
// @Tags         sites
// @Param        id   path      string  true  "Site ID"
// @Success      200  {object}  map[string][]models.RedirectRule
// @Router       /sites/{id}/redirects [get]
func (h *MiddlewareHandler) ListRedirectRules(c *gin.Context) {
	siteID := c.Param("id")
	var rules []models.RedirectRule
	if err := database.DB.Where("site_id = ?", siteID).Order("priority DESC, created_at DESC").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

// CreateRedirectRule creates a new redirect rule
// @Summary      Create redirect rule
// @Description  Create a new redirect rule for a site
// @Tags         sites
// @Param        id    path      string               true  "Site ID"
// @Param        rule  body      models.RedirectRule  true  "Rule JSON"
// @Success      201   {object}  models.RedirectRule
// @Router       /sites/{id}/redirects [post]
func (h *MiddlewareHandler) CreateRedirectRule(c *gin.Context) {
	siteID := c.Param("id")
	var rule models.RedirectRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rule.SiteID = siteID

	if err := database.DB.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rule)
}

// DeleteRedirectRule deletes a redirect rule
// @Summary      Delete redirect rule
// @Description  Delete a redirect rule by ID
// @Tags         redirects
// @Param        id   path      string  true  "Rule ID"
// @Success      200  {object}  map[string]string
// @Router       /redirects/{id} [delete]
func (h *MiddlewareHandler) DeleteRedirectRule(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.RedirectRule{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Redirect rule deleted"})
}
