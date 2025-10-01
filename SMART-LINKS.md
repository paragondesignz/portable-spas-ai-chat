# Smart Link Behavior 🔗

The chat now intelligently handles links based on whether they're internal (your site) or external (other sites).

## 🎯 How It Works

### Internal Links (portablespas.co.nz)
- ✅ Opens in **same tab** (`target="_self"`)
- ✅ Keeps user on your site
- ✅ Better UX for browsing your products

### External Links (other domains)
- ✅ Opens in **new tab** (`target="_blank"`)
- ✅ User doesn't lose their chat
- ✅ Includes `rel="noopener"` for security

---

## 📋 Examples

### Same Tab (Internal):
```
AI: Check out our [Deluxe Model](https://portablespas.co.nz/products/deluxe)
     → Clicks link → Opens in SAME tab ✅

AI: See our [FAQ page](https://www.portablespas.co.nz/faq)
     → Clicks link → Opens in SAME tab ✅

AI: View [pricing](/pricing)
     → Clicks link → Opens in SAME tab ✅ (relative URL)
```

### New Tab (External):
```
AI: Read this [guide](https://example.com/spa-guide)
     → Clicks link → Opens in NEW tab ✅

AI: Check [this review](https://reviews.com/portable-spas)
     → Clicks link → Opens in NEW tab ✅

AI: Learn more at [Wikipedia](https://en.wikipedia.org/wiki/Hot_tub)
     → Clicks link → Opens in NEW tab ✅
```

---

## 🔍 Detection Logic

```javascript
function isInternalLink(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    return urlObj.hostname.includes('portablespas.co.nz');
  } catch (e) {
    // If URL parsing fails, assume it's a relative URL (internal)
    return !url.startsWith('http');
  }
}
```

### What Counts as Internal?

✅ **Internal (Same Tab)**:
- `https://portablespas.co.nz/products`
- `https://www.portablespas.co.nz/faq`
- `http://portablespas.co.nz/about`
- `/products/deluxe` (relative URL)
- `/faq` (relative URL)
- `#contact` (anchor link)

❌ **External (New Tab)**:
- `https://google.com`
- `https://facebook.com/portablespas`
- `https://example.com/anything`
- `http://otherdomain.com`

---

## 🎨 Why This Matters

### Better User Experience:

**Internal Links (Same Tab)**:
```
User clicks "View Product Page"
→ Navigates to product (stays in same window)
→ Can use browser back button to return to chat
→ Smooth, native feel ✅
```

**External Links (New Tab)**:
```
User clicks "Read Review on TrustPilot"
→ Opens review in new tab
→ Chat still open in original tab
→ User can finish reading and come back
→ No work lost ✅
```

---

## 🚀 Benefits

### For Internal Links:
1. **Native Navigation**: Feels like browsing your site
2. **Browser History**: Back button works naturally
3. **Reduced Tabs**: Cleaner browser experience
4. **Better Mobile UX**: Doesn't spawn new tabs on small screens

### For External Links:
1. **Keep Chat Open**: User doesn't lose their place
2. **Easy Return**: Can come back to chat easily
3. **Reference Material**: Can check multiple sources
4. **Standard Web UX**: Expected behavior for external links

---

## 🔧 Where Applied

✅ **Main Next.js App** (`src/components/chat-interface.tsx`)
- React component with TypeScript
- Used in Vercel deployment

✅ **Shopify Native Embed** (`SHOPIFY-NATIVE-EMBED.html`)
- Standalone JavaScript version
- Same behavior, no dependencies

---

## 🛡️ Security

### Internal Links:
```html
<a href="https://portablespas.co.nz/product" target="_self">
  Product Page
</a>
```
- No `rel` attribute needed (same origin)

### External Links:
```html
<a href="https://external.com" target="_blank" rel="noopener">
  External Site
</a>
```
- `rel="noopener"` prevents security vulnerabilities
- Stops new page from accessing `window.opener`

---

## 🧪 Testing

### Test Internal Links:
```
1. Ask chat: "Show me your products"
2. AI provides link to portablespas.co.nz/products
3. Click link
4. ✅ Opens in same tab
5. Use back button
6. ✅ Returns to chat
```

### Test External Links:
```
1. Ask chat: "What do reviews say?"
2. AI provides link to external review site
3. Click link
4. ✅ Opens in new tab
5. Chat still visible in original tab
6. ✅ Close new tab to return
```

### Test Relative Links:
```
1. AI sends link: "/products/deluxe"
2. Click link
3. ✅ Opens in same tab (relative = internal)
```

---

## 📱 Mobile Behavior

### Internal Links on Mobile:
- Opens in same mobile browser tab
- Browser back gesture returns to chat
- Natural navigation flow

### External Links on Mobile:
- Opens in new mobile tab
- Long-press to see options
- Easy to switch back to chat tab

---

## 💡 Future Enhancements

If needed, we could add:
- **Subdomain handling**: `shop.portablespas.co.nz` vs `blog.portablespas.co.nz`
- **Query parameter preservation**: Keep UTM tracking
- **Analytics tracking**: Log which links are clicked
- **Link previews**: Show hover preview of destination
- **Confirmation for external**: "You're leaving our site..."

But for now, the current behavior is optimal! ✅

---

## ✨ Summary

**Smart Link Detection:**
- 🏠 **portablespas.co.nz** → Same tab (keep browsing)
- 🌍 **Other domains** → New tab (keep chat open)

**Result:**
- Better navigation flow
- Chat stays accessible
- Professional user experience
- Matches modern web standards

Perfect for your Shopify store! 🎉

