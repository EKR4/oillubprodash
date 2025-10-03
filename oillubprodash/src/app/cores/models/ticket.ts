export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'product' | 'order' | 'technical' | 'billing' | 'other';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  user_id: string;
  assigned_to?: string;
  order_id?: string;
  product_id?: string;
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
  attachments?: TicketAttachment[];
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  attachments?: TicketAttachment[];
  created_at: Date;
  updated_at?: Date;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  created_at: Date;
}