CREATE TABLE auth.users (
  id INT PRIMARY KEY
);

CREATE TABLE auth.sessions (
  id INT PRIMARY KEY,
  user_id INT REFERENCES auth.users(id)
);
