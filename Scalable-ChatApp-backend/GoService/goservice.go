package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	PORT         string = ":6001"
	MongoDBURL   string = "mongodb://0.0.0.0:27017"
	DatabaseName string = "scalablechat"
)

var (
	client *mongo.Client
)

type GroupChatMessage struct {
	SenderID  string    `json:"senderId"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type OneOnOneChatMessage struct {
	SenderID   string    `json:"senderId"`
	ReceiverID string    `json:"receiverId"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
}

func initMongoDB() error {
	clientOptions := options.Client().ApplyURI(MongoDBURL)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	client, err = mongo.Connect(ctx, clientOptions)
	if err != nil {
		return err
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		return err
	}

	fmt.Println("Connected to MongoDB!")
	return nil
}

func fetchData(w http.ResponseWriter, r *http.Request) {
	// parts := strings.Split(r.URL.Path, "/")
	// username := parts[len(parts)-1]

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := client.Database(DatabaseName).Collection("groupchatmessages")
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		http.Error(w, "Error querying database", http.StatusInternalServerError)
		log.Println("Error querying database:", err)
		return
	}
	defer cursor.Close(ctx)
	var messages []GroupChatMessage
	for cursor.Next(ctx) {
		var message GroupChatMessage
		if err := cursor.Decode(&message); err != nil {
			http.Error(w, "Error decoding messages", http.StatusInternalServerError)
			log.Println("Error decoding messages:", err)
			return
		}
		messages = append(messages, message)
	}

	if err := cursor.Err(); err != nil {
		http.Error(w, "Error iterating cursor", http.StatusInternalServerError)
		log.Println("Error iterating cursor:", err)
		return
	}

	responseJSON, err := json.Marshal(messages)
	if err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		log.Println("Error encoding response:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

func main() {
	log.Println("Starting our simple http server.")

	err := initMongoDB()
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	http.HandleFunc("/api/chat/", fetchData)

	log.Println("Started on port", PORT)

	err = http.ListenAndServe(PORT, nil)
	if err != nil {
		log.Fatal(err)
	}
}
