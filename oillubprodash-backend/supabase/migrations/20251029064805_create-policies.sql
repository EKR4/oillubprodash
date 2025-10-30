-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- User profiles policies
CREATE POLICY "Users can view their own user profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own user profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Companies policies
CREATE POLICY "Anyone can view active companies"
    ON public.companies
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Company admins can update their company"
    ON public.companies
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.company_id = companies.id
        AND profiles.id = auth.uid()
        AND profiles.role = 'company'
    ));

-- Admin users policies
CREATE POLICY "Only admins can access admin_users"
    ON public.admin_users
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Session management policies
CREATE POLICY "Users can view their own sessions"
    ON public.user_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can invalidate their own sessions"
    ON public.user_sessions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- MFA policies
CREATE POLICY "Users can manage their own MFA settings"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Security monitoring policies
CREATE POLICY "Only admins can view auth failures"
    ON public.auth_failures
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Additional admin policies
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

CREATE POLICY "Admins can update all profiles"
    ON public.profiles
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));