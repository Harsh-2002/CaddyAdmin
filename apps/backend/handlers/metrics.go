package handlers

import (
	"net/http"
	"runtime"
	"sync/atomic"
	"time"

	"caddyadmin/database"
	"caddyadmin/models"

	"github.com/gin-gonic/gin"
)

// MetricsHandler handles metrics endpoints
type MetricsHandler struct {
	startTime      time.Time
	requestCount   uint64
	errorCount     uint64
}

var metricsInstance = &MetricsHandler{
	startTime: time.Now(),
}

// NewMetricsHandler returns the metrics handler instance
func NewMetricsHandler() *MetricsHandler {
	return metricsInstance
}

// IncrementRequest increments request counter
func (h *MetricsHandler) IncrementRequest() {
	atomic.AddUint64(&h.requestCount, 1)
}

// IncrementError increments error counter
func (h *MetricsHandler) IncrementError() {
	atomic.AddUint64(&h.errorCount, 1)
}

// GetMetrics returns current metrics
func (h *MetricsHandler) GetMetrics(c *gin.Context) {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// Count entities
	var siteCount, routeCount, upstreamCount, groupCount int64
	database.DB.Model(&models.Site{}).Count(&siteCount)
	database.DB.Model(&models.Route{}).Count(&routeCount)
	database.DB.Model(&models.Upstream{}).Count(&upstreamCount)
	database.DB.Model(&models.UpstreamGroup{}).Count(&groupCount)

	// Count healthy upstreams
	var healthyCount int64
	database.DB.Model(&models.Upstream{}).Where("healthy = ?", true).Count(&healthyCount)

	c.JSON(http.StatusOK, gin.H{
		"uptime_seconds": int64(time.Since(h.startTime).Seconds()),
		"uptime_human":   time.Since(h.startTime).Round(time.Second).String(),
		"requests_total": atomic.LoadUint64(&h.requestCount),
		"errors_total":   atomic.LoadUint64(&h.errorCount),
		"memory": gin.H{
			"alloc_mb":       memStats.Alloc / 1024 / 1024,
			"total_alloc_mb": memStats.TotalAlloc / 1024 / 1024,
			"sys_mb":         memStats.Sys / 1024 / 1024,
			"num_gc":         memStats.NumGC,
		},
		"runtime": gin.H{
			"goroutines": runtime.NumGoroutine(),
			"cpus":       runtime.NumCPU(),
			"go_version": runtime.Version(),
		},
		"entities": gin.H{
			"sites":      siteCount,
			"routes":     routeCount,
			"upstreams":  upstreamCount,
			"groups":     groupCount,
			"healthy":    healthyCount,
		},
	})
}

// GetPrometheusMetrics returns metrics in Prometheus format
func (h *MetricsHandler) GetPrometheusMetrics(c *gin.Context) {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	var siteCount, routeCount, upstreamCount, healthyCount int64
	database.DB.Model(&models.Site{}).Count(&siteCount)
	database.DB.Model(&models.Route{}).Count(&routeCount)
	database.DB.Model(&models.Upstream{}).Count(&upstreamCount)
	database.DB.Model(&models.Upstream{}).Where("healthy = ?", true).Count(&healthyCount)

	output := ""
	output += "# HELP caddy_proxy_manager_uptime_seconds Uptime in seconds\n"
	output += "# TYPE caddy_proxy_manager_uptime_seconds gauge\n"
	output += "caddy_proxy_manager_uptime_seconds " + formatInt(int64(time.Since(h.startTime).Seconds())) + "\n"
	
	output += "# HELP caddy_proxy_manager_requests_total Total requests\n"
	output += "# TYPE caddy_proxy_manager_requests_total counter\n"
	output += "caddy_proxy_manager_requests_total " + formatUint(atomic.LoadUint64(&h.requestCount)) + "\n"
	
	output += "# HELP caddy_proxy_manager_sites_total Number of sites\n"
	output += "# TYPE caddy_proxy_manager_sites_total gauge\n"
	output += "caddy_proxy_manager_sites_total " + formatInt(siteCount) + "\n"
	
	output += "# HELP caddy_proxy_manager_routes_total Number of routes\n"
	output += "# TYPE caddy_proxy_manager_routes_total gauge\n"
	output += "caddy_proxy_manager_routes_total " + formatInt(routeCount) + "\n"
	
	output += "# HELP caddy_proxy_manager_upstreams_total Number of upstreams\n"
	output += "# TYPE caddy_proxy_manager_upstreams_total gauge\n"
	output += "caddy_proxy_manager_upstreams_total " + formatInt(upstreamCount) + "\n"
	
	output += "# HELP caddy_proxy_manager_upstreams_healthy Number of healthy upstreams\n"
	output += "# TYPE caddy_proxy_manager_upstreams_healthy gauge\n"
	output += "caddy_proxy_manager_upstreams_healthy " + formatInt(healthyCount) + "\n"
	
	output += "# HELP caddy_proxy_manager_memory_bytes Memory usage in bytes\n"
	output += "# TYPE caddy_proxy_manager_memory_bytes gauge\n"
	output += "caddy_proxy_manager_memory_bytes{type=\"alloc\"} " + formatUint(memStats.Alloc) + "\n"
	output += "caddy_proxy_manager_memory_bytes{type=\"sys\"} " + formatUint(memStats.Sys) + "\n"
	
	output += "# HELP caddy_proxy_manager_goroutines Number of goroutines\n"
	output += "# TYPE caddy_proxy_manager_goroutines gauge\n"
	output += "caddy_proxy_manager_goroutines " + formatInt(int64(runtime.NumGoroutine())) + "\n"

	c.Header("Content-Type", "text/plain; version=0.0.4")
	c.String(http.StatusOK, output)
}

func formatInt(n int64) string {
	return string(rune('0'+n%10)) + formatIntHelper(n/10)
}

func formatIntHelper(n int64) string {
	if n == 0 {
		return ""
	}
	return formatIntHelper(n/10) + string(rune('0'+n%10))
}

func formatUint(n uint64) string {
	if n == 0 {
		return "0"
	}
	result := ""
	for n > 0 {
		result = string(rune('0'+n%10)) + result
		n /= 10
	}
	return result
}
