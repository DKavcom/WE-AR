create table challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  item_id uuid references items(id),
  type text default 'wear',
  deadline date,
  status text default 'active',
  created_at timestamp default now()
);

alter table items add column is_duplicate_of uuid references items(id);
