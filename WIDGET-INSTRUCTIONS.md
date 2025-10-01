# Portable Spas Chat Widget - Integration Guide

## 📦 What You Get

A fully self-contained HTML chat widget that can be embedded into any webpage with zero dependencies.

## ✨ Features

- ✅ **Zero Dependencies** - No React, no external libraries
- ✅ **Fully Inline** - All CSS and JavaScript included
- ✅ **Aggressive CSS Isolation** - Won't conflict with existing styles
- ✅ **Markdown Support** - Links, bold, lists, code formatting
- ✅ **Responsive Design** - Works on mobile and desktop
- ✅ **Smooth Animations** - Fade-in messages, loading indicators
- ✅ **Auto-scroll** - Automatically scrolls to new messages
- ✅ **Same Functionality** - Identical to the React version

## 🚀 Quick Start

### Option 1: Copy & Paste (Recommended)

1. Open `public/chat-widget.html`
2. Copy the ENTIRE contents
3. Paste anywhere in your HTML where you want the chat to appear

**That's it!** The widget will work immediately.

### Option 2: External Script (Coming Soon)

Extract the JavaScript into a separate file and load it:

```html
<div id="portable-spas-chat-widget" data-api-url="/api/chat"></div>
<script src="/path/to/chat-widget.js"></script>
```

## ⚙️ Configuration

### API Endpoint ⚠️ CRITICAL

**The widget MUST use a full URL when embedded on external sites!**

```html
<!-- ❌ WRONG (only works on localhost) -->
<div id="portable-spas-chat-widget" data-api-url="/api/chat"></div>

<!-- ✅ CORRECT (works everywhere) -->
<div id="portable-spas-chat-widget" data-api-url="https://your-app.vercel.app/api/chat"></div>
```

**Why?** 
- Relative URLs (`/api/chat`) only work on the same domain
- When you embed on Shopify/WordPress, it tries to call THEIR `/api/chat` (doesn't exist!)
- You need the full URL to your deployed Next.js API

### Deployment Steps

1. **Deploy your Next.js app** to Vercel:
   ```bash
   npm run build
   vercel --prod
   ```

2. **Get your deployment URL** (e.g., `https://portable-spas-chat.vercel.app`)

3. **Update the widget** with your API URL:
   ```html
   <div id="portable-spas-chat-widget" 
        data-api-url="https://portable-spas-chat.vercel.app/api/chat">
   </div>
   ```

4. **CORS is already configured** - The API now accepts requests from any domain

### Customization

All styles are defined inline. To customize:

1. Find the `styles` constant in the widget code
2. Modify colors, sizes, fonts as needed
3. All classes are prefixed with `ps-` to avoid conflicts

**Example customizations:**

```javascript
// Change primary color (blue)
background: #2563eb !important;  // Change to your brand color

// Change chat height
height: 600px !important;  // Adjust as needed

// Change font
font-family: 'Your Font', sans-serif !important;
```

## 📋 Integration Examples

### Shopify

```liquid
<!-- In your theme.liquid or page template -->
<div class="chat-widget-wrapper">
  <!-- Paste widget code here -->
</div>
```

### WordPress

```php
<!-- In your page template or widget area -->
<?php
// Paste widget code here
?>
```

### Plain HTML

```html
<!DOCTYPE html>
<html>
<body>
  <h1>My Website</h1>
  
  <!-- Paste widget code here -->
  
</body>
</html>
```

## 🎨 Styling Notes

The widget uses:
- **Aggressive CSS specificity** - All styles use `!important` and ID selectors
- **CSS Reset** - `all: initial` on the container to prevent inheritance
- **Namespaced classes** - All classes prefixed with `ps-` (Portable Spas)
- **Scoped animations** - All keyframes prefixed with `ps-`

This ensures the widget won't be affected by existing page styles and won't affect your page.

## 🔧 How It Works

1. **Self-contained** - Everything runs in an IIFE (Immediately Invoked Function Expression)
2. **No globals** - Doesn't pollute the global namespace
3. **Vanilla JS** - Pure JavaScript, no frameworks
4. **Markdown parsing** - Simple regex-based markdown parser
5. **Fetch API** - Uses native fetch for API calls

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🐛 Troubleshooting

### Widget not showing

- Check browser console for errors
- Verify the `portable-spas-chat-widget` div exists
- Ensure JavaScript is enabled

### API errors

- Check the `data-api-url` attribute
- Verify CORS settings on your server
- Check network tab in browser DevTools

### Styling conflicts

- The widget should be isolated, but if issues occur:
- Check for CSS specificity conflicts
- Add more `!important` flags if needed
- Increase selector specificity

## 📄 Files

- `public/chat-widget.html` - The complete widget (copy this!)
- `public/widget-demo.html` - Demo page showing the widget in action
- `WIDGET-INSTRUCTIONS.md` - This file

## 🧪 Testing

1. Start your Next.js dev server: `npm run dev`
2. Open: `http://localhost:3000/widget-demo.html`
3. Test the chat functionality

## 📞 Support

For issues or questions, contact your development team.

---

## 💡 Pro Tips

1. **Multiple widgets** - You can have multiple widgets on the same page by changing the `WIDGET_ID`
2. **Custom welcome message** - Edit the initial `messages` array in the code
3. **Custom placeholder** - Change the input placeholder text
4. **Height adjustment** - Modify `height: 600px` in the container styles
5. **Mobile optimization** - Uses `max-height: 80vh` for mobile devices

## ✅ Checklist Before Going Live

- [ ] Test on your actual website
- [ ] Verify API endpoint is correct
- [ ] Test on mobile devices
- [ ] Check loading times
- [ ] Verify CORS settings
- [ ] Test with real customer questions
- [ ] Check browser console for errors
- [ ] Test scroll behavior with long conversations

---

**Ready to go!** Just copy `chat-widget.html` and paste it into your site. 🚀

