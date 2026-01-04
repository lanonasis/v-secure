# v-secure Documentation Integration Plan

Integration strategy for adding v-secure documentation to the existing Docusaurus platform at https://docs.lanonasis.com

## Current Platform Analysis

**Platform**: Docusaurus v3.8.1
**URL**: https://docs.lanonasis.com
**Current Products**: LanOnasis Memory-as-a-Service
**Features**:

- Multi-language support (English, Spanish, French, German)
- Dark/Light mode
- Search functionality
- Mobile responsive
- Dashboard integration

**Current Navigation**:

- Getting Started (`/intro`)
- API Reference (`/api/overview`)
- SDKs (`/sdks/overview`)
- Language selector
- Dashboard link

## Integration Strategy

### Option 1: Product-Based Navigation (Recommended)

Add v-secure as a separate product section within the existing docs platform.

**Benefits**:

- Clear separation between products
- Shared infrastructure and branding
- Consistent user experience
- Easy cross-product navigation
- Single search index

**Structure**:

```
docs.lanonasis.com/
├── intro (LanOnasis overview)
├── memory/
│   ├── intro
│   ├── api/
│   ├── sdks/
│   └── guides/
└── v-secure/
    ├── intro
    ├── getting-started
    ├── api/
    ├── sdks/
    ├── guides/
    ├── compliance/
    ├── mcp-integration/
    └── examples/
```

**Navigation Update**:

```jsx
// Add to navbar
<div class="navbar__item dropdown">
  <a href="#" class="navbar__link">
    Products
  </a>
  <ul class="dropdown__menu">
    <li>
      <a href="/memory/intro">Memory Service</a>
    </li>
    <li>
      <a href="/v-secure/intro">v-secure</a>
    </li>
  </ul>
</div>
```

### Option 2: Subdomain Approach

Host v-secure docs on a subdomain: `v-secure.docs.lanonasis.com`

**Benefits**:

- Complete independence
- Separate deployment pipeline
- Can use different Docusaurus config
- No conflicts with existing docs

**Drawbacks**:

- Separate search indexes
- Duplicate infrastructure
- Less cohesive experience

### Option 3: Monorepo with Multiple Instances

Use Docusaurus multi-instance feature for complete separation within same deployment.

**Benefits**:

- Separate sidebars and configs
- Shared components and theme
- Single deployment
- Independent versioning

## Recommended Implementation: Option 1 (Product-Based)

### Phase 1: Setup & Structure (Week 1)

#### 1.1 Create v-secure Documentation Directory

```bash
# In your Docusaurus project
docs/
├── memory/          # Move existing docs here
│   ├── intro.md
│   ├── api/
│   └── sdks/
└── v-secure/        # New v-secure docs
    ├── intro.md
    ├── getting-started.md
    ├── installation.md
    ├── configuration.md
    ├── api/
    │   ├── overview.md
    │   ├── secrets.md
    │   ├── api-keys.md
    │   └── mcp.md
    ├── guides/
    │   ├── secret-management.md
    │   ├── api-key-rotation.md
    │   ├── mcp-integration.md
    │   └── compliance.md
    ├── compliance/
    │   ├── soc2.md
    │   ├── iso27001.md
    │   └── gdpr.md
    ├── sdks/
    │   ├── typescript.md
    │   ├── nodejs.md
    │   └── cli.md
    ├── examples/
    │   ├── basic-usage.md
    │   ├── express-integration.md
    │   └── nextjs-integration.md
    └── troubleshooting.md
```

#### 1.2 Update docusaurus.config.js

```javascript
module.exports = {
  // ... existing config

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/lanonasis/v-secure/tree/main/docs/",
          // Add version support
          versions: {
            current: {
              label: "v1.0.0",
            },
          },
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      items: [
        // Add Products dropdown
        {
          type: "dropdown",
          label: "Products",
          position: "left",
          items: [
            {
              label: "Memory Service",
              to: "/memory/intro",
            },
            {
              label: "v-secure",
              to: "/v-secure/intro",
            },
          ],
        },
        // Keep existing items
        {
          type: "doc",
          docId: "intro",
          position: "left",
          label: "Getting Started",
        },
        // Add v-secure specific nav
        {
          type: "doc",
          docId: "v-secure/api/overview",
          position: "left",
          label: "API Reference",
        },
        // ... rest of navbar
      ],
    },

    // Add v-secure to footer
    footer: {
      links: [
        {
          title: "Products",
          items: [
            {
              label: "Memory Service",
              to: "/memory/intro",
            },
            {
              label: "v-secure",
              to: "/v-secure/intro",
            },
          ],
        },
        // ... existing footer links
      ],
    },
  },
};
```

#### 1.3 Create v-secure Sidebar Configuration

