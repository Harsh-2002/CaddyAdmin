package handlers

import (
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// DNSProviderHandler handles DNS provider endpoints
type DNSProviderHandler struct{}

// NewDNSProviderHandler creates a new DNS provider handler
func NewDNSProviderHandler() *DNSProviderHandler {
	return &DNSProviderHandler{}
}

// DNSProviderType represents a supported DNS provider type
type DNSProviderType struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Module       string   `json:"module"`
	Fields       []Field  `json:"fields"`
}

// Field represents a credential field for a DNS provider
type Field struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Type        string `json:"type"` // text, password
	Required    bool   `json:"required"`
	Placeholder string `json:"placeholder"`
}

// GetProviderTypes returns all supported DNS provider types
// @Summary      List supported DNS provider types
// @Description  Get a list of all supported DNS provider types and their required fields
// @Tags         dns-providers
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string][]DNSProviderType
// @Router       /dns-providers/types [get]
func (h *DNSProviderHandler) GetProviderTypes(c *gin.Context) {
	types := []DNSProviderType{
		{
			ID:     "cloudflare",
			Name:   "Cloudflare",
			Module: "github.com/caddy-dns/cloudflare",
			Fields: []Field{
				{Name: "api_token", Label: "API Token", Type: "password", Required: true, Placeholder: "Your Cloudflare API Token"},
			},
		},
		{
			ID:     "route53",
			Name:   "Amazon Route53",
			Module: "github.com/caddy-dns/route53",
			Fields: []Field{
				{Name: "access_key_id", Label: "Access Key ID", Type: "text", Required: true, Placeholder: "AKIAIOSFODNN7EXAMPLE"},
				{Name: "secret_access_key", Label: "Secret Access Key", Type: "password", Required: true, Placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"},
				{Name: "region", Label: "Region", Type: "text", Required: false, Placeholder: "us-east-1"},
			},
		},
		{
			ID:     "digitalocean",
			Name:   "DigitalOcean",
			Module: "github.com/caddy-dns/digitalocean",
			Fields: []Field{
				{Name: "api_token", Label: "API Token", Type: "password", Required: true, Placeholder: "Your DigitalOcean API Token"},
			},
		},
		{
			ID:     "hetzner",
			Name:   "Hetzner",
			Module: "github.com/caddy-dns/hetzner",
			Fields: []Field{
				{Name: "api_token", Label: "API Token", Type: "password", Required: true, Placeholder: "Your Hetzner API Token"},
			},
		},
		{
			ID:     "godaddy",
			Name:   "GoDaddy",
			Module: "github.com/caddy-dns/godaddy",
			Fields: []Field{
				{Name: "api_key", Label: "API Key", Type: "password", Required: true, Placeholder: "Your GoDaddy API Key"},
				{Name: "api_secret", Label: "API Secret", Type: "password", Required: true, Placeholder: "Your GoDaddy API Secret"},
			},
		},
		{
			ID:     "namecheap",
			Name:   "Namecheap",
			Module: "github.com/caddy-dns/namecheap",
			Fields: []Field{
				{Name: "api_user", Label: "API User", Type: "text", Required: true, Placeholder: "Your Namecheap Username"},
				{Name: "api_key", Label: "API Key", Type: "password", Required: true, Placeholder: "Your Namecheap API Key"},
			},
		},
		{
			ID:     "linode",
			Name:   "Linode",
			Module: "github.com/caddy-dns/linode",
			Fields: []Field{
				{Name: "api_token", Label: "API Token", Type: "password", Required: true, Placeholder: "Your Linode API Token"},
			},
		},
		{
			ID:     "vultr",
			Name:   "Vultr",
			Module: "github.com/caddy-dns/vultr",
			Fields: []Field{
				{Name: "api_token", Label: "API Token", Type: "password", Required: true, Placeholder: "Your Vultr API Token"},
			},
		},
		{
			ID:     "netlify",
			Name:   "Netlify",
			Module: "github.com/caddy-dns/netlify",
			Fields: []Field{
				{Name: "api_token", Label: "Personal Access Token", Type: "password", Required: true, Placeholder: "Your Netlify Token"},
			},
		},
		{
			ID:     "duckdns",
			Name:   "DuckDNS",
			Module: "github.com/caddy-dns/duckdns",
			Fields: []Field{
				{Name: "api_token", Label: "Token", Type: "password", Required: true, Placeholder: "Your DuckDNS Token"},
			},
		},
		{
			ID:     "acmedns",
			Name:   "ACME-DNS",
			Module: "github.com/caddy-dns/acmedns",
			Fields: []Field{
				{Name: "server_url", Label: "Server URL", Type: "text", Required: true, Placeholder: "https://auth.acme-dns.io"},
				{Name: "username", Label: "Username", Type: "text", Required: true, Placeholder: "Username"},
				{Name: "password", Label: "Password", Type: "password", Required: true, Placeholder: "Password"},
				{Name: "subdomain", Label: "Subdomain", Type: "text", Required: true, Placeholder: "Subdomain"},
			},
		},
		{
			ID:     "powerdns",
			Name:   "PowerDNS",
			Module: "github.com/caddy-dns/powerdns",
			Fields: []Field{
				{Name: "server_url", Label: "Server URL", Type: "text", Required: true, Placeholder: "http://localhost:8081"},
				{Name: "api_key", Label: "API Key", Type: "password", Required: true, Placeholder: "Your PowerDNS API Key"},
			},
		},
		{
			ID:     "ionos",
			Name:   "IONOS",
			Module: "github.com/caddy-dns/ionos",
			Fields: []Field{
				{Name: "api_key", Label: "API Key", Type: "password", Required: true, Placeholder: "publicprefix.secret"},
			},
		},
		{
			ID:     "alidns",
			Name:   "Alibaba Cloud DNS",
			Module: "github.com/caddy-dns/alidns",
			Fields: []Field{
				{Name: "access_key_id", Label: "Access Key ID", Type: "text", Required: true, Placeholder: "Your Access Key ID"},
				{Name: "access_key_secret", Label: "Access Key Secret", Type: "password", Required: true, Placeholder: "Your Access Key Secret"},
			},
		},
		{
			ID:     "tencentcloud",
			Name:   "Tencent Cloud",
			Module: "github.com/caddy-dns/tencentcloud",
			Fields: []Field{
				{Name: "secret_id", Label: "Secret ID", Type: "text", Required: true, Placeholder: "Your Secret ID"},
				{Name: "secret_key", Label: "Secret Key", Type: "password", Required: true, Placeholder: "Your Secret Key"},
			},
		},
		{
			ID:     "huaweicloud",
			Name:   "Huawei Cloud",
			Module: "github.com/caddy-dns/huaweicloud",
			Fields: []Field{
				{Name: "access_key_id", Label: "Access Key ID", Type: "text", Required: true, Placeholder: "Your Access Key ID"},
				{Name: "secret_access_key", Label: "Secret Access Key", Type: "password", Required: true, Placeholder: "Your Secret Access Key"},
				{Name: "region", Label: "Region", Type: "text", Required: true, Placeholder: "cn-north-1"},
			},
		},
		// Add more as needed
	}

	c.JSON(http.StatusOK, gin.H{"types": types})
}

// ListDNSProviders returns all configured DNS providers
// @Summary      List DNS providers
// @Description  Get a list of all configured DNS providers
// @Tags         dns-providers
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string][]models.DNSProvider
// @Router       /dns-providers [get]
func (h *DNSProviderHandler) ListDNSProviders(c *gin.Context) {
	var providers []models.DNSProvider
	result := database.GetDB().Order("created_at DESC").Find(&providers)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"providers": providers})
}

