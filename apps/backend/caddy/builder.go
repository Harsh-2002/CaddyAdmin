package caddy

import (
	"caddyadmin/database"
	"caddyadmin/models"
	"encoding/json"
	"fmt"
	"strings"
)

// ConfigBuilder helps construct Caddy JSON configurations
type ConfigBuilder struct {
	client *Client
}

// NewConfigBuilder creates a new configuration builder
func NewConfigBuilder(client *Client) *ConfigBuilder {
	return &ConfigBuilder{client: client}
}

// CaddyConfig represents the full Caddy configuration structure
type CaddyConfig struct {
	Admin   *AdminConfig           `json:"admin,omitempty"`
	Logging *LoggingConfig         `json:"logging,omitempty"`
	Apps    map[string]interface{} `json:"apps,omitempty"`
}

// LoggingConfig represents global logging configuration
type LoggingConfig struct {
	Logs map[string]*LogConfig `json:"logs,omitempty"`
}

// LogConfig represents a specific logger configuration
type LogConfig struct {
	Level string `json:"level,omitempty"`
}

// AdminConfig represents Caddy admin configuration
type AdminConfig struct {
	Listen string `json:"listen,omitempty"`
}

// HTTPApp represents the HTTP app configuration
type HTTPApp struct {
	HTTPPort    int                    `json:"http_port,omitempty"`
	HTTPSPort   int                    `json:"https_port,omitempty"`
	GracePeriod string                 `json:"grace_period,omitempty"`
	Servers     map[string]*HTTPServer `json:"servers,omitempty"`
}

// HTTPServer represents an HTTP server configuration
type HTTPServer struct {
	Listen            []string        `json:"listen,omitempty"`
	Routes            []Route         `json:"routes,omitempty"`
	AutoHTTPS         *AutoHTTPSConfig `json:"automatic_https,omitempty"`
	TLSConnectionPolicies []interface{} `json:"tls_connection_policies,omitempty"`
	Logs              *ServerLogs     `json:"logs,omitempty"`
}

// AutoHTTPSConfig represents automatic HTTPS configuration
type AutoHTTPSConfig struct {
	Disable           bool     `json:"disable,omitempty"`
	DisableRedir      bool     `json:"disable_redirects,omitempty"`
	DisableCerts      bool     `json:"disable_certificates,omitempty"`
	IgnoreLoadedCerts bool     `json:"ignore_loaded_certificates,omitempty"`
	Skip              []string `json:"skip,omitempty"`
	SkipCerts         []string `json:"skip_certificates,omitempty"`
}

// ServerLogs represents server logging configuration
type ServerLogs struct {
	DefaultLoggerName string            `json:"default_logger_name,omitempty"`
	LoggerNames       map[string]string `json:"logger_names,omitempty"`
}

// Route represents a Caddy route
type Route struct {
	ID       string    `json:"@id,omitempty"`
	Group    string    `json:"group,omitempty"`
	Match    []Match   `json:"match,omitempty"`
	Handle   []Handler `json:"handle,omitempty"`
	Terminal bool      `json:"terminal,omitempty"`
}

// Match represents route matching criteria
type Match struct {
	Host   []string `json:"host,omitempty"`
	Path   []string `json:"path,omitempty"`
	Method []string `json:"method,omitempty"`
}

// Handler represents a route handler
type Handler struct {
	Handler   string      `json:"handler"`
	Body      string      `json:"body,omitempty"`      // for static_response
	Root      string      `json:"root,omitempty"`      // for file_server
	Browse    interface{} `json:"browse,omitempty"`    // for file_server
	Upstreams []Upstream  `json:"upstreams,omitempty"` // for reverse_proxy
	Transport interface{} `json:"transport,omitempty"` // for reverse_proxy
	LoadBalancing interface{} `json:"load_balancing,omitempty"` // for reverse_proxy
	HealthChecks interface{} `json:"health_checks,omitempty"` // for reverse_proxy
	Headers   *Headers    `json:"headers,omitempty"`   // for headers handler
	StatusCode int        `json:"status_code,omitempty"` // for static_response
}

// Upstream represents a reverse proxy upstream
type Upstream struct {
	Dial        string `json:"dial"`
	MaxRequests int    `json:"max_requests,omitempty"`
}

// Headers represents header manipulation
type Headers struct {
	Request  *HeaderOps `json:"request,omitempty"`
	Response *HeaderOps `json:"response,omitempty"`
}

