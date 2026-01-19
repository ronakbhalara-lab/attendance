-- Add password reset columns to Users table
ALTER TABLE Users ADD PasswordResetToken VARCHAR(255) NULL;
ALTER TABLE Users ADD PasswordResetExpiry DATETIME NULL;
