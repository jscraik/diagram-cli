CREATE TABLE users (
  id INTEGER,
  email TEXT,
  PRIMARY KEY (id),
  UNIQUE (email)
);

CREATE TABLE sessions (
  id INTEGER,
  user_id INTEGER,
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
);
