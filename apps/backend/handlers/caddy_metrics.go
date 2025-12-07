package handlers

import (
	"bufio"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"caddyadmin/caddy"

	"github.com/gin-gonic/gin"
)

// CaddyMetricsHandler handles Caddy metrics endpoints
type CaddyMetricsHandler struct {
	caddyClient *caddy.Client
}

// NewCaddyMetricsHandler creates a new Caddy metrics handler
func NewCaddyMetricsHandler(client *caddy.Client) *CaddyMetricsHandler {
	return &CaddyMetricsHandler{caddyClient: client}
}

// PrometheusMetric represents a parsed Prometheus metric
type PrometheusMetric struct {
	Name   string            `json:"name"`
	Labels map[string]string `json:"labels,omitempty"`
	Value  float64           `json:"value"`
	Help   string            `json:"help,omitempty"`
	Type   string            `json:"type,omitempty"`
}

// CaddyMetricsResponse represents the structured metrics response
type CaddyMetricsResponse struct {
	HTTP struct {
		RequestsTotal      int64   `json:"requests_total"`
		RequestsInFlight   int64   `json:"requests_in_flight"`
		RequestErrorsTotal int64   `json:"request_errors_total"`
		AvgDurationMs      float64 `json:"avg_duration_ms"`
	} `json:"http"`
	ReverseProxy struct {
		UpstreamsHealthy int64             `json:"upstreams_healthy"`
		UpstreamsTotal   int64             `json:"upstreams_total"`
		Upstreams        []UpstreamStatus  `json:"upstreams,omitempty"`
	} `json:"reverse_proxy"`
	Admin struct {
		RequestsTotal    int64             `json:"requests_total"`
		ErrorsTotal      int64             `json:"errors_total"`
		RequestsByPath   map[string]int64  `json:"requests_by_path,omitempty"`
	} `json:"admin"`
	Config struct {
		LastReloadSuccess   bool    `json:"last_reload_success"`
		LastReloadTimestamp float64 `json:"last_reload_timestamp"`
	} `json:"config"`
	Process struct {
		Goroutines       int64   `json:"goroutines"`
		Threads          int64   `json:"threads"`
		CPUSecondsTotal  float64 `json:"cpu_seconds_total"`
		OpenFDs          int64   `json:"open_fds"`
		MaxFDs           int64   `json:"max_fds"`
		ResidentMemBytes int64   `json:"resident_mem_bytes"`
		VirtualMemBytes  int64   `json:"virtual_mem_bytes"`
		StartTimeSecs    float64 `json:"start_time_seconds"`
	} `json:"process"`
	Network struct {
		ReceiveBytesTotal  int64 `json:"receive_bytes_total"`
		TransmitBytesTotal int64 `json:"transmit_bytes_total"`
	} `json:"network"`
	Memory struct {
		HeapAllocBytes   int64 `json:"heap_alloc_bytes"`
		HeapSysBytes     int64 `json:"heap_sys_bytes"`
		HeapIdleBytes    int64 `json:"heap_idle_bytes"`
		HeapInuseBytes   int64 `json:"heap_inuse_bytes"`
		HeapObjects      int64 `json:"heap_objects"`
		StackInuseBytes  int64 `json:"stack_inuse_bytes"`
		SysBytes         int64 `json:"sys_bytes"`
		AllocBytesTotal  int64 `json:"alloc_bytes_total"`
		FreesTotal       int64 `json:"frees_total"`
		MallocsTotal     int64 `json:"mallocs_total"`
	} `json:"memory"`
	GC struct {
		DurationSecsSum   float64           `json:"duration_seconds_sum"`
		DurationSecsCount int64             `json:"duration_seconds_count"`
		NextGCBytes       int64             `json:"next_gc_bytes"`
		LastGCSecs        float64           `json:"last_gc_seconds"`
		GOGCPercent       int64             `json:"gogc_percent"`
		Quantiles         map[string]float64 `json:"quantiles,omitempty"`
	} `json:"gc"`
	Runtime struct {
		GoVersion    string `json:"go_version"`
		GOMAXPROCS   int64  `json:"gomaxprocs"`
		MemLimitBytes int64 `json:"mem_limit_bytes"`
	} `json:"runtime"`
	Raw []PrometheusMetric `json:"raw,omitempty"`
}