// HeaderOps represents header operations
type HeaderOps struct {
	Set    map[string][]string `json:"set,omitempty"`
	Add    map[string][]string `json:"add,omitempty"`
	Delete []string            `json:"delete,omitempty"`
}

// BuildSiteConfig builds Caddy configuration for a site with its routes
func (cb *ConfigBuilder) BuildSiteConfig(site *models.Site, routes []models.Route, redirectRules []models.RedirectRule, upstreamGroups map[string]*models.UpstreamGroup, upstreams map[string][]models.Upstream) (*HTTPServer, error) {
	server := &HTTPServer{
		Listen: []string{fmt.Sprintf(":%d", site.ListenPort)},
		Routes: []Route{},
	}

	// Configure auto HTTPS
	if !site.AutoHTTPS {
		server.AutoHTTPS = &AutoHTTPSConfig{Disable: true}
	}

	// Build routes from model
	var hosts []string
	if err := json.Unmarshal([]byte(site.HostsJSON), &hosts); err == nil {
		site.Hosts = hosts
	}

	// 1. Redirect Rules (Priority High)
	for _, rule := range redirectRules {
		if !rule.Enabled {
			continue
		}

		caddyRoute := Route{
			ID:       fmt.Sprintf("redirect_%s", rule.ID),
			Terminal: true, // Redirects are terminal usually
		}

		// Matcher
		match := Match{}
		if len(site.Hosts) > 0 {
			match.Host = site.Hosts
		}
		match.Path = []string{rule.Source}
		caddyRoute.Match = []Match{match}

		// Handler
		handler := Handler{
			Handler: "static_response",
			Headers: &Headers{
				Response: &HeaderOps{
					Set: map[string][]string{"Location": {rule.Destination}},
				},
			},
			StatusCode: rule.Code,
		}
		caddyRoute.Handle = []Handler{handler}
		server.Routes = append(server.Routes, caddyRoute)
	}

	// 2. Standard Routes
	for _, route := range routes {
		if !route.Enabled {
			continue
		}

		caddyRoute := Route{
			ID:       fmt.Sprintf("route_%s", route.ID),
			Terminal: true,
		}

		// Build matchers
		match := Match{}
		if len(site.Hosts) > 0 {
			match.Host = site.Hosts
		}
		if route.PathMatcher != "" {
			pathMatch := route.PathMatcher
			// For file_server, use wildcard matching so all files are served
			if route.HandlerType == "file_server" && (pathMatch == "/" || pathMatch == "") {
				pathMatch = "/*"
			}
			match.Path = []string{pathMatch}
		} else if route.HandlerType == "file_server" {
			// Default to wildcard for file_server with no path specified
			match.Path = []string{"/*"}
		}
		
		// Parse methods
		if route.MethodsJSON != "" {
			var methods []string
			if err := json.Unmarshal([]byte(route.MethodsJSON), &methods); err == nil && len(methods) > 0 {
				match.Method = methods
			}
		}
		
		caddyRoute.Match = []Match{match}

		// Build handler based on type
		handler, err := cb.buildHandler(route, upstreamGroups, upstreams)
		if err != nil {
			return nil, err
		}
		caddyRoute.Handle = []Handler{handler}

		server.Routes = append(server.Routes, caddyRoute)
	}

	return server, nil
}

// buildHandler creates a Caddy handler from a route model
func (cb *ConfigBuilder) buildHandler(route models.Route, upstreamGroups map[string]*models.UpstreamGroup, upstreams map[string][]models.Upstream) (Handler, error) {
	handler := Handler{
		Handler: route.HandlerType,
	}

	// Parse handler config
	var config map[string]interface{}
	if route.HandlerConfig != "" {
		if err := json.Unmarshal([]byte(route.HandlerConfig), &config); err != nil {
			return handler, err
		}
	}

	switch route.HandlerType {
	case "static_response":
		if body, ok := config["body"].(string); ok {
			handler.Body = body
		}
		if statusCode, ok := config["status_code"].(float64); ok {
			handler.StatusCode = int(statusCode)
		}

	case "file_server":
		if root, ok := config["root"].(string); ok {
			handler.Root = root
		}
		if browse, ok := config["browse"].(bool); ok && browse {
			handler.Browse = struct{}{}
		}

	case "reverse_proxy":
		// Get upstream group or direct upstreams
		if groupName, ok := config["upstream_group"].(string); ok {
			if group, exists := upstreamGroups[groupName]; exists {
				if groupUpstreams, exists := upstreams[groupName]; exists {
					for _, u := range groupUpstreams {
						if u.Enabled {
							handler.Upstreams = append(handler.Upstreams, Upstream{
								Dial:        u.Address,
								MaxRequests: u.MaxRequests,
							})
						}
					}
				}
				
				// Set load balancing policy
				if group.LoadBalancing != "" {
					handler.LoadBalancing = map[string]interface{}{
						"selection_policy": map[string]interface{}{
							"policy": group.LoadBalancing,
						},
					}
				}
			}
		} else if upstreamAddrs, ok := config["upstreams"].([]interface{}); ok {
			for _, addr := range upstreamAddrs {
				if a, ok := addr.(string); ok {
					handler.Upstreams = append(handler.Upstreams, Upstream{Dial: a})
				}
			}
		}

		// Transport configuration
		if transport, ok := config["transport"].(map[string]interface{}); ok {
			handler.Transport = transport
		}

	case "redirect":
		handler.Handler = "static_response"
		if location, ok := config["location"].(string); ok {
			handler.Headers = &Headers{
				Response: &HeaderOps{
					Set: map[string][]string{"Location": {location}},
				},
			}
		}
		if statusCode, ok := config["status_code"].(float64); ok {
			handler.StatusCode = int(statusCode)
		} else {
			handler.StatusCode = 302
		}
	}

	return handler, nil
}

