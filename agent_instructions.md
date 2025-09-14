# Agent Instructions & Development Guidelines

## Core Development Principles

### 1. File Management Strategy
- **Always use Edit tool if file exists** - Never overwrite existing files unless explicitly requested
- **Create new files only when necessary** - Check if similar functionality exists first
- **Maintain file structure integrity** - Follow established patterns and conventions
- **Use MultiEdit for multiple changes** - When making several edits to the same file

### 2. Senior Engineer Approach
- **Code Quality First** - Write maintainable, type-safe, well-documented code
- **Error Handling** - Comprehensive error handling with proper logging using JSON.stringify
- **TypeScript Strict Mode** - Always fix TypeScript errors immediately
- **Performance Optimization** - Consider bundle size, lazy loading, and caching
- **Security Best Practices** - Input validation, sanitization, proper authentication
- **Testing Strategy** - Write tests for critical functionality

### 3. Business Owner Perspective
- **User Experience Priority** - Every change should improve UX
- **Business Value Focus** - Features should drive revenue or reduce costs
- **Scalability Planning** - Design for growth and future requirements
- **Market Positioning** - Maintain competitive advantage through innovation
- **ROI Consideration** - Prioritize high-impact, low-effort improvements

### 4. Intaj Platform Specifics

#### Terminology Standards
- Use "agents" not "chatbots" throughout the codebase
- Database tables use "agents" table, not "chatbots"
- API endpoints use `/agents/` not `/chatbots/`
- UI components reference "AI Agents" consistently

#### Architecture Patterns
- **Next.js 15 App Router** - Use server components where possible
- **Supabase Integration** - RLS policies for security, real-time subscriptions
- **Component Structure** - Shadcn UI components with custom styling
- **State Management** - React hooks + Supabase real-time for global state

#### Code Style Guidelines
- **TypeScript First** - All new code must be TypeScript
- **Functional Components** - Use hooks, avoid class components
- **Error Logging** - Always use `JSON.stringify(error, null, 2)` for error objects
- **Consistent Naming** - camelCase for variables, PascalCase for components
- **Import Organization** - External libraries first, then internal imports

### 5. Development Workflow

#### Before Starting Any Task
1. Read existing code to understand current implementation
2. Check for similar functionality that can be reused
3. Update todo_list with specific tasks
4. Plan the implementation approach

#### During Development
1. Fix TypeScript errors immediately
2. Test functionality as you build
3. Use proper error handling and validation
4. Follow established patterns and conventions
5. Update todo_list progress regularly

#### After Completion
1. Run TypeScript check: `npx tsc --noEmit`
2. Run linting: `npx next lint --fix`
3. Test all affected functionality
4. Update documentation if needed
5. Mark todos as completed

### 6. Common Patterns & Best Practices

#### Database Operations
```typescript
// Always handle errors properly
const { data, error } = await supabase
  .from('agents')
  .select('*')
  .eq('user_id', user.id);

if (error) {
  console.error('Database error:', JSON.stringify(error, null, 2));
  throw new Error(`Failed to fetch agents: ${error.message}`);
}
```

#### Component Structure
```typescript
// Always use proper TypeScript interfaces
interface ComponentProps {
  id: string;
  onUpdate?: (data: any) => void;
}

export default function Component({ id, onUpdate }: ComponentProps) {
  // Implementation
}
```

#### Error Handling
```typescript
try {
  // Operation
} catch (err) {
  console.error('Operation failed:', JSON.stringify({
    error: err instanceof Error ? err.message : String(err),
    context: { /* relevant context */ }
  }, null, 2));
}
```

### 7. UI/UX Standards

#### Design System
- **Dark Theme Primary** - #0a0a0b background, #f8fafc text
- **Gradient Accents** - Blue to purple gradients for highlights
- **Glass Card Effects** - Subtle backdrop blur for modern look
- **Consistent Spacing** - Use Tailwind spacing scale
- **Responsive Design** - Mobile-first approach

#### Navigation Patterns
- **Logo Navigation** - Always include Intaj logo linking to dashboard
- **Breadcrumb Trails** - Clear navigation hierarchy
- **Action Buttons** - Consistent placement and styling
- **Loading States** - Proper loading indicators for async operations

### 8. Security & Performance

#### Security Checklist
- [ ] Input validation and sanitization
- [ ] Proper authentication checks
- [ ] RLS policies for database access
- [ ] Environment variables for secrets
- [ ] CORS configuration
- [ ] Rate limiting for APIs

#### Performance Checklist
- [ ] Code splitting and lazy loading
- [ ] Image optimization
- [ ] Database query optimization
- [ ] Caching strategies
- [ ] Bundle size monitoring
- [ ] Core Web Vitals optimization

### 9. Integration Guidelines

#### External Services
- **AI Models** - Use OpenRouter for model access
- **Payments** - Stripe for subscription management
- **Messaging** - WhatsApp Business API, Telegram Bot API
- **Analytics** - Custom analytics with Supabase
- **Storage** - Supabase Storage for file uploads

#### API Design
- **RESTful Endpoints** - Follow REST conventions
- **Error Responses** - Consistent error format
- **Rate Limiting** - Implement proper limits
- **Versioning** - Use `/api/v1/` for versioned endpoints
- **Documentation** - OpenAPI/Swagger documentation

### 10. Business Logic Patterns

#### Agent Management
- **Creation Flow** - Multi-step wizard with validation
- **Configuration** - Tabbed interface for different settings
- **Status Management** - Active/Inactive/Training states
- **Integration Setup** - OAuth flows and API key management

#### Analytics & Reporting
- **Real-time Metrics** - Live dashboard updates
- **Historical Data** - Time-series analysis
- **Business KPIs** - Revenue, conversion, engagement metrics
- **Export Functionality** - CSV/PDF report generation

### 11. Troubleshooting Common Issues

#### TypeScript Errors
- Missing type definitions - Install @types packages
- Import errors - Check file paths and exports
- Interface mismatches - Update interfaces to match data structure

#### Supabase Issues
- RLS policy errors - Check user permissions
- Connection timeouts - Implement retry logic
- Real-time subscription issues - Verify channel setup

#### UI/UX Issues
- Layout shifts - Use proper loading skeletons
- Mobile responsiveness - Test on different screen sizes
- Accessibility - Ensure keyboard navigation and screen reader support

### 12. Deployment & Monitoring

#### Pre-deployment Checklist
- [ ] All TypeScript errors resolved
- [ ] Linting passes without errors
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Performance benchmarks met

#### Post-deployment Monitoring
- [ ] Error tracking active
- [ ] Performance monitoring enabled
- [ ] User analytics configured
- [ ] Business metrics tracking
- [ ] Backup systems verified

---

## Quick Reference Commands

```bash
# TypeScript check
npx tsc --noEmit --skipLibCheck

# Linting
npx next lint --fix

# Database migrations
npx supabase db push

# Development server
npm run dev

# Build production
npm run build

# Type generation
npx supabase gen types typescript --project-id [project-id] > src/lib/types/database.types.ts
```

## Emergency Contacts & Resources

- **Supabase Dashboard**: https://app.supabase.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **OpenRouter API**: https://openrouter.ai/docs

---

*This document should be updated regularly as the platform evolves and new patterns emerge.*
