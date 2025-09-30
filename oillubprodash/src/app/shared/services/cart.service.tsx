import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, of, switchMap, take, tap, filter, from } from 'rxjs';
import { AuthService } from '../../cores/services/auth.service';
import { SupabaseService } from '../../cores/services/supabase.service';
import { 
  Cart, 
  CartItem, 
  CartSummary, 
  CheckoutDetails, 
  SavedCart 
} from '../../cores/models/cart';
import { Product, ProductPackage } from '../../cores/models/product';
import { User } from '../../cores/models/user';
// Add type declaration for uuid
import { v4 as uuidv4 } from 'uuid';
// Declare uuid module to fix TypeScript error
declare module 'uuid';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'lubrimax_cart';
  private readonly TAX_RATE = 0.16; // 16% VAT
  private readonly DEFAULT_CURRENCY = 'KES';
  
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  cart$ = this.cartSubject.asObservable();
  
  private cartSummarySubject = new BehaviorSubject<CartSummary>({
    total_items: 0,
    subtotal: 0,
    tax: 0,
    shipping_fee: 0,
    total: 0,
    currency: this.DEFAULT_CURRENCY
  });
  cartSummary$ = this.cartSummarySubject.asObservable();
  
  private currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {
    // Initialize cart
    this.initializeCart();
    
    // Listen for auth changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        // If user logs in, merge local cart with server cart
        this.syncCartWithServer();
      }
    });
  }

  /**
   * Initialize the cart from localStorage or create a new one
   */
  private initializeCart(): void {
    // Try to get cart from localStorage
    const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart) as Cart;
        // Fix dates which come as strings from JSON
        parsedCart.created_at = new Date(parsedCart.created_at);
        parsedCart.updated_at = new Date(parsedCart.updated_at);
        parsedCart.items.forEach(item => {
          item.added_at = new Date(item.added_at);
          item.updated_at = new Date(item.updated_at);
        });
        
        this.cartSubject.next(parsedCart);
        this.updateCartSummary();
      } catch (error) {
        console.error('Error parsing stored cart:', error);
        this.createNewCart();
      }
    } else {
      this.createNewCart();
    }
  }

  /**
   * Create a new empty cart
   */
  private createNewCart(): void {
    const newCart: Cart = {
      id: uuidv4(),
      user_id: this.currentUser?.id,
      session_id: this.getOrCreateSessionId(),
      items: [],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.cartSubject.next(newCart);
    this.saveCartToLocalStorage();
    this.updateCartSummary();
  }

  /**
   * Get or create a unique session ID for guest users
   */
  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('lubrimax_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('lubrimax_session_id', sessionId);
    }
    // Non-null assertion is safe here because if sessionId was null, it would be assigned above
    return sessionId!;
  }

  /**
   * Save cart to localStorage
   */
  private saveCartToLocalStorage(): void {
    const cart = this.cartSubject.value;
    if (cart) {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }

  /**
   * Sync local cart with server cart for logged-in users
   */
  private syncCartWithServer(): void {
    if (!this.currentUser) return;
    
    // Get the local cart
    const localCart = this.cartSubject.value;
    
    // Check if user has a cart on the server
    this.supabaseService.getSupabase()
      .from('carts')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .single()
      .then(async ({ data: serverCart, error }) => {
        if (error || !serverCart) {
          // No server cart exists, upload local cart if it has items
          if (localCart && localCart.items.length > 0) {
            const cartToUpload = { ...localCart, user_id: this.currentUser?.id };
            delete cartToUpload.session_id; // Remove session_id when associating with user
            
            await this.supabaseService.getSupabase()
              .from('carts')
              .insert(cartToUpload);
          }
        } else {
          // Server cart exists
          if (localCart && localCart.items.length > 0) {
            // Merge items from local cart into server cart
            const mergedItems = [...serverCart.items];
            
            // For each item in local cart
            localCart.items.forEach(localItem => {
              const existingItemIndex = mergedItems.findIndex(
                item => item.product_id === localItem.product_id && 
                       item.package_id === localItem.package_id
              );
              
              if (existingItemIndex >= 0) {
                // Update quantity if item exists
                mergedItems[existingItemIndex].quantity += localItem.quantity;
                mergedItems[existingItemIndex].updated_at = new Date();
              } else {
                // Add new item
                mergedItems.push({
                  ...localItem,
                  id: uuidv4()
                });
              }
            });
            
            // Update server cart with merged items
            await this.supabaseService.getSupabase()
              .from('carts')
              .update({
                items: mergedItems,
                updated_at: new Date()
              })
              .eq('id', serverCart.id);
              
            // Update local cart with server cart
            const updatedCart = {
              ...serverCart,
              items: mergedItems,
              updated_at: new Date()
            };
            
            this.cartSubject.next(updatedCart);
            this.saveCartToLocalStorage();
            this.updateCartSummary();
          } else {
            // Use server cart
            this.cartSubject.next(serverCart);
            this.saveCartToLocalStorage();
            this.updateCartSummary();
          }
        }
      });
  }

  /**
   * Calculate and update the cart summary
   */
  private updateCartSummary(): void {
    const cart = this.cartSubject.value;
    if (!cart) {
      this.cartSummarySubject.next({
        total_items: 0,
        subtotal: 0,
        tax: 0,
        shipping_fee: 0,
        total: 0,
        currency: this.DEFAULT_CURRENCY
      });
      return;
    }
    
    // Calculate items and subtotal
    let totalItems = 0;
    let subtotal = 0;
    
    cart.items.forEach(item => {
      totalItems += item.quantity;
      subtotal += item.package.unit_price * item.quantity;
    });
    
    // Calculate tax and shipping
    // For simplicity, using fixed shipping fee of 500 KES
    const shippingFee = totalItems > 0 ? 500 : 0;
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax + shippingFee;
    
    this.cartSummarySubject.next({
      total_items: totalItems,
      subtotal,
      tax,
      shipping_fee: shippingFee,
      total,
      currency: this.DEFAULT_CURRENCY
    });
  }

  /**
   * Add a product to the cart
   */
  addToCart(product: Product, packageItem: ProductPackage, quantity: number = 1): Observable<Cart> {
    return this.cart$.pipe(
      take(1),
      map(cart => {
        if (!cart) {
          this.createNewCart();
          return this.cartSubject.value!;
        }
        return cart;
      }),
      map(cart => {
        // Check if the item already exists in the cart
        const existingItemIndex = cart.items.findIndex(
          item => item.product_id === product.id && item.package_id === packageItem.id
        );
        
        const updatedItems = [...cart.items];
        
        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity,
            updated_at: new Date()
          };
        } else {
          // Add new item
          updatedItems.push({
            id: uuidv4(),
            product_id: product.id,
            product,
            package_id: packageItem.id,
            package: packageItem,
            quantity,
            added_at: new Date(),
            updated_at: new Date()
          });
        }
        
        // Update cart
        const updatedCart: Cart = {
          ...cart,
          items: updatedItems,
          updated_at: new Date()
        };
        
        this.cartSubject.next(updatedCart);
        this.saveCartToLocalStorage();
        this.updateCartSummary();
        
        // Sync with server if user is logged in
        this.syncCartWithServer();
        
        return updatedCart;
      })
    );
  }

  /**
   * Update item quantity in the cart
   */
  updateQuantity(itemId: string, quantity: number): Observable<Cart> {
    if (quantity <= 0) {
      return this.removeFromCart(itemId);
    }
    
    return this.cart$.pipe(
      take(1),
      map(cart => {
        if (!cart) {
          // If no cart exists, create one and return empty cart
          this.createNewCart();
          return this.cartSubject.value!;
        }
        
        const itemIndex = cart.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return cart;
        
        const updatedItems = [...cart.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          quantity,
          updated_at: new Date()
        };
        
        const updatedCart: Cart = {
          ...cart,
          items: updatedItems,
          updated_at: new Date()
        };
        
        this.cartSubject.next(updatedCart);
        this.saveCartToLocalStorage();
        this.updateCartSummary();
        
        // Sync with server if user is logged in
        this.syncCartWithServer();
        
        return updatedCart;
      }),
      // Filter out null values to satisfy TypeScript
      filter((cart): cart is Cart => cart !== null)
    );
  }

  /**
   * Remove an item from the cart
   */
  removeFromCart(itemId: string): Observable<Cart> {
    return this.cart$.pipe(
      take(1),
      map(cart => {
        if (!cart) {
          // If no cart exists, create one and return empty cart
          this.createNewCart();
          return this.cartSubject.value!;
        }
        
        const updatedItems = cart.items.filter(item => item.id !== itemId);
        
        const updatedCart: Cart = {
          ...cart,
          items: updatedItems,
          updated_at: new Date()
        };
        
        this.cartSubject.next(updatedCart);
        this.saveCartToLocalStorage();
        this.updateCartSummary();
        
        // Sync with server if user is logged in
        this.syncCartWithServer();
        
        return updatedCart;
      }),
      // Filter out null values to satisfy TypeScript
      filter((cart): cart is Cart => cart !== null)
    );
  }

  /**
   * Clear the entire cart
   */
  clearCart(): Observable<Cart> {
    return this.cart$.pipe(
      take(1),
      map(cart => {
        if (!cart) {
          // If no cart exists, create one and return empty cart
          this.createNewCart();
          return this.cartSubject.value!;
        }
        
        const clearedCart: Cart = {
          ...cart,
          items: [],
          updated_at: new Date()
        };
        
        this.cartSubject.next(clearedCart);
        this.saveCartToLocalStorage();
        this.updateCartSummary();
        
        // Sync with server if user is logged in
        if (this.currentUser) {
          this.supabaseService.getSupabase()
            .from('carts')
            .update({ 
              items: [], 
              updated_at: new Date() 
            })
            .eq('id', cart.id)
            .then();
        }
        
        return clearedCart;
      }),
      // Filter out null values to satisfy TypeScript
      filter((cart): cart is Cart => cart !== null)
    );
  }

  /**
   * Save the current cart for later
   */
  saveCartForLater(name: string): Observable<SavedCart> {
    if (!this.currentUser) {
      return of({
        id: '',
        user_id: '',
        name: '',
        items: [],
        created_at: new Date()
      });
    }
    
    return this.cart$.pipe(
      take(1),
      switchMap(cart => {
        if (!cart || cart.items.length === 0) {
          throw new Error('Cannot save an empty cart');
        }
        
        const savedCart: SavedCart = {
          id: uuidv4(),
          user_id: this.currentUser!.id,
          name,
          items: cart.items,
          created_at: new Date()
        };
        
        return this.supabaseService.getSupabase()
          .from('saved_carts')
          .insert(savedCart)
          .then(() => savedCart);
      })
    );
  }

  /**
   * Load a saved cart
   */
  loadSavedCart(savedCartId: string): Observable<Cart> {
    if (!this.currentUser) {
      throw new Error('User must be logged in to load a saved cart');
    }
    
    return this.cart$.pipe(
      take(1),
      switchMap(currentCart => {
        return this.supabaseService.getSupabase()
          .from('saved_carts')
          .select('*')
          .eq('id', savedCartId)
          .eq('user_id', this.currentUser!.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              throw new Error('Saved cart not found');
            }
            
            const savedCart = data as SavedCart;
            
            // Create a new cart or update existing
            const updatedCart: Cart = {
              ...(currentCart || {
                id: uuidv4(),
                user_id: this.currentUser!.id,
                created_at: new Date(),
              }),
              items: savedCart.items,
              updated_at: new Date()
            };
            
            this.cartSubject.next(updatedCart);
            this.saveCartToLocalStorage();
            this.updateCartSummary();
            
            // Sync with server
            this.syncCartWithServer();
            
            return updatedCart;
          });
      })
    );
  }

  /**
   * Get all saved carts for the current user
   */
  getSavedCarts(): Observable<SavedCart[]> {
    if (!this.currentUser) {
      return of([]);
    }
    
    return from(
      this.supabaseService.getSupabase()
        .from('saved_carts')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) {
          return [];
        }
        return data as SavedCart[];
      })
    );
  }

  /**
   * Create a checkout process
   */
  createCheckout(checkoutDetails: CheckoutDetails): Observable<{ checkout_id: string }> {
    return this.cart$.pipe(
      take(1),
      switchMap(cart => {
        if (!cart || cart.items.length === 0) {
          throw new Error('Cannot checkout with an empty cart');
        }
        
        // Calculate cart summary
        const cartSummary = this.cartSummarySubject.value;
        
        // Create checkout object
        const checkout = {
          id: uuidv4(),
          user_id: this.currentUser?.id,
          session_id: !this.currentUser ? this.getOrCreateSessionId() : null,
          cart_id: cart.id,
          cart_items: cart.items,
          cart_summary: cartSummary,
          shipping_address: checkoutDetails.shipping_address,
          billing_address: checkoutDetails.same_as_shipping 
            ? checkoutDetails.shipping_address 
            : checkoutDetails.billing_address,
          payment_method: checkoutDetails.payment_method,
          delivery_method: checkoutDetails.delivery_method,
          delivery_instructions: checkoutDetails.delivery_instructions || null,
          delivery_date: checkoutDetails.delivery_date || null,
          pickup_location: checkoutDetails.pickup_location || null,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        };
        
        // Save checkout to Supabase
        return this.supabaseService.getSupabase()
          .from('checkouts')
          .insert(checkout)
          .then(() => {
            // Clear the cart after successful checkout
            this.clearCart().subscribe();
            
            return { checkout_id: checkout.id };
          });
      })
    );
  }

  /**
   * Helper to convert date string to Date object
   */
  private toDate(dateStr: string): Date {
    return new Date(dateStr);
  }
}