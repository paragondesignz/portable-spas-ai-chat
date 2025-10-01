# Shopify Embedding Guide

## 🎯 Option 1: iFrame Embed (Recommended - Easiest)

### Why iFrame?
- ✅ Simplest to implement
- ✅ No code conflicts with Shopify theme
- ✅ Automatically updates when you deploy changes
- ✅ Full isolation from Shopify styles
- ✅ Works on any Shopify page

### How to Add:

**Step 1: Choose Where to Add**

You can add the chat to:
- A dedicated "Contact" or "Help" page
- Your homepage
- Product pages
- A custom section

**Step 2: Add the iFrame Code**

#### For a Full Page (Recommended):

1. In Shopify Admin: **Online Store → Pages → Add page**
2. Name it "Chat" or "Customer Service"
3. Click `<>` (Show HTML) in the editor
4. Paste this code:

```html
<div style="width: 100%; height: 800px; max-width: 1200px; margin: 0 auto;">
  <iframe 
    src="https://portable-spas-ai-chat.vercel.app" 
    style="width: 100%; height: 100%; border: 1px solid #e5e7eb; border-radius: 8px;"
    title="Portable Spas Customer Service Chat"
    allow="clipboard-read; clipboard-write"
  ></iframe>
</div>
```

5. Save and publish
6. Add to your navigation menu

#### For a Section in Your Theme:

1. **Online Store → Themes → Actions → Edit code**
2. **Sections → Add a new section**
3. Name it: `chat-widget.liquid`
4. Paste this code:

```liquid
<div class="chat-widget-section" style="padding: 40px 20px; background: #f9fafb;">
  <div style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; margin-bottom: 30px; font-size: 2em;">
      {{ section.settings.title }}
    </h2>
    <div style="width: 100%; height: {{ section.settings.height }}px; margin: 0 auto;">
      <iframe 
        src="https://portable-spas-ai-chat.vercel.app" 
        style="width: 100%; height: 100%; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        title="Customer Service Chat"
        allow="clipboard-read; clipboard-write"
      ></iframe>
    </div>
  </div>
</div>

{% schema %}
{
  "name": "Chat Widget",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Section Title",
      "default": "Chat with Our Team"
    },
    {
      "type": "range",
      "id": "height",
      "min": 400,
      "max": 1000,
      "step": 50,
      "unit": "px",
      "label": "Chat Height",
      "default": 700
    }
  ],
  "presets": [
    {
      "name": "Chat Widget"
    }
  ]
}
{% endschema %}
```

5. Save
6. Go to **Customize theme**
7. Add the "Chat Widget" section wherever you want

---

## ⚡ Option 2: Floating Chat Button (Advanced)

For a chat button that opens in a modal:

1. **Online Store → Themes → Actions → Edit code**
2. **Layout → theme.liquid**
3. Add before `</body>`:

```html
<!-- Floating Chat Button -->
<style>
  .ps-chat-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: #2563eb;
    border-radius: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999;
    transition: transform 0.2s;
  }
  
  .ps-chat-button:hover {
    transform: scale(1.1);
  }
  
  .ps-chat-button svg {
    width: 30px;
    height: 30px;
    fill: white;
  }
  
  .ps-chat-modal {
    display: none;
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 400px;
    height: 600px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 120px);
    z-index: 1000;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    border-radius: 12px;
    overflow: hidden;
    background: white;
  }
  
  .ps-chat-modal.open {
    display: block;
    animation: slideUp 0.3s ease-out;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .ps-chat-close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    background: white;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .ps-chat-modal iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
  
  @media (max-width: 768px) {
    .ps-chat-modal {
      width: calc(100vw - 20px);
      height: calc(100vh - 100px);
      right: 10px;
    }
  }
</style>

<div class="ps-chat-button" onclick="toggleChat()">
  <svg viewBox="0 0 24 24">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
  </svg>
</div>

<div class="ps-chat-modal" id="chatModal">
  <button class="ps-chat-close" onclick="toggleChat()">✕</button>
  <iframe 
    src="https://portable-spas-ai-chat.vercel.app"
    title="Customer Service Chat"
    allow="clipboard-read; clipboard-write"
  ></iframe>
</div>

<script>
  function toggleChat() {
    var modal = document.getElementById('chatModal');
    modal.classList.toggle('open');
  }
</script>
```

