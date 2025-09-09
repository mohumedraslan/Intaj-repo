# Intaj UI Design Guide

_Modern AI Automation Platform - Design System & Visual Identity_

---

## 🎨 Brand Philosophy & Visual Identity

### Core Brand Values

- **Intelligence**: Sophisticated AI capabilities with intuitive interfaces
- **Automation**: Seamless, effortless workflow automation
- **Connectivity**: Multi-channel integration and unified experience
- **Modern**: Cutting-edge technology with contemporary design
- **Professional**: Enterprise-ready with startup agility

### Design Principles

1. **Clarity Over Complexity**: Clean interfaces that make powerful features accessible
2. **Dark-First Design**: Professional, modern aesthetic that reduces eye strain
3. **Purposeful Animation**: Subtle micro-interactions that enhance UX
4. **Scalable Components**: Design system that grows with the platform
5. **Accessibility**: Inclusive design for all users

---

## 🌙 Color System

### Primary Dark Theme (Default)

```css
/* Background Layers */
--bg-primary: #0a0a0b /* Deep black-blue */ --bg-secondary: #141517 /* Card backgrounds */
  --bg-tertiary: #1f2024 /* Elevated surfaces */ --bg-accent: #2a2d35 /* Interactive elements */
  /* AI-Inspired Accent Colors */ --primary: #3b82f6 /* Intelligent Blue */ --primary-hover: #2563eb
  --secondary: #8b5cf6 /* Neural Purple */ --accent: #06b6d4 /* Automation Cyan */
  /* Status & Feedback */ --success: #10b981 /* Connected/Active */ --warning: #f59e0b
  /* Attention needed */ --error: #ef4444 /* Errors/Disconnected */ --info: #3b82f6
  /* Information */ /* Text Hierarchy */ --text-primary: #f8fafc /* Main content */
  --text-secondary: #cbd5e1 /* Supporting text */ --text-muted: #64748b /* Captions, labels */
  --text-disabled: #475569 /* Inactive elements */ /* Borders & Dividers */
  --border-primary: #334155 /* Main borders */ --border-secondary: #1e293b /* Subtle divisions */
  --border-accent: #3b82f6 /* Active/focused borders */;
```

### Light Theme (Toggle Option)

```css
/* Background Layers */
--bg-primary: #ffffff --bg-secondary: #f8fafc --bg-tertiary: #f1f5f9 --bg-accent: #e2e8f0
  /* Accent Colors (Adjusted for light mode) */ --primary: #2563eb --secondary: #7c3aed
  --accent: #0891b2 /* Text Hierarchy */ --text-primary: #0f172a --text-secondary: #334155
  --text-muted: #64748b --text-disabled: #94a3b8;
```

---

## 🎭 Visual Elements & Patterns

### Iconography Style

- **Phosphor Icons** or **Lucide React** for consistency
- **Duotone style** for feature icons (primary + muted accent)
- **24px standard** size with 16px and 32px variants
- **Rounded edges** to match overall design language

### Gradients & Effects

```css
/* AI-Inspired Gradients */
.gradient-neural {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
}

.gradient-automation {
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
}

.gradient-success {
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
}

/* Glassmorphism Effects */
.glass-card {
  background: rgba(31, 32, 36, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(59, 130, 246, 0.1);
}
```

### Animation Library

```css
/* Micro-interactions */
@keyframes pulse-ai {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes slide-up {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.ai-thinking {
  animation: pulse-ai 2s ease-in-out infinite;
}
```

---

## 📐 Layout & Components

### Grid System

- **12-column grid** with responsive breakpoints
- **24px base spacing unit** (6px, 12px, 24px, 48px, 96px)
- **Max content width**: 1200px for main content areas
- **Sidebar width**: 280px (collapsible to 80px)

### Component Hierarchy

#### Navigation

```
├── Top Navigation Bar
│   ├── Logo (Intaj + AI symbol)
│   ├── Workspace Switcher
│   ├── Search (Global)
│   └── User Menu + Theme Toggle
│
├── Side Navigation
│   ├── Dashboard
│   ├── Chatbots & Agents
│   ├── Channels (FB, IG, WhatsApp)
│   ├── Content Studio
│   ├── Analytics
│   └── Settings
```

#### Dashboard Cards

- **Status Cards**: AI agent status, channel connections
- **Quick Actions**: Create bot, connect channel, view analytics
- **Recent Activity**: Latest conversations, automations triggered
- **Performance Metrics**: Response times, conversion rates

#### Form Elements