// GetDNSProvider returns a specific DNS provider
// @Summary      Get a DNS provider
// @Description  Get details of a specific DNS provider
// @Tags         dns-providers
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "DNS Provider ID"
// @Success      200  {object}  models.DNSProvider
// @Router       /dns-providers/{id} [get]
func (h *DNSProviderHandler) GetDNSProvider(c *gin.Context) {
	id := c.Param("id")

	var provider models.DNSProvider
	result := database.GetDB().First(&provider, "id = ?", id)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "DNS provider not found"})
		return
	}

	c.JSON(http.StatusOK, provider)
}

// CreateDNSProviderRequest represents a request to create a DNS provider
type CreateDNSProviderRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Provider    string                 `json:"provider" binding:"required"`
	Credentials map[string]interface{} `json:"credentials" binding:"required"`
	IsDefault   bool                   `json:"is_default"`
}

// CreateDNSProvider creates a new DNS provider
// @Summary      Create a DNS provider
// @Description  Create a new DNS provider configuration
// @Tags         dns-providers
// @Accept       json
// @Produce      json
// @Param        provider  body      CreateDNSProviderRequest  true  "DNS Provider Data"
// @Success      201       {object}  models.DNSProvider
// @Router       /dns-providers [post]
func (h *DNSProviderHandler) CreateDNSProvider(c *gin.Context) {
	var req CreateDNSProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Serialize credentials to JSON
	credentialsJSON, err := json.Marshal(req.Credentials)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credentials format"})
		return
	}

	// If setting as default, unset other defaults
	if req.IsDefault {
		database.GetDB().Model(&models.DNSProvider{}).Where("is_default = ?", true).Update("is_default", false)
	}

	provider := models.DNSProvider{
		Name:        req.Name,
		Provider:    req.Provider,
		Credentials: string(credentialsJSON),
		IsDefault:   req.IsDefault,
		Enabled:     true,
	}

	result := database.GetDB().Create(&provider)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, provider)
}

