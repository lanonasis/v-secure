# Social Media Images - Customization Needed

## Current Status

✅ **Favicons**: Extracted from @lanonasis/brand-kit
✅ **Logo files**: Lan Onasis branding in place
⚠️ **Social media images**: Using Lan Onasis logo as placeholder

## Customize for VortexShield

The current `og-image.png` and `twitter-image.png` use the generic Lan Onasis logo. For better branding, create VortexShield-specific images:

### Option 1: Quick Customization (Recommended)

Use the existing logo with VortexShield text overlay:

**Tools**: Canva, Figma, or Photoshop

**og-image.png (1200x630)**

```
Background: Gradient (#0A1930 → #4F46E5)
Logo: Lan Onasis icon (centered or left)
Text: "VortexShield"
Subtext: "Enterprise Security Infrastructure"
Badges: "SOC 2 • ISO 27001 • GDPR"
```

**twitter-image.png (1200x675)**

```
Background: Gradient (#0A1930 → #6366F1)
Logo: Lan Onasis icon
Text: "VortexShield"
Subtext: "AES-256 • API Keys • MCP Integration"
```

### Option 2: Use Brand Kit Templates

Adapt existing social media templates:

```bash
# Available in brand-kit:
node_modules/@lanonasis/brand-kit/social-media/
- twitter-header-v1.png
- linkedin-cover-v1.png
- facebook-profile-v1.png
```

### Option 3: Keep Current (Fastest)

The current images work and show Lan Onasis branding, which is appropriate since VortexShield is part of the Lan Onasis ecosystem.

## Testing Social Previews

After customization, test with:

- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/

## Current Files

- ✅ `og-image.png` - 1.5MB (Lan Onasis logo)
- ✅ `twitter-image.png` - 1.5MB (Lan Onasis logo)
- ✅ `logo.png` - 1.5MB (Lan Onasis primary logo)
- ✅ `icon.png` - 1.5MB (Lan Onasis icon version)

All images are high quality and will work for deployment. Customization is optional but recommended for stronger VortexShield brand identity.