// UpstreamStatus represents individual upstream health
type UpstreamStatus struct {
	Address string `json:"address"`
	Healthy bool   `json:"healthy"`
}

// GetCaddyMetrics fetches and parses metrics from Caddy
func (h *CaddyMetricsHandler) GetCaddyMetrics(c *gin.Context) {
	includeRaw := c.Query("raw") == "true"

	// Fetch metrics from Caddy admin API
	resp, err := http.Get(h.caddyClient.BaseURL + "/metrics")
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "Failed to fetch Caddy metrics",
			"details": err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": "Caddy metrics endpoint returned error",
			"code":  resp.StatusCode,
		})
		return
	}

	// Parse Prometheus format
	metrics := parsePrometheusMetrics(resp.Body)

	// Build structured response
	result := CaddyMetricsResponse{}
	result.Admin.RequestsByPath = make(map[string]int64)
	result.GC.Quantiles = make(map[string]float64)

	for _, m := range metrics {
		switch m.Name {
		// HTTP Metrics
		case "caddy_http_requests_total":
			result.HTTP.RequestsTotal += int64(m.Value)
		case "caddy_http_requests_in_flight":
			result.HTTP.RequestsInFlight += int64(m.Value)
		case "caddy_http_request_errors_total":
			result.HTTP.RequestErrorsTotal += int64(m.Value)
		case "caddy_http_request_duration_seconds_sum":
			result.HTTP.AvgDurationMs += m.Value * 1000

		// Reverse Proxy
		case "caddy_reverse_proxy_upstreams_healthy":
			upstream := m.Labels["upstream"]
			healthy := m.Value == 1
			if healthy {
				result.ReverseProxy.UpstreamsHealthy++
			}
			result.ReverseProxy.UpstreamsTotal++
			result.ReverseProxy.Upstreams = append(result.ReverseProxy.Upstreams, UpstreamStatus{
				Address: upstream,
				Healthy: healthy,
			})

		// Admin API
		case "caddy_admin_http_requests_total":
			result.Admin.RequestsTotal += int64(m.Value)
			if path, ok := m.Labels["path"]; ok {
				result.Admin.RequestsByPath[path] += int64(m.Value)
			}
		case "caddy_admin_http_request_errors_total":
			result.Admin.ErrorsTotal += int64(m.Value)

		// Config Reload
		case "caddy_config_last_reload_successful":
			result.Config.LastReloadSuccess = m.Value == 1
		case "caddy_config_last_reload_success_timestamp_seconds":
			result.Config.LastReloadTimestamp = m.Value

		// Process Metrics
		case "go_goroutines":
			result.Process.Goroutines = int64(m.Value)
		case "go_threads":
			result.Process.Threads = int64(m.Value)
		case "process_cpu_seconds_total":
			result.Process.CPUSecondsTotal = m.Value
		case "process_open_fds":
			result.Process.OpenFDs = int64(m.Value)
		case "process_max_fds":
			result.Process.MaxFDs = int64(m.Value)
		case "process_resident_memory_bytes":
			result.Process.ResidentMemBytes = int64(m.Value)
		case "process_virtual_memory_bytes":
			result.Process.VirtualMemBytes = int64(m.Value)
		case "process_start_time_seconds":
			result.Process.StartTimeSecs = m.Value

		// Network I/O
		case "process_network_receive_bytes_total":
			result.Network.ReceiveBytesTotal = int64(m.Value)
		case "process_network_transmit_bytes_total":
			result.Network.TransmitBytesTotal = int64(m.Value)

		// Memory Metrics
		case "go_memstats_heap_alloc_bytes":
			result.Memory.HeapAllocBytes = int64(m.Value)
		case "go_memstats_heap_sys_bytes":
			result.Memory.HeapSysBytes = int64(m.Value)
		case "go_memstats_heap_idle_bytes":
			result.Memory.HeapIdleBytes = int64(m.Value)
		case "go_memstats_heap_inuse_bytes":
			result.Memory.HeapInuseBytes = int64(m.Value)
		case "go_memstats_heap_objects":
			result.Memory.HeapObjects = int64(m.Value)
		case "go_memstats_stack_inuse_bytes":
			result.Memory.StackInuseBytes = int64(m.Value)
		case "go_memstats_sys_bytes":
			result.Memory.SysBytes = int64(m.Value)
		case "go_memstats_alloc_bytes_total":
			result.Memory.AllocBytesTotal = int64(m.Value)
		case "go_memstats_frees_total":
			result.Memory.FreesTotal = int64(m.Value)
		case "go_memstats_mallocs_total":
			result.Memory.MallocsTotal = int64(m.Value)

		// GC Metrics
		case "go_gc_duration_seconds":
			if q, ok := m.Labels["quantile"]; ok {
				result.GC.Quantiles[q] = m.Value
			}
		case "go_gc_duration_seconds_sum":
			result.GC.DurationSecsSum = m.Value
		case "go_gc_duration_seconds_count":
			result.GC.DurationSecsCount = int64(m.Value)
		case "go_memstats_next_gc_bytes":
			result.GC.NextGCBytes = int64(m.Value)
		case "go_memstats_last_gc_time_seconds":
			result.GC.LastGCSecs = m.Value
		case "go_gc_gogc_percent":
			result.GC.GOGCPercent = int64(m.Value)

		// Runtime Info
		case "go_info":
			if v, ok := m.Labels["version"]; ok {
				result.Runtime.GoVersion = v
			}
		case "go_sched_gomaxprocs_threads":
			result.Runtime.GOMAXPROCS = int64(m.Value)
		case "go_gc_gomemlimit_bytes":
			result.Runtime.MemLimitBytes = int64(m.Value)
		}
	}

	if includeRaw {
		result.Raw = metrics
	}

	c.JSON(http.StatusOK, result)
}

