package handlers

import (
	"bufio"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"caddyadmin/caddy"
	"caddyadmin/sse"

	"github.com/gin-gonic/gin"
)

// LogsHandler handles log viewing endpoints
type LogsHandler struct {
	caddyClient *caddy.Client
}

// NewLogsHandler creates a new logs handler
func NewLogsHandler(caddyClient *caddy.Client) *LogsHandler {
	return &LogsHandler{caddyClient: caddyClient}
}



// GetLogs retrieves Caddy logs from journalctl
func (h *LogsHandler) GetLogs(c *gin.Context) {
	lines := c.DefaultQuery("lines", "100")
	level := c.DefaultQuery("level", "")
	search := c.DefaultQuery("search", "")
	since := c.DefaultQuery("since", "1h")

	// Build journalctl command
	args := []string{"-u", "caddy", "--no-pager", "-o", "cat"}
	
	if n, err := strconv.Atoi(lines); err == nil && n > 0 {
		args = append(args, "-n", lines)
	} else {
		args = append(args, "-n", "100")
	}

	if since != "" {
		args = append(args, "--since", since+" ago")
	}

	cmd := exec.Command("journalctl", args...)
	output, err := cmd.Output()
	if err != nil {
		// Try reading from /var/log/caddy if journalctl fails
		logFile := "/var/log/caddy/access.log"
		if _, statErr := os.Stat(logFile); statErr == nil {
			output, _ = readLastNLines(logFile, 100)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read logs: " + err.Error()})
			return
		}
	}

	// Parse and filter logs
	logLines := strings.Split(string(output), "\n")
	var entries []LogEntry

	for _, line := range logLines {
		if line == "" {
			continue
		}

		// Filter by level
		if level != "" {
			levelLower := strings.ToLower(level)
			if !strings.Contains(strings.ToLower(line), levelLower) {
				continue
			}
		}

		// Filter by search term
		if search != "" {
			if !strings.Contains(strings.ToLower(line), strings.ToLower(search)) {
				continue
			}
		}

		entry := parseLogLine(line)
		entries = append(entries, entry)
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  entries,
		"count": len(entries),
		"total": len(logLines),
	})
}

// StreamLogs streams logs in real-time using SSE (Legacy direct connection)
func (h *LogsHandler) StreamLogs(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	cmd := exec.Command("journalctl", "-u", "caddy", "-f", "--no-pager", "-o", "cat")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		c.SSEvent("error", err.Error())
		return
	}

	if err := cmd.Start(); err != nil {
		c.SSEvent("error", err.Error())
		return
	}

	defer func() {
		cmd.Process.Kill()
		cmd.Wait()
	}()

	reader := bufio.NewReader(stdout)
	clientGone := c.Request.Context().Done()

	for {
		select {
		case <-clientGone:
			return
		default:
			line, err := reader.ReadString('\n')
			if err != nil {
				if err != io.EOF {
					c.SSEvent("error", err.Error())
				}
				return
			}

			entry := parseLogLine(strings.TrimSpace(line))
			c.SSEvent("log", entry)
			c.Writer.Flush()
		}
	}
}

// StartLogBroadcaster background worker to broadcast logs to SSE hub
func (h *LogsHandler) StartLogBroadcaster(hub *sse.Hub) {
	go func() {
		// Retrying loop
		for {
			h.broadcastLogs(hub)
			time.Sleep(2 * time.Second) // Wait before retrying
		}
	}()
}

func (h *LogsHandler) broadcastLogs(hub *sse.Hub) {
	cmd := exec.Command("journalctl", "-u", "caddy", "-f", "--no-pager", "-o", "cat")
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		// If journalctl fails, try tailing file directly
		logFile := "/var/log/caddy/access.log"
		if _, statErr := os.Stat(logFile); statErr == nil {
			h.broadcastFileTail(hub, logFile)
		}
		return
	}

	if err := cmd.Start(); err != nil {
		return
	}

	defer func() {
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		cmd.Wait()
	}()

	reader := bufio.NewReader(stdout)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return
		}

		entry := parseLogLine(strings.TrimSpace(line))
		hub.Broadcast(sse.EventLogs, entry)
	}
}

func (h *LogsHandler) broadcastFileTail(hub *sse.Hub, filePath string) {
	// Simple polling tail implementation for fallback
	// In production, using fsnotify would be better, but polling is robust
	file, err := os.Open(filePath)
	if err != nil {
		return
	}
	defer file.Close()

	// Seek to end
	file.Seek(0, io.SeekEnd)
	reader := bufio.NewReader(file)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				time.Sleep(100 * time.Millisecond)
				continue
			}
			return
		}

		entry := parseLogLine(strings.TrimSpace(line))
		hub.Broadcast(sse.EventLogs, entry)
	}
}

