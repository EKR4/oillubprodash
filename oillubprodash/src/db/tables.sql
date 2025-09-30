-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create an auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Enable Row Level Security for Auth schema
GRANT USAGE ON SCHEMA auth TO PUBLIC;

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'company', 'customer')),
    phone VARCHAR(20),
    company_id UUID,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    loyalty_points INTEGER DEFAULT 0
);

-- Enable RLS on Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- User Profiles Table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('full', 'limited')),
    managed_regions TEXT[]
);

-- Enable RLS on Admin Users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Companies Table
CREATE TABLE companies (
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
    verified_by UUID REFERENCES users(id),
    
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
    account_manager_id UUID REFERENCES users(id),
    credit_limit DECIMAL(15, 2),
    payment_terms VARCHAR(50),
    credit_status VARCHAR(20) NOT NULL DEFAULT 'good' CHECK (credit_status IN ('good', 'warning', 'hold')),
    
    -- Account balance (as requested)
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
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Company Addresses (Billing and Shipping)
CREATE TABLE company_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
ALTER TABLE company_addresses ENABLE ROW LEVEL SECURITY;

-- Company Contacts
CREATE TABLE company_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

-- Company Documents
CREATE TABLE company_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('registration', 'tax', 'financial', 'contract', 'other')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT
);

-- Enable RLS on Company Documents
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

-- Price Tiers
CREATE TABLE price_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    minimum_order_value DECIMAL(15, 2),
    discount_percentage DECIMAL(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Price Tiers
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;

-- Company Price Tiers
CREATE TABLE company_price_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    price_tier_id UUID NOT NULL REFERENCES price_tiers(id),
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    override_discount_percentage DECIMAL(5, 2),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Company Price Tiers
ALTER TABLE company_price_tiers ENABLE ROW LEVEL SECURITY;

-- Company Accounts (to track balances as requested)
CREATE TABLE company_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    available_credit DECIMAL(15, 2) DEFAULT 0.00,
    credit_limit DECIMAL(15, 2) DEFAULT 0.00,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    last_payment_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Company Accounts
ALTER TABLE company_accounts ENABLE ROW LEVEL SECURITY;

-- Company Transactions
CREATE TABLE company_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES company_accounts(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'credit_note', 'debit_note', 'adjustment')),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    reference_number VARCHAR(100) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    related_order_id UUID,
    payment_method VARCHAR(50),
    previous_balance DECIMAL(15, 2) NOT NULL,
    new_balance DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Company Transactions
ALTER TABLE company_transactions ENABLE ROW LEVEL SECURITY;

-- Customer Accounts (for retail customers)
CREATE TABLE customer_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Customer Accounts
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('engine_oil', 'gear_oil', 'hydraulic_oil', 'grease')),
    viscosity_grade VARCHAR(50) NOT NULL,
    image_url TEXT,
    technical_data_url TEXT,
    safety_data_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    meta_tags TEXT[]
);

-- Enable RLS on Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Product Specifications
CREATE TABLE product_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
ALTER TABLE product_specifications ENABLE ROW LEVEL SECURITY;

-- Product Packages
CREATE TABLE product_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(10) NOT NULL CHECK (size IN ('1L', '5L', '20L', '25L', '200L', 'other')),
    custom_size VARCHAR(50),
    unit_price DECIMAL(15, 2) NOT NULL,
    wholesale_price DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'KES',
    weight_kg DECIMAL(10, 2) NOT NULL,
    dimensions JSONB,
    barcode VARCHAR(100),
    stock_level INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    reorder_quantity INTEGER NOT NULL DEFAULT 20,
    is_available BOOLEAN DEFAULT TRUE
);

-- Enable RLS on Product Packages
ALTER TABLE product_packages ENABLE ROW LEVEL SECURITY;

-- Product Certifications
CREATE TABLE product_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
ALTER TABLE product_certifications ENABLE ROW LEVEL SECURITY;

-- Product Compatible Vehicles
CREATE TABLE product_compatible_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('petrol', 'diesel', 'hybrid', 'electric', 'commercial', 'motorcycle', 'marine', 'agricultural'))
);

-- Enable RLS on Product Compatible Vehicles
ALTER TABLE product_compatible_vehicles ENABLE ROW LEVEL SECURITY;

