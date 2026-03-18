-- Seed data for deterministic route testing.
-- Run after schema.sql.

insert into subjects (code, name, aliases, department, semester)
values
  ('DBMS101', 'DBMS', array['dbms', 'database'], 'CSE', 3),
  ('OS201', 'Operating Systems', array['os', 'operating systems'], 'CSE', 4),
  ('CN301', 'Computer Networks', array['cn', 'computer networks', 'networking'], 'CSE', 4),
  ('DSA102', 'Data Structures', array['dsa', 'data structures'], 'CSE', 2),
  ('MATH101', 'Mathematics', array['math', 'maths', 'mathematics'], 'CSE', 1),
  ('AI401', 'Artificial Intelligence', array['ai', 'artificial intelligence'], 'CSE', 5),
  ('SE202', 'Software Engineering', array['se', 'software engineering'], 'CSE', 4),
  ('JAVA105', 'Java Programming', array['java', 'oop java'], 'CSE', 2)
on conflict (code) do update
set name = excluded.name,
    aliases = excluded.aliases,
    department = excluded.department,
    semester = excluded.semester,
    updated_at = now();

insert into portal_pages (subject_id, page_type, title, url_path)
select
  s.id,
  'attendance',
  s.name || ' Attendance',
  '/attendance/' ||
  case s.code
    when 'DBMS101' then 'dbms'
    when 'OS201' then 'os'
    when 'CN301' then 'cn'
    when 'DSA102' then 'dsa'
    when 'MATH101' then 'maths'
    when 'AI401' then 'ai'
    when 'SE202' then 'se'
    when 'JAVA105' then 'java'
    else lower(s.code)
  end
from subjects s
on conflict (subject_id, page_type) do update
set title = excluded.title,
    url_path = excluded.url_path,
    updated_at = now();

insert into portal_pages (subject_id, page_type, title, url_path)
select
  s.id,
  'syllabus',
  s.name || ' Syllabus',
  '/syllabus/' ||
  case s.code
    when 'DBMS101' then 'dbms'
    when 'OS201' then 'os'
    when 'CN301' then 'cn'
    when 'DSA102' then 'dsa'
    when 'MATH101' then 'maths'
    when 'AI401' then 'ai'
    when 'SE202' then 'se'
    when 'JAVA105' then 'java'
    else lower(s.code)
  end
from subjects s
on conflict (subject_id, page_type) do update
set title = excluded.title,
    url_path = excluded.url_path,
    updated_at = now();

insert into portal_pages (subject_id, page_type, title, url_path)
select
  s.id,
  'assignment',
  s.name || ' Assignments',
  '/assignments/' ||
  case s.code
    when 'DBMS101' then 'dbms'
    when 'OS201' then 'os'
    when 'CN301' then 'cn'
    when 'DSA102' then 'dsa'
    when 'MATH101' then 'maths'
    when 'AI401' then 'ai'
    when 'SE202' then 'se'
    when 'JAVA105' then 'java'
    else lower(s.code)
  end
from subjects s
on conflict (subject_id, page_type) do update
set title = excluded.title,
    url_path = excluded.url_path,
    updated_at = now();

insert into portal_pages (subject_id, page_type, title, url_path, metadata)
values
  (null, 'fees', 'Fees Overview', '/fees/overview', '{"scope":"global"}'::jsonb)
on conflict do nothing;

insert into keyword_routes (phrase, intent, priority)
values
  ('attendance dbms', 'NAV_ATTENDANCE', 10),
  ('dbms attendance', 'NAV_ATTENDANCE', 10),
  ('attendance maths', 'NAV_ATTENDANCE', 10),
  ('maths attendance', 'NAV_ATTENDANCE', 10),
  ('dbms syllabus', 'NAV_SYLLABUS', 10),
  ('syllabus dbms', 'NAV_SYLLABUS', 10),
  ('fees', 'NAV_FEES', 20),
  ('fee', 'NAV_FEES', 20),
  ('tuition fees', 'NAV_FEES', 20),
  ('due assignment', 'PARSE_ASSIGNMENTS', 15),
  ('assignment due', 'PARSE_ASSIGNMENTS', 15)
