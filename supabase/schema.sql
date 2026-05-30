-- Atoms Demo Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  current_code text,
  model_provider text default 'claude',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- generated_files
create table generated_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version int not null default 1,
  filename text not null,
  content text not null,
  language text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table projects enable row level security;
alter table messages enable row level security;
alter table generated_files enable row level security;

-- Policies: users can only access their own projects
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Messages: accessible if user owns the project
create policy "Users can view project messages"
  on messages for select
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can create messages"
  on messages for insert
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- Generated files: accessible if user owns the project
create policy "Users can view project files"
  on generated_files for select
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can create files"
  on generated_files for insert
  with check (project_id in (select id from projects where user_id = auth.uid()));
