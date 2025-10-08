import { Order, OrderStatus, PaymentStatus, PaymentMethod, DeliveryMethod } from './order';

describe('Order interface', () => {
  it('should be able to create an order object', () => {
    const order: Order = {
      created_at: new Date(),
      is_bulk_order: false,
      id: '1',
      order_number: 'ORD-001',
      user_id: '123',
      items: [],
      subtotal: 0,
      tax_amount: 0,
      shipping_fee: 0,
      discount_amount: 0,
      total_amount: 0,
      currency: 'KES',
      status: 'pending',
      payment_status: 'pending',
      payment_details: {
        id: '1',
        order_id: '1',
        payment_method: 'mpesa',
        payment_provider: 'mpesa',
        amount: 0,
        currency: 'KES',
        status: 'pending',
        created_at: new Date()
      },
      shipping_details: {
        id: '1',
        order_id: '1',
        delivery_method: 'shipping',
        shipping_address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'Kenya',
          is_default: false
        },
        status: 'pending',
        created_at: new Date()
      }
    };
    expect(order).toBeTruthy();
    expect(order.status).toBe('pending');
  });
});
