create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  xp int not null default 0,
  streak_count int not null default 0,
  last_checkin_date date,
  created_at timestamp with time zone default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  image_url text,
  color text,
  category text,
  style_tags text[],
  date_added timestamp default now(),
  last_worn_fake date,
  condition_notes text,
  tags_source text default 'manual' -- 'ai' or 'manual'
);
