package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"caddyadmin/database"
	"caddyadmin/models"

	"github.com/gin-gonic/gin"
)

// BackupHandler handles backup and restore operations
type BackupHandler struct{}

// NewBackupHandler creates a new backup handler
func NewBackupHandler() *BackupHandler {
	return &BackupHandler{}
}

// BackupData represents the complete backup structure
type BackupData struct {
	Version    string                    `json:"version"`
	Timestamp  time.Time                 `json:"timestamp"`
	Sites      []models.Site             `json:"sites"`
	Routes     []models.Route            `json:"routes"`
	Upstreams  []models.Upstream         `json:"upstreams"`
	Groups     []models.UpstreamGroup    `json:"upstream_groups"`
	TLS        []models.TLSConfig        `json:"tls_configs"`
	Settings   *models.GlobalSettings    `json:"global_settings"`
	Middleware []models.MiddlewareSettings `json:"middleware_settings"`
	AuthUsers  []models.BasicAuthUser    `json:"basic_auth_users"`
	Headers    []models.HeaderRule       `json:"header_rules"`
	Access     []models.AccessRule       `json:"access_rules"`
	Rewrites   []models.RewriteRule      `json:"rewrite_rules"`
}

// CreateBackup exports all configuration as JSON
func (h *BackupHandler) CreateBackup(c *gin.Context) {
	backup := BackupData{
		Version:   "1.0",
		Timestamp: time.Now(),
	}

	// Load all data
	database.DB.Find(&backup.Sites)
	database.DB.Find(&backup.Routes)
	database.DB.Find(&backup.Upstreams)
	database.DB.Preload("Upstreams").Find(&backup.Groups)
	database.DB.Find(&backup.TLS)
	database.DB.Find(&backup.Middleware)
	database.DB.Find(&backup.AuthUsers)
	database.DB.Find(&backup.Headers)
	database.DB.Find(&backup.Access)
	database.DB.Find(&backup.Rewrites)

	var settings models.GlobalSettings
	if err := database.DB.First(&settings).Error; err == nil {
		backup.Settings = &settings
	}

	// Return as download
	c.Header("Content-Disposition", "attachment; filename=caddy-backup-"+time.Now().Format("2006-01-02")+".json")
	c.JSON(http.StatusOK, backup)
}

// RestoreBackup imports configuration from JSON
func (h *BackupHandler) RestoreBackup(c *gin.Context) {
	var backup BackupData
	if err := c.ShouldBindJSON(&backup); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()

	// Clear existing data (except admin users and API keys)
	tx.Exec("DELETE FROM rewrite_rules")
	tx.Exec("DELETE FROM access_rules")
	tx.Exec("DELETE FROM header_rules")
	tx.Exec("DELETE FROM basic_auth_users")
	tx.Exec("DELETE FROM middleware_settings")
	tx.Exec("DELETE FROM tls_configs")
	tx.Exec("DELETE FROM upstream_group_members")
	tx.Exec("DELETE FROM upstream_groups")
	tx.Exec("DELETE FROM upstreams")
	tx.Exec("DELETE FROM routes")
	tx.Exec("DELETE FROM sites")

	// Restore data
	for _, site := range backup.Sites {
		if err := tx.Create(&site).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore sites: " + err.Error()})
			return
		}
	}

	for _, route := range backup.Routes {
		tx.Create(&route)
	}

	for _, upstream := range backup.Upstreams {
		tx.Create(&upstream)
	}

	for _, group := range backup.Groups {
		tx.Create(&group)
	}

	for _, tls := range backup.TLS {
		tx.Create(&tls)
	}

	for _, middleware := range backup.Middleware {
		tx.Create(&middleware)
	}

	for _, auth := range backup.AuthUsers {
		tx.Create(&auth)
	}

	for _, header := range backup.Headers {
		tx.Create(&header)
	}

	for _, access := range backup.Access {
		tx.Create(&access)
	}

	for _, rewrite := range backup.Rewrites {
		tx.Create(&rewrite)
	}

	if backup.Settings != nil {
		tx.Where("1=1").Delete(&models.GlobalSettings{})
		tx.Create(backup.Settings)
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message": "Backup restored successfully",
		"stats": gin.H{
			"sites":     len(backup.Sites),
			"routes":    len(backup.Routes),
			"upstreams": len(backup.Upstreams),
			"groups":    len(backup.Groups),
		},
	})
}

// DownloadBackupFile creates a downloadable ZIP backup
func (h *BackupHandler) DownloadBackupFile(c *gin.Context) {
	backup := BackupData{
		Version:   "1.0",
		Timestamp: time.Now(),
	}

	database.DB.Find(&backup.Sites)
	database.DB.Find(&backup.Routes)
	database.DB.Find(&backup.Upstreams)
	database.DB.Preload("Upstreams").Find(&backup.Groups)
	database.DB.Find(&backup.TLS)
	database.DB.Find(&backup.Middleware)
	database.DB.Find(&backup.AuthUsers)
	database.DB.Find(&backup.Headers)
	database.DB.Find(&backup.Access)
	database.DB.Find(&backup.Rewrites)

	var settings models.GlobalSettings
	if err := database.DB.First(&settings).Error; err == nil {
		backup.Settings = &settings
	}

	// Create ZIP in memory
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Add backup.json
	jsonData, _ := json.MarshalIndent(backup, "", "  ")
	w, _ := zipWriter.Create("backup.json")
	w.Write(jsonData)

	// Add database file if exists
	dbPath := filepath.Join(".", "caddy_manager.db")
	if _, err := os.Stat(dbPath); err == nil {
		dbData, _ := os.ReadFile(dbPath)
		w, _ := zipWriter.Create("caddy_manager.db")
		w.Write(dbData)
	}

	zipWriter.Close()

	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", "attachment; filename=caddy-backup-"+time.Now().Format("2006-01-02")+".zip")
	c.Data(http.StatusOK, "application/zip", buf.Bytes())
}

// UploadRestore restores from uploaded file
func (h *BackupHandler) UploadRestore(c *gin.Context) {
	file, err := c.FormFile("backup")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No backup file provided"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	var backup BackupData
	if err := json.Unmarshal(data, &backup); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid backup file format"})
		return
	}

	// Reuse restore logic
	c.Request.Body = io.NopCloser(bytes.NewReader(data))
	h.RestoreBackup(c)
}
