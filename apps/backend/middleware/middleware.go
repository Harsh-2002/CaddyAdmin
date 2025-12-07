package middleware

import (
	"log"
	"time"

	"caddyadmin/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupMiddleware configures all middleware for the Gin router
func SetupMiddleware(r *gin.Engine) {
	// CORS configuration for frontend
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Request logging
	// Rate limiting: 600 req/min (10 req/s) with burst of 50
	r.Use(RateLimitMiddleware(600, 50))
	
	r.Use(RequestLogger())

	// Recovery middleware
	r.Use(gin.Recovery())
}

// RequestLogger logs request details
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		log.Printf("[%d] %s %s %s %v",
			statusCode,
			method,
			path,
			clientIP,
			latency,
		)

		// Update metrics
		metrics := handlers.NewMetricsHandler()
		metrics.IncrementRequest()
		if statusCode >= 400 {
			metrics.IncrementError()
		}
	}
}
