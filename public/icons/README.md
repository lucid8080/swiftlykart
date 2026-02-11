# PWA Icons

This directory should contain the following PWA icon files:

## Required Icons

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192x192 | Standard app icon |
| `icon-192-maskable.png` | 192x192 | Maskable icon (with 10% safe zone padding) |
| `icon-512.png` | 512x512 | Large app icon / splash screen |
| `icon-512-maskable.png` | 512x512 | Large maskable icon |

## Creating Icons

### Using Online Tools

1. **Maskable App Editor**: https://maskable.app/editor
   - Upload your source image
   - Adjust padding for safe zone
   - Export as maskable icon

2. **RealFaviconGenerator**: https://realfavicongenerator.net
   - Generates all necessary sizes
   - Includes maskable variants

3. **PWA Builder**: https://www.pwabuilder.com/imageGenerator
   - Upload single image
   - Generates all PWA icon sizes

### Design Guidelines

- **Safe Zone**: Maskable icons should have important content within the center 80% 
  (10% padding on each edge)
- **Background**: Use a solid background color that matches your app's theme
- **Transparency**: Non-maskable icons can have transparency; maskable should not
- **Format**: PNG with 24-bit color depth recommended

### Placeholder Icons

The SVG files in this directory can be used as templates:
- Convert to PNG at the required sizes
- Ensure proper padding for maskable variants

## Theme Colors

Match these colors from the app:
- Primary: `#ed7712` (Orange)
- Background (Light): `#fffbf5`
- Background (Dark): `#0f0d0a`
