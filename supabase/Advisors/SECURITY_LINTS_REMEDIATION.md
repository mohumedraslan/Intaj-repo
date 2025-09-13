# Supabase Security Lints Remediation Plan

## Overview

This document addresses the security issues identified in the Supabase Performance Security Lints report. The following issues need to be addressed to improve the security of our Supabase implementation.

## Issues and Remediation Steps

### 1. Function Search Path Mutable

**Issue**: Multiple functions in the `public` schema have a role mutable search_path, which is a security risk.

**Affected Functions**:
- `public.increment_usage`
- `public.get_analytics_metrics`
- `public.add_role`
- `public.get_monthly_usage`
- `public.has_role`
- `public.check_api_rate_limit`
- `public.match_vectors`

**Remediation**:

For each function, modify the function definition to explicitly set the search_path parameter. This prevents potential schema poisoning attacks.

Example fix for a function:

```sql
CREATE OR REPLACE FUNCTION public.function_name(...) 
RETURNS ... 
LANGUAGE ... 
SECURITY DEFINER
SET search_path = public
AS $$
  -- Function body
$$;
```

The key addition is `SET search_path = public` which explicitly sets the search path to the public schema.

### 2. Leaked Password Protection Disabled

**Issue**: Supabase Auth's leaked password protection feature is currently disabled.

**Remediation**:

Enable leaked password protection in the Supabase Auth settings to prevent users from using compromised passwords. This feature checks passwords against HaveIBeenPwned.org.

Steps:
1. Go to the Supabase Dashboard
2. Navigate to Authentication > Settings
3. Enable the "Leaked password protection" option

### 3. Vulnerable Postgres Version

**Issue**: The current Postgres version (supabase-postgres-17.4.1.075) has outstanding security patches available.

**Remediation**:

Upgrade the Postgres database to the latest version to receive security patches.

Steps:
1. Go to the Supabase Dashboard
2. Navigate to Project Settings > Database
3. Check for available updates
4. Schedule a maintenance window for the upgrade
5. Backup the database before upgrading
6. Apply the upgrade

## Implementation Timeline

1. **High Priority** - Enable leaked password protection (Immediate)
2. **Medium Priority** - Fix function search path issues (Within 1 week)
3. **High Priority** - Upgrade Postgres version (Schedule within 2 weeks)

## References

- [Function Search Path Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Password Security Documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Database Upgrading Guide](https://supabase.com/docs/guides/platform/upgrading)