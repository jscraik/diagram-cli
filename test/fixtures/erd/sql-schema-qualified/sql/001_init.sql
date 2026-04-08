CREATE TABLE public.users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE
);

CREATE TABLE public.sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id)
);