on conflict (phrase) do update
set intent = excluded.intent,
    priority = excluded.priority,
    updated_at = now();

insert into assignments (subject_id, title, description, assigned_date, due_date, status, priority)
select s.id, 'Normalization Case Study', 'Design a 3NF schema for library data.', '2026-03-01', '2026-03-10', 'open', 'high'
from subjects s where s.code = 'DBMS101'
on conflict (subject_id, title, due_date) do update
set description = excluded.description,
    assigned_date = excluded.assigned_date,
    status = excluded.status,
    priority = excluded.priority,
    updated_at = now();

insert into assignments (subject_id, title, description, assigned_date, due_date, status, priority)
select s.id, 'ER Diagram Draft', 'Create ER model for hostel management.', '2026-03-02', '2026-03-12', 'open', 'normal'
from subjects s where s.code = 'DBMS101'
on conflict (subject_id, title, due_date) do update
set description = excluded.description,
    assigned_date = excluded.assigned_date,
    status = excluded.status,
    priority = excluded.priority,
    updated_at = now();

insert into assignments (subject_id, title, description, assigned_date, due_date, status, priority)
select s.id, 'Process Synchronization Notes', 'Short report on deadlock handling.', '2026-03-03', '2026-03-14', 'open', 'normal'
from subjects s where s.code = 'OS201'
on conflict (subject_id, title, due_date) do update
set description = excluded.description,
    assigned_date = excluded.assigned_date,
    status = excluded.status,
    priority = excluded.priority,
    updated_at = now();

-- Student seeds for DB-first reads.
insert into student_profiles (student_id, full_name, email, semester, program)
values
  ('AI23001', 'Rahul Verma', 'rahul.verma@college.edu', 3, 'BTech AI'),
  ('AI23002', 'Aditi Singh', 'aditi.singh@college.edu', 3, 'BTech AI')
on conflict (student_id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    semester = excluded.semester,
    program = excluded.program,
    updated_at = now();

insert into student_subjects (student_id, subject_id)
select 'AI23001', s.id from subjects s where s.code in ('DBMS101', 'AI402', 'AI305')
on conflict (student_id, subject_id) do nothing;

insert into student_subjects (student_id, subject_id)
select 'AI23002', s.id from subjects s where s.code in ('DBMS101', 'AI402', 'AI305')
on conflict (student_id, subject_id) do nothing;

insert into student_attendance (student_id, subject_id, attended_classes, total_classes, attendance_percentage)
select 'AI23001', s.id, 43, 50, 86.00 from subjects s where s.code = 'DBMS101'
on conflict (student_id, subject_id) do update
set attended_classes = excluded.attended_classes,
    total_classes = excluded.total_classes,
    attendance_percentage = excluded.attendance_percentage,
    updated_at = now();

insert into student_attendance (student_id, subject_id, attended_classes, total_classes, attendance_percentage)
select 'AI23001', s.id, 45, 50, 91.00 from subjects s where s.code = 'AI402'
on conflict (student_id, subject_id) do update
set attended_classes = excluded.attended_classes,
    total_classes = excluded.total_classes,
    attendance_percentage = excluded.attendance_percentage,
    updated_at = now();

insert into student_attendance (student_id, subject_id, attended_classes, total_classes, attendance_percentage)
select 'AI23001', s.id, 44, 50, 88.00 from subjects s where s.code = 'AI305'
on conflict (student_id, subject_id) do update
set attended_classes = excluded.attended_classes,
    total_classes = excluded.total_classes,
    attendance_percentage = excluded.attendance_percentage,
    updated_at = now();

insert into student_performance (student_id, semester, gpa, marks_page_url)
values
  ('AI23001', 'sem3', 8.20, '/performance/AI23001/sem3'),
  ('AI23001', 'sem5', 8.50, '/performance/AI23001/sem5')
on conflict (student_id, semester) do update
set gpa = excluded.gpa,
    marks_page_url = excluded.marks_page_url,
    updated_at = now();
