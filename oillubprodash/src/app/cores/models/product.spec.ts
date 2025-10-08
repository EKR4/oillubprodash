import { Product } from './product';

describe('Product interface', () => {
  it('should be able to create a product object', () => {
    const product: Product = {
      id: '1',
      sku: 'TEST001',
      name: 'Test Product',
      description: 'Test Description',
      brand: 'Test Brand',
      category: 'engine_oil',
      viscosity_grade: '5W-30',
      is_active: true,
      created_at: new Date(),
      created_by: 'test-user',
      specifications: {
        base_oil_type: 'synthetic',
        api_classification: 'SN',
        density: 0.85,
        flash_point: 220,
        pour_point: -30
      },
      packages: [{
        id: '1',
        product_id: '1',
        size: '1L',
        unit: 'L',
        unit_price: 1000,
        currency: 'KES',
        weight_kg: 1,
        stock_level: 100,
        low_stock_threshold: 20,
        reorder_quantity: 50,
        is_available: true
      }],
      certifications: [{
        id: '1',
        product_id: '1',
        certification_type: 'API',
        certification_number: 'API-SN-001',
        issuing_body: 'American Petroleum Institute',
        issue_date: new Date(),
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        is_active: true
      }],
      compatible_vehicles: ['petrol', 'diesel']
    };
    expect(product).toBeTruthy();
    expect(product.name).toBe('Test Product');
  });
});
