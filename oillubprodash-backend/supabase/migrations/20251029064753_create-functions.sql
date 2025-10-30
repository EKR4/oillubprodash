-- Type for role permissions
CREATE TYPE role_permission AS ENUM (
    'manage_users',
    'manage_roles',
    'manage_products',
    'manage_orders',
    'manage_companies',
    'view_reports',
    'place_orders',
    'view_orders'
);

-- Function to get role permissions
CREATE OR REPLACE FUNCTION public.get_role_permissions(role_value user_role)
RETURNS role_permission[] AS $$
BEGIN
    RETURN CASE role_value
        WHEN 'admin' THEN ARRAY[
            'manage_users',
            'manage_roles',
            'manage_products',
            'manage_orders',
            'manage_companies',
            'view_reports',
            'place_orders',
            'view_orders'
        ]::role_permission[]
        WHEN 'company' THEN ARRAY[
            'manage_orders',
            'view_reports',
            'place_orders',
            'view_orders'
        ]::role_permission[]
        WHEN 'customer' THEN ARRAY[
            'place_orders',
            'view_orders'
        ]::role_permission[]
        ELSE ARRAY[]::role_permission[]
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Role hierarchy function with caching
CREATE OR REPLACE FUNCTION public.get_role_level(role_value user_role)
RETURNS INT AS $$
DECLARE
    cached_level INT;
BEGIN
    -- Check cache first
    cached_level := (SELECT current_setting('app.role_levels.' || role_value, true)::INT);
    IF cached_level IS NOT NULL THEN
        RETURN cached_level;
    END IF;

    -- Calculate level
    cached_level := CASE role_value
        WHEN 'admin' THEN 3
        WHEN 'company' THEN 2
        WHEN 'customer' THEN 1
        ELSE 0
    END;

    -- Cache the result
    PERFORM set_config('app.role_levels.' || role_value, cached_level::text, false);
    
    RETURN cached_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get first user status with error handling
CREATE OR REPLACE FUNCTION public.get_first_user_status()
RETURNS json AS $$
DECLARE
    user_count integer;
