# 📦 Embed File Version History

## Current Version: v2.3 (Latest)

**File:** `SHOPIFY-NATIVE-EMBED.html`  
**Last Updated:** October 2025  
**Status:** ✅ Up-to-date with main app

---

## ✅ Current Features (v2.3)

All features from the main Next.js app are included:

### 🎯 Personalization & Memory
- ✅ **Smart Name Extraction**
  - Handles: "I'm Mark", "My name is Mark", "Call me Mark", etc.
  - Extracts actual name from common phrases
  
- ✅ **Chat History Persistence**
  - Saved to browser localStorage
  - Survives page refreshes
  - Welcome back messages for returning users

- ✅ **User Controls**
  - Clear chat button
  - Change name button
  - Personalized subtitle with user name

### 🔗 Smart Link Behavior
- ✅ **Domain Detection**
  - Internal links (portablespas.co.nz) → Same tab
  - External links → New tab
  - Automatic detection and routing

### 📜 Smooth Scrolling
- ✅ **Auto-scroll to Bottom**
  - Smooth scroll on new messages
  - "Scroll to bottom" button when scrolled up
  - Natural, Claude-style behavior

### 🎨 UI/UX
- ✅ **Clean Design**
  - No borders
  - White background
  - Minimalist light mode
  - Responsive mobile/desktop

### 🔌 Integration
- ✅ **Native JavaScript**
  - No dependencies
  - Self-contained
  - Aggressive CSS isolation
  - Works on any platform

---

## 📋 Feature Parity Check

| Feature | Main App | Embed File | Status |
|---------|----------|------------|--------|
| Smart name extraction | ✅ | ✅ | ✅ Match |
| localStorage history | ✅ | ✅ | ✅ Match |
| Smart links (internal/external) | ✅ | ✅ | ✅ Match |
| Smooth scrolling | ✅ | ✅ | ✅ Match |
| Scroll to bottom button | ✅ | ✅ | ✅ Match |
| Clear chat | ✅ | ✅ | ✅ Match |
| Change name | ✅ | ✅ | ✅ Match |
| Welcome back messages | ✅ | ✅ | ✅ Match |
| Markdown rendering | ✅ | ✅ | ✅ Match |
| Loading indicators | ✅ | ✅ | ✅ Match |
| Error handling | ✅ | ✅ | ✅ Match |
| Mobile responsive | ✅ | ✅ | ✅ Match |

**Result:** ✅ **100% Feature Parity**

---

## 🔄 Version History

### v2.3 (Current) - October 2025
- ✅ Smart name extraction with pattern matching
- ✅ Fixed scrolling behavior
- ✅ Added scroll-to-bottom button
- ✅ Smart link routing (internal vs external)
- ✅ Improved localStorage handling

### v2.2 - October 2025
- ✅ Name collection and personalization
- ✅ Chat history persistence
- ✅ Clear chat functionality
- ✅ Change name functionality

### v2.1 - October 2025
- ✅ Markdown rendering
- ✅ Link handling
- ✅ Auto-scrolling

### v2.0 - October 2025
- ✅ Initial native embed
- ✅ Claude-style UI
- ✅ Mobile responsive
- ✅ CSS isolation

---

## 📝 Usage

### Copy & Paste Ready

1. Open: `SHOPIFY-NATIVE-EMBED.html`
2. Copy entire file (774 lines)
3. Paste into Shopify page HTML
4. Done! ✅

### API Configuration

The embed connects to:
```javascript
const API_URL = 'https://portable-spas-ai-chat.vercel.app/api/chat';
```

To use a different backend, change this URL in the embed file.

---

## 🎯 What Makes It "Native"

Unlike iframe embeds, this version:

1. **Direct DOM Injection**
   - No iframe wrapper
   - Single document
   - Native feel

2. **CSS Isolation**
   - Aggressive `!important` rules
   - Prefixed classes (`ps-*`)
   - Won't conflict with site styles

3. **Performance**
   - Faster load time
   - Single page load
   - No nested documents

4. **SEO Friendly**
   - Content visible to search engines
   - Better page integration

5. **Mobile Optimized**
   - Touch-friendly
   - Single smooth scroll
   - Native keyboard behavior

---

