# AI Assistant Troubleshooting Guide

## 🤖 Expected Behavior
The AI assistant should appear as a floating robot icon (🤖) in the bottom-right corner of all authenticated pages.

## 🔍 Troubleshooting Steps

### 1. Check Browser Console
Open browser developer tools (F12) and check for JavaScript errors:
```
Right-click → Inspect → Console tab
Look for any red error messages related to aiAssistant.js
```

### 2. Verify Script Loading
In browser developer tools:
```
Network tab → Reload page → Look for aiAssistant.js
Should show status 200 (success)
```

### 3. Check Authentication
Ensure you're logged in and on an authenticated page:
- ✅ Dashboard, Stock, Records, etc. (should have AI assistant)
- ❌ Login, Register pages (no AI assistant - this is correct)

### 4. Clear Browser Cache
```
Ctrl+Shift+R (hard refresh)
Or clear browser cache completely
```

### 5. Check CSS Conflicts
The AI assistant might be hidden by other CSS. In browser console, run:
```javascript
// Check if AI assistant elements exist
console.log('Chat toggle:', document.getElementById('chatToggle'));
console.log('Chat window:', document.getElementById('chatWindow'));

// Force show if hidden
const toggle = document.getElementById('chatToggle');
if (toggle) {
    toggle.style.display = 'block';
    toggle.style.position = 'fixed';
    toggle.style.bottom = '1.5rem';
    toggle.style.right = '1.5rem';
    toggle.style.zIndex = '9999';
}
```

### 6. Manual Initialization
If the script loaded but didn't initialize, try in browser console:
```javascript
// Check if ChatBot class exists
console.log('ChatBot class:', typeof ChatBot);

// Manual initialization
if (typeof ChatBot !== 'undefined') {
    window.chatbot = new ChatBot();
    console.log('AI Assistant manually initialized');
}
```

## 🚀 Quick Fix Script

If the AI assistant is not working, you can add this to any page temporarily:

```html
<script>
// Force load AI assistant if not present
if (!document.getElementById('chatToggle')) {
    console.log('Loading AI assistant...');
    const script = document.createElement('script');
    script.src = '/js/aiAssistant.js?v=' + Date.now();
    script.onload = function() {
        console.log('AI assistant loaded successfully');
    };
    script.onerror = function() {
        console.error('Failed to load AI assistant');
    };
    document.head.appendChild(script);
}
</script>
```

## 📋 Verification Checklist

- [ ] Browser console shows no JavaScript errors
- [ ] aiAssistant.js loads successfully (Network tab)
- [ ] You're on an authenticated page (not login/register)
- [ ] Robot icon (🤖) is visible in bottom-right corner
- [ ] Clicking robot icon opens chat window
- [ ] Ctrl+K keyboard shortcut works
- [ ] Chat responds to messages

## 🔧 Advanced Debugging

### Check AI Assistant API
Test if the backend is working:
```javascript
fetch('/api/ai-assistant/info')
    .then(response => response.json())
    .then(data => console.log('AI Assistant API:', data))
    .catch(error => console.error('API Error:', error));
```

### Check Session Authentication
```javascript
fetch('/api/live-counts')
    .then(response => response.json())
    .then(data => console.log('Auth check:', data))
    .catch(error => console.error('Auth error:', error));
```

## 📞 Still Not Working?

If none of these steps work:

1. **Check server logs** for any errors related to AI assistant routes
2. **Verify database connection** - AI assistant needs database access for advanced features
3. **Check file permissions** - Ensure `/js/aiAssistant.js` is readable
4. **Try different browser** - Rule out browser-specific issues
5. **Check network connectivity** - Ensure all assets can load

## 💡 Expected Features

When working correctly, the AI assistant provides:

- 🧠 **Real-time data access** - Live product availability, assignments, etc.
- 🎯 **Role-based responses** - Different capabilities for Employee/Monitor/Admin
- 💬 **Natural language processing** - Understands context and intent
- 📊 **Page summaries** - Can summarize current page content
- 🔄 **Conversation memory** - Remembers context within session
- 📱 **Responsive design** - Works on mobile and desktop
- ⌨️ **Keyboard shortcuts** - Ctrl+K to open, Escape to close
- 🎨 **Resizable interface** - Drag to resize chat window

The AI assistant is a powerful feature that should enhance your experience across all pages!