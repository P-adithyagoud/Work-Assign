-- ============================================================
-- AI PROJECT MANAGER — SUPABASE SCHEMA
-- Safe to re-run. Run this in Supabase Dashboard → SQL Editor
-- ============================================================


-- ──────────────────────────────────────────────
-- TABLE: analyses
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analyses (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID    NOT NULL,
    user_email    TEXT,
    project_name  TEXT    NOT NULL,
    result        JSONB   NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id    ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);

-- Grant access to all Supabase roles
GRANT ALL ON public.analyses TO postgres, anon, authenticated, service_role;

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Disable RLS — access is controlled by Flask JWT verification
-- ──────────────────────────────────────────────
ALTER TABLE public.analyses DISABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────
-- TABLE: profiles (optional)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id           UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT,
    full_name    TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
