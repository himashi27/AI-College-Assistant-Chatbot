create table if not exists chat_sessions (
  session_id text primary key,
  user_id text,
  role text not null default 'student',
  language text not null default 'en',
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists chat_messages (
  message_id text primary key,
  session_id text not null references chat_sessions(session_id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  latency_ms integer not null default 0,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_id on chat_messages(session_id);
create index if not exists idx_chat_messages_created_at on chat_messages(created_at desc);

create table if not exists intent_logs (
  id bigserial primary key,
  session_id text not null references chat_sessions(session_id) on delete cascade,
  user_id text,
  intent text not null,
  query text not null,
  confidence numeric(4,3) not null default 0.500,
  created_at timestamptz not null default now()
);

create index if not exists idx_intent_logs_created_at on intent_logs(created_at desc);
create index if not exists idx_intent_logs_intent on intent_logs(intent);

create table if not exists feedback (
  id bigserial primary key,
  message_id text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_message_id on feedback(message_id);
create index if not exists idx_feedback_created_at on feedback(created_at desc);
