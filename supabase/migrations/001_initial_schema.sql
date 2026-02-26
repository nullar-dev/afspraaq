-- Create profiles table for user data
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'user' check (role in ('user', 'admin')) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policy: Users can read their own profile
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

-- Policy: Users can update their own profile
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Policy: Users can insert their own profile (for trigger-created profiles)
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Note: Admin policies will be added when admin features are implemented
-- For now, use service_role key in migrations or direct DB access for admin operations

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Rate limiting: Configure Supabase Auth rate limits
-- These settings limit failed login attempts
-- Note: Configure via Supabase Dashboard > Authentication > Rate Limits
-- Or via gotrue.yml in self-hosted Supabase

-- Enable email confirmations (recommended for production)
-- Users will receive confirmation email before account is activated
