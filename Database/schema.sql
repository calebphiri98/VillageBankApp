-- VSLA Manase Management System - Complete Database Schema
CREATE DATABASE IF NOT EXISTS vsla_manase;
USE vsla_manase;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'treasurer', 'secretary', 'member') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Members
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    membership_number VARCHAR(20) UNIQUE NOT NULL,
    date_joined DATE NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Saving Cycles (New)
CREATE TABLE IF NOT EXISTS cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Savings
CREATE TABLE IF NOT EXISTS savings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    cycle_id INT,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    recorded_by INT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (cycle_id) REFERENCES cycles(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    cycle_id INT,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 10.00,
    status ENUM('pending', 'approved', 'repaid', 'defaulted') DEFAULT 'pending',
    due_date DATE,
    approved_by INT,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (cycle_id) REFERENCES cycles(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Loan Repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    recorded_by INT NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Share Out
CREATE TABLE IF NOT EXISTS share_out (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id INT NOT NULL,
    total_fund DECIMAL(12,2) NOT NULL,
    total_members INT NOT NULL,
    date_distributed DATE,
    distributed_by INT,
    FOREIGN KEY (cycle_id) REFERENCES cycles(id),
    FOREIGN KEY (distributed_by) REFERENCES users(id)
);

-- SMS Notifications Log
CREATE TABLE IF NOT EXISTS sms_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('sent', 'failed') DEFAULT 'sent',
    sent_by INT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sent_by) REFERENCES users(id)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sample Admin
INSERT INTO users (username, password, role, full_name, phone) 
VALUES ('admin', '$2b$10$8KzJ7v9pQmWvXzL5nRtY6uX7vPqR9sT2uV4wX8yZ0aB1cD2eF3gH4', 'admin', 'System Administrator', '0888123456');