// parsePrometheusMetrics parses Prometheus text format into structured metrics
func parsePrometheusMetrics(body interface{}) []PrometheusMetric {
	var metrics []PrometheusMetric
	helpMap := make(map[string]string)
	typeMap := make(map[string]string)

	// Regex for parsing metric lines
	metricRegex := regexp.MustCompile(`^([a-zA-Z_:][a-zA-Z0-9_:]*)\s*(\{[^}]*\})?\s+([0-9.eE+-]+|NaN|[+-]Inf)`)
	labelRegex := regexp.MustCompile(`([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"`)

	scanner := bufio.NewScanner(body.(interface{ Read([]byte) (int, error) }))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines
		if line == "" {
			continue
		}

		// Parse HELP lines
		if strings.HasPrefix(line, "# HELP ") {
			parts := strings.SplitN(line[7:], " ", 2)
			if len(parts) == 2 {
				helpMap[parts[0]] = parts[1]
			}
			continue
		}

		// Parse TYPE lines
		if strings.HasPrefix(line, "# TYPE ") {
			parts := strings.SplitN(line[7:], " ", 2)
			if len(parts) == 2 {
				typeMap[parts[0]] = parts[1]
			}
			continue
		}

		// Skip other comments
		if strings.HasPrefix(line, "#") {
			continue
		}

		// Parse metric line
		match := metricRegex.FindStringSubmatch(line)
		if match == nil {
			continue
		}

		name := match[1]
		labelsStr := match[2]
		valueStr := match[3]

		value, err := strconv.ParseFloat(valueStr, 64)
		if err != nil {
			continue
		}

		// Parse labels
		labels := make(map[string]string)
		if labelsStr != "" {
			labelMatches := labelRegex.FindAllStringSubmatch(labelsStr, -1)
			for _, lm := range labelMatches {
				labels[lm[1]] = lm[2]
			}
		}

		metric := PrometheusMetric{
			Name:   name,
			Labels: labels,
			Value:  value,
			Help:   helpMap[name],
			Type:   typeMap[name],
		}
		metrics = append(metrics, metric)
	}

	return metrics
}
