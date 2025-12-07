package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Site represents a domain/host configuration
type Site struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Hosts       []string  `gorm:"-" json:"hosts"`                           // Handled via HostsJSON
	HostsJSON   string    `gorm:"column:hosts;type:text" json:"-"`          // Stored as JSON string
	ListenPort  int       `gorm:"default:443" json:"listen_port"`
	AutoHTTPS   bool      `gorm:"default:true" json:"auto_https"`
	TLSEnabled  bool      `gorm:"default:true" json:"tls_enabled"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Routes      []Route   `gorm:"foreignKey:SiteID;constraint:OnDelete:CASCADE" json:"routes,omitempty"`
}

func (s *Site) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// Route represents a route configuration within a site
type Route struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID      string    `gorm:"not null;index" json:"site_id"`
	Name        string    `json:"name"`
	PathMatcher string    `json:"path_matcher"`            // e.g., "/api/*", "/", "/static/*"
	MatchType   string    `gorm:"default:path" json:"match_type"` // path, path_prefix, path_regexp
	Methods     []string  `gorm:"-" json:"methods"`
	MethodsJSON string    `gorm:"column:methods" json:"-"`
	HandlerType string    `gorm:"not null" json:"handler_type"` // reverse_proxy, file_server, static_response, redirect, php_fastcgi
	HandlerConfig string  `gorm:"type:text" json:"handler_config"` // JSON config for the handler
	Order       int       `gorm:"default:0" json:"order"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (r *Route) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

// Upstream represents a backend server for reverse proxy
type Upstream struct {
	ID              string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name            string    `gorm:"not null" json:"name"`
	Address         string    `gorm:"not null" json:"address"` // e.g., "localhost:8080"
	Scheme          string    `gorm:"default:http" json:"scheme"` // http, https, h2c
	Weight          int       `gorm:"default:1" json:"weight"`
	MaxRequests     int       `gorm:"default:0" json:"max_requests"` // 0 = unlimited
	MaxConnections  int       `gorm:"default:0" json:"max_connections"`
	HealthCheckPath string    `json:"health_check_path"`
	HealthCheckInterval int   `gorm:"default:30" json:"health_check_interval"` // seconds
	Healthy         bool      `gorm:"default:true" json:"healthy"`
	Enabled         bool      `gorm:"default:true" json:"enabled"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (u *Upstream) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

// UpstreamGroup represents a group of upstreams for load balancing
type UpstreamGroup struct {
	ID              string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name            string     `gorm:"not null;unique" json:"name"`
	LoadBalancing   string     `gorm:"default:round_robin" json:"load_balancing"` // round_robin, least_conn, first, random, ip_hash, uri_hash, header, cookie
	TryDuration     int        `gorm:"default:0" json:"try_duration"` // seconds
	TryInterval     int        `gorm:"default:250" json:"try_interval"` // milliseconds
	HealthChecks    bool       `gorm:"default:false" json:"health_checks"`
	PassiveHealth   bool       `gorm:"default:true" json:"passive_health"`
	Retries         int        `gorm:"default:3" json:"retries"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	Upstreams       []Upstream `gorm:"many2many:upstream_group_members" json:"upstreams,omitempty"`
}

func (ug *UpstreamGroup) BeforeCreate(tx *gorm.DB) error {
	if ug.ID == "" {
		ug.ID = uuid.New().String()
	}
	return nil
}