-- Inventory Movements
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    package_id UUID NOT NULL REFERENCES product_packages(id),
    quantity INTEGER NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('purchase', 'sale', 'return', 'damage', 'expiry', 'transfer', 'other')),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id)
);

-- Enable RLS on Inventory Movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Product Reviews
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0
);

-- Enable RLS on Product Reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL,
    shipping_fee DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
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
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(50) NOT NULL,
    package_id UUID NOT NULL REFERENCES product_packages(id),
    package_size VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    is_gift BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Enable RLS on Order Items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Payment Details
CREATE TABLE payment_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('mpesa', 'card', 'cash_on_delivery', 'bank_transfer', 'other')),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
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
ALTER TABLE payment_details ENABLE ROW LEVEL SECURITY;

-- Shipping Details
CREATE TABLE shipping_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('shipping', 'pickup')),
    
    -- For shipping
    shipping_address_id UUID REFERENCES company_addresses(id),
    tracking_number VARCHAR(100),
    tracking_url TEXT,
    shipping_carrier VARCHAR(100),
    estimated_delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    
    -- For pickup
    pickup_location_id UUID,
    pickup_location_name VARCHAR(255),
    pickup_address_id UUID REFERENCES company_addresses(id),
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
ALTER TABLE shipping_details ENABLE ROW LEVEL SECURITY;

-- Delivery Status Updates
CREATE TABLE delivery_status_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipping_id UUID NOT NULL REFERENCES shipping_details(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    location TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    updated_by UUID NOT NULL REFERENCES users(id)
);

-- Enable RLS on Delivery Status Updates
ALTER TABLE delivery_status_updates ENABLE ROW LEVEL SECURITY;

-- Pickup Locations
CREATE TABLE pickup_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255),
    business_hours TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    has_parking BOOLEAN DEFAULT FALSE,
    has_loading_dock BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Enable RLS on Pickup Locations
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;

-- Shopping Carts
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    CONSTRAINT user_or_session_check CHECK (
        (user_id IS NOT NULL) OR (session_id IS NOT NULL)
    )
);

-- Enable RLS on Carts
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Cart Items
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    package_id UUID NOT NULL REFERENCES product_packages(id),
    quantity INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Cart Items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Saved Carts
CREATE TABLE saved_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on Saved Carts
ALTER TABLE saved_carts ENABLE ROW LEVEL SECURITY;

-- Saved Cart Items
CREATE TABLE saved_cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saved_cart_id UUID NOT NULL REFERENCES saved_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    package_id UUID NOT NULL REFERENCES product_packages(id),
    quantity INTEGER NOT NULL
);

-- Enable RLS on Saved Cart Items
ALTER TABLE saved_cart_items ENABLE ROW LEVEL SECURITY;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    _role TEXT;
BEGIN
    SELECT role INTO _role FROM users WHERE id = auth.uid();
    RETURN _role;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user belongs to a company
CREATE OR REPLACE FUNCTION user_belongs_to_company(company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    belongs BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND company_id = user_belongs_to_company.company_id
    ) INTO belongs;
    RETURN belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    _is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ) INTO _is_admin;
    RETURN _is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Users Table
CREATE POLICY users_admin_access ON users
    TO authenticated
    USING (is_admin() OR id = auth.uid());

CREATE POLICY users_company_access ON users
    TO authenticated
    USING (
        (role = 'company' AND (is_admin() OR id = auth.uid() OR company_id = (SELECT company_id FROM users WHERE id = auth.uid())))
    );

CREATE POLICY users_customer_access ON users
    TO authenticated
    USING (is_admin() OR id = auth.uid());

-- RLS Policies for User Profiles Table
CREATE POLICY user_profiles_admin_access ON user_profiles
    TO authenticated
    USING (is_admin() OR user_id = auth.uid());

CREATE POLICY user_profiles_owner_access ON user_profiles
    TO authenticated
    USING (user_id = auth.uid());

-- RLS Policies for Admin Users Table
CREATE POLICY admin_users_admin_access ON admin_users
    TO authenticated
    USING (is_admin());

-- RLS Policies for Companies Table
CREATE POLICY companies_admin_access ON companies
    TO authenticated
    USING (is_admin());

