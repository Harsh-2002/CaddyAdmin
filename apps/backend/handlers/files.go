package handlers

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// FileHandler handles file management operations
type FileHandler struct {
	basePath string
}

// FileInfo represents a file or directory
type FileInfo struct {
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Type     string    `json:"type"` // "file" or "directory"
	Size     int64     `json:"size"`
	Modified time.Time `json:"modified"`
}

// NewFileHandler creates a new file handler
func NewFileHandler(basePath string) *FileHandler {
	return &FileHandler{basePath: basePath}
}

// getSitePath returns the path for a site's files
func (h *FileHandler) getSitePath(siteID string) string {
	return filepath.Join(h.basePath, siteID, "public")
}

// validatePath ensures the path doesn't escape the site directory
func (h *FileHandler) validatePath(siteID, requestPath string) (string, error) {
	sitePath := h.getSitePath(siteID)
	
	// Clean and join the path
	cleanPath := filepath.Clean(requestPath)
	if cleanPath == "." {
		cleanPath = ""
	}
	
	fullPath := filepath.Join(sitePath, cleanPath)
	
	// Ensure the path is within the site directory
	if !strings.HasPrefix(fullPath, sitePath) {
		return "", fmt.Errorf("invalid path: attempted path traversal")
	}
	
	return fullPath, nil
}

// ListFiles lists files in a directory
// @Summary List files
// @Description List files and directories in a site's public folder
// @Tags files
// @Param id path string true "Site ID"
// @Param path query string false "Subdirectory path"
// @Success 200 {object} map[string]interface{}
// @Router /api/sites/{id}/files [get]
func (h *FileHandler) ListFiles(c *gin.Context) {
	siteID := c.Param("id")
	requestPath := c.DefaultQuery("path", "/")
	
	fullPath, err := h.validatePath(siteID, requestPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Create directory if it doesn't exist
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}
	
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read directory"})
		return
	}
	
	files := make([]FileInfo, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		
		fileType := "file"
		if entry.IsDir() {
			fileType = "directory"
		}
		
		relativePath := filepath.Join(requestPath, entry.Name())
		if !strings.HasPrefix(relativePath, "/") {
			relativePath = "/" + relativePath
		}
		
		files = append(files, FileInfo{
			Name:     entry.Name(),
			Path:     relativePath,
			Type:     fileType,
			Size:     info.Size(),
			Modified: info.ModTime(),
		})
	}
	
	// Sort: directories first, then alphabetically
	sort.Slice(files, func(i, j int) bool {
		if files[i].Type != files[j].Type {
			return files[i].Type == "directory"
		}
		return files[i].Name < files[j].Name
	})
	
	c.JSON(http.StatusOK, gin.H{
		"path":      requestPath,
		"site_path": h.getSitePath(siteID),
		"files":     files,
	})
}

// UploadFiles handles file uploads
// @Summary Upload files
// @Description Upload files to a site's public folder
// @Tags files
// @Param id path string true "Site ID"
// @Accept multipart/form-data
// @Success 200 {object} map[string]interface{}
// @Router /api/sites/{id}/files [post]
func (h *FileHandler) UploadFiles(c *gin.Context) {
	siteID := c.Param("id")
	targetPath := c.DefaultPostForm("path", "/")
	extract := c.DefaultPostForm("extract", "false") == "true"
	
	fullPath, err := h.validatePath(siteID, targetPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Create target directory
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}
	
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}
	
	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}
	
	uploaded := make([]string, 0, len(files))
	
	for _, file := range files {
		filename := filepath.Base(file.Filename)
		destPath := filepath.Join(fullPath, filename)
		
		// Save the file
		if err := c.SaveUploadedFile(file, destPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":    "Failed to save file",
				"filename": filename,
			})
			return
		}
		
		uploaded = append(uploaded, filename)
		
		// Extract if requested and is an archive
		if extract && isArchive(filename) {
			if err := h.extractArchive(destPath, fullPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":    "Failed to extract archive",
					"filename": filename,
					"details":  err.Error(),
				})
				return
			}
			// Remove the archive after extraction
			os.Remove(destPath)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message":  "Files uploaded successfully",
		"uploaded": uploaded,
		"path":     targetPath,
	})
}