// TLSConfig represents TLS/certificate configuration
type TLSConfig struct {
	ID                 string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID             string    `gorm:"uniqueIndex" json:"site_id"`
	AutoHTTPS          bool      `gorm:"default:true" json:"auto_https"`
	ACMEEmail          string    `json:"acme_email"`
	ACMEProvider       string    `gorm:"default:letsencrypt" json:"acme_provider"` // letsencrypt, zerossl, custom
	OnDemandTLS        bool      `gorm:"default:false" json:"on_demand_tls"`
	WildcardCert       bool      `gorm:"default:false" json:"wildcard_cert"`
	CustomCertPath     string    `json:"custom_cert_path"`
	CustomKeyPath      string    `json:"custom_key_path"`
	MinVersion         string    `gorm:"default:tls1.2" json:"min_version"` // tls1.0, tls1.1, tls1.2, tls1.3
	CipherSuites       string    `gorm:"type:text" json:"cipher_suites"` // JSON array
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

func (t *TLSConfig) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

// ConfigHistory stores configuration change history for rollback
type ConfigHistory struct {
	ID            string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Timestamp     time.Time `gorm:"index" json:"timestamp"`
	Action        string    `gorm:"not null" json:"action"` // create, update, delete, load, rollback
	ResourceType  string    `gorm:"not null" json:"resource_type"` // site, route, upstream, config
	ResourceID    string    `json:"resource_id"`
	ResourceName  string    `json:"resource_name"`
	PreviousState string    `gorm:"type:text" json:"previous_state"` // JSON snapshot
	NewState      string    `gorm:"type:text" json:"new_state"`      // JSON snapshot
	CaddyConfig   string    `gorm:"type:text" json:"caddy_config"`   // Full Caddy config at this point
	UserAgent     string    `json:"user_agent"`
	IPAddress     string    `json:"ip_address"`
	Success       bool      `gorm:"default:true" json:"success"`
	ErrorMessage  string    `json:"error_message,omitempty"`
}

func (ch *ConfigHistory) BeforeCreate(tx *gorm.DB) error {
	if ch.ID == "" {
		ch.ID = uuid.New().String()
	}
	if ch.Timestamp.IsZero() {
		ch.Timestamp = time.Now()
	}
	return nil
}

// GlobalSettings stores global Caddy settings
type GlobalSettings struct {
	ID                string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	AdminEmail        string    `json:"admin_email"`
	DefaultSNI        string    `json:"default_sni"`
	GracePeriod       int       `gorm:"default:10" json:"grace_period"` // seconds
	HTTPPort          int       `gorm:"default:80" json:"http_port"`
	HTTPSPort         int       `gorm:"default:443" json:"https_port"`
	LogLevel          string    `gorm:"default:debug" json:"log_level"`
	AccessLogEnabled  bool      `gorm:"default:true" json:"access_log_enabled"`
	ErrorLogEnabled   bool      `gorm:"default:true" json:"error_log_enabled"`
	// Global TLS Settings
	DefaultACMEEmail    string `json:"default_acme_email"`
	DefaultACMEProvider string `gorm:"default:letsencrypt" json:"default_acme_provider"` // letsencrypt, zerossl, buypass
	DefaultMinTLS       string `gorm:"default:tls1.2" json:"default_min_tls"`            // tls1.0, tls1.1, tls1.2, tls1.3
	OnDemandTLSEnabled  bool   `gorm:"default:false" json:"on_demand_tls_enabled"`
	HSTSEnabled         bool   `gorm:"default:false" json:"hsts_enabled"`
	HSTSMaxAge          int    `gorm:"default:31536000" json:"hsts_max_age"` // 1 year default
	HSTSIncludeSubs     bool   `gorm:"default:true" json:"hsts_include_subs"`
	HSTSPreload         bool   `gorm:"default:false" json:"hsts_preload"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func (gs *GlobalSettings) BeforeCreate(tx *gorm.DB) error {
	if gs.ID == "" {
		gs.ID = uuid.New().String()
	}
	return nil
}

// BasicAuthUser represents a user for HTTP basic authentication
type BasicAuthUser struct {
	ID           string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID       string    `gorm:"index;not null" json:"site_id"`
	Username     string    `gorm:"not null" json:"username"`
	PasswordHash string    `gorm:"not null" json:"password_hash"` // bcrypt hash
	Realm        string    `gorm:"default:Restricted" json:"realm"`
	Enabled      bool      `gorm:"default:true" json:"enabled"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (ba *BasicAuthUser) BeforeCreate(tx *gorm.DB) error {
	if ba.ID == "" {
		ba.ID = uuid.New().String()
	}
	return nil
}

// HeaderRule represents a header manipulation rule
type HeaderRule struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID      string    `gorm:"index;not null" json:"site_id"`
	Direction   string    `gorm:"not null" json:"direction"`  // request, response
	Operation   string    `gorm:"not null" json:"operation"`  // set, add, delete
	HeaderName  string    `gorm:"not null" json:"header_name"`
	HeaderValue string    `json:"header_value"`
	Replace     string    `json:"replace"` // For search/replace in value
	Priority    int       `gorm:"default:0" json:"priority"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (hr *HeaderRule) BeforeCreate(tx *gorm.DB) error {
	if hr.ID == "" {
		hr.ID = uuid.New().String()
	}
	return nil
}

// AccessRule represents an IP-based access control rule
type AccessRule struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID    string    `gorm:"index;not null" json:"site_id"`
	RuleType  string    `gorm:"not null" json:"rule_type"` // allow, deny
	CIDR      string    `gorm:"not null" json:"cidr"`      // e.g., "192.168.1.0/24" or "10.0.0.1"
	Priority  int       `gorm:"default:0" json:"priority"`
	Enabled   bool      `gorm:"default:true" json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (ar *AccessRule) BeforeCreate(tx *gorm.DB) error {
	if ar.ID == "" {
		ar.ID = uuid.New().String()
	}
	return nil
}

// RewriteRule represents a URL rewrite rule
type RewriteRule struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID      string    `gorm:"index;not null" json:"site_id"`
	MatchType   string    `gorm:"default:prefix" json:"match_type"` // prefix, exact, regexp
	Pattern     string    `gorm:"not null" json:"pattern"`
	Replacement string    `gorm:"not null" json:"replacement"`
	StripPrefix string    `json:"strip_prefix"`
	Priority    int       `gorm:"default:0" json:"priority"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (rr *RewriteRule) BeforeCreate(tx *gorm.DB) error {
	if rr.ID == "" {
		rr.ID = uuid.New().String()
	}
	return nil
}

// MiddlewareSettings represents per-site middleware configuration
type RedirectRule struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID      string    `gorm:"index;not null" json:"site_id"`
	Source      string    `gorm:"not null" json:"source"`       // e.g., /old-path
	Destination string    `gorm:"not null" json:"destination"`  // e.g., /new-path
	Code        int       `gorm:"default:301" json:"code"`      // 301, 302, 307, 308
	Priority    int       `gorm:"default:0" json:"priority"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (rr *RedirectRule) BeforeCreate(tx *gorm.DB) error {
	if rr.ID == "" {
		rr.ID = uuid.New().String()
	}
	return nil
}

// MiddlewareSettings represents per-site middleware configuration
type MiddlewareSettings struct {
	ID                string `gorm:"primaryKey;type:varchar(36)" json:"id"`
	SiteID            string `gorm:"uniqueIndex;not null" json:"site_id"`
	CompressionEnabled bool  `gorm:"default:false" json:"compression_enabled"`
	CompressionTypes  string `gorm:"default:gzip" json:"compression_types"` // gzip, zstd, br
	CompressionLevel  int    `gorm:"default:5" json:"compression_level"`    // 1-9
	BasicAuthEnabled  bool   `gorm:"default:false" json:"basic_auth_enabled"`
	BasicAuthRealm    string `gorm:"default:Restricted" json:"basic_auth_realm"`
	AccessControlEnabled bool `gorm:"default:false" json:"access_control_enabled"`
	AccessControlDefault string `gorm:"default:allow" json:"access_control_default"` // allow, deny
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (ms *MiddlewareSettings) BeforeCreate(tx *gorm.DB) error {
	if ms.ID == "" {
		ms.ID = uuid.New().String()
	}
	return nil
}

// AdminUser represents an admin user for the management UI
type AdminUser struct {
	ID           string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Username     string    `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Email        string    `gorm:"uniqueIndex" json:"email"`
	Role         string    `gorm:"default:admin" json:"role"` // admin, viewer
	Enabled      bool      `gorm:"default:true" json:"enabled"`
	LastLoginAt  time.Time `json:"last_login_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (u *AdminUser) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

// APIKey represents an API key for programmatic access
type APIKey struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Key         string    `gorm:"uniqueIndex;not null" json:"key"`
	Description string    `json:"description"`
	Role        string    `gorm:"default:admin" json:"role"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	ExpiresAt   time.Time `json:"expires_at"`
	LastUsedAt  time.Time `json:"last_used_at"`
	CreatedAt   time.Time `json:"created_at"`
}

func (k *APIKey) BeforeCreate(tx *gorm.DB) error {
	if k.ID == "" {
		k.ID = uuid.New().String()
	}
	return nil
}

// CustomCertificate represents a user-managed TLS certificate stored in the database
type CustomCertificate struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Domains     []string  `gorm:"-" json:"domains"`                     // Parsed from cert
	DomainsJSON string    `gorm:"column:domains;type:text" json:"-"`    // Stored as JSON
	CertPEM     string    `gorm:"type:text;not null" json:"cert_pem"`   // Certificate content (PEM)
	KeyPEM      string    `gorm:"type:text;not null" json:"-"`          // Private key (PEM) - never exposed in JSON
	ExpiresAt   time.Time `json:"expires_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (c *CustomCertificate) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
