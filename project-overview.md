# Oil Lubricant Product Dashboard Project Overview

## Project Structure
This is an Angular 20 application integrated with Supabase for backend services. The project follows a modular architecture with the following main components:

### Core Components
- Authentication System
- User Management
- Product Management
- Order Processing
- Company Management
- Cart Functionality

### Module Structure
1. Admin Module
   - Companies Management
   - Dashboard
   - Orders Management
   - Products Management
   - System Settings
   - User Management

2. Auth Module
   - Login
   - Registration
   - Password Recovery
   - Email Verification
   - Password Reset

3. Company Module
   - Compliance
   - Customer Management
   - Dashboard
   - Inventory Management
   - Order Management
   - Product Management
   - Reports
   - Settings

4. Customer Module
   - Account Management
   - Shopping Cart
   - Checkout Process
   - Dashboard
   - Favorites
   - Order Management
   - Product Management
   - Support
   - Product Verification

## Current Issues and Solutions

### 1. Supabase Authentication Issues

#### Problem: Infinite Recursion in Profiles Policy
Error: "infinite recursion detected in policy for relation 'profiles'"

**Cause:**
This error typically occurs when there's a circular reference in your Supabase Row Level Security (RLS) policies for the profiles table.

**Solution:**
1. Review and modify your profiles table RLS policies:
```sql
-- Replace existing policy with:
CREATE POLICY "Users can view own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

2. Ensure your profiles table has a direct reference to auth.users:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  -- other fields
);
```

### 2. Server-Side Rendering Issue

#### Problem: reqHandler Export Missing
Error: "The 'reqHandler' export in 'server.ts' is either undefined or does not provide a recognized request handler"

**Solution:**
Update your `server.ts` to properly export the request handler:

```typescript
// src/server.ts
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './main.server';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

export const reqHandler = app();
```

### 3. Database Relationship Issue

#### Problem: Missing Relationship Between Tables
Error: "Could not find a relationship between 'profiles' and 'user_profiles'"

**Cause:**
This error suggests that your database schema is missing proper foreign key relationships between these tables.

**Solution:**
1. Ensure your tables are properly defined with foreign key relationships:
```sql
-- Define profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT
);

-- If you need a separate user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  -- additional fields
  CONSTRAINT fk_profile
    FOREIGN KEY(profile_id) 
    REFERENCES profiles(id)
    ON DELETE CASCADE
);
```

2. Update your Supabase client configuration to include proper relationships:
```typescript
// In your supabase.service.ts
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

## Integration Challenges with Angular 20 and Supabase

1. **Server-Side Rendering (SSR)**
   - Angular 20's SSR implementation may conflict with Supabase's client-side authentication
   - Solution: Implement proper SSR guards and state transfer

2. **Real-time Subscriptions**
   - Need to properly handle Supabase real-time subscriptions in Angular components
   - Implement proper cleanup in component lifecycle hooks

3. **Authentication State Management**
   - Ensure proper synchronization between Supabase auth state and Angular's auth guards
   - Implement proper session persistence

4. **Type Safety**
   - Maintain type safety between Supabase database types and Angular interfaces
   - Use generated types from Supabase CLI

## Recommendations

1. **Authentication Flow**
   - Implement proper error handling for auth state changes
   - Add proper loading states during authentication
   - Handle token refresh properly

2. **Database Structure**
   - Review and optimize RLS policies
   - Ensure proper table relationships
   - Implement proper indexing for frequently accessed data

3. **Performance Optimization**
   - Implement proper caching strategies
   - Optimize queries using Supabase's query builders
   - Use appropriate Supabase features for real-time updates

4. **Security**
   - Review and update RLS policies regularly
   - Implement proper input validation
   - Use proper error handling and logging

5. **Testing**
   - Implement comprehensive unit tests
   - Add integration tests for critical paths
   - Set up end-to-end testing for crucial user flows