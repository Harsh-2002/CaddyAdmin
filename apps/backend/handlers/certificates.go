package handlers

import (
	"caddyadmin/database"
	"caddyadmin/models"
	"crypto/x509"
	"encoding/pem"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type CertificateHandler struct{}

func NewCertificateHandler(storagePath string) *CertificateHandler {
	// storagePath is ignored - we store in DB now
	return &CertificateHandler{}
}

// GetCertificates lists all custom certificates
// GET /api/certificates
func (h *CertificateHandler) GetCertificates(c *gin.Context) {
	var certs []models.CustomCertificate
	if err := database.GetDB().Find(&certs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch certificates"})
		return
	}

	// Parse JSON domains
	for i := range certs {
		if certs[i].DomainsJSON != "" {
			json.Unmarshal([]byte(certs[i].DomainsJSON), &certs[i].Domains)
		}
	}

	c.JSON(http.StatusOK, gin.H{"certificates": certs})
}

// GetCertificate returns a single certificate with its PEM content (for Caddy config)
// GET /api/certificates/:id
func (h *CertificateHandler) GetCertificate(c *gin.Context) {
	id := c.Param("id")

	var cert models.CustomCertificate
	if err := database.GetDB().First(&cert, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}

	// Parse domains
	if cert.DomainsJSON != "" {
		json.Unmarshal([]byte(cert.DomainsJSON), &cert.Domains)
	}

	// Return with PEM content for Caddy integration
	c.JSON(http.StatusOK, gin.H{
		"id":          cert.ID,
		"name":        cert.Name,
		"domains":     cert.Domains,
		"cert_pem":    cert.CertPEM,
		"key_pem":     cert.KeyPEM, // Only exposed via this specific endpoint
		"expires_at":  cert.ExpiresAt,
		"created_at":  cert.CreatedAt,
	})
}

// UploadCertificate handles certificate file upload and stores content in DB
// POST /api/certificates
func (h *CertificateHandler) UploadCertificate(c *gin.Context) {
	name := c.PostForm("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	// Get files
	certFile, err := c.FormFile("cert_file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Certificate file is required"})
		return
	}
	keyFile, err := c.FormFile("key_file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Private key file is required"})
		return
	}

	// Read certificate content
	certReader, err := certFile.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read certificate file"})
		return
	}
	defer certReader.Close()
	certPEM, err := io.ReadAll(certReader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read certificate content"})
		return
	}

	// Read key content
	keyReader, err := keyFile.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read key file"})
		return
	}
	defer keyReader.Close()
	keyPEM, err := io.ReadAll(keyReader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read key content"})
		return
	}

	// Parse certificate to get domains and expiration
	domains, expiresAt, err := parseCertificateFromPEM(certPEM)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid certificate: " + err.Error()})
		return
	}

	// Validate that the key is a valid PEM block
	keyBlock, _ := pem.Decode(keyPEM)
	if keyBlock == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid private key: not a valid PEM block"})
		return
	}

	domainsJSON, _ := json.Marshal(domains)

	// Save to DB
	cert := models.CustomCertificate{
		Name:        name,
		DomainsJSON: string(domainsJSON),
		Domains:     domains,
		CertPEM:     string(certPEM),
		KeyPEM:      string(keyPEM),
		ExpiresAt:   expiresAt,
	}

	if err := database.GetDB().Create(&cert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save certificate record"})
		return
	}

	c.JSON(http.StatusCreated, cert)
}

// DeleteCertificate deletes a certificate from the database
// DELETE /api/certificates/:id
func (h *CertificateHandler) DeleteCertificate(c *gin.Context) {
	id := c.Param("id")

	var cert models.CustomCertificate
	if err := database.GetDB().First(&cert, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}

	// Delete from DB
	if err := database.GetDB().Delete(&cert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete certificate record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Certificate deleted"})
}

// Helper to parse x509 certificate from PEM bytes
func parseCertificateFromPEM(pemData []byte) ([]string, time.Time, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, time.Time{}, fmt.Errorf("failed to decode PEM block")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, time.Time{}, err
	}

	domains := cert.DNSNames
	if len(domains) == 0 && cert.Subject.CommonName != "" {
		domains = []string{cert.Subject.CommonName}
	}

	return domains, cert.NotAfter, nil
}
