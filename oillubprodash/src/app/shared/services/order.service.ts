import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { Order, OrderStatus } from '../../cores/models/order';
import { SupabaseService } from '../../cores/services/supabase.service';
import { AuthService } from '../../cores/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {}

  getUserOrders(userId: string): Observable<Order[]> {
    return from(
      this.supabaseService.getSupabase()
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data as Order[];
      })
    );
  }

  getOrderById(orderId: string): Observable<Order | null> {
    return from(
      this.supabaseService.getSupabase()
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          shipping_details:shipping_details(*),
          payment_details:payment_details(*)
        `)
        .eq('id', orderId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data as Order;
      })
    );
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Observable<void> {
    return from(
      this.supabaseService.getSupabase()
        .from('orders')
        .update({ status, updated_at: new Date() })
        .eq('id', orderId)
    ).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      })
    );
  }

  getOrderTracking(orderId: string): Observable<any> {
    return from(
      this.supabaseService.getSupabase()
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data;
      })
    );
  }
}