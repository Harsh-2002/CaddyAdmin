package sse

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

// EventType defines the types of events that can be broadcast
type EventType string

const (
	EventMetrics   EventType = "metrics"
	EventLogs      EventType = "logs"
	EventSites     EventType = "sites"
	EventConfig    EventType = "config"
	EventHeartbeat EventType = "heartbeat"
)

// Event represents an SSE event
type Event struct {
	Type      EventType   `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

// Client represents a connected SSE client
type Client struct {
	ID          string
	Username    string
	Channel     chan Event
	Subscribed  map[EventType]bool
	ConnectedAt time.Time
	mu          sync.RWMutex
}

// Subscribe adds event type to client subscriptions
func (c *Client) Subscribe(eventType EventType) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Subscribed[eventType] = true
}

// Unsubscribe removes event type from client subscriptions
func (c *Client) Unsubscribe(eventType EventType) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.Subscribed, eventType)
}

// IsSubscribed checks if client is subscribed to event type
func (c *Client) IsSubscribed(eventType EventType) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Subscribed[eventType]
}

// Hub manages all SSE connections
type Hub struct {
	clients    map[string]*Client
	register   chan *Client
	unregister chan *Client
	broadcast  chan Event
	mu         sync.RWMutex
}

var (
	hub  *Hub
	once sync.Once
)

// GetHub returns the singleton SSE hub instance
func GetHub() *Hub {
	once.Do(func() {
		hub = &Hub{
			clients:    make(map[string]*Client),
			register:   make(chan *Client),
			unregister: make(chan *Client),
			broadcast:  make(chan Event, 100), // Buffered channel
		}
		go hub.run()
		go hub.heartbeat()
		log.Println("✅ SSE Hub initialized")
	})
	return hub
}

// run is the main loop for the hub
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			// Check if user already has a connection
			for id, existing := range h.clients {
				if existing.Username == client.Username {
					log.Printf("SSE: Closing existing connection for user %s", client.Username)
					close(existing.Channel)
					delete(h.clients, id)
				}
			}
			h.clients[client.ID] = client
			h.mu.Unlock()
			log.Printf("SSE: Client connected (ID: %s, User: %s, Total: %d)", 
				client.ID, client.Username, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				close(client.Channel)
				delete(h.clients, client.ID)
				log.Printf("SSE: Client disconnected (ID: %s, Total: %d)", 
					client.ID, len(h.clients))
			}
			h.mu.Unlock()

		case event := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				// Only send if client is subscribed to this event type
				// Heartbeats are always sent
				if event.Type == EventHeartbeat || client.IsSubscribed(event.Type) {
					select {
					case client.Channel <- event:
					default:
						// Channel full, skip this event for this client
						log.Printf("SSE: Dropping event for slow client %s", client.ID)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// heartbeat sends periodic heartbeat to keep connections alive
func (h *Hub) heartbeat() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		h.Broadcast(EventHeartbeat, map[string]interface{}{
			"status": "alive",
			"clients": h.ClientCount(),
		})
	}
}

// Register adds a new client to the hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Broadcast sends an event to all subscribed clients
func (h *Hub) Broadcast(eventType EventType, data interface{}) {
	event := Event{
		Type:      eventType,
		Data:      data,
		Timestamp: time.Now().UnixMilli(),
	}
	
	select {
	case h.broadcast <- event:
	default:
		log.Println("SSE: Broadcast channel full, dropping event")
	}
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// FormatSSE formats an event for SSE protocol
func FormatSSE(event Event) string {
	data, err := json.Marshal(event)
	if err != nil {
		return ""
	}
	return fmt.Sprintf("event: %s\ndata: %s\n\n", event.Type, string(data))
}

// NewClient creates a new SSE client
func NewClient(id, username string) *Client {
	return &Client{
		ID:          id,
		Username:    username,
		Channel:     make(chan Event, 50), // Buffered channel per client
		Subscribed:  make(map[EventType]bool),
		ConnectedAt: time.Now(),
	}
}