// UpdateDNSProviderRequest represents a request to update a DNS provider
type UpdateDNSProviderRequest struct {
	Name        string                 `json:"name"`
	Credentials map[string]interface{} `json:"credentials"`
	IsDefault   *bool                  `json:"is_default"`
	Enabled     *bool                  `json:"enabled"`
}

// UpdateDNSProvider updates an existing DNS provider
// @Summary      Update a DNS provider
// @Description  Update details of a specific DNS provider
// @Tags         dns-providers
// @Accept       json
// @Produce      json
// @Param        id        path      string                    true  "DNS Provider ID"
// @Param        provider  body      UpdateDNSProviderRequest  true  "DNS Provider Update Data"
// @Success      200       {object}  models.DNSProvider
// @Router       /dns-providers/{id} [put]
func (h *DNSProviderHandler) UpdateDNSProvider(c *gin.Context) {
	id := c.Param("id")

	var provider models.DNSProvider
	if result := database.GetDB().First(&provider, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "DNS provider not found"})
		return
	}

	var req UpdateDNSProviderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		provider.Name = req.Name
	}

	if req.Credentials != nil {
		credentialsJSON, err := json.Marshal(req.Credentials)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credentials format"})
			return
		}
		provider.Credentials = string(credentialsJSON)
	}

	if req.IsDefault != nil {
		if *req.IsDefault {
			database.GetDB().Model(&models.DNSProvider{}).Where("is_default = ? AND id != ?", true, id).Update("is_default", false)
		}
		provider.IsDefault = *req.IsDefault
	}

	if req.Enabled != nil {
		provider.Enabled = *req.Enabled
	}

	result := database.GetDB().Save(&provider)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, provider)
}

// DeleteDNSProvider deletes a DNS provider
// @Summary      Delete a DNS provider
// @Description  Delete a specific DNS provider
// @Tags         dns-providers
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "DNS Provider ID"
// @Success      200  {object}  map[string]string
// @Router       /dns-providers/{id} [delete]
func (h *DNSProviderHandler) DeleteDNSProvider(c *gin.Context) {
	id := c.Param("id")

	var provider models.DNSProvider
	if result := database.GetDB().First(&provider, "id = ?", id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "DNS provider not found"})
		return
	}

	result := database.GetDB().Delete(&provider)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "DNS provider deleted successfully"})
}