BEGIN
    -- Count number of users in profiles table
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    
    -- Return JSON with is_first flag and count
    RETURN json_build_object(
        'is_first', user_count = 0,
        'user_count', user_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', SQLERRM,
        'is_first', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit log function
CREATE OR REPLACE FUNCTION public.log_audit_event(
    event_type TEXT,
    user_id UUID,
    table_name TEXT,
    record_id UUID,
    old_data JSONB DEFAULT NULL,
    new_data JSONB DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        event_type,
        user_id,
        table_name,
        record_id,
        old_data,
        new_data,
        metadata,
        created_at
    ) VALUES (
        event_type,
        user_id,
        table_name,
        record_id,
        old_data,
        new_data,
        metadata,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    action_key TEXT,
    max_attempts INT,
    window_seconds INT
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INT;
BEGIN
    -- Clean up old entries
    DELETE FROM public.rate_limits
    WHERE action_key = check_rate_limit.action_key
    AND created_at < NOW() - (window_seconds || ' seconds')::INTERVAL;

    -- Get current count
    SELECT COUNT(*) INTO current_count
    FROM public.rate_limits
    WHERE action_key = check_rate_limit.action_key;

    -- Check if limit exceeded
    IF current_count >= max_attempts THEN
        RETURN FALSE;
    END IF;

    -- Log attempt
    INSERT INTO public.rate_limits (action_key, created_at)
    VALUES (action_key, NOW());

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and sanitize user data
CREATE OR REPLACE FUNCTION public.validate_user_data(
    user_data JSONB
) RETURNS TABLE (
    is_valid BOOLEAN,
    errors TEXT[],
    sanitized_data JSONB
) AS $$
DECLARE
    validation_errors TEXT[] := ARRAY[]::TEXT[];
    sanitized JSONB;
BEGIN
    -- Email validation
    IF user_data->>'email' IS NULL OR user_data->>'email' = '' THEN
        validation_errors := array_append(validation_errors, 'Email is required');
    ELSIF NOT (user_data->>'email' ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        validation_errors := array_append(validation_errors, 'Invalid email format');
    END IF;

    -- Name validation
    IF user_data->>'full_name' IS NULL OR length(user_data->>'full_name') < 2 THEN
        validation_errors := array_append(validation_errors, 'Full name is required and must be at least 2 characters');
    END IF;

    -- Phone validation if provided
    IF user_data->>'phone' IS NOT NULL AND NOT (user_data->>'phone' ~* '^\+?[1-9]\d{1,14}$') THEN
        validation_errors := array_append(validation_errors, 'Invalid phone number format');
    END IF;

    -- Sanitize data
    sanitized := jsonb_build_object(
        'email', lower(trim(user_data->>'email')),
        'full_name', trim(user_data->>'full_name'),
        'phone', CASE 
            WHEN user_data->>'phone' IS NOT NULL 
            THEN regexp_replace(user_data->>'phone', '[^+0-9]', '', 'g')
            ELSE NULL 
        END
    );

    -- Add additional fields if they exist
    IF user_data ? 'company_id' THEN
        sanitized := sanitized || jsonb_build_object('company_id', user_data->'company_id');
    END IF;

    RETURN QUERY SELECT 
        array_length(validation_errors, 1) IS NULL,
        validation_errors,
        sanitized;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Function to handle user creation with improved validation and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_value user_role;
    is_first_user boolean;
    validation_result RECORD;
    rate_limit_key TEXT;
BEGIN
    -- Rate limiting
    rate_limit_key := 'new_user_' || NEW.email;
    IF NOT public.check_rate_limit(rate_limit_key, 5, 300) THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
    END IF;

    -- Validate user data
    SELECT * INTO validation_result
    FROM public.validate_user_data(to_jsonb(NEW));

    IF NOT validation_result.is_valid THEN
        RAISE EXCEPTION 'Validation failed: %', array_to_string(validation_result.errors, ', ');
    END IF;

    -- Check if this is the first user with proper error handling
    BEGIN
        SELECT COUNT(*) = 0 INTO is_first_user FROM public.profiles;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error checking first user status: %', SQLERRM;
    END;

    -- Get role from metadata with improved error handling
    BEGIN
        user_role_value := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error and default to customer
        RAISE NOTICE 'Invalid role in metadata, defaulting to customer: %', SQLERRM;
        user_role_value := 'customer'::user_role;
    END;
    
    -- First user is always admin with role level validation
    IF is_first_user THEN
        user_role_value := 'admin'::user_role;
    ELSIF user_role_value = 'admin' AND NOT is_first_user THEN
        -- Only the first user can be admin through signup
        user_role_value := 'customer'::user_role;
        RAISE NOTICE 'Attempted admin creation when not first user, defaulting to customer';
    END IF;

    -- Transaction for atomic operations
    BEGIN
        -- Insert into profiles with full audit fields
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            is_active,
            created_at,
            updated_at,
            last_login
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            user_role_value,
            true,
            NOW(),
            NOW(),
            NOW()
        );
        
        -- Create user_profile entry with default preferences
        INSERT INTO public.user_profiles (
            user_id,
            is_default_address,
            newsletter_subscribed,
            sms_notifications,
            email_notifications,
            preferred_language,
            preferred_currency,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            true,
            false,
            false,
            true,
            COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
            COALESCE(NEW.raw_user_meta_data->>'preferred_currency', 'KES'),
            NOW(),
            NOW()
        );
        
        -- If admin, create admin_users entry with security settings
        IF user_role_value = 'admin' THEN
            INSERT INTO public.admin_users (
                id,
                department,
                access_level,
                managed_regions,
                permissions,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                'Administration',
                'full',
                ARRAY['all'],
                jsonb_build_object(
                    'can_manage_users', true,
                    'can_manage_roles', true,
                    'can_manage_products', true,
                    'can_manage_orders', true,
                    'can_manage_companies', true
                ),
                NOW(),
                NOW()
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE EXCEPTION 'Error in handle_new_user transaction: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle profile updates with validation
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate required fields
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RAISE EXCEPTION 'Email cannot be empty';
    END IF;
    
    -- Prevent role downgrades for admins if they're the only admin
    IF TG_TABLE_NAME = 'profiles' AND 
       OLD.role = 'admin' AND 
       NEW.role != 'admin' THEN
        IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') <= 1 THEN
            RAISE EXCEPTION 'Cannot downgrade the last admin user';
        END IF;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile update failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at timestamp with error handling
CREATE OR REPLACE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

CREATE OR REPLACE TRIGGER on_user_profile_updated
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

CREATE OR REPLACE TRIGGER on_company_updated
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

-- Function to get user activity stats
CREATE OR REPLACE FUNCTION public.get_user_activity_stats(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'last_login', p.last_login,
        'login_count', COALESCE((SELECT COUNT(*) FROM public.audit_logs WHERE event_type = 'LOGIN' AND record_id = user_id), 0),
        'orders_placed', COALESCE((SELECT COUNT(*) FROM public.orders WHERE user_id = get_user_activity_stats.user_id), 0),
        'total_spent', COALESCE((SELECT SUM(total_amount) FROM public.orders WHERE user_id = get_user_activity_stats.user_id), 0),
        'last_order_date', (SELECT MAX(created_at) FROM public.orders WHERE user_id = get_user_activity_stats.user_id),
        'profile_completion', (
            SELECT floor(COUNT(*) FILTER (WHERE value IS NOT NULL)::DECIMAL / COUNT(*)::DECIMAL * 100)
            FROM jsonb_each(to_jsonb(up))
            WHERE key IN ('street', 'city', 'state', 'postal_code', 'country', 'phone')
        )
    ) INTO stats
    FROM public.profiles p
    LEFT JOIN public.user_profiles up ON p.id = up.user_id
    WHERE p.id = user_id;

    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage authentication attempts and security
CREATE OR REPLACE FUNCTION public.handle_auth_attempt(
    p_email TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_success BOOLEAN,
    p_failure_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_attempt_count INT;
    v_lockout_threshold INT := 5; -- Configure as needed
    v_lockout_duration INTERVAL := INTERVAL '30 minutes';
BEGIN
    -- Check if IP is already blocked
    SELECT COUNT(*) INTO v_attempt_count
    FROM auth_failures
    WHERE ip_address = p_ip_address
    AND attempt_time > NOW() - v_lockout_duration;

    -- Handle failed attempt
    IF NOT p_success THEN
        INSERT INTO auth_failures (email, ip_address, user_agent, failure_reason)
        VALUES (p_email, p_ip_address, p_user_agent, p_failure_reason);

        -- Lock account if threshold exceeded
        IF v_attempt_count >= v_lockout_threshold THEN
            UPDATE profiles
            SET account_locked = true,
                lock_reason = 'Too many failed attempts'
            WHERE email = p_email;
            
            RETURN false;
        END IF;
    ELSE
        -- Reset failed attempts on successful login
        DELETE FROM auth_failures
        WHERE email = p_email;
        
        -- Update login streak and last activity
        UPDATE profiles
        SET login_streak = login_streak + 1,
            last_login = NOW(),
            account_locked = false,
            lock_reason = NULL
        WHERE email = p_email;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage MFA
CREATE OR REPLACE FUNCTION public.manage_mfa(
    user_id UUID,
    action TEXT,
    mfa_type TEXT,
    mfa_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    current_methods JSONB;
BEGIN
    SELECT mfa_methods INTO current_methods
    FROM profiles
    WHERE id = user_id;

    CASE action
        WHEN 'enable' THEN
            current_methods := jsonb_set(
                coalesce(current_methods, '{}'::jsonb),
                array[mfa_type],
                coalesce(mfa_data, '{}'::jsonb)
            );
        WHEN 'disable' THEN
            current_methods := current_methods - mfa_type;
        ELSE
            RAISE EXCEPTION 'Invalid MFA action';
    END CASE;

    UPDATE profiles
    SET mfa_methods = current_methods,
        mfa_enabled = (jsonb_array_length(current_methods) > 0)
    WHERE id = user_id;

    RETURN current_methods;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate MFA changes
CREATE OR REPLACE FUNCTION public.validate_mfa_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow users to modify their own MFA settings
    IF NEW.id != auth.uid() THEN
        RAISE EXCEPTION 'You can only modify your own MFA settings';
    END IF;

    -- Validate MFA methods structure
    IF NEW.mfa_methods IS NOT NULL AND NOT validate_json_schema(
        '{
            "type": "object",
            "properties": {
                "email": {"type": "object"},
                "sms": {"type": "object"},
                "totp": {"type": "object"}
            },
            "additionalProperties": false
        }',
        NEW.mfa_methods
    ) THEN
        RAISE EXCEPTION 'Invalid MFA methods format';
    END IF;

    -- Ensure MFA enabled flag matches methods
    IF NEW.mfa_methods IS NULL OR jsonb_array_length(NEW.mfa_methods) = 0 THEN
        NEW.mfa_enabled := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for MFA changes
CREATE TRIGGER validate_mfa_changes_trigger
    BEFORE UPDATE OF mfa_enabled, mfa_methods
    ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_mfa_changes();

-- Function to validate session
CREATE OR REPLACE FUNCTION public.validate_session(
    p_session_id UUID,
    p_token_hash TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM user_sessions
    WHERE id = p_session_id
    AND token_hash = p_token_hash
    AND is_valid = true
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Update last activity
    UPDATE user_sessions
    SET last_activity = NOW()
    WHERE id = p_session_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user access history
CREATE OR REPLACE FUNCTION public.get_user_access_history(
    target_user_id UUID,
    days_back INT DEFAULT 30
)
RETURNS TABLE (
    event_date DATE,
    login_count INT,
    action_count INT,
    resources_accessed TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        date_trunc('day', al.created_at)::DATE,
        COUNT(*) FILTER (WHERE al.event_type = 'LOGIN') as login_count,
        COUNT(*) FILTER (WHERE al.event_type != 'LOGIN') as action_count,
        array_agg(DISTINCT al.table_name) FILTER (WHERE al.table_name IS NOT NULL) as resources_accessed
    FROM public.audit_logs al
    WHERE al.user_id = target_user_id
    AND al.created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY date_trunc('day', al.created_at)::DATE
    ORDER BY date_trunc('day', al.created_at)::DATE DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's profile with extended information and caching
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role user_role,
    company_id UUID,
    is_active BOOLEAN,
    profile_data JSONB,
    admin_data JSONB,
    permissions JSONB,
    activity_stats JSONB,
    last_access JSONB
) AS $$
DECLARE
    v_user_id UUID;
    v_cache_key TEXT;
    v_cached_data JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check cache
    v_cache_key := 'user_profile:' || v_user_id;
    v_cached_data := (SELECT current_setting(v_cache_key, true)::JSONB);
    
    -- Return cached data if it's recent (less than 5 minutes old)
    IF v_cached_data IS NOT NULL AND 
       (v_cached_data->>'cache_time')::timestamp > NOW() - interval '5 minutes' THEN
        RETURN QUERY SELECT
            (v_cached_data->>'id')::UUID,
            v_cached_data->>'email',
            v_cached_data->>'full_name',
            (v_cached_data->>'role')::user_role,
            (v_cached_data->>'company_id')::UUID,
            (v_cached_data->>'is_active')::BOOLEAN,
            v_cached_data->'profile_data',
            v_cached_data->'admin_data',
            v_cached_data->'permissions',
            v_cached_data->'activity_stats',
            v_cached_data->'last_access';
        RETURN;
    END IF;

    -- Get fresh data
    RETURN QUERY
    WITH profile_data AS (
        SELECT 
            p.id,
            p.email,
            p.full_name,
            p.role,
            p.company_id,
            p.is_active,
            to_jsonb(up.*) - 'id' - 'user_id' - 'created_at' - 'updated_at' AS profile_data,
            CASE 
                WHEN p.role = 'admin' THEN to_jsonb(au.*) - 'id' - 'created_at' - 'updated_at'
                ELSE NULL
            END AS admin_data,
            CASE
                WHEN p.role = 'admin' THEN au.permissions
                WHEN p.role = 'company' THEN jsonb_build_object(
                    'can_manage_company', true,
                    'can_manage_orders', true
                )
                ELSE jsonb_build_object(
                    'can_place_orders', true,
                    'can_view_orders', true
                )
            END AS permissions,
            public.get_user_activity_stats(p.id) as activity_stats,
            (
                SELECT jsonb_build_object(
                    'last_login', MAX(created_at) FILTER (WHERE event_type = 'LOGIN'),
                    'last_action', MAX(created_at),
                    'recent_resources', array_to_json(
                        array_agg(DISTINCT table_name) FILTER (
                            WHERE created_at > NOW() - interval '24 hours'
                            AND table_name IS NOT NULL
                        )
                    )
                )
                FROM public.audit_logs
                WHERE user_id = p.id
            ) as last_access
        FROM public.profiles p
        LEFT JOIN public.user_profiles up ON p.id = up.user_id
        LEFT JOIN public.admin_users au ON p.id = au.id
        WHERE p.id = v_user_id
    )
    SELECT 
        pd.id,
        pd.email,
        pd.full_name,
        pd.role,
        pd.company_id,
        pd.is_active,
        pd.profile_data,
        pd.admin_data,
        pd.permissions,
        pd.activity_stats,
        pd.last_access
    FROM profile_data pd;

    -- Update cache
    UPDATE public.profiles 
    SET last_profile_cache = NOW()
    WHERE id = v_user_id;

    -- Cache the result for 5 minutes
    v_cached_data := (
        SELECT jsonb_build_object(
            'id', id,
            'email', email,
            'full_name', full_name,
            'role', role,
            'company_id', company_id,
            'is_active', is_active,
            'profile_data', profile_data,
            'admin_data', admin_data,
            'permissions', permissions,
            'activity_stats', activity_stats,
            'last_access', last_access,
            'cache_time', NOW()
        )
        FROM profile_data
    );
    
    PERFORM set_config(v_cache_key, v_cached_data::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get profiles by role hierarchy
CREATE OR REPLACE FUNCTION public.get_profiles_by_role_hierarchy(target_role user_role)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role user_role,
    created_at TIMESTAMP,
    is_active BOOLEAN,
    user_profile JSONB,
    is_admin BOOLEAN,
    permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_id UUID;
    requester_role user_role;
    requester_level INT;
    target_level INT;
BEGIN
    -- Get the authenticated user's ID
    requester_id := auth.uid();
    IF requester_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the role of the requester
    SELECT role INTO requester_role
    FROM public.profiles
    WHERE id = requester_id;

    IF requester_role IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Get hierarchy levels
    requester_level := public.get_role_level(requester_role);
    target_level := public.get_role_level(target_role);

    -- Enforce hierarchy: requester must be >= target
    IF requester_level < target_level THEN
        RAISE EXCEPTION 'Access denied: insufficient role level';
    END IF;

    -- Return all profiles matching the target role with extended information
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.created_at,
        p.is_active,
        to_jsonb(up.*) - 'id' - 'user_id' - 'created_at' - 'updated_at' AS user_profile,
        (au.id IS NOT NULL) AS is_admin,
        CASE
            WHEN p.role = 'admin' THEN au.permissions
            WHEN p.role = 'company' THEN jsonb_build_object(
                'can_manage_company', true,
                'can_manage_orders', true
            )
            ELSE jsonb_build_object(
                'can_place_orders', true,
                'can_view_orders', true
            )
        END AS permissions
    FROM public.profiles p
    LEFT JOIN public.user_profiles up ON p.id = up.user_id
    LEFT JOIN public.admin_users au ON p.id = au.id
    WHERE p.role = target_role
    ORDER BY p.created_at DESC;
END;
$$;