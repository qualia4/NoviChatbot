-- Migration for authentication and chat system
-- Creates users and messages tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    own BOOLEAN NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(username) ON DELETE CASCADE
);

-- Create index on datetime for efficient querying
CREATE INDEX IF NOT EXISTS idx_messages_datetime ON messages(datetime);

-- Create index on user_id for efficient querying
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);