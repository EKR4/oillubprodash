-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable JSON Schema validation
CREATE EXTENSION IF NOT EXISTS "plv8";

-- Create helper function for JSON schema validation
CREATE OR REPLACE FUNCTION validate_json_schema(schema jsonb, data jsonb)
RETURNS boolean AS $$
  const Ajv = require('ajv');
  const ajv = new Ajv();
  const validate = ajv.compile(JSON.parse(schema));
  const valid = validate(JSON.parse(data));
  return valid;
$$ LANGUAGE plv8 IMMUTABLE STRICT;

-- Create roles enum
CREATE TYPE user_role AS ENUM ('admin', 'company', 'customer');

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    company_id UUID,
    is_active BOOLEAN DEFAULT true,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create user_profiles table for additional user information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    street TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    is_default_address BOOLEAN DEFAULT true,
    newsletter_subscribed BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT false,
    email_notifications BOOLEAN DEFAULT true,
    preferred_language TEXT DEFAULT 'en',
    preferred_currency TEXT DEFAULT 'KES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create admin_users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    department TEXT DEFAULT 'Administration',
    access_level TEXT DEFAULT 'full',
    managed_regions TEXT[] DEFAULT ARRAY['all'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key for company_id in profiles
ALTER TABLE profiles
ADD CONSTRAINT fk_company
FOREIGN KEY (company_id)
REFERENCES companies(id)
ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create user sessions table for tracking active sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_info JSONB,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Create failed authentication attempts table
CREATE TABLE auth_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    failure_reason TEXT,
    user_agent TEXT
);

-- Add profile_image_url and loyalty_points columns to profiles
ALTER TABLE profiles 
ADD COLUMN profile_image_url TEXT,
ADD COLUMN loyalty_points INTEGER DEFAULT 0,
ADD COLUMN last_password_change TIMESTAMPTZ,
ADD COLUMN password_change_required BOOLEAN DEFAULT false,
ADD COLUMN mfa_enabled BOOLEAN DEFAULT false,
ADD COLUMN mfa_methods JSONB DEFAULT '{}'::JSONB,
ADD COLUMN account_locked BOOLEAN DEFAULT false,
ADD COLUMN lock_reason TEXT,
ADD COLUMN security_questions JSONB DEFAULT '[]'::JSONB,
ADD COLUMN login_streak INTEGER DEFAULT 0;