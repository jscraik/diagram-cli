CREATE TABLE users (
  id INT,
  email TEXT,
  CONSTRAINT users_pk PRIMARY KEY (id),
  UNIQUE (email)
);

CREATE TABLE sessions (
  id INT PRIMARY KEY,
  user_id INT,
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
);
