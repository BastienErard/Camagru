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

-- Create stickers table (pour les images superposables)
CREATE TABLE IF NOT EXISTS stickers
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	file_path VARCHAR(255) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create photos table (remplace la table images pour l'édition)
CREATE TABLE IF NOT EXISTS photos
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	file_path VARCHAR(255) NOT NULL,
	thumbnail_path VARCHAR(255) NOT NULL,
	is_gif BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES users(id)
	ON DELETE CASCADE
);

-- Create likes table (référence maintenant la table photos)
CREATE TABLE IF NOT EXISTS likes
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	photo_id INT NOT NULL,
	user_id INT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (photo_id) REFERENCES photos(id)
	ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id)
	ON DELETE CASCADE,
	UNIQUE KEY unique_like (photo_id, user_id)
);

-- Create comments table (référence maintenant la table photos)
CREATE TABLE IF NOT EXISTS comments
(
	id INT AUTO_INCREMENT PRIMARY KEY,
	photo_id INT NOT NULL,
	user_id INT NOT NULL,
	comment_text TEXT NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (photo_id) REFERENCES photos(id)
	ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id)
	ON DELETE CASCADE
);

-- Insert default avatars
INSERT INTO avatars (name, file_path) VALUES
('Avatar_1', '/assets/avatars/avatar_1.png'),
('Avatar_2', '/assets/avatars/avatar_2.png');

-- Insert default stickers
INSERT INTO stickers (name, file_path) VALUES
('Sorry', '/assets/stickers/desole.png'),
('Help me', '/assets/stickers/aide-moi.png'),
('Coffee', '/assets/stickers/cafe.png'),
('Notation', '/assets/stickers/notation.png');

