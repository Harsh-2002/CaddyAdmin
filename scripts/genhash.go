package main

import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run genhash.go YOUR_PASSWORD")
		os.Exit(1)
	}

	password := os.Args[1]
	
	// Use cost 12 for fast authentication (~100ms)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\n✅ Generated bcrypt hash (cost 10):\n\n%s\n\n", string(hash))
	fmt.Println("Copy this to your .env file (with single quotes):")
	fmt.Printf("ADMIN_PASSWORD_HASH='%s'\n\n", string(hash))
}