## 🔧 Customization

All customization can be done by editing CSS variables in the `<style>` section:

### Colors
```css
/* User messages */
.ps-message.ps-user .ps-bubble {
  background: #2563eb !important; /* Change to your brand color */
}

/* Buttons */
.ps-send-btn {
  background: #2563eb !important; /* Match brand color */
}
```

### Fonts
```css
#ps-native-chat-root {
  font-family: 'Your Font', sans-serif !important;
}
```

### Size
```css
.ps-chat-wrapper {
  max-width: 800px !important; /* Adjust width */
}

.ps-chat-container {
  min-height: 600px !important; /* Adjust height */
}
```

---

## ✨ Key Differences from Main App

The embed file has these differences (by necessity):

| Aspect | Main App | Embed File | Reason |
|--------|----------|------------|--------|
| Framework | React/Next.js | Vanilla JS | No dependencies |
| CSS | Tailwind | Inline CSS | Self-contained |
| Scroll | Radix ScrollArea | Native scroll | No dependencies |
| Markdown | react-markdown | Custom parser | No dependencies |
| Icons | Lucide React | SVG inline | No dependencies |

**But:** Functionality and UX are identical! 🎉

---

## 🚀 Deployment

### Shopify Integration

**Pages:**
1. Online Store → Pages → Add page
2. Click `<>` (Show HTML)
3. Paste entire embed code
4. Publish

**Theme Code:**
1. Online Store → Themes → Edit code
2. Create new section: `chat-widget.liquid`
3. Paste embed code
4. Add section to page template

**Liquid Template:**
```liquid
<div class="chat-container">
  {% include 'chat-widget' %}
</div>
```

---

## 🧪 Testing Checklist

Before deploying to production:

- ✅ Test on desktop (Chrome, Firefox, Safari)
- ✅ Test on mobile (iOS Safari, Android Chrome)
- ✅ Test name collection ("I'm Mark", "Mark", etc.)
- ✅ Test chat history (refresh page, should persist)
- ✅ Test clear chat button
- ✅ Test change name button
- ✅ Test scrolling with multiple messages
- ✅ Test scroll-to-bottom button appears/disappears
- ✅ Test internal links (same tab)
- ✅ Test external links (new tab)
- ✅ Test markdown rendering (bold, links, lists)
- ✅ Test error handling (disconnect internet)
- ✅ Verify API URL is correct

---

## 📊 Comparison: Embed vs Main App

### Use Embed When:
- ✅ Embedding in Shopify
- ✅ Embedding in WordPress
- ✅ Embedding in any CMS
- ✅ Want native, integrated feel
- ✅ Don't want iframe

### Use Main App When:
- ✅ Standalone deployment
- ✅ Need admin panel access
- ✅ Want React ecosystem
- ✅ Building on top of it

### Best Practice:
**Use both!**
- Main app at: `portable-spas-ai-chat.vercel.app`
- Embed on your Shopify site
- Both connect to same API
- Consistent experience everywhere

---

## 🆘 Troubleshooting

### Chat not loading?
- Check API_URL is correct
- Check browser console for errors
- Verify CORS is enabled on API

### Styling conflicts?
- Increase CSS specificity
- Add more `!important` flags
- Use more specific prefixes

### Name not saving?
- Check localStorage is enabled
- Check not in private/incognito mode
- Clear localStorage and retry

### Scroll not working?
- Check container has height set
- Verify messages are rendering
- Check for CSS conflicts

---

## 📚 Files Reference

- **Embed File**: `SHOPIFY-NATIVE-EMBED.html` (774 lines)
- **Main App**: `src/components/chat-interface.tsx`
- **Documentation**: `IFRAME-VS-NATIVE.md`
- **Mobile Guide**: `MOBILE-RESPONSIVE-GUIDE.md`
- **Admin Guide**: `ADMIN-INTERFACE.md`

---

## ✅ Status: Production Ready

**Current Status:** ✅ Fully tested and production-ready

The embed file is:
- ✅ Feature-complete
- ✅ Mobile-optimized  
- ✅ Cross-browser compatible
- ✅ SEO-friendly
- ✅ Performance-optimized
- ✅ Thoroughly tested

**Ready to deploy!** 🚀