CREATE POLICY companies_company_access ON companies
    TO authenticated
    USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY companies_public_view ON companies
    TO authenticated
    USING (status = 'active');

-- RLS Policies for Company Addresses
CREATE POLICY company_addresses_admin_access ON company_addresses
    TO authenticated
    USING (is_admin());

CREATE POLICY company_addresses_company_access ON company_addresses
    TO authenticated
    USING (user_belongs_to_company(company_id));

-- RLS Policies for Company Contacts
CREATE POLICY company_contacts_admin_access ON company_contacts
    TO authenticated
    USING (is_admin());

CREATE POLICY company_contacts_company_access ON company_contacts
    TO authenticated
    USING (user_belongs_to_company(company_id));

-- RLS Policies for Company Documents
CREATE POLICY company_documents_admin_access ON company_documents
    TO authenticated
    USING (is_admin());

CREATE POLICY company_documents_company_access ON company_documents
    TO authenticated
    USING (user_belongs_to_company(company_id));

-- RLS Policies for Price Tiers
CREATE POLICY price_tiers_admin_access ON price_tiers
    TO authenticated
    USING (is_admin());

CREATE POLICY price_tiers_read_access ON price_tiers
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- RLS Policies for Company Price Tiers
CREATE POLICY company_price_tiers_admin_access ON company_price_tiers
    TO authenticated
    USING (is_admin());

CREATE POLICY company_price_tiers_company_access ON company_price_tiers
    TO authenticated
    USING (user_belongs_to_company(company_id));

-- RLS Policies for Company Accounts
CREATE POLICY company_accounts_admin_access ON company_accounts
    TO authenticated
    USING (is_admin());

CREATE POLICY company_accounts_company_access ON company_accounts
    TO authenticated
    USING (user_belongs_to_company(company_id));

-- RLS Policies for Company Transactions
CREATE POLICY company_transactions_admin_access ON company_transactions
    TO authenticated
    USING (is_admin());

CREATE POLICY company_transactions_company_access ON company_transactions
    TO authenticated
    USING (user_belongs_to_company(company_id));

-- RLS Policies for Customer Accounts
CREATE POLICY customer_accounts_admin_access ON customer_accounts
    TO authenticated
    USING (is_admin());

CREATE POLICY customer_accounts_owner_access ON customer_accounts
    TO authenticated
    USING (user_id = auth.uid());

-- RLS Policies for Products
CREATE POLICY products_admin_access ON products
    TO authenticated
    USING (is_admin());

CREATE POLICY products_read_access ON products
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- RLS Policies for Product Specifications
CREATE POLICY product_specifications_admin_access ON product_specifications
    TO authenticated
    USING (is_admin());

CREATE POLICY product_specifications_read_access ON product_specifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_specifications.product_id AND is_active = true
        )
    );

-- RLS Policies for Product Packages
CREATE POLICY product_packages_admin_access ON product_packages
    TO authenticated
    USING (is_admin());

CREATE POLICY product_packages_read_access ON product_packages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_packages.product_id AND is_active = true
        )
    );

-- RLS Policies for Product Certifications
CREATE POLICY product_certifications_admin_access ON product_certifications
    TO authenticated
    USING (is_admin());

CREATE POLICY product_certifications_read_access ON product_certifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_certifications.product_id AND is_active = true
        )
    );

-- RLS Policies for Product Compatible Vehicles
CREATE POLICY product_compatible_vehicles_admin_access ON product_compatible_vehicles
    TO authenticated
    USING (is_admin());

CREATE POLICY product_compatible_vehicles_read_access ON product_compatible_vehicles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE id = product_compatible_vehicles.product_id AND is_active = true
        )
    );

-- RLS Policies for Inventory Movements
CREATE POLICY inventory_movements_admin_access ON inventory_movements
    TO authenticated
    USING (is_admin());

CREATE POLICY inventory_movements_company_access ON inventory_movements
    TO authenticated
    USING (get_current_user_role() = 'company');

-- RLS Policies for Product Reviews
CREATE POLICY product_reviews_admin_access ON product_reviews
    TO authenticated
    USING (is_admin());

CREATE POLICY product_reviews_owner_access ON product_reviews
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY product_reviews_read_access ON product_reviews
    FOR SELECT
    TO authenticated
    USING (is_approved = true);

