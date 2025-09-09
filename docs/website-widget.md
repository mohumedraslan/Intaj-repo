# Website Widget Integration Guide

## Overview

This guide will help you integrate the Intaj Chat Widget into your website. The widget enables:

- Real-time chat capabilities
- Customizable appearance
- Multi-language support
- File attachments
- Rich message formats

## Installation

### 1. Script Installation

Add the widget script to your HTML:

```html
<script src="https://cdn.intaj.io/widget.js" defer></script>
```

### 2. Widget Initialization

Initialize the widget with your configuration:

```javascript
window.IntajWidget.init({
  botId: 'your_bot_id',
  apiKey: 'your_public_api_key',
  position: 'bottom-right',
  theme: {
    primaryColor: '#007bff',
    textColor: '#333333',
  },
});
```

## Configuration Options

### Basic Configuration

```javascript
window.IntajWidget.init({
  botId: 'your_bot_id',
  apiKey: 'your_public_api_key',
  position: 'bottom-right', // bottom-right, bottom-left
  language: 'en', // en, ar, fr, etc.
  theme: {
    primaryColor: '#007bff',
    textColor: '#333333',
    fontFamily: 'Arial, sans-serif',
  },
});
```

### Advanced Configuration

```javascript
window.IntajWidget.init({
  botId: 'your_bot_id',
  apiKey: 'your_public_api_key',
  position: 'bottom-right',
  theme: {
    primaryColor: '#007bff',
    textColor: '#333333',
    fontFamily: 'Arial, sans-serif',
    borderRadius: '8px',
    headerHeight: '60px',
    width: '380px',
    height: '600px',
  },
  greeting: {
    message: 'Hello! How can I help you today?',
    delay: 2000,
  },
  attachments: {
    enabled: true,
    maxSize: 5, // MB
    allowedTypes: ['image/*', 'application/pdf'],
  },
  persistent: true,
  defaultOpen: false,
  notifications: {
    sound: true,
    browser: true,
  },
});
```

## JavaScript API

### Methods

```javascript
// Open widget
window.IntajWidget.open();

// Close widget
window.IntajWidget.close();

// Toggle widget
window.IntajWidget.toggle();

// Set user information
window.IntajWidget.setUser({
  name: 'John Doe',
  email: 'john@example.com',
  metadata: {
    plan: 'pro',
    company: 'Acme Inc',
  },
});

// Send message programmatically
window.IntajWidget.sendMessage('Hello!');
```

### Event Listeners

```javascript
// Widget ready
window.IntajWidget.on('ready', () => {
  console.log('Widget is ready');
});

// Message received
window.IntajWidget.on('message', message => {
  console.log('New message:', message);
});

// Widget opened
window.IntajWidget.on('open', () => {
  console.log('Widget opened');
});

// Widget closed
window.IntajWidget.on('close', () => {
  console.log('Widget closed');
});
```

## Customization

### 1. Styling

Custom CSS variables:

```css
:root {
  --intaj-primary-color: #007bff;
  --intaj-text-color: #333333;
  --intaj-background-color: #ffffff;
  --intaj-border-radius: 8px;
  --intaj-font-family: Arial, sans-serif;
}
```

### 2. Custom Components

Override default components:

```javascript
window.IntajWidget.init({
  components: {
    header: {
      title: 'Custom Header',
      logo: 'https://example.com/logo.png',
    },
    launcher: {
      label: 'Chat with us',
      icon: 'https://example.com/icon.svg',
    },
    inputPlaceholder: 'Type your message...',
  },
});
```

## Best Practices

1. **Performance**
   - Load script with defer attribute
   - Initialize after page load
   - Optimize asset sizes

2. **User Experience**
   - Set appropriate greeting delay
   - Configure reasonable file limits
   - Provide clear error messages

3. **Security**
   - Use public API key only
   - Validate file uploads
   - Sanitize user input

4. **Accessibility**
   - Set ARIA labels
   - Ensure keyboard navigation
   - Support screen readers

## Troubleshooting

### Common Issues

1. **Widget Not Loading**
   - Check script inclusion
   - Verify API key
   - Check browser console

2. **Connection Issues**
   - Verify internet connection
   - Check API endpoint status
   - Review CORS settings

3. **Style Conflicts**
   - Use CSS specificity
   - Check z-index
   - Review CSS cascade

## Examples

### Basic Integration

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
    <script src="https://cdn.intaj.io/widget.js" defer></script>
  </head>
  <body>
    <script>
      window.IntajWidget.init({
        botId: 'your_bot_id',
        apiKey: 'your_public_api_key',
      });
    </script>
  </body>
</html>
```

### Custom Integration

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
    <script src="https://cdn.intaj.io/widget.js" defer></script>
    <style>
      :root {
        --intaj-primary-color: #007bff;
        --intaj-text-color: #333333;
      }
    </style>
  </head>
  <body>
    <script>
      window.IntajWidget.init({
        botId: 'your_bot_id',
        apiKey: 'your_public_api_key',
        theme: {
          primaryColor: '#007bff',
        },
        greeting: {
          message: 'Welcome! How can I assist you?',
        },
      });

      window.IntajWidget.on('ready', () => {
        console.log('Widget ready');
      });
    </script>
  </body>
</html>
```

## Support

- Documentation: [docs.intaj.io](https://docs.intaj.io)
- Support: [support@intaj.io](mailto:support@intaj.io)
- Status: [status.intaj.io](https://status.intaj.io)