4. Save

This creates a blue floating chat button in the bottom-right corner that opens the chat in a modal.

---

## 🎨 Customization Options

### Change iFrame Height:
```html
height: 800px;  <!-- Adjust this value -->
```

### Change Width:
```html
max-width: 1200px;  <!-- Adjust this value -->
```

### Remove Border:
```html
border: none;  <!-- Instead of border: 1px solid -->
```

### Full Width:
```html
<iframe 
  src="https://portable-spas-ai-chat.vercel.app" 
  style="width: 100vw; height: 100vh; border: none; position: fixed; top: 0; left: 0;"
></iframe>
```

---

## 📱 Mobile Responsive - IMPORTANT!

✅ **YES! The chat works perfectly on mobile devices!**

The chat interface is already mobile-responsive and optimized for:
- **Smartphones** (iOS & Android)
- **Tablets** (iPad, Android tablets)  
- **Different orientations** (portrait & landscape)

### For Best Mobile Experience:

**Use the mobile-optimized code:** See `SHOPIFY-MOBILE-EMBED.html`

This includes:
- Automatic height adjustment for mobile
- Touch-friendly interactions
- Full-screen on mobile for better UX
- Smooth animations
- Prevents body scroll when open

### Quick Mobile Setup:

Instead of the basic iframe above, use this mobile-first code:

```html
<!-- Copy from SHOPIFY-MOBILE-EMBED.html for full mobile optimization -->
```

**📖 Full mobile guide:** See `MOBILE-RESPONSIVE-GUIDE.md` for complete details!

---

## 🔒 Security Notes

- ✅ iFrame is secure - your Vercel app runs separately
- ✅ No API keys exposed to Shopify
- ✅ CORS already configured
- ✅ All data stays on your Vercel server

---

## ⚡ Performance Tips

1. **Lazy Load** (Optional - for product pages):
```html
<iframe 
  src="https://portable-spas-ai-chat.vercel.app" 
  loading="lazy"
  ...
></iframe>
```

2. **Preload** (For dedicated chat page):
Add to `<head>`:
```html
<link rel="preconnect" href="https://portable-spas-ai-chat.vercel.app">
```

---

## 📊 Tracking (Optional)

To track chat usage in Google Analytics:

```javascript
<script>
  window.addEventListener('message', function(event) {
    if (event.origin === 'https://portable-spas-ai-chat.vercel.app') {
      // Track chat interactions
      if (typeof gtag !== 'undefined') {
        gtag('event', 'chat_interaction', {
          'event_category': 'Chat',
          'event_label': 'Message Sent'
        });
      }
    }
  });
</script>
```

---

## ✅ Quick Setup Checklist

- [ ] Decide where to add chat (page, section, or floating button)
- [ ] Copy appropriate code from above
- [ ] Paste into Shopify editor
- [ ] Adjust height/width as needed
- [ ] Save and preview
- [ ] Test on mobile devices
- [ ] Publish when satisfied

---

## 🆘 Troubleshooting

**Chat not showing?**
- Check browser console for errors
- Verify iframe src URL is correct
- Check Shopify theme permissions

**Looks cut off?**
- Increase height value
- Check parent container styles

**Not responsive on mobile?**
- Add the mobile CSS from above
- Test in Shopify preview mode

---

## 🎯 Recommended Setup

For most stores, we recommend:

1. **Create a dedicated "Chat" page** with the full-page iframe
2. **Add to main navigation** menu
3. **Optional:** Also add floating button on product/cart pages

This gives customers a clear way to get help while keeping your homepage clean.

---

## 📞 Need Help?

The chat is live at: https://portable-spas-ai-chat.vercel.app

Test it first before embedding to make sure everything works as expected!

