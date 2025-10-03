-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- This schema follows Supabase best practices for authentication and security
-- It properly integrates with auth.users table and implements secure RLS policies

--------------------------------------------------
-- AUTHENTICATION & USER MANAGEMENT
--------------------------------------------------

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'company', 'customer')) DEFAULT 'customer',
    phone VARCHAR(20),
    company_id UUID REFERENCES public.companies(id),
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    loyalty_points INTEGER DEFAULT 0,
    CONSTRAINT profiles_company_role_check CHECK (
        (role = 'company' AND company_id IS NOT NULL) OR
        (role != 'company')
    )
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NOW()
  );

-- Add trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User Profiles Table (additional profile information)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    street VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_default_address BOOLEAN DEFAULT TRUE,
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    preferred_currency VARCHAR(3) DEFAULT 'KES',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on User Profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Admin Users Table (special admin permissions)
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('full', 'limited')),
    managed_regions TEXT[]
);

-- Enable RLS on Admin Users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- COMPANY MANAGEMENT
--------------------------------------------------

-- Companies Table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    business_registration_number VARCHAR(100) NOT NULL,
    tax_id VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternative_phone VARCHAR(20),
    website VARCHAR(255),
    company_type VARCHAR(50) NOT NULL CHECK (company_type IN ('distributor', 'retailer', 'workshop', 'fleet_operator', 'manufacturer', 'other')),
    industry VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended', 'inactive')),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    verification_date TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    
    -- Address information
    street VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    
    -- Business details
    year_established INTEGER,
    employee_count INTEGER,
    annual_revenue_range VARCHAR(50),
    description TEXT,
    
    -- Account information
    account_manager_id UUID REFERENCES auth.users(id),
    credit_limit DECIMAL(15, 2),
    payment_terms VARCHAR(50),
    credit_status VARCHAR(20) NOT NULL DEFAULT 'good' CHECK (credit_status IN ('good', 'warning', 'hold')),
    
    -- Account balance
    account_balance DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Documents
    logo_url TEXT,
    registration_certificate_url TEXT,
    tax_certificate_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    last_order_date TIMESTAMP WITH TIME ZONE,
    
    -- Metrics
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0.00,
    average_order_value DECIMAL(15, 2) DEFAULT 0.00
);

-- Enable RLS on Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Company Addresses (Billing and Shipping)
CREATE TABLE public.company_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('billing', 'shipping')),
    is_default BOOLEAN DEFAULT FALSE,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Company Addresses
ALTER TABLE public.company_addresses ENABLE ROW LEVEL SECURITY;

-- Company Contacts
CREATE TABLE public.company_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_primary_contact BOOLEAN DEFAULT FALSE,
    is_billing_contact BOOLEAN DEFAULT FALSE,
    is_technical_contact BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Company Contacts
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- PRODUCTS (Multi-tenant with company_id)
--------------------------------------------------

-- Products Table with company_id for multi-tenancy
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id), -- Added for multi-tenant architecture
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('engine_oil', 'gear_oil', 'hydraulic_oil', 'grease')),
    viscosity_grade VARCHAR(50) NOT NULL,
    api_rating TEXT[],
    applications TEXT[],
    features_benefits TEXT[],
    image_url TEXT,
    image_urls TEXT[],
    technical_data_url TEXT,
    safety_data_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    meta_tags TEXT[],
    
    -- Add unique constraint for company + sku
    UNIQUE (company_id, sku)
);

-- Create index for company_id for better performance
CREATE INDEX ON public.products(company_id);

-- Enable RLS on Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Product Specifications
CREATE TABLE public.product_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    base_oil_type VARCHAR(50) CHECK (base_oil_type IN ('mineral', 'semi_synthetic', 'synthetic')),
    api_classification VARCHAR(50),
    acea_classification VARCHAR(50),
    oem_approvals TEXT[],
    flash_point DECIMAL(10, 2),
    pour_point DECIMAL(10, 2),
    density DECIMAL(10, 5),
    additives TEXT[],
    technical_properties JSONB
);

-- Enable RLS on Product Specifications
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;

-- Product Packages
CREATE TABLE public.product_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size VARCHAR(10) NOT NULL CHECK (size IN ('1L', '5L', '20L', '25L', '200L', 'other')),
    custom_size VARCHAR(50),
    unit_price DECIMAL(15, 2) NOT NULL,
    wholesale_price DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'KES', -- Standardized on KES
    weight_kg DECIMAL(10, 2) NOT NULL,
    dimensions JSONB,
    barcode VARCHAR(100),
    stock_level INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    reorder_quantity INTEGER NOT NULL DEFAULT 20,
    is_available BOOLEAN DEFAULT TRUE
);