// TLSApp represents the TLS app configuration
type TLSApp struct {
	Certificates map[string]interface{} `json:"certificates,omitempty"`
	Automation   *TLSAutomation         `json:"automation,omitempty"`
}

type TLSAutomation struct {
	Policies []TLSPolicy `json:"policies,omitempty"`
}

type TLSPolicy struct {
	Subjects []string      `json:"subjects,omitempty"`
	Issuers  []interface{} `json:"issuers,omitempty"`
}

// PEMCertKeyPair represents a certificate key pair for load_pem
type PEMCertKeyPair struct {
	Certificate string   `json:"certificate"`
	Key         string   `json:"key"`
	Tags        []string `json:"tags,omitempty"`
}

// BuildFullConfig builds the complete Caddy configuration from database models
func (cb *ConfigBuilder) BuildFullConfig(sites []models.Site, routes map[string][]models.Route, redirectRules map[string][]models.RedirectRule, upstreamGroups map[string]*models.UpstreamGroup, upstreams map[string][]models.Upstream, certificates []models.CustomCertificate, settings *models.GlobalSettings, tlsConfigs map[string]models.TLSConfig, dnsProviders map[string]models.DNSProvider) (*CaddyConfig, error) {
	config := &CaddyConfig{
		Apps: make(map[string]interface{}),
	}

	httpApp := &HTTPApp{
		Servers: make(map[string]*HTTPServer),
	}

	// TLS App configuration
	tlsApp := TLSApp{
		Certificates: make(map[string]interface{}),
	}

	// 1. Custom Certificates
	if len(certificates) > 0 {
		
		var pemLoader []PEMCertKeyPair
		for _, cert := range certificates {
			pemLoader = append(pemLoader, PEMCertKeyPair{
				Certificate: cert.CertPEM,
				Key:         cert.KeyPEM,
				Tags:        []string{cert.Name}, // Use name as tag for easier debugging
			})
		}
		
		tlsApp.Certificates["load_pem"] = pemLoader
	}

	// 2. DNS Automation Policies
	var policies []TLSPolicy
	for _, site := range sites {
		tlsConfig, ok := tlsConfigs[site.ID]
		if !ok || !tlsConfig.WildcardCert || tlsConfig.DNSProviderID == "" {
			continue
		}

		// Find DNS Provider
		provider, ok := dnsProviders[tlsConfig.DNSProviderID]
		if !ok {
			continue
		}

		// Parse Credentials
		var creds map[string]interface{}
		if err := json.Unmarshal([]byte(provider.Credentials), &creds); err != nil {
			fmt.Printf("Error parsing credentials for provider %s: %v\n", provider.Name, err)
			continue
		}

		// Construct Provider Config
		providerConfig := map[string]interface{}{
			"name": provider.Provider,
		}
		// Merge credentials into provider config
		for k, v := range creds {
			providerConfig[k] = v
		}

		// Create Policy
		policy := TLSPolicy{
			Subjects: site.Hosts, // Apply to all hosts in site (should include *.domain)
			Issuers: []interface{}{
				map[string]interface{}{
					"module": "acme",
					"challenges": map[string]interface{}{
						"dns": map[string]interface{}{
							"provider": providerConfig,
						},
					},
				},
				map[string]interface{}{
					"module": "zerossl",
					"challenges": map[string]interface{}{
						"dns": map[string]interface{}{
							"provider": providerConfig,
						},
					},
				},
			},
		}
		policies = append(policies, policy)
	}

	if len(policies) > 0 {
		tlsApp.Automation = &TLSAutomation{
			Policies: policies,
		}
	}
	
	if len(tlsApp.Certificates) > 0 || tlsApp.Automation != nil {
		config.Apps["tls"] = tlsApp
	}

	if settings != nil {
		httpApp.HTTPPort = settings.HTTPPort
		httpApp.HTTPSPort = settings.HTTPSPort
		if settings.GracePeriod > 0 {
			httpApp.GracePeriod = fmt.Sprintf("%ds", settings.GracePeriod)
		}

		// Configure global logging
		if settings.LogLevel != "" {
			config.Logging = &LoggingConfig{
				Logs: map[string]*LogConfig{
					"default": {
						Level: settings.LogLevel,
					},
				},
			}
		}
	}

	// Build each server from sites
	for _, site := range sites {
		if !site.Enabled {
			continue
		}

		siteRoutes := routes[site.ID]
		siteRedirects := redirectRules[site.ID]
		serverName := strings.ReplaceAll(site.Name, ".", "_")
		
		server, err := cb.BuildSiteConfig(&site, siteRoutes, siteRedirects, upstreamGroups, upstreams)
		if err != nil {
			return nil, fmt.Errorf("failed to build config for site %s: %w", site.Name, err)
		}

		httpApp.Servers[serverName] = server
	}

	config.Apps["http"] = httpApp

	return config, nil
}

