# 📦 Embed File Version History

## Current Version: v2.6 (Latest) - Blue Theme + Smart Scroll

**File:** `SHOPIFY-NATIVE-EMBED.html` & `public/chat-widget.html`  
**Last Updated:** October 2025  
**Status:** ✅ Up-to-date with main app (Blue user messages + natural scroll)

---

## ✅ Current Features (v2.6)

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

### 📜 Smart Scrolling
- ✅ **Auto-scroll to Message Start**
  - Scrolls to beginning of latest message (not end)
  - Natural reading flow - see reply from the start
  - "New messages" button when scrolled up
  - Smooth scroll behavior

### 🎨 UI/UX (Centered Landing Style)
- ✅ **Centered Landing Page** (shows when ≤1 message)
  - Large "Hey there, Name" greeting (48-60px)
  - Greeting centered vertically on screen
  - Prominent input field centered below greeting
  - Rounded input (24px radius)
  - Round send button (56px, gray-800)
  - Action buttons below input
  - Smooth transition to chat view after first message
  
- ✅ **Chat View** (shows after first message)
  - Fixed header with border-bottom
  - Messages centered in container (max 768px width)
  - Rounder message bubbles (16px radius)
  - **Blue user messages (#2563eb), light gray assistant (#f3f4f6)**
  - **Blue links (#2563eb)** for easy identification
  - Gray send button (rounded-full)
  - White background, minimalist design
  - Responsive mobile/desktop
  
- ✅ **Consistent Styling**
  - Rounded inputs (24px radius)
  - **Blue underlined links in assistant messages**
  - **White links in user messages** (for contrast)
  - Send button: 44x44px (chat), 56x56px (landing)
  - Disclaimer text in chat view
  - Better spacing and visual hierarchy

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

### v2.6 (Current) - October 2025
- ✅ **NEW:** Scroll to beginning of message (not end)
- ✅ **NEW:** Blue user message bubbles (#2563eb)
- ✅ **NEW:** Blue links in assistant messages (#2563eb)
- ✅ White links in user messages (for contrast)
- ✅ Natural reading flow - see reply from start
- ✅ Improved scroll-to-message button behavior

### v2.5 - October 2025
- ✅ Centered landing page layout
- ✅ Gray color scheme throughout
- ✅ Dynamic layout switching

### v2.4 - October 2025
- ✅ Claude-style interface
- ✅ Fixed header design
- ✅ Centered message container

### v2.3 - October 2025
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

## 📜 Version History

### v2.6 (October 2025) - Blue Theme + Smart Scroll
**Changes:**
- ✅ **NEW:** Scroll to beginning of latest message (not end)
- ✅ **NEW:** Blue user message bubbles (#2563eb, white text)
- ✅ **NEW:** Blue links in assistant messages (#2563eb)
- ✅ **NEW:** White links in user messages (contrast on blue)
- ✅ Natural reading flow - see reply from the start
- ✅ Improved scroll behavior with message refs
- ✅ Updated "scroll to bottom" to scroll to message start
- ✅ More intuitive UX - no need to scroll back up

### v2.5 (October 2025) - Centered Landing Layout
**Changes:**
- ✅ **NEW:** Centered landing page layout (shows when ≤1 message)
- ✅ Large "Hey there, Name" greeting centered on screen
- ✅ Prominent centered input field on initial load
- ✅ Changed all colors to gray theme (removed blue)
- ✅ Gray user messages (#e5e7eb), gray assistant messages (#f3f4f6)
- ✅ Gray send button (#1f2937) with rounded-full style
- ✅ Rounded inputs (24px radius) throughout
- ✅ Gray underlined links (#1f2937)
- ✅ Smooth transition from landing to chat view
- ✅ Matches Gemini-style centered interface
- ✅ Mobile responsive with adjusted sizing

### v2.4 (October 2025) - Claude Style Update
**Changes:**
- ✅ Redesigned layout to match Claude AI interface
- ✅ Input now visible and centered on load (not below fold)
- ✅ Fixed header with cleaner styling and border
- ✅ Messages centered in 768px container
- ✅ Rounder message bubbles (16px radius)
- ✅ Blue user messages (#2563eb), gray assistant messages
- ✅ Improved input area with disclaimer text
- ✅ Better spacing and visual hierarchy
- ✅ Enhanced mobile responsive design
- ✅ All existing features retained

### v2.3 (October 2025) - Smart Links & Scrolling
- ✅ Smart link behavior (internal vs external)
- ✅ Improved scrolling with Claude-style button
- ✅ Better auto-scroll behavior

### v2.2 (October 2025) - Name Parsing Fix
- ✅ Smart name extraction from phrases
- ✅ Handles "I'm Mark", "My name is Mark", etc.

### v2.1 (October 2025) - Personalization
- ✅ User name collection
- ✅ Chat history persistence
- ✅ LocalStorage integration

### v2.0 (October 2025) - Native Embed
- ✅ Self-contained HTML/CSS/JS
- ✅ Aggressive CSS overrides
- ✅ No dependencies

### v1.0 (October 2025) - Initial Release
- ✅ Basic chat functionality
- ✅ Pinecone integration
- ✅ Markdown rendering

---

## ✅ Status: Production Ready

**Current Status:** ✅ Fully tested and production-ready

The embed file is:
- ✅ Feature-complete with centered landing layout
- ✅ Gray color scheme (no blue)
- ✅ Dynamic layout switching (landing ↔ chat)
- ✅ Mobile-optimized  
- ✅ Cross-browser compatible
- ✅ SEO-friendly
- ✅ Performance-optimized
- ✅ Thoroughly tested

**Ready to deploy!** 🚀