// DeleteFile deletes a file or directory
// @Summary Delete file
// @Description Delete a file or directory from a site's public folder
// @Tags files
// @Param id path string true "Site ID"
// @Param path query string true "File path to delete"
// @Success 200 {object} map[string]interface{}
// @Router /api/sites/{id}/files [delete]
func (h *FileHandler) DeleteFile(c *gin.Context) {
	siteID := c.Param("id")
	requestPath := c.Query("path")
	
	if requestPath == "" || requestPath == "/" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete root directory"})
		return
	}
	
	fullPath, err := h.validatePath(siteID, requestPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Check if path exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}
	
	// Remove file or directory
	if err := os.RemoveAll(fullPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Deleted successfully",
		"path":    requestPath,
	})
}

// CreateDirectory creates a new directory
// @Summary Create directory
// @Description Create a new directory in a site's public folder
// @Tags files
// @Param id path string true "Site ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/sites/{id}/files/mkdir [post]
func (h *FileHandler) CreateDirectory(c *gin.Context) {
	siteID := c.Param("id")
	
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	fullPath, err := h.validatePath(siteID, req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Directory created",
		"path":    req.Path,
	})
}

// isArchive checks if a file is a supported archive format
func isArchive(filename string) bool {
	lower := strings.ToLower(filename)
	return strings.HasSuffix(lower, ".zip") ||
		strings.HasSuffix(lower, ".tar") ||
		strings.HasSuffix(lower, ".tar.gz") ||
		strings.HasSuffix(lower, ".tgz")
}

// extractArchive extracts an archive to the destination
func (h *FileHandler) extractArchive(archivePath, destPath string) error {
	lower := strings.ToLower(archivePath)
	
	if strings.HasSuffix(lower, ".zip") {
		return h.extractZip(archivePath, destPath)
	}
	
	if strings.HasSuffix(lower, ".tar.gz") || strings.HasSuffix(lower, ".tgz") {
		return h.extractTarGz(archivePath, destPath)
	}
	
	if strings.HasSuffix(lower, ".tar") {
		return h.extractTar(archivePath, destPath)
	}
	
	return fmt.Errorf("unsupported archive format")
}

// extractZip extracts a zip file
func (h *FileHandler) extractZip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()
	
	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)
		
		// Security check
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path in archive")
		}
		
		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, 0755)
			continue
		}
		
		if err := os.MkdirAll(filepath.Dir(fpath), 0755); err != nil {
			return err
		}
		
		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}
		
		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}
		
		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()
		
		if err != nil {
			return err
		}
	}
	
	return nil
}

// extractTarGz extracts a .tar.gz file
func (h *FileHandler) extractTarGz(src, dest string) error {
	file, err := os.Open(src)
	if err != nil {
		return err
	}
	defer file.Close()
	
	gzr, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzr.Close()
	
	return h.extractTarReader(tar.NewReader(gzr), dest)
}

// extractTar extracts a .tar file
func (h *FileHandler) extractTar(src, dest string) error {
	file, err := os.Open(src)
	if err != nil {
		return err
	}
	defer file.Close()
	
	return h.extractTarReader(tar.NewReader(file), dest)
}

// extractTarReader extracts from a tar reader
func (h *FileHandler) extractTarReader(tr *tar.Reader, dest string) error {
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		
		fpath := filepath.Join(dest, header.Name)
		
		// Security check
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path in archive")
		}
		
		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(fpath, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(fpath), 0755); err != nil {
				return err
			}
			
			outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return err
			}
			
			if _, err := io.Copy(outFile, tr); err != nil {
				outFile.Close()
				return err
			}
			outFile.Close()
		}
	}
	
	return nil
}
