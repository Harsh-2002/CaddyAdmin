package database

import (
	"caddyadmin/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Initialize sets up the database connection and runs migrations
func Initialize(dbPath string) error {
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // Silent mode for cleaner logs
	})
	if err != nil {
		return err
	}

	// Run migrations
	err = DB.AutoMigrate(
		&models.Site{},
		&models.Route{},
		&models.Upstream{},
		&models.UpstreamGroup{},
		&models.TLSConfig{},
		&models.ConfigHistory{},
		&models.GlobalSettings{},
		&models.BasicAuthUser{},
		&models.HeaderRule{},
		&models.AccessRule{},
		&models.RewriteRule{},
		&models.RedirectRule{},
		&models.MiddlewareSettings{},
		&models.AdminUser{},
		&models.APIKey{},
		&models.CustomCertificate{},
		&models.DNSProvider{},
	)
	if err != nil {
		return err
	}

	log.Println("Database initialized")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// Close closes the database connection
func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
