import { Ticket } from './ticket';

describe('Ticket interface', () => {
  it('should be able to create a ticket object', () => {
    const ticket: Ticket = {
      id: '1',
      title: 'Test Ticket',
      description: 'Test Description',
      status: 'open',
      priority: 'medium',
      category: 'general',
      user_id: '123',
      messages: [],
      created_at: new Date(),
      updated_at: new Date()
    };
    expect(ticket).toBeTruthy();
    expect(ticket.title).toBe('Test Ticket');
  });
});