-- Enable RLS on Product Packages
ALTER TABLE public.product_packages ENABLE ROW LEVEL SECURITY;

-- Product Certifications
CREATE TABLE public.product_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    certification_type VARCHAR(20) NOT NULL CHECK (certification_type IN ('KEBS', 'ISO', 'API', 'ACEA', 'OEM', 'EPRA', 'other')),
    certification_number VARCHAR(100) NOT NULL,
    issuing_body VARCHAR(100) NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    document_url TEXT,
    verification_url TEXT,
    verification_qr_code TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS on Product Certifications
ALTER TABLE public.product_certifications ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- CART & TOKEN SECURITY
--------------------------------------------------

-- Cart Tokens Table for secure cart authentication
CREATE TABLE public.cart_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for token lookup
CREATE INDEX ON public.cart_tokens(token);

-- Enable RLS on Cart Tokens
ALTER TABLE public.cart_tokens ENABLE ROW LEVEL SECURITY;

-- Shopping Carts
CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_id UUID REFERENCES public.cart_tokens(id), -- Use token_id instead of session_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Enable RLS on Carts
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Cart Items
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    package_id UUID NOT NULL REFERENCES public.product_packages(id),
    quantity INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Cart Items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Saved Carts
CREATE TABLE public.saved_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on Saved Carts
ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

-- Saved Cart Items
CREATE TABLE public.saved_cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saved_cart_id UUID NOT NULL REFERENCES public.saved_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    package_id UUID NOT NULL REFERENCES public.product_packages(id),
    quantity INTEGER NOT NULL
);

-- Enable RLS on Saved Cart Items
ALTER TABLE public.saved_cart_items ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- ORDERS & TRANSACTIONS
--------------------------------------------------

-- Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id), -- For multi-tenant implementation
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL,
    shipping_fee DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES', -- Standardized on KES
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded')),
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    loyalty_points_earned INTEGER,
    loyalty_points_used INTEGER,
    is_bulk_order BOOLEAN DEFAULT FALSE,
    metadata JSONB
);

-- Enable RLS on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order Items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    package_id UUID NOT NULL REFERENCES public.product_packages(id),
    package_size VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES', -- Standardized on KES
    is_gift BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Enable RLS on Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Payment Details
CREATE TABLE public.payment_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('mpesa', 'card', 'cash_on_delivery', 'bank_transfer', 'other')),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES', -- Standardized on KES
    transaction_id VARCHAR(100),
    transaction_reference VARCHAR(100),
    transaction_date TIMESTAMP WITH TIME ZONE,
    payment_provider VARCHAR(20) NOT NULL CHECK (payment_provider IN ('mulaflow', 'mpesa', 'stripe', 'paypal', 'manual', 'other')),
    
    -- MulaFlow specific fields
    mulaflow_request_id VARCHAR(100),
    mulaflow_callback_url TEXT,
    
    -- MPesa specific fields
    mpesa_phone_number VARCHAR(20),
    mpesa_receipt_number VARCHAR(50),
    
    -- Card specific fields
    card_last_four VARCHAR(4),
    card_brand VARCHAR(50),
    card_expiry_month VARCHAR(2),
    card_expiry_year VARCHAR(4),
    
    -- Status information
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')),
    status_message TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Payment Details
ALTER TABLE public.payment_details ENABLE ROW LEVEL SECURITY;

-- Shipping Details
CREATE TABLE public.shipping_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('shipping', 'pickup')),
    
    -- For shipping
    shipping_address_id UUID REFERENCES public.company_addresses(id),
    tracking_number VARCHAR(100),
    tracking_url TEXT,
    shipping_carrier VARCHAR(100),
    estimated_delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    
    -- For pickup
    pickup_location_id UUID,
    pickup_location_name VARCHAR(255),
    pickup_date TIMESTAMP WITH TIME ZONE,
    pickup_time_slot VARCHAR(100),
    pickup_confirmation_code VARCHAR(50),
    pickup_instructions TEXT,
    
    -- Delivery status
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered', 'failed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Shipping Details
ALTER TABLE public.shipping_details ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- SECURITY FUNCTIONS WITH SEARCH_PATH
--------------------------------------------------

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    _role TEXT;
BEGIN
    SELECT role INTO _role FROM public.profiles WHERE id = auth.uid();
    RETURN _role;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if current user belongs to a company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(company_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    belongs BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND company_id = user_belongs_to_company.company_id
    ) INTO belongs;
    RETURN belongs;
