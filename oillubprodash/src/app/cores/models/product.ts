export type ProductCategory = 'engine_oil' | 'gear_oil' | 'hydraulic_oil' | 'grease';
export type PackageSize = '1L' | '5L' | '20L' | '25L' | '200L' | 'other';
export type VehicleType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'commercial' | 'motorcycle' | 'marine' | 'agricultural';
export type ViscosityGrade = '0W-20' | '0W-30' | '5W-30' | '5W-40' | '10W-30' | '10W-40' | '15W-40' | '20W-50' | 'SAE 90' | 'SAE 140' | 'ISO 32' | 'ISO 46' | 'ISO 68' | 'NLGI 1' | 'NLGI 2' | 'NLGI 3' | 'other';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: ProductCategory;
  viscosity_grade: ViscosityGrade;
  image_url?: string;
  technical_data_url?: string;
  safety_data_url?: string;
  is_active: boolean;
  is_featured?: boolean;
  created_at: Date;
  updated_at?: Date;
  created_by: string;
  updated_by?: string;
  
  // Technical specifications
  specifications: ProductSpecifications;
  
  // Package and pricing
  packages: ProductPackage[];
  
  // Compliance and certifications
  certifications: ProductCertification[];
  
  // Compatible vehicle types
  compatible_vehicles: VehicleType[];
  
  // Metadata for search and filtering
  meta_tags?: string[];
  
  // Additional properties
  benefits?: string[];
  recommended_for?: string[];
}

export interface ProductSpecifications {
  base_oil_type?: 'mineral' | 'semi_synthetic' | 'synthetic';
  base_type?: string; // For template consistency
  api_classification?: string; // API SN, API SM, etc.
  acea_classification?: string; // ACEA A3/B4, etc.
  oem_approvals?: string[]; // Mercedes-Benz, BMW, etc.
  flash_point?: number; // in Celsius
  pour_point?: number; // in Celsius
  density?: number; // in kg/L
  additives?: string[];
  technical_properties?: Record<string, string>; // Additional properties
  
  // Additional properties used in template
  viscosity_grade?: string;
  viscosity_index?: number;
  application?: string;
  performance_level?: string;
  safety_data_url?: string;
}

export interface ProductPackage {
  id: string;
  product_id: string;
  size: PackageSize;
  custom_size?: string; // For "other" package sizes
  unit: string; // Unit of measurement (L, ml, kg, g, etc.)
  unit_price: number;
  wholesale_price?: number; // For company users
  currency: string;
  weight_kg: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  barcode?: string;
  stock_level: number;
  low_stock_threshold: number;
  reorder_quantity: number;
  is_available: boolean;
}

export interface ProductCertification {
  id: string;
  product_id: string;
  certification_type: 'KEBS' | 'ISO' | 'API' | 'ACEA' | 'OEM' | 'EPRA' | 'other';
  certification_number: string;
  issuing_body: string;
  issue_date: Date;
  expiry_date?: Date;
  document_url?: string;
  verification_url?: string;
  verification_qr_code?: string;
  is_active: boolean;
}

// Product inventory movement
export interface InventoryMovement {
  id: string;
  product_id: string;
  package_id: string;
  quantity: number;
  movement_type: 'in' | 'out' | 'adjustment';
  reason: 'purchase' | 'sale' | 'return' | 'damage' | 'expiry' | 'transfer' | 'other';
  reference_id?: string; // Order ID, etc.
  notes?: string;
  created_at: Date;
  created_by: string;
}

// Product review
export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  created_at: Date;
  updated_at?: Date;
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_votes?: number;
}

// Product query response for pagination
export interface ProductsResponse {
  data: Product[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: Error;
}