```javascript
// sidebars.js
module.exports = {
  // Existing Memory Service sidebar
  memorySidebar: [
    {
      type: "category",
      label: "Memory Service",
      items: ["memory/intro", "memory/quickstart" /* ... */],
    },
  ],

  // New v-secure sidebar
  vSecureSidebar: [
    {
      type: "category",
      label: "Getting Started",
      items: [
        "v-secure/intro",
        "v-secure/getting-started",
        "v-secure/installation",
        "v-secure/configuration",
      ],
    },
    {
      type: "category",
      label: "Core Concepts",
      items: [
        "v-secure/concepts/secrets",
        "v-secure/concepts/api-keys",
        "v-secure/concepts/encryption",
        "v-secure/concepts/audit-logs",
      ],
    },
    {
      type: "category",
      label: "API Reference",
      items: [
        "v-secure/api/overview",
        "v-secure/api/authentication",
        "v-secure/api/secrets",
        "v-secure/api/api-keys",
        "v-secure/api/mcp",
        "v-secure/api/audit-logs",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "v-secure/guides/secret-management",
        "v-secure/guides/api-key-rotation",
        "v-secure/guides/mcp-integration",
        "v-secure/guides/backup-restore",
      ],
    },
    {
      type: "category",
      label: "Compliance",
      items: [
        "v-secure/compliance/overview",
        "v-secure/compliance/soc2",
        "v-secure/compliance/iso27001",
        "v-secure/compliance/gdpr",
        "v-secure/compliance/pci-dss",
      ],
    },
    {
      type: "category",
      label: "SDKs",
      items: [
        "v-secure/sdks/overview",
        "v-secure/sdks/typescript",
        "v-secure/sdks/nodejs",
        "v-secure/sdks/cli",
      ],
    },
    {
      type: "category",
      label: "Examples",
      items: [
        "v-secure/examples/basic-usage",
        "v-secure/examples/express",
        "v-secure/examples/nextjs",
        "v-secure/examples/docker",
        "v-secure/examples/kubernetes",
      ],
    },
    {
      type: "doc",
      id: "v-secure/troubleshooting",
      label: "Troubleshooting",
    },
    {
      type: "doc",
      id: "v-secure/faq",
      label: "FAQ",
    },
  ],
};
```

### Phase 2: Content Migration (Week 2)

#### 2.1 Create Core Documentation Files

**v-secure/intro.md**:

````markdown
---
sidebar_position: 1
title: Introduction to v-secure
description: Enterprise-grade security service for managing secrets, API keys, and credentials
---

# v-secure

Enterprise-grade security service for managing secrets, API keys, and credentials.

## What is v-secure?

v-secure is a comprehensive security infrastructure solution that provides:

- 🔐 **Secret Management** - AES-256-GCM encrypted storage
- 🔑 **API Key Lifecycle** - Complete key management with rotation
- 🤖 **MCP Integration** - Secure AI tool access
- 📝 **Immutable Audit Logs** - HMAC-signed, tamper-proof trails
- ✅ **Compliance Ready** - SOC 2, ISO 27001, GDPR compliant

## Quick Start

```bash
npm install @lanonasis/security-service
```
````

[Get Started →](./getting-started)

## Key Features

### Secret Management

Store and retrieve secrets securely with version control and expiration.

### API Key Management

Complete lifecycle management from creation to rotation.

### MCP Integration

Secure access for AI tools with approval workflows.

### Compliance

Built-in support for SOC 2, ISO 27001, GDPR, and PCI DSS.

## Architecture

v-secure is part of the LanOnasis VortexCore ecosystem, providing security infrastructure for cross-border operations.

## Next Steps

- [Installation Guide](./installation)
- [Configuration](./configuration)
- [API Reference](./api/overview)
- [Examples](./examples/basic-usage)

````

#### 2.2 Convert Existing Documentation

Convert existing v-secure documentation to Docusaurus format:

1. **README.md** → `intro.md`
2. **API documentation** → `api/` directory
3. **Guides** → `guides/` directory
4. **Examples** → `examples/` directory

Use Docusaurus features:
- Admonitions (:::tip, :::warning, :::danger)
- Code blocks with syntax highlighting
- Tabs for multi-language examples
- Interactive API playground (optional)

### Phase 3: Enhanced Features (Week 3)

#### 3.1 Add Interactive API Documentation

```markdown
---
title: Secrets API
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Secrets API

## Store Secret

<Tabs>
<TabItem value="typescript" label="TypeScript">

\`\`\`typescript
import { SecretService } from '@lanonasis/security-service';

const secretService = new SecretService();

await secretService.storeSecret(
  'DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  'postgresql://<user>:<password>@<host>:<port>/<db>',
  {
    tags: ['database', 'production'],
    expiresAt: '2024-12-31'
  }
);
\`\`\`

</TabItem>
<TabItem value="curl" label="cURL">

\`\`\`bash
curl -X POST https://api.lanonasis.com/v1/secrets \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
    "value": "postgresql://<user>:<password>@<host>:<port>/<db>",
    "tags": ["database", "production"],
    "expiresAt": "2024-12-31"
  }'
\`\`\`

</TabItem>
</Tabs>
````

#### 3.2 Add Version Support

```bash
# Create versioned docs
npm run docusaurus docs:version 1.0.0
```

#### 3.3 Add Search Integration

Docusaurus already has Algolia DocSearch. Update configuration:

```javascript
// docusaurus.config.js
themeConfig: {
  algolia: {
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_API_KEY',
    indexName: 'lanonasis',
    contextualSearch: true,
    searchParameters: {
      facetFilters: ['product:v-secure'], // Filter by product
    },
  },
}
```

### Phase 4: Branding & Polish (Week 4)

#### 4.1 Add v-secure Branding

```css
/* src/css/custom.css */

/* v-secure specific colors */
[data-product="v-secure"] {
  --ifm-color-primary: #4f46e5; /* Indigo */
  --ifm-color-primary-dark: #4338ca;
  --ifm-color-primary-darker: #3730a3;
  --ifm-color-primary-darkest: #312e81;
  --ifm-color-primary-light: #6366f1;
  --ifm-color-primary-lighter: #818cf8;
  --ifm-color-primary-lightest: #a5b4fc;
}

/* v-secure badge */
.v-secure-badge {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
```

#### 4.2 Add Custom Components

```jsx
// src/components/VSecureFeature.js
import React from "react";

export default function VSecureFeature({ icon, title, description }) {
  return (
    <div className="v-secure-feature">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
```

#### 4.3 Add Landing Page

```jsx
// src/pages/v-secure/index.js
import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";

export default function VSecureHome() {
  return (
    <Layout
      title="v-secure Documentation"
      description="Enterprise-grade security infrastructure"
    >
      <header className="hero hero--primary">
        <div className="container">
          <h1 className="hero__title">v-secure</h1>
          <p className="hero__subtitle">
            Enterprise Security Infrastructure for Cross-Border Safety
          </p>
          <div className="buttons">
            <Link
              className="button button--secondary button--lg"
              to="/v-secure/intro"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </header>
      {/* Features section */}
    </Layout>
  );
}
```

## Implementation Checklist

### Week 1: Setup

- [ ] Create `/docs/v-secure/` directory structure
- [ ] Update `docusaurus.config.js` with v-secure navigation
- [ ] Create `sidebars.js` configuration for v-secure
- [ ] Set up product dropdown in navbar
- [ ] Test local build

### Week 2: Content

- [ ] Migrate intro and getting started docs
- [ ] Convert API documentation
- [ ] Add guides and tutorials
- [ ] Create compliance documentation
- [ ] Add examples

### Week 3: Features

- [ ] Add interactive code examples with tabs
- [ ] Set up version support
- [ ] Configure search with product filtering
- [ ] Add cross-product navigation
- [ ] Test all links and navigation

### Week 4: Polish

- [ ] Apply v-secure branding
- [ ] Create custom components
- [ ] Add landing page
- [ ] Optimize images and assets
- [ ] Final testing and QA

## Deployment

### Option A: Same Deployment (Recommended)

Deploy v-secure docs with existing docs:

```bash
# Build
npm run build

# Deploy to existing hosting
# (Netlify, Vercel, or your current host)
```

### Option B: Separate Deployment

If you want independent deployments:

```bash
# Deploy to v-secure.docs.lanonasis.com
# Configure DNS CNAME record
```

## Cross-Product Integration

### Shared Components

Create shared components for consistency:

```jsx
// src/components/ProductCard.js
export function ProductCard({ product, description, link }) {
  return (
    <div className="product-card">
      <h3>{product}</h3>
      <p>{description}</p>
      <Link to={link}>Learn More →</Link>
    </div>
  );
}
```

### Product Switcher

Add product switcher in navbar:

```jsx
<div className="product-switcher">
  <button>
    <span className="current-product">v-secure</span>
    <ChevronDown />
  </button>
  <div className="product-menu">
    <a href="/memory/intro">Memory Service</a>
    <a href="/v-secure/intro">v-secure</a>
  </div>
</div>
```

## SEO Optimization

### Meta Tags

```javascript
// docusaurus.config.js
module.exports = {
  themeConfig: {
    metadata: [
      {
        name: "keywords",
        content:
          "security, secrets management, API keys, encryption, compliance, SOC 2, ISO 27001, GDPR",
      },
    ],
  },
};
```

### Structured Data

Add JSON-LD for v-secure docs:

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "v-secure",
    "applicationCategory": "SecurityApplication",
    "offers": {
      "@type": "Offer",
      "price": "0"
    }
  }
</script>
```

## Maintenance

### Regular Updates

- Weekly: Review and update documentation
- Monthly: Check for broken links
- Quarterly: Update examples and tutorials
- Annually: Major version updates

### Community Contributions

- Enable "Edit this page" links to GitHub
- Set up documentation issues in GitHub
- Create contribution guidelines for docs

## Success Metrics

Track these metrics:

- Page views per section
- Search queries
- Time on page
- Bounce rate
- User feedback

## Support

For questions about documentation:

- **Technical Writer**: [Assign]
- **DevOps**: [Assign]
- **Product Manager**: [Assign]

---

**Status**: Ready for implementation
**Estimated Time**: 4 weeks
**Priority**: HIGH
**Dependencies**: Docusaurus platform access