END;
$$ LANGUAGE plpgsql;

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    _is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) INTO _is_admin;
    RETURN _is_admin;
END;
$$ LANGUAGE plpgsql;

-- Function to get first user status (atomic role determination)
CREATE OR REPLACE FUNCTION public.get_first_user_status()
RETURNS TABLE(is_first boolean)
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*) = 0 AS is_first FROM auth.users;
END;
$$ LANGUAGE plpgsql;

-- Function to create cart token
CREATE OR REPLACE FUNCTION public.create_cart_token()
RETURNS TABLE(token text, expires_at timestamptz)
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_token text;
  new_token_id UUID;
  new_expires_at timestamptz;
BEGIN
  -- Generate a random token
  new_token := encode(gen_random_bytes(32), 'hex');
  new_expires_at := NOW() + INTERVAL '30 days';
  
  -- Insert the token
  INSERT INTO public.cart_tokens (token, user_id, expires_at)
  VALUES (
    new_token, 
    auth.uid(), 
    new_expires_at
  )
  RETURNING id INTO new_token_id;
  
  RETURN QUERY SELECT new_token, new_expires_at;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------
-- RLS POLICIES
--------------------------------------------------

-- RLS Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin users can manage all profiles" ON public.profiles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for User Profiles
CREATE POLICY "Users can view their own user profiles" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own user profiles" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin users can manage all user profiles" ON public.user_profiles
  FOR ALL USING (is_admin());

-- RLS Policies for Admin Users
CREATE POLICY "Admin users can manage admin users" ON public.admin_users
  FOR ALL USING (is_admin());

-- RLS Policies for Companies
CREATE POLICY "Admin users can manage companies" ON public.companies
  FOR ALL USING (is_admin());

CREATE POLICY "Company users can view their company" ON public.companies
  FOR SELECT USING (
    id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Public users can view active companies" ON public.companies
  FOR SELECT USING (status = 'active');

-- RLS Policies for Products (with multi-tenant)
CREATE POLICY "Admin users can manage all products" ON public.products
  FOR ALL USING (is_admin());

CREATE POLICY "Company users can manage their own products" ON public.products
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "All users can view active products" ON public.products
  FOR SELECT USING (is_active = true);

-- RLS Policies for Cart Tokens
CREATE POLICY "Users can manage their own cart tokens" ON public.cart_tokens
  FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admin users can manage all cart tokens" ON public.cart_tokens
  FOR ALL USING (is_admin());

-- RLS Policies for Carts (with token-based auth)
CREATE POLICY "Users can manage their own carts" ON public.carts
  FOR ALL USING (
    user_id = auth.uid() OR 
    token_id IN (
      SELECT id FROM public.cart_tokens 
      WHERE user_id = auth.uid() OR 
            user_id IS NULL
    )
  );

CREATE POLICY "Admin users can manage all carts" ON public.carts
  FOR ALL USING (is_admin());

-- RLS Policies for Cart Items
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts 
      WHERE id = cart_items.cart_id AND (
        user_id = auth.uid() OR 
        token_id IN (
          SELECT id FROM public.cart_tokens 
          WHERE user_id = auth.uid() OR 
                user_id IS NULL
        )
      )
    )
  );

CREATE POLICY "Admin users can manage all cart items" ON public.cart_items
  FOR ALL USING (is_admin());

-- RLS Policies for Orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Company users can view orders for their company" ON public.orders
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin users can manage all orders" ON public.orders
  FOR ALL USING (is_admin());

--------------------------------------------------
-- TRIGGERS FOR DATA CONSISTENCY
--------------------------------------------------

-- Function to update company order metrics after a new order
CREATE OR REPLACE FUNCTION public.update_company_order_metrics()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update if it's a company order
    IF NEW.company_id IS NOT NULL THEN
        UPDATE public.companies
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total_amount,
            average_order_value = (total_spent + NEW.total_amount) / (total_orders + 1),
            last_order_date = NOW(),
            updated_at = NOW()
        WHERE id = NEW.company_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update company metrics after a new order
CREATE TRIGGER after_order_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_company_order_metrics();

-- Function to update profile timestamps
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile timestamps
CREATE TRIGGER before_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_profile_timestamp();