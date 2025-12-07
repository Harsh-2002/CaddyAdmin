package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type IPRateLimiter struct {
	ips map[string]*rate.Limiter
	mu  *sync.RWMutex
	r   rate.Limit
	b   int
}

// NewIPRateLimiter creates a new rate limiter with r requests per second and burst b
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	i := &IPRateLimiter{
		ips: make(map[string]*rate.Limiter),
		mu:  &sync.RWMutex{},
		r:   r,
		b:   b,
	}

	// Periodic cleanup of old IPs to prevent memory leak
	go i.cleanupLoop()

	return i
}

// AddIP creates a new limiter for an IP if it doesn't exist
func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	limiter, exists := i.ips[ip]
	if !exists {
		limiter = rate.NewLimiter(i.r, i.b)
		i.ips[ip] = limiter
	}

	return limiter
}

func (i *IPRateLimiter) cleanupLoop() {
	for {
		time.Sleep(10 * time.Minute)
		i.mu.Lock()
		// Simple approach: clear all to avoid complexity of tracking last access
		// In production, you'd want a proper LRU or timestamp tracking
		i.ips = make(map[string]*rate.Limiter)
		i.mu.Unlock()
	}
}

// RateLimitMiddleware applies rate limiting per IP
func RateLimitMiddleware(limit int, burst int) gin.HandlerFunc {
    // Convert limit (req/s)
	// Example: 100 req/min = 1.6 req/s
    // User asked for ~100 req/min. 
    // we use limit as req/s. 
    // Let's assume input limit is req/second for simplicity or adjust.
    // Actually, "100 req/min" is ~1.66 rps.
    // Let's use a standard default of 5 rps (300/min) for API to be safe, or allow config.
    // The specific request was "100 req/min". That is rate.Limit(100.0/60.0).
    
    rps := rate.Limit(float64(limit) / 60.0) 
	limiter := NewIPRateLimiter(rps, burst)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.GetLimiter(ip).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			return
		}
		c.Next()
	}
}