// ValidateCaddyfile validates Caddyfile syntax
func (h *LogsHandler) ValidateCaddyfile(c *gin.Context) {
	var req struct {
		Caddyfile string `json:"caddyfile" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use Caddy API to adapt/validate the Caddyfile
	resp, err := h.caddyClient.AdaptConfig(req.Caddyfile, "text/caddyfile")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusOK, gin.H{
			"valid":   false,
			"error":   string(resp.Body),
			"message": "Caddyfile syntax is invalid",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"message": "Caddyfile syntax is valid",
		"json":    string(resp.Body),
	})
}

// GetAccessLogs retrieves access logs
func (h *LogsHandler) GetAccessLogs(c *gin.Context) {
	lines := c.DefaultQuery("lines", "100")
	search := c.DefaultQuery("search", "")

	// Common access log locations
	logPaths := []string{
		"/var/log/caddy/access.log",
		"/var/log/access.log",
		"./access.log",
	}

	var logContent []byte
	var err error
	n, _ := strconv.Atoi(lines)

	for _, path := range logPaths {
		if _, statErr := os.Stat(path); statErr == nil {
			logContent, err = readLastNLines(path, n)
			if err == nil {
				break
			}
		}
	}

	if logContent == nil {
		c.JSON(http.StatusOK, gin.H{"logs": []string{}, "message": "No access log file found"})
		return
	}

	logLines := strings.Split(string(logContent), "\n")
	var filtered []string

	for _, line := range logLines {
		if line == "" {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(line), strings.ToLower(search)) {
			continue
		}
		filtered = append(filtered, line)
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  filtered,
		"count": len(filtered),
	})
}

// LogEntry represents a single log entry
type LogEntry struct {
	Ts        float64 `json:"ts"`
	Timestamp string  `json:"timestamp"`
	Level     string  `json:"level"`
	Logger    string  `json:"logger"`
	Message   string  `json:"message"`
	Raw       string  `json:"raw"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// ClearLogs (for development) - truncates log file
func (h *LogsHandler) ClearLogs(c *gin.Context) {
	// Only allow in development
	c.JSON(http.StatusOK, gin.H{"message": "Log clearing is disabled in production"})
}

// parseLogLine parses a log line into structured format
func parseLogLine(line string) LogEntry {
	now := time.Now()
	entry := LogEntry{
		Raw:       line,
		Timestamp: now.Format(time.RFC3339),
		Ts:        float64(now.Unix()),
		Level:     "info",
		Message:   line,
	}

	// Try to parse JSON log format
	if strings.HasPrefix(line, "{") {
		var logMap map[string]interface{}
		if err := json.Unmarshal([]byte(line), &logMap); err == nil {
			entry.Data = logMap
			
			if ts, ok := logMap["ts"].(float64); ok {
				entry.Ts = ts
				entry.Timestamp = time.Unix(int64(ts), int64((ts-float64(int64(ts)))*1e9)).Format(time.RFC3339)
			}
			
			if level, ok := logMap["level"].(string); ok {
				entry.Level = level
			}
			
			if logger, ok := logMap["logger"].(string); ok {
				entry.Logger = logger
			}
			
			// Handle standard 'msg' field
			if msg, ok := logMap["msg"].(string); ok {
				entry.Message = msg
			}

			// Handle 'message' field which might contain nested JSON (double encoding)
			if message, ok := logMap["message"].(string); ok {
				message = strings.TrimSpace(message)
				if strings.HasPrefix(message, "{") {
					var innerMap map[string]interface{}
					if err := json.Unmarshal([]byte(message), &innerMap); err == nil {
						// Merge useful fields from inner JSON
						if innerTs, ok := innerMap["ts"].(float64); ok {
							entry.Ts = innerTs
							entry.Timestamp = time.Unix(int64(innerTs), int64((innerTs-float64(int64(innerTs)))*1e9)).Format(time.RFC3339)
						}
						if innerLevel, ok := innerMap["level"].(string); ok {
							entry.Level = innerLevel
						}
						if innerLogger, ok := innerMap["logger"].(string); ok {
							entry.Logger = innerLogger
						}
						if innerMsg, ok := innerMap["msg"].(string); ok {
							entry.Message = innerMsg
						}
						// Store remaining data
						if entry.Data == nil {
							entry.Data = make(map[string]interface{})
						}
						for k, v := range innerMap {
							if k != "ts" && k != "level" && k != "logger" && k != "msg" {
								entry.Data[k] = v
							}
						}
					} else {
						entry.Message = message
					}
				} else {
					entry.Message = message
				}
			}
		}
	} else {
		// Plain text log
		parts := strings.SplitN(line, " ", 4)
		if len(parts) >= 4 {
			// Try to parse journalctl timestamp if possible, otherwise keep default
			entry.Message = parts[3]
			entry.Level = strings.ToLower(strings.Trim(parts[2], "[]"))
		}
	}

	return entry
}

// readLastNLines reads the last N lines from a file
func readLastNLines(filePath string, n int) ([]byte, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Get file size
	stat, err := file.Stat()
	if err != nil {
		return nil, err
	}

	// Start from end of file
	size := stat.Size()
	if size == 0 {
		return []byte{}, nil
	}

	bufSize := int64(4096)
	if bufSize > size {
		bufSize = size
	}

	lines := make([]string, 0, n)
	offset := size

	for offset > 0 && len(lines) < n {
		if offset < bufSize {
			bufSize = offset
		}
		offset -= bufSize

		buf := make([]byte, bufSize)
		file.ReadAt(buf, offset)

		chunk := strings.Split(string(buf), "\n")
		for i := len(chunk) - 1; i >= 0 && len(lines) < n; i-- {
			if chunk[i] != "" {
				lines = append([]string{chunk[i]}, lines...)
			}
		}
	}

	return []byte(strings.Join(lines, "\n")), nil
}