// ApplyConfig applies the given configuration to Caddy
func (cb *ConfigBuilder) ApplyConfig(config *CaddyConfig) error {
	resp, err := cb.client.LoadConfig(config)
	if err != nil {
		return err
	}
	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to apply config: %s", string(resp.Body))
	}
	return nil
}

// BuildFromDB builds the configuration from the database
func (cb *ConfigBuilder) BuildFromDB() (*CaddyConfig, error) {
	db := database.GetDB()

	// 1. Get Sites
	var sites []models.Site
	if err := db.Where("enabled = ?", true).Find(&sites).Error; err != nil {
		return nil, fmt.Errorf("failed to load sites: %w", err)
	}

	// 2. Get Routes
	routesMap := make(map[string][]models.Route)
	for _, site := range sites {
		var routes []models.Route
		db.Where("site_id = ? AND enabled = ?", site.ID, true).Order("`order` ASC").Find(&routes)
		routesMap[site.ID] = routes
	}

	// 3. Get Redirect Rules
	redirectsMap := make(map[string][]models.RedirectRule)
	for _, site := range sites {
		var rules []models.RedirectRule
		db.Where("site_id = ? AND enabled = ?", site.ID, true).Order("priority DESC, created_at DESC").Find(&rules)
		redirectsMap[site.ID] = rules
	}

	// 4. Get Upstream Groups
	var upstreamGroups []models.UpstreamGroup
	db.Find(&upstreamGroups)
	groupsMap := make(map[string]*models.UpstreamGroup)
	upstreamsMap := make(map[string][]models.Upstream)
	for i := range upstreamGroups {
		groupsMap[upstreamGroups[i].Name] = &upstreamGroups[i]
		var upstreams []models.Upstream
		db.Model(&upstreamGroups[i]).Association("Upstreams").Find(&upstreams)
		upstreamsMap[upstreamGroups[i].Name] = upstreams
	}

	// 5. Get Global Settings
	var settings models.GlobalSettings
	db.First(&settings)

	// 6. Get Custom Certificates
	var certificates []models.CustomCertificate
	db.Find(&certificates)

	// 7. Get TLS Configs
	var tlsConfigsList []models.TLSConfig
	db.Find(&tlsConfigsList)
	tlsConfigsMap := make(map[string]models.TLSConfig)
	for _, tc := range tlsConfigsList {
		tlsConfigsMap[tc.SiteID] = tc
	}

	// 8. Get DNS Providers
	var dnsProvidersList []models.DNSProvider
	db.Find(&dnsProvidersList)
	dnsProvidersMap := make(map[string]models.DNSProvider)
	for _, dp := range dnsProvidersList {
		dnsProvidersMap[dp.ID] = dp
	}

	// Build Config
	return cb.BuildFullConfig(sites, routesMap, redirectsMap, groupsMap, upstreamsMap, certificates, &settings, tlsConfigsMap, dnsProvidersMap)
}
