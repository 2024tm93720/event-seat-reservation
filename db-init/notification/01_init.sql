CREATE DATABASE IF NOT EXISTS notification_db;
USE notification_db;
CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id VARCHAR(60),
  channel ENUM('EMAIL','SMS') DEFAULT 'EMAIL',
  subject VARCHAR(200),
  body TEXT,
  status ENUM('SENT','FAILED','PENDING') DEFAULT 'SENT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX(user_id), INDEX(order_id)
);
