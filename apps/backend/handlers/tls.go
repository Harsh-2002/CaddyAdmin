package handlers

import (
	"caddyadmin/caddy"
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// TLSHandler handles TLS/certificate-related endpoints
type TLSHandler struct {
	caddyClient *caddy.Client
}

// NewTLSHandler creates a new TLS handler
func NewTLSHandler(client *caddy.Client) *TLSHandler {
	return &TLSHandler{
		caddyClient: client,
	}
}

// CreateTLSConfigRequest represents a request to create TLS config
type CreateTLSConfigRequest struct {
	SiteID          string `json:"site_id"` // Optional - comes from URL
	AutoHTTPS       bool   `json:"auto_https"`
	ACMEEmail       string `json:"acme_email"`
	ACMEProvider    string `json:"acme_provider"`
	OnDemandTLS     bool   `json:"on_demand_tls"`
	WildcardCert    bool   `json:"wildcard_cert"`
	CustomCertPath  string `json:"custom_cert_path"`
	CustomKeyPath   string `json:"custom_key_path"`
	MinVersion      string `json:"min_version"`
	CipherSuites    string `json:"cipher_suites"`
}

// GetTLSConfig gets TLS config for a site
// GET /api/sites/:id/tls
func (h *TLSHandler) GetTLSConfig(c *gin.Context) {
	siteID := c.Param("id")

	var config models.TLSConfig
	result := database.GetDB().Where("site_id = ?", siteID).First(&config)
	if result.Error != nil {
		// Return default config if none exists
		config = models.TLSConfig{
			SiteID:       siteID,
			AutoHTTPS:    true,
			ACMEProvider: "letsencrypt",
			MinVersion:   "tls1.2",
		}
	}
	c.JSON(http.StatusOK, config)
}

// UpdateTLSConfig updates TLS config for a site
// PUT /api/sites/:id/tls
func (h *TLSHandler) UpdateTLSConfig(c *gin.Context) {
	siteID := c.Param("id")

	// Verify site exists
	var site models.Site
	if result := database.GetDB().First(&site, "id = ?", siteID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	var config models.TLSConfig
	database.GetDB().Where("site_id = ?", siteID).First(&config)

	previousState, _ := json.Marshal(config)

	var req CreateTLSConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.SiteID = siteID
	config.AutoHTTPS = req.AutoHTTPS
	config.ACMEEmail = req.ACMEEmail
	config.ACMEProvider = req.ACMEProvider
	config.OnDemandTLS = req.OnDemandTLS
	config.WildcardCert = req.WildcardCert
	config.CustomCertPath = req.CustomCertPath
	config.CustomKeyPath = req.CustomKeyPath
	config.MinVersion = req.MinVersion
	config.CipherSuites = req.CipherSuites

	if config.ACMEProvider == "" {
		config.ACMEProvider = "letsencrypt"
	}
	if config.MinVersion == "" {
		config.MinVersion = "tls1.2"
	}

	var result error
	if config.ID == "" {
		result = database.GetDB().Create(&config).Error
	} else {
		result = database.GetDB().Save(&config).Error
	}
	if result != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error()})
		return
	}

	// Record history
	newState, _ := json.Marshal(config)
	history := models.ConfigHistory{
		Action:        "update",
		ResourceType:  "tls_config",
		ResourceID:    config.ID,
		ResourceName:  site.Name + "_tls",
		PreviousState: string(previousState),
		NewState:      string(newState),
		Success:       true,
	}
	database.GetDB().Create(&history)

	c.JSON(http.StatusOK, config)
}

// GetPKICA gets PKI CA information
// GET /api/pki/ca/:id
func (h *TLSHandler) GetPKICA(c *gin.Context) {
	id := c.Param("id")
	resp, err := h.caddyClient.GetPKICA(id)
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

// GetPKICACertificates gets PKI CA certificates
// GET /api/pki/ca/:id/certificates
func (h *TLSHandler) GetPKICACertificates(c *gin.Context) {
	id := c.Param("id")
	resp, err := h.caddyClient.GetPKICACertificates(id)
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
