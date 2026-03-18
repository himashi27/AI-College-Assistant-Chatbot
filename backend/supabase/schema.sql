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

-- Academic domain tables for deterministic routing.
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  aliases text[] not null default '{}',
  department text,
  semester integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists portal_pages (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  page_type text not null check (page_type in ('attendance', 'syllabus', 'fees', 'assignment', 'other')),
  title text not null,
  url_path text not null,
  section_anchor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_portal_pages_subject_page_type
  on portal_pages(subject_id, page_type);
create index if not exists idx_portal_pages_page_type on portal_pages(page_type);
create index if not exists idx_portal_pages_url_path on portal_pages(url_path);

create table if not exists fee_items (
  id uuid primary key default gen_random_uuid(),
  program text,
  semester integer,
  fee_type text not null,
  amount numeric(10,2),
  currency text not null default 'INR',
  due_date date,
  page_id uuid references portal_pages(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fee_items_program_semester on fee_items(program, semester);
create index if not exists idx_fee_items_due_date on fee_items(due_date);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  description text,
  assigned_date date,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'submitted', 'overdue', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  page_id uuid references portal_pages(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assignments_subject_id on assignments(subject_id);
create index if not exists idx_assignments_due_date on assignments(due_date);
create index if not exists idx_assignments_status on assignments(status);
create unique index if not exists uq_assignments_subject_title_due
  on assignments(subject_id, title, due_date);

create table if not exists keyword_routes (
  id uuid primary key default gen_random_uuid(),
  phrase text not null unique,
  intent text not null,
  subject_id uuid references subjects(id) on delete set null,
  page_id uuid references portal_pages(id) on delete set null,
  priority integer not null default 100,
  is_regex boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_keyword_routes_intent on keyword_routes(intent);
create index if not exists idx_keyword_routes_priority on keyword_routes(priority);

-- Student domain tables for DB-first section reads.
create table if not exists student_profiles (
  student_id text primary key,
  full_name text not null,
  email text,
  semester integer,
  program text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_subjects (
  id bigserial primary key,
  student_id text not null references student_profiles(student_id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(student_id, subject_id)
);

create table if not exists student_attendance (
  id bigserial primary key,
  student_id text not null references student_profiles(student_id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  attended_classes integer not null default 0,
  total_classes integer not null default 0,
  attendance_percentage numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique(student_id, subject_id)
);

create index if not exists idx_student_attendance_student_id on student_attendance(student_id);
create index if not exists idx_student_attendance_subject_id on student_attendance(subject_id);

create table if not exists student_performance (
  id bigserial primary key,
  student_id text not null references student_profiles(student_id) on delete cascade,
  semester text not null,
  gpa numeric(3,2),
  marks_page_url text,
  updated_at timestamptz not null default now(),
  unique(student_id, semester)
);

create index if not exists idx_student_performance_student_id on student_performance(student_id);