- **Floating labels** for input fields
- **AI-powered suggestions** in dropdowns
- **Progressive disclosure** for advanced settings
- **Real-time validation** with smooth feedback

---

## 🚀 Page-Specific Design Patterns

### 1. Dashboard (Home)

```
┌─────────────────────────────────────────┐
│ Welcome back, [User] 🤖                 │
├─────────┬─────────┬─────────┬───────────┤
│ Active  │ Channel │ Today's │ Response  │
│ Bots: 5 │ Conn: 3 │ Chats   │ Time      │
│         │         │ 247     │ 1.2s avg  │
├─────────┴─────────┴─────────┴───────────┤
│ 📊 Quick Actions                        │
│ [Create Bot] [Connect Channel] [Analytics]│
├─────────────────────────────────────────┤
│ 🔄 Recent Activity                      │
│ • Bot "Support" handled 12 chats        │
│ • Instagram connected successfully       │
│ • New knowledge base uploaded           │
└─────────────────────────────────────────┘
```

### 2. Bot Builder

- **Visual flow builder** with drag-drop nodes
- **AI conversation preview** in real-time
- **Component palette** on the left
- **Properties panel** on the right
- **Dark canvas** with bright node connections

### 3. Channel Integrations

- **Connection status indicators** with real-time updates
- **OAuth flow** with branded loading states
- **Test message functionality** for each channel
- **Analytics preview** for connected channels

### 4. Content Studio

- **AI writing assistant** with templates
- **Multi-format preview** (chat, social, email)
- **Brand voice settings** and tone controls
- **Content calendar** view

---

## 🎨 UI Component Specifications

### Buttons

```jsx
// Primary Action Button
className =
  'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl';

// Secondary Button
className =
  'bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-6 py-3 rounded-lg font-medium transition-colors duration-200';

// AI Action Button (Special)
className =
  'bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700';
```

### Cards

```jsx
// Standard Card
className =
  'bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/30 transition-colors duration-200';

// Feature Card
className =
  'bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:-translate-y-1';
```

### Status Indicators

- **Connected**: Green pulse with "●" indicator
- **Connecting**: Blue spinning animation
- **Disconnected**: Red static indicator
- **AI Processing**: Cyan breathing animation

---

## 🌐 Responsive Breakpoints

```css
/* Mobile First Approach */
.mobile {
  @media (min-width: 640px);
} /* sm */
.tablet {
  @media (min-width: 768px);
} /* md */
.laptop {
  @media (min-width: 1024px);
} /* lg */
.desktop {
  @media (min-width: 1280px);
} /* xl */
```

### Mobile Adaptations

- **Bottom navigation** for primary actions
- **Swipe gestures** for chat management
- **Collapsible sections** for complex forms
- **Touch-optimized** button sizes (44px minimum)

---

## 🔧 Technical Implementation

### CSS Framework Stack

```json
{
  "base": "Tailwind CSS",
  "components": "Shadcn/ui",
  "animations": "Framer Motion",
  "icons": "Lucide React",
  "themes": "next-themes"
}
```

### Theme Toggle Implementation

```jsx
// Add to root layout
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  {children}
</ThemeProvider>

// Theme toggle button
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</Button>
```

---

## ⚡ Performance & Accessibility

### Performance Optimizations

- **CSS-in-JS** with zero runtime overhead (Tailwind)
- **Component lazy loading** for heavy features
- **Image optimization** with Next.js Image component
- **Font optimization** with next/font

### Accessibility Standards

- **WCAG 2.1 AA** compliance minimum
- **Color contrast ratio**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard navigation** for all interactive elements
- **Screen reader** optimized with proper ARIA labels
- **Reduced motion** support for animations

---

## 🎯 Brand Differentiators

### What Makes Intaj UI Unique

1. **AI-First Visual Language**: Subtle neural network patterns, breathing animations
2. **Professional Dark Mode**: Sophisticated, eye-friendly default theme
3. **Automation-Inspired Interactions**: Smooth, predictable micro-animations
4. **Multi-Channel Visual Consistency**: Unified design across all platforms
5. **Enterprise-Grade Polish**: Premium feel with startup accessibility

### Competitive Advantage Through Design

- **Reduced cognitive load** through consistent patterns
- **Professional credibility** through polished dark theme
- **User confidence** through clear status indicators
- **Platform stickiness** through delightful interactions
- **Brand recognition** through distinctive AI-inspired aesthetics

---

_This design system positions Intaj as the premium, intelligent choice for AI automation platforms while maintaining accessibility and usability for all user types._
