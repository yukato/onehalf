-- Create onehalf user with no password for local development
CREATE USER IF NOT EXISTS 'onehalf'@'%' IDENTIFIED WITH mysql_native_password BY '';
GRANT ALL PRIVILEGES ON onehalf.* TO 'onehalf'@'%';
FLUSH PRIVILEGES;
