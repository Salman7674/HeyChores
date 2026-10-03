-- ==============================================================================
-- HeyChores: Supabase Database Migration
-- Roommate Task Rotation System
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Group Members Table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  interval_type TEXT NOT NULL CHECK (interval_type IN ('days', 'weeks', 'months')) DEFAULT 'days',
  interval_value INTEGER NOT NULL DEFAULT 3 CHECK (interval_value > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Task Rotation Table
CREATE TABLE IF NOT EXISTS public.task_rotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(task_id, position),
  UNIQUE(task_id, user_id)
);

-- 6. Task State Table
CREATE TABLE IF NOT EXISTS public.task_state (
  task_id UUID PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  current_rotation_position INTEGER NOT NULL DEFAULT 0,
  current_assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  last_completed_at TIMESTAMPTZ,
  last_completed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_due_at TIMESTAMPTZ NOT NULL,
  next_reminder_at TIMESTAMPTZ,
  last_reminded_at TIMESTAMPTZ,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Away Periods Table
CREATE TABLE IF NOT EXISTS public.away_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

-- 8. Task Completions Table (History)
CREATE TABLE IF NOT EXISTS public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  was_exchanged BOOLEAN NOT NULL DEFAULT FALSE,
  original_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT
);

-- 9. Turn Exchanges Table
CREATE TABLE IF NOT EXISTS public.turn_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  original_assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  replacement_assignee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurrence_id TEXT NOT NULL,
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Notification Subscriptions (Web Push)
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  browser TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. In-App Notifications
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'due',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_group ON public.tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_task_rotation_task ON public.task_rotation(task_id);
CREATE INDEX IF NOT EXISTS idx_away_periods_user ON public.away_periods(user_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_task_completions_task ON public.task_completions(task_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON public.in_app_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_state_reminders ON public.task_state(next_reminder_at) WHERE is_paused = FALSE;

-- ==============================================================================
-- Automatic Profile Creation on Signup Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_rotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.away_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turn_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is member of group
CREATE OR REPLACE FUNCTION public.is_member_of_group(lookup_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = lookup_group_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Check if current user is admin of group
CREATE OR REPLACE FUNCTION public.is_admin_of_group(lookup_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = lookup_group_id
      AND admin_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: Anyone authenticated can read profiles; users can update their own
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Groups: Members can read groups; authenticated users can create; admins can update/delete
CREATE POLICY "Read groups" ON public.groups FOR SELECT USING (public.is_member_of_group(id));
CREATE POLICY "Create group" ON public.groups FOR INSERT WITH CHECK (auth.uid() = admin_user_id);
CREATE POLICY "Update group" ON public.groups FOR UPDATE USING (public.is_admin_of_group(id));
CREATE POLICY "Delete group" ON public.groups FOR DELETE USING (public.is_admin_of_group(id));

-- Group Members: Members can read fellow members; users can join via code; admins can manage
CREATE POLICY "Read group members" ON public.group_members FOR SELECT USING (public.is_member_of_group(group_id));
CREATE POLICY "Join group" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage members" ON public.group_members FOR ALL USING (public.is_admin_of_group(group_id) OR auth.uid() = user_id);

-- Tasks: Members can read tasks; Admins can manage tasks
CREATE POLICY "Read tasks" ON public.tasks FOR SELECT USING (public.is_member_of_group(group_id));
CREATE POLICY "Admin manage tasks" ON public.tasks FOR ALL USING (public.is_admin_of_group(group_id));

-- Task Rotation & Task State: Group members can read; Admins and members can update state on completion
CREATE POLICY "Read task rotation" ON public.task_rotation FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_member_of_group(t.group_id))
);
CREATE POLICY "Admin manage task rotation" ON public.task_rotation FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_admin_of_group(t.group_id))
);

CREATE POLICY "Read task state" ON public.task_state FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_member_of_group(t.group_id))
);
CREATE POLICY "Update task state" ON public.task_state FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_member_of_group(t.group_id))
);
CREATE POLICY "Insert task state" ON public.task_state FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_admin_of_group(t.group_id))
);

-- Away periods: Group members can view away status; users can manage their own away periods
CREATE POLICY "Read away periods" ON public.away_periods FOR SELECT USING (public.is_member_of_group(group_id));
CREATE POLICY "Manage own away periods" ON public.away_periods FOR ALL USING (auth.uid() = user_id);

-- Task completions: Group members can read completions and insert new ones
CREATE POLICY "Read task completions" ON public.task_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_member_of_group(t.group_id))
);
CREATE POLICY "Insert task completion" ON public.task_completions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_member_of_group(t.group_id))
);

-- Turn exchanges: Group members can view; participants can insert/update
CREATE POLICY "Read turn exchanges" ON public.turn_exchanges FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_member_of_group(t.group_id))
);
CREATE POLICY "Manage turn exchanges" ON public.turn_exchanges FOR ALL USING (
  auth.uid() IN (original_assignee_id, replacement_assignee_id)
);

-- Notification Subscriptions: Users manage their own
CREATE POLICY "Manage own notification subscriptions" ON public.notification_subscriptions FOR ALL USING (auth.uid() = user_id);

-- In-App Notifications: Users view & update their own
CREATE POLICY "Manage own in-app notifications" ON public.in_app_notifications FOR ALL USING (auth.uid() = user_id);
