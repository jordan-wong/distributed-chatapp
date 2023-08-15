package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-redis/redis"
	"github.com/gorilla/websocket"
)

var redisChannelName = "messages" // Redis Pub/Sub channel name

type Message struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	Topic       string    `json:"topic"`
	Content     string    `json:"content"`
	IsEphemeral bool      `json:"isEphem"`
	Timestamp   time.Time `json:"timestamp"`
}

var (
	redisClient *redis.Client
	upgrader    = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true // allow all connections
		},
	}
)

func handleConnection(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	log.Println("succesffully connected..")
	defer func() {
		// Remove client from the clients map and close connection
		log.Println("Closing", conn)
		conn.Close()

	}()

	// Subscribe to the Redis Pub/Sub channel for receiving messages
	redisClient := redis.NewClient(&redis.Options{
		Addr: "redis:6379",
	})
	subscriber := redisClient.Subscribe(redisChannelName)
	defer subscriber.Close()

	// Goroutine to receive Redis Pub/Sub messages and send them to the client
	go func() {
		for {
			msg, err := subscriber.ReceiveMessage()
			if err != nil {
				log.Println(err)
				break
			}
			err = conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
			if err != nil {
				log.Println(err)
				break
			}
		}
	}()

	// Goroutine to write initial messages to client
	go func() {
		// Write the initial messages to the client
		messages, err := redisClient.LRange(redisChannelName, 0, -1).Result()
		if err != nil {
			log.Println(err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		for _, messageJSON := range messages {
			var messageData Message
			err = json.Unmarshal([]byte(messageJSON), &messageData)
			if err != nil {
				log.Println(err)
				continue
			}

			messageBytes, err := json.Marshal(messageData)
			if err != nil {
				log.Println(err)
				continue
			}

			err = conn.WriteMessage(websocket.TextMessage, messageBytes)
			if err != nil {
				log.Println(err)
				return
			}
		}
	}()

	// Listen for messages from the client
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}

		// Parse the message
		var messageData Message
		err = json.Unmarshal(message, &messageData)
		if err != nil {
			log.Println(err)
			break
		}

		// Add the timestamp to the message
		messageData.Timestamp = time.Now()

		messageJSON, _ := json.Marshal(messageData)

		// Store the message in Redis if the message is not marked as "ephemeral"
		if messageData.IsEphemeral != true {
			err = redisClient.RPush("messages", messageJSON).Err()
			log.Println("storing message")
			if err != nil {
				log.Println(err)
				break
			}
		}

		// Broadcast the message to all connected clients
		err = redisClient.Publish("messages", messageJSON).Err()
		if err != nil {
			log.Println(err)
			break
		}
	}
}

func main() {
	// connect to Redis
	redisClient = redis.NewClient(&redis.Options{
		Addr: "redis:6379",
	})

	// // Serve static files from the "public" directory
	// fs := http.FileServer(http.Dir("public"))
	// http.Handle("/", fs)

	// Handle WebSocket connections
	http.HandleFunc("/ws", handleConnection)

	// Start the server
	fmt.Println("Listening on port 14222")
	err := http.ListenAndServe(":14222", nil)
	if err != nil {
		log.Fatal(err)
	}
}