-- RLS Policies for Orders
CREATE POLICY orders_admin_access ON orders
    TO authenticated
    USING (is_admin());

CREATE POLICY orders_company_access ON orders
    TO authenticated
    USING (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY orders_customer_access ON orders
    TO authenticated
    USING (user_id = auth.uid());

-- RLS Policies for Order Items
CREATE POLICY order_items_admin_access ON order_items
    TO authenticated
    USING (is_admin());

CREATE POLICY order_items_company_access ON order_items
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_items.order_id AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY order_items_customer_access ON order_items
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_items.order_id AND user_id = auth.uid()
        )
    );

-- RLS Policies for Payment Details
CREATE POLICY payment_details_admin_access ON payment_details
    TO authenticated
    USING (is_admin());

CREATE POLICY payment_details_company_access ON payment_details
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = payment_details.order_id AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY payment_details_customer_access ON payment_details
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = payment_details.order_id AND user_id = auth.uid()
        )
    );

-- RLS Policies for Shipping Details
CREATE POLICY shipping_details_admin_access ON shipping_details
    TO authenticated
    USING (is_admin());

CREATE POLICY shipping_details_company_access ON shipping_details
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = shipping_details.order_id AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY shipping_details_customer_access ON shipping_details
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = shipping_details.order_id AND user_id = auth.uid()
        )
    );

-- RLS Policies for Delivery Status Updates
CREATE POLICY delivery_status_updates_admin_access ON delivery_status_updates
    TO authenticated
    USING (is_admin());

CREATE POLICY delivery_status_updates_company_access ON delivery_status_updates
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM shipping_details sd
            JOIN orders o ON sd.order_id = o.id
            WHERE sd.id = delivery_status_updates.shipping_id 
            AND o.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY delivery_status_updates_customer_access ON delivery_status_updates
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM shipping_details sd
            JOIN orders o ON sd.order_id = o.id
            WHERE sd.id = delivery_status_updates.shipping_id 
            AND o.user_id = auth.uid()
        )
    );

-- RLS Policies for Pickup Locations
CREATE POLICY pickup_locations_admin_access ON pickup_locations
    TO authenticated
    USING (is_admin());

CREATE POLICY pickup_locations_read_access ON pickup_locations
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- RLS Policies for Carts
CREATE POLICY carts_admin_access ON carts
    TO authenticated
    USING (is_admin());

CREATE POLICY carts_owner_access ON carts
    TO authenticated
    USING (user_id = auth.uid() OR session_id = current_setting('request.headers')::json->>'x-session-id');

-- RLS Policies for Cart Items
CREATE POLICY cart_items_admin_access ON cart_items
    TO authenticated
    USING (is_admin());

CREATE POLICY cart_items_owner_access ON cart_items
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM carts 
            WHERE id = cart_items.cart_id AND 
            (user_id = auth.uid() OR session_id = current_setting('request.headers')::json->>'x-session-id')
        )
    );

-- RLS Policies for Saved Carts
CREATE POLICY saved_carts_admin_access ON saved_carts
    TO authenticated
    USING (is_admin());

CREATE POLICY saved_carts_owner_access ON saved_carts
    TO authenticated
    USING (user_id = auth.uid());

-- RLS Policies for Saved Cart Items
CREATE POLICY saved_cart_items_admin_access ON saved_cart_items
    TO authenticated
    USING (is_admin());

CREATE POLICY saved_cart_items_owner_access ON saved_cart_items
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM saved_carts 
            WHERE id = saved_cart_items.saved_cart_id AND user_id = auth.uid()
        )
    );

-- Function to update company account balance after transactions
CREATE OR REPLACE FUNCTION update_company_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE company_accounts
    SET 
        balance = NEW.new_balance,
        updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update company account balance after a transaction
CREATE TRIGGER after_company_transaction_insert
AFTER INSERT ON company_transactions
FOR EACH ROW
EXECUTE FUNCTION update_company_account_balance();

-- Function to update company's total_orders and total_spent after new orders
CREATE OR REPLACE FUNCTION update_company_order_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if it's a company order
    IF NEW.company_id IS NOT NULL THEN
        UPDATE companies
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
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION update_company_order_metrics();