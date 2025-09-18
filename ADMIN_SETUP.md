# Admin Account Setup Guide

## How to Create an Admin Account

### Method 1: Database Direct Update (Recommended)

1. **Create a regular user account first:**
   - Go to `/auth/signup` and create a normal user account
   - Complete the email verification process

2. **Update the user role in Supabase:**
   ```sql
   -- Connect to your Supabase database and run:
   UPDATE profiles 
   SET role = 'admin', 
       updated_at = NOW()
   WHERE email = 'your-admin-email@example.com';
   ```

3. **Verify admin access:**
   - Log out and log back in
   - Navigate to `/admin/routing` to test admin access
   - You should now see admin-only features

### Method 2: Environment Variable (Development)

1. **Add admin emails to environment variables:**
   ```env
   # In your .env.local file
   ADMIN_EMAILS=admin@yourcompany.com,admin2@yourcompany.com
   ```

2. **Update the auth middleware:**
   ```typescript
   // In src/middleware.ts or auth helper
   const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
   const isAdmin = adminEmails.includes(user.email);
   ```

### Method 3: First User Auto-Admin

1. **Automatic first user promotion:**
   ```sql
   -- Add this trigger to automatically make the first user an admin
   CREATE OR REPLACE FUNCTION make_first_user_admin()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Check if this is the first user
     IF (SELECT COUNT(*) FROM profiles) = 1 THEN
       NEW.role = 'admin';
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER first_user_admin_trigger
     BEFORE INSERT ON profiles
     FOR EACH ROW
     EXECUTE FUNCTION make_first_user_admin();
   ```

## Admin Features Access

### Current Admin Routes:
- `/admin/routing` - Platform routing overview ✅
- `/admin/users` - User management (planned)
- `/admin/system` - System settings (planned)

### Admin Permissions:
- View all user accounts and agents
- Access system analytics and metrics
- Manage platform settings and configurations
- View audit logs and system health

## Database Schema for Admin

### Profiles Table Update:
```sql
-- Add role column if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Add role check constraint
ALTER TABLE profiles 
ADD CONSTRAINT check_role 
CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index for faster role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
```

### Admin Permissions Table (Optional):
```sql
-- Create admin permissions table for granular control
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL,
  granted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- RLS for admin permissions
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin permissions viewable by admins" ON admin_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

## Testing Admin Access

1. **Create test admin account:**
   ```bash
   # Use Supabase CLI or dashboard
   npx supabase db push
   ```

2. **Test admin routes:**
   - Visit `/admin/routing`
   - Check for admin-only UI elements
   - Verify access to admin APIs

3. **Verify permissions:**
   ```typescript
   // Test in browser console
   const response = await fetch('/api/admin/users');
   console.log(response.status); // Should be 200 for admin, 403 for regular users
   ```

## Security Considerations

### Admin Route Protection:
```typescript
// Example middleware for admin routes
export function withAdminAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return handler(req, res);
  };
}
```

### Admin UI Protection:
```typescript
// Example React hook for admin access
export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      }
      
      setLoading(false);
    }

    checkAdminAccess();
  }, []);

  return { isAdmin, loading };
}
```

## Quick Setup Commands

```bash
# 1. Update your database schema
npx supabase db push

# 2. Create your admin account via signup
# 3. Run this SQL in Supabase dashboard:
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

# 4. Test admin access
# Navigate to: http://localhost:3000/admin/routing
```

## Troubleshooting

### Common Issues:

1. **Admin routes return 404:**
   - Ensure the admin pages are created in `/src/app/admin/`
   - Check Next.js routing configuration

2. **Permission denied errors:**
   - Verify the user's role in the database
   - Check RLS policies on admin tables

3. **Admin UI not showing:**
   - Clear browser cache and cookies
   - Verify the admin check logic in components

### Debug Commands:
```sql
-- Check user roles
SELECT email, role, created_at FROM profiles ORDER BY created_at;

-- Verify admin permissions
SELECT p.email, p.role, ap.permission 
FROM profiles p 
LEFT JOIN admin_permissions ap ON p.id = ap.user_id 
WHERE p.role = 'admin';
```
