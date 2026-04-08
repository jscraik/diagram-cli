CREATE TABLE users (
  id INT PRIMARY KEY
);

CREATE TABLE tickets (
  id INT PRIMARY KEY,
  user_id INT
);

CREATE TABLE comments (
  id INT PRIMARY KEY,
  user_id INT,
  ticket_id INT
);
