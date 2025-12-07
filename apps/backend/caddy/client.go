package caddy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client wraps the Caddy Admin API
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewClient creates a new Caddy API client
func NewClient(baseURL string) *Client {
	return &Client{
		BaseURL: strings.TrimSuffix(baseURL, "/"),
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Response represents a generic API response
type Response struct {
	StatusCode int
	Body       []byte
	Error      error
}

// UpstreamStatus represents the status of a reverse proxy upstream
type UpstreamStatus struct {
	Address     string `json:"address"`
	NumRequests int    `json:"num_requests"`
	Fails       int    `json:"fails"`
}

// LoadConfig loads a complete configuration into Caddy
// POST /load
func (c *Client) LoadConfig(config interface{}) (*Response, error) {
	return c.doRequest("POST", "/load", config)
}

// LoadCaddyfile loads a Caddyfile configuration
// POST /load with Content-Type: text/caddyfile
func (c *Client) LoadCaddyfile(caddyfile string) (*Response, error) {
	req, err := http.NewRequest("POST", c.BaseURL+"/load", strings.NewReader(caddyfile))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "text/caddyfile")
	return c.executeRequest(req)
}

// GetConfig retrieves configuration at the specified path
// GET /config/[path]
func (c *Client) GetConfig(path string) (*Response, error) {
	return c.doRequest("GET", "/config/"+path, nil)
}

// GetFullConfig retrieves the complete Caddy configuration
// GET /config/
func (c *Client) GetFullConfig() (map[string]interface{}, error) {
	resp, err := c.doRequest("GET", "/config/", nil)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get config: status %d, body: %s", resp.StatusCode, string(resp.Body))
	}

	var config map[string]interface{}
	if len(resp.Body) > 0 {
		if err := json.Unmarshal(resp.Body, &config); err != nil {
			return nil, err
		}
	}
	return config, nil
}

// SetConfig sets or appends configuration at the specified path
// POST /config/[path]
func (c *Client) SetConfig(path string, value interface{}) (*Response, error) {
	return c.doRequest("POST", "/config/"+path, value)
}

// CreateConfig creates new configuration at the specified path
// PUT /config/[path]
func (c *Client) CreateConfig(path string, value interface{}) (*Response, error) {
	return c.doRequest("PUT", "/config/"+path, value)
}

// UpdateConfig updates existing configuration at the specified path
// PATCH /config/[path]
func (c *Client) UpdateConfig(path string, value interface{}) (*Response, error) {
	return c.doRequest("PATCH", "/config/"+path, value)
}

// DeleteConfig removes configuration at the specified path
// DELETE /config/[path]
func (c *Client) DeleteConfig(path string) (*Response, error) {
	return c.doRequest("DELETE", "/config/"+path, nil)
}

// Stop stops Caddy gracefully
// POST /stop
func (c *Client) Stop() (*Response, error) {
	return c.doRequest("POST", "/stop", nil)
}

// GetUpstreams retrieves the status of all reverse proxy upstreams
// GET /reverse_proxy/upstreams
func (c *Client) GetUpstreams() ([]UpstreamStatus, error) {
	resp, err := c.doRequest("GET", "/reverse_proxy/upstreams", nil)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get upstreams: status %d", resp.StatusCode)
	}

	var upstreams []UpstreamStatus
	if len(resp.Body) > 0 {
		if err := json.Unmarshal(resp.Body, &upstreams); err != nil {
			return nil, err
		}
	}
	return upstreams, nil
}

// AdaptConfig adapts a configuration to JSON without loading it
// POST /adapt
func (c *Client) AdaptConfig(config string, contentType string) (*Response, error) {
	req, err := http.NewRequest("POST", c.BaseURL+"/adapt", strings.NewReader(config))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", contentType)
	return c.executeRequest(req)
}

// GetPKICA retrieves information about a PKI CA
// GET /pki/ca/<id>
func (c *Client) GetPKICA(id string) (*Response, error) {
	return c.doRequest("GET", "/pki/ca/"+id, nil)
}

// GetPKICACertificates retrieves certificates for a PKI CA
// GET /pki/ca/<id>/certificates
func (c *Client) GetPKICACertificates(id string) (*Response, error) {
	return c.doRequest("GET", "/pki/ca/"+id+"/certificates", nil)
}

// GetByID retrieves configuration using an @id
// GET /id/<id>[/path]
func (c *Client) GetByID(id string, path string) (*Response, error) {
	fullPath := "/id/" + id
	if path != "" {
		fullPath += "/" + path
	}
	return c.doRequest("GET", fullPath, nil)
}

// SetByID sets configuration using an @id
// POST /id/<id>[/path]
func (c *Client) SetByID(id string, path string, value interface{}) (*Response, error) {
	fullPath := "/id/" + id
	if path != "" {
		fullPath += "/" + path
	}
	return c.doRequest("POST", fullPath, value)
}

// Health checks if Caddy is running and responding
func (c *Client) Health() error {
	_, err := c.GetConfig("")
	return err
}

// doRequest performs an HTTP request to the Caddy API
func (c *Client) doRequest(method, path string, body interface{}) (*Response, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.executeRequest(req)
}

// executeRequest executes an HTTP request and returns the response
func (c *Client) executeRequest(req *http.Request) (*Response, error) {
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return &Response{Error: err}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &Response{StatusCode: resp.StatusCode, Error: err}, err
	}

	return &Response{
		StatusCode: resp.StatusCode,
		Body:       body,
	}, nil
}
