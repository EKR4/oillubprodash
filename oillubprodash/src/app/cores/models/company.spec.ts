import { Company } from './company';

describe('Company', () => {
 it('should allow creating a valid Company object', () => {
    const company: Company = {
      id: '1',
      name: 'Test Company',
      business_registration_number: 'BRN123',
      email: 'test@example.com',
      phone: '1234567890',
      company_type: 'distributor',
      status: 'active',
      verification_status: 'unverified',
      primary_address: {
        street: '123 Main St',
        city: 'Testville',
        state: 'TS',
        postal_code: '12345',
        country: 'Testland',
        is_default: true
      },
      credit_status: 'good',
      created_at: new Date()
    };
    expect(company).toBeTruthy();
  });
});
