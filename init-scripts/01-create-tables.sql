-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS camagru;
USE camagru;

-- Create avatars table
CREATE TABLE IF NOT EXISTS avatars
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	file_path VARCHAR(255) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(255) NOT NULL UNIQUE,
	email VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	salt VARCHAR(32) NOT NULL,
	avatar_id INT,
	email_notifications BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	is_verified BOOLEAN DEFAULT FALSE,
	verification_token VARCHAR(255),
	reset_token VARCHAR(255),
	reset_token_expires TIMESTAMP DEFAULT NULL,
	FOREIGN KEY (avatar_id) REFERENCES avatars(id)
	ON DELETE SET NULL
);

-- Create assets table (for superposable images)
CREATE TABLE IF NOT EXISTS assets
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	file_path VARCHAR(255) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create images table
CREATE TABLE IF NOT EXISTS images
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	file_path VARCHAR(255) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id)
	ON DELETE CASCADE
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	image_id INT NOT NULL,
	user_id INT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (image_id) REFERENCES images(id)
	ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id)
	ON DELETE CASCADE,
	UNIQUE KEY unique_like (image_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	image_id INT NOT NULL,
	user_id INT NOT NULL,
	comment_text TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (image_id) REFERENCES images(id)
	ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id)
	ON DELETE CASCADE
);

-- Insert default avatars (adjust paths according to your structure)
INSERT INTO avatars (name, file_path) VALUES
('Avatar_1', '/assets/avatars/avatar_1.png'),
('Avatar_2', '/assets/avatars/avatar_2.png');
