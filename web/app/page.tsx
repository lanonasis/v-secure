import {
  Shield,
  Lock,
  Key,
  Activity,
  CheckCircle,
  Zap,
  Database,
  Cloud,
  FileKey,
  ShieldCheck,
  AlertTriangle,
  BarChart,
  Globe,
  Fingerprint,
  EyeOff,
  Layers,
  Code,
  Building2,
  CreditCard,
  FileCheck,
  Network,
  Cpu,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { AiDemo } from './components/ai-demo'

export default function VortexShieldPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-700 z-50">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-vortex-indigo" />
              <span className="text-2xl font-bold gradient-text">VortexShield</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-300 hover:text-vortex-indigo transition">Features</a>
              <a href="#security" className="text-gray-300 hover:text-vortex-indigo transition">Security</a>
              <a href="#oauth" className="text-gray-300 hover:text-vortex-indigo transition">OAuth</a>
              <a href="#privacy" className="text-gray-300 hover:text-vortex-indigo transition">Privacy</a>
              <a href="#compliance" className="text-gray-300 hover:text-vortex-indigo transition">Compliance</a>
              <a href="#api" className="text-gray-300 hover:text-vortex-indigo transition">API</a>
              <Link href="/" className="text-gray-300 hover:text-vortex-indigo transition">
                All Services
              </Link>
              <a href="/signup" className="px-6 py-2 bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white rounded-lg hover:shadow-lg transition">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-full shadow-lg mb-6">
              <ShieldCheck className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-sm font-medium text-gray-200">SOC 2 • ISO 27001 • GDPR Compliant</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance">
              <span className="gradient-text">Security Infrastructure</span>
              <br />
              <span className="text-gray-100">for Cross-Border Safety</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              Enterprise-grade secret management without the enterprise complexity.
              Born from real-world production needs and refined through rigorous security standards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a href="/signup" className="px-8 py-4 bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white rounded-lg font-semibold text-lg hover:shadow-xl transition transform hover:-translate-y-1 text-center">
                Start Free Trial
              </a>
              <a href="https://docs.lanonasis.com/v-secure" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white text-vortex-indigo border-2 border-vortex-indigo rounded-lg font-semibold text-lg hover:bg-vortex-indigo hover:text-white transition text-center">
                View Documentation
              </a>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
              {[
                { label: '99.99%', sublabel: 'Uptime SLA', icon: <Activity className="w-6 h-6 text-vortex-blue" /> },
                { label: 'AES-256', sublabel: 'Encryption', icon: <Lock className="w-6 h-6 text-vortex-indigo" /> },
                { label: '<100ms', sublabel: 'Response Time', icon: <Zap className="w-6 h-6 text-vortex-cyan" /> },
                { label: 'SOC 2', sublabel: 'Certified', icon: <ShieldCheck className="w-6 h-6 text-green-400" /> },
              ].map((stat, idx) => (
                <div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 shadow-lg hover:bg-slate-800 transition">
                  <div className="flex items-center justify-center mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold gradient-text">{stat.label}</div>
                  <div className="text-sm text-gray-400 mt-1">{stat.sublabel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-800/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Core Capabilities</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built for developers who care about security. Designed for enterprises that demand compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Lock className="w-8 h-8" />,
                title: 'Secret Management',
                description: 'AES-256-GCM encrypted storage with version control, expiration, and secure sharing',
                features: ['Version Control', 'Auto Expiration', 'Secure Sharing', 'Multi-Environment']
              },
              {
                icon: <Key className="w-8 h-8" />,
                title: 'API Key Lifecycle',
                description: 'Complete key management from creation to rotation, with usage analytics and anomaly detection',
                features: ['Auto Rotation', 'Usage Analytics', 'Access Levels', 'Project Organization']
              },
              {
                icon: <Activity className="w-8 h-8" />,
                title: 'MCP Integration',
                description: 'Model Context Protocol support for secure AI tool access with approval workflows',
                features: ['Tool Registration', 'Access Requests', 'Session Management', 'Proxy Tokens']
              },
              {
                icon: <FileKey className="w-8 h-8" />,
                title: 'Immutable Audit Logs',
                description: 'HMAC-signed, tamper-proof audit trails for complete compliance visibility',
                features: ['Tamper-Proof', 'HMAC Signed', 'Compliance Ready', 'Real-time Monitoring']
              },
              {
                icon: <ShieldCheck className="w-8 h-8" />,
                title: 'Access Control',
                description: 'Role-based access control (RBAC) with fine-grained permissions and multi-tenancy',
                features: ['RBAC', 'Fine-grained Permissions', 'Multi-tenancy', 'MFA Support']
              },
              {
                icon: <Fingerprint className="w-8 h-8" />,
                title: 'Enterprise Encryption',
                description: 'PBKDF2 key derivation, automatic key rotation, and TLS 1.3 for data in transit',
                features: ['PBKDF2 (100k iterations)', 'Auto Key Rotation', 'TLS 1.3', 'Hardware Security']
              },
            ].map((feature, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 card-hover">
                <div className="text-vortex-indigo mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-100">{feature.title}</h3>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Standards */}
      <section id="security" className="py-20 bg-gradient-to-br from-vortex-indigo to-vortex-cyan text-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Security Standards & Compliance
            </h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
              Compliance built-in, not bolted-on. Every feature designed with SOC 2 and ISO 27001 in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'OWASP Top 10 (2023)',
                items: ['Broken Access Control', 'Cryptographic Failures', 'Injection Prevention', 'Security Logging']
              },
              {
                title: 'SOC 2 Type II',
                items: ['Security Controls', 'High Availability', 'Processing Integrity', 'Confidentiality']
              },
              {
                title: 'ISO 27001:2022',
                items: ['Access Control Policies', 'Cryptographic Controls', 'Evidence Collection', 'Data Masking']
              },
              {
                title: 'PCI DSS 4.0',
                items: ['Protect Cardholder Data', 'Authenticate Access', 'Log All Access', 'Encryption Standards']
              },
              {
                title: 'GDPR Compliance',
                items: ['Security of Processing', 'Records of Activities', 'Right to Erasure', 'Data Protection']
              },
              {
                title: 'NIST Framework',
                items: ['Identify Assets', 'Protect Systems', 'Detect Threats', 'Respond & Recover']
              },
            ].map((standard, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                  {standard.title}
                </h3>
                <ul className="space-y-2">
                  {standard.items.map((item, i) => (
                    <li key={i} className="text-sm text-indigo-100 flex items-start">
                      <span className="mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Integration */}
      <section id="api" className="py-20 bg-slate-900 text-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Developer-First <span className="gradient-text">API</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Intuitive TypeScript APIs that feel natural to use. Get started in minutes, not hours.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Secret Management Example */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <div className="bg-slate-900 px-6 py-3 border-b border-slate-700">
                <h3 className="font-semibold text-sm text-gray-300">Secret Management</h3>
              </div>
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="language-typescript">{`import { SecretService } from '@lanonasis/security-service';

const secretService = new SecretService();

// Store a secret
await secretService.storeSecret(
  'DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  'postgresql://<user>:<password>@<host>:<port>/<db>',
  {
    tags: ['database', 'production'],
    expiresAt: '2024-12-31'
  }
);

// Retrieve a secret
const dbUrl = await secretService.getSecret('DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
              </pre>
            </div>

            {/* API Key Management Example */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <div className="bg-slate-900 px-6 py-3 border-b border-slate-700">
                <h3 className="font-semibold text-sm text-gray-300">API Key Management</h3>
              </div>
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="language-typescript">{`import { ApiKeyService } from '@lanonasis/security-service';

const apiKeyService = new ApiKeyService();

// Create an API key
const apiKey = await apiKeyService.createApiKey({
  name: 'Production API Key',
  keyType: 'api_key',
  environment: 'production',
  rotationFrequency: 90
}, userId);

// Rotate an API key
await apiKeyService.rotateApiKey(keyId, userId);`}</code>
              </pre>
            </div>

            {/* MCP Integration Example */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 lg:col-span-2">
              <div className="bg-slate-900 px-6 py-3 border-b border-slate-700">
                <h3 className="font-semibold text-sm text-gray-300">MCP Integration (AI Tool Access)</h3>
              </div>
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="language-typescript">{`import { VortexClient } from '@vortex-secure/mcp-sdk';

// Initialize the client (api.lanonasis.com/mcp/v1)
const vortex = new VortexClient({
  endpoint: 'https://api.lanonasis.com/mcp/v1',
  apiKey: process.env.VORTEX_API_KEY,
  toolId: 'claude-code-assistant',
  toolName: 'Claude Code Assistant',
});

// Use secrets securely within scoped callback
await vortex.useSecret('GITHUB_TOKEN', async (token) => {
  // Token automatically revoked after callback
  const octokit = new Octokit({ auth: token });
  return octokit.repos.listForAuthenticatedUser();
});

// Or route requests through configured services
const result = await vortex.router.execute({
  service: 'github',
  action: 'repos.list',
});`}</code>
              </pre>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a href="https://docs.lanonasis.com/v-secure/api" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white rounded-lg font-semibold text-lg hover:shadow-xl transition inline-block">
              View Full API Documentation
            </a>
          </div>
        </div>
      </section>

      {/* OAuth2 PKCE Section */}
      <section id="oauth" className="py-20 bg-slate-900">
        <div className="container-custom">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-vortex-indigo/20 rounded-full mb-6">
              <Key className="w-5 h-5 text-vortex-indigo mr-2" />
              <span className="text-sm font-medium text-gray-300">Industry Standard Authentication</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">OAuth2 PKCE</span> Authentication
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Secure, standards-based authentication that never exposes user passwords. Perfect for IDE extensions, CLI tools, and third-party integrations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-400 mr-3" />
                <h3 className="text-2xl font-bold text-gray-100">Why PKCE?</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Browser-based login (familiar UX)',
                  'Extension never sees user password',
                  'Server-controlled token revocation',
                  'Complete audit trail',
                  'Scope-based permissions',
                  'Token refresh without re-login'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <Code className="w-8 h-8 text-vortex-blue mr-3" />
                <h3 className="text-2xl font-bold text-gray-100">Integration Points</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'VSCode/Cursor Extensions',
                  'CLI Tools & SDKs',
                  'Windsurf IDE Integration',
                  'Third-party Applications',
                  'API Gateway Authentication',
                  'MCP Tool Access Control'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-vortex-blue mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
              <Star className="w-6 h-6 text-vortex-cyan mr-2" />
              OAuth2 PKCE Flow
            </h3>
            <pre className="bg-slate-900 rounded-lg p-6 overflow-x-auto text-sm text-gray-300">
              <code>{`// 1. Generate code verifier & challenge
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// 2. Redirect to authorization endpoint
const authUrl = \`/oauth/authorize?client_id=cursor-extension&code_challenge=\${codeChallenge}\`;

// 3. User authenticates in browser
// 4. Receive authorization code
// 5. Exchange code + verifier for tokens
const tokens = await exchangeCode(code, codeVerifier);

// 6. Store tokens securely (SecretStorage)
await storage.store('vortexshield_token', tokens.accessToken);`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Privacy SDK Section */}
      <section id="privacy" className="py-20 bg-slate-800/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-vortex-cyan/20 rounded-full mb-6">
              <EyeOff className="w-5 h-5 text-vortex-cyan mr-2" />
              <span className="text-sm font-medium text-gray-300">GDPR & Privacy Compliant</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Privacy SDK</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built-in data masking, anonymization, and PII detection. Privacy by design, compliance by default.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: <EyeOff className="w-8 h-8" />,
                title: 'Data Masking',
                features: ['Email masking', 'Phone number protection', 'Credit card tokenization', 'SSN anonymization']
              },
              {
                icon: <Fingerprint className="w-8 h-8" />,
                title: 'PII Detection',
                features: ['Automatic detection', 'Pattern recognition', 'Context-aware masking', 'Custom patterns']
              },
              {
                icon: <FileCheck className="w-8 h-8" />,
                title: 'GDPR Compliance',
                features: ['Right to erasure', 'Data portability', 'Consent management', 'Audit trails']
              },
            ].map((feature, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 card-hover">
                <div className="text-vortex-cyan mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-4 text-gray-100">{feature.title}</h3>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
              <Code className="w-6 h-6 text-vortex-cyan mr-2" />
              Privacy SDK Usage
            </h3>
            <pre className="bg-slate-900 rounded-lg p-6 overflow-x-auto text-sm text-gray-300">
              <code>{`import { PrivacySDK } from '@lanonasis/privacy-sdk';

const privacy = new PrivacySDK();

// Mask sensitive data
const maskedEmail = privacy.maskData('user@example.com', { type: 'email' });
// Result: u***r@example.com

// Detect PII in text
const detected = privacy.detectPII('Contact: john@example.com or 555-1234');
// Returns: [{ type: 'email', value: 'john@example.com', position: 9 }]

// Sanitize entire objects
const sanitized = privacy.sanitizeObject(userData, {
  email: { type: 'email' },
  phone: { type: 'phone' }
});`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Vendor Abstraction Section */}
      <section id="abstraction" className="py-20 bg-slate-900">
        <div className="container-custom">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-vortex-blue/20 rounded-full mb-6">
              <Layers className="w-5 h-5 text-vortex-blue mr-2" />
              <span className="text-sm font-medium text-gray-300">Vendor-Agnostic Architecture</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Vendor Abstraction</span> Layer
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Switch vendors without changing code. Complete separation between client requests and vendor implementations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-gray-100 flex items-center">
                <Network className="w-8 h-8 text-vortex-blue mr-3" />
                Supported Categories
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'Payment Processing',
                  'AI/ML Services',
                  'Cloud Storage',
                  'Email Services',
                  'SMS/Notifications',
                  'Analytics'
                ].map((item, i) => (
                  <div key={i} className="flex items-center text-gray-300">
                    <CheckCircle className="w-4 h-4 text-vortex-blue mr-2" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-gray-100 flex items-center">
                <Cpu className="w-8 h-8 text-vortex-indigo mr-3" />
                Key Benefits
              </h3>
              <ul className="space-y-3">
                {[
                  'Zero code changes when switching vendors',
                  'Unified API across all vendors',
                  'Automatic input validation',
                  'Vendor-specific optimizations',
                  'Easy A/B testing between vendors',
                  'Future-proof architecture'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-300">
                    <CheckCircle className="w-5 h-5 text-vortex-indigo mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
              <Code className="w-6 h-6 text-vortex-blue mr-2" />
              Abstraction Layer Example
            </h3>
            <pre className="bg-slate-900 rounded-lg p-6 overflow-x-auto text-sm text-gray-300">
              <code>{`// Client code - vendor agnostic
const result = await abstraction.executeAbstractedCall(
  'payment',
  'processPayment',
  {
    amount: 100.00,
    currency: 'USD',
    customerId: 'cust_123'
  },
  'stripe' // Optional: prefer specific vendor
);

// Abstraction layer handles:
// 1. Input validation
// 2. Vendor selection
// 3. Format transformation
// 4. Error handling
// 5. Response normalization`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Enhanced Use Cases */}
      <section className="py-20 bg-slate-800/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Trusted Across</span> Industries
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              From fintech to healthcare, VortexShield secures Africa&apos;s digital economy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <CreditCard className="w-8 h-8" />,
                title: 'Financial Services',
                description: 'PCI DSS compliant payment processing and transaction security',
                features: ['Payment gateway secrets', 'Cardholder data protection', 'Transaction encryption', 'Compliance automation']
              },
              {
                icon: <Cloud className="w-8 h-8" />,
                title: 'SaaS Platforms',
                description: 'Multi-tenant secret management and API key lifecycle',
                features: ['Tenant isolation', 'API key rotation', 'Usage analytics', 'Access control']
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: 'Cross-Border Commerce',
                description: 'Secure international transactions and compliance automation',
                features: ['Multi-currency support', 'Regulatory compliance', 'Cross-border encryption', 'Audit trails']
              },
              {
                icon: <BarChart className="w-8 h-8" />,
                title: 'Data Analytics',
                description: 'Encrypted data processing and GDPR-compliant storage',
                features: ['Data masking', 'PII protection', 'Analytics encryption', 'Privacy compliance']
              },
            ].map((useCase, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 card-hover">
                <div className="text-vortex-indigo mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-bold mb-2 text-gray-100">{useCase.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{useCase.description}</p>
                <ul className="space-y-1">
                  {useCase.features.map((feature, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-center">
                      <CheckCircle className="w-3 h-3 text-green-400 mr-1" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-900">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Trusted by</span> Security Leaders
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              See what security professionals and enterprises are saying about VortexShield
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "VortexShield transformed our secret management. The OAuth2 PKCE integration was seamless, and compliance reporting saved us weeks of audit preparation.",
                author: "Sarah Chen",
                role: "CTO, FinTech Startup",
                company: "PaySecure Africa",
                icon: <Building2 className="w-12 h-12 text-vortex-blue" />
              },
              {
                quote: "The vendor abstraction layer is brilliant. We switched payment processors without changing a single line of code. Game-changer for our architecture.",
                author: "Michael Okafor",
                role: "Lead Security Engineer",
                company: "CrossBorder Commerce",
                icon: <Shield className="w-12 h-12 text-vortex-indigo" />
              },
              {
                quote: "GDPR compliance was our biggest concern. The Privacy SDK's automatic PII detection and masking made compliance effortless. Highly recommended.",
                author: "Amina Hassan",
                role: "Data Protection Officer",
                company: "HealthTech Solutions",
                icon: <FileCheck className="w-12 h-12 text-vortex-cyan" />
              },
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 card-hover">
                <div className="mb-4">{testimonial.icon}</div>
                <p className="text-gray-300 mb-6 italic">&quot;{testimonial.quote}&quot;</p>
                <div className="border-t border-slate-700 pt-4">
                  <p className="font-bold text-gray-100">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                  <p className="text-sm text-vortex-indigo">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Ready */}
      <section id="compliance" className="py-20 bg-slate-800/30">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="gradient-text">Compliance-Ready</span> from Day One
              </h2>
              <p className="text-xl text-gray-300">
                Built-in support for global compliance standards and regulatory frameworks
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-gray-100">✅ Current Standards</h3>
                  <ul className="space-y-3">
                    {[
                      'OWASP Top 10 (2023)',
                      'SOC 2 Type II',
                      'ISO 27001:2022',
                      'PCI DSS 4.0',
                      'GDPR Compliance',
                      'NIST Cybersecurity Framework'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-gray-100">🚀 Compliance Features</h3>
                  <ul className="space-y-3">
                    {[
                      'Immutable audit trails',
                      'HMAC-signed logs',
                      'Data retention policies',
                      'Access reports generation',
                      'Encryption status tracking',
                      'Real-time compliance monitoring'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center text-gray-300">
                        <Zap className="w-5 h-5 text-vortex-blue mr-3" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live AI Orchestrator Demo */}
      <AiDemo />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-vortex-blue via-vortex-indigo to-vortex-cyan text-white">
        <div className="container-custom text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Secure Your Infrastructure?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join forward-thinking companies across Africa that trust VortexShield for their security needs
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="/signup" className="px-8 py-4 bg-white text-vortex-indigo rounded-lg font-semibold text-lg hover:shadow-xl transition transform hover:-translate-y-1 text-center">
              Start Free Trial
            </a>
            <a href="https://calendly.com/lanonasis/demo" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white hover:text-vortex-indigo transition text-center">
              Schedule Demo
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">Free</div>
              <div className="text-indigo-100">14-day trial</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-indigo-100">Enterprise support</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">99.99%</div>
              <div className="text-indigo-100">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-gray-400 py-12 border-t border-slate-800">
        <div className="container-custom">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-6 h-6 text-vortex-indigo" />
                <span className="text-lg font-bold text-white">VortexShield</span>
              </div>
              <p className="text-sm text-gray-400">
                Security infrastructure for cross-border safety. Part of the LanOnasis platform suite.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-vortex-indigo transition">Features</a></li>
                <li><a href="#security" className="hover:text-vortex-indigo transition">Security</a></li>
                <li><a href="#oauth" className="hover:text-vortex-indigo transition">OAuth2 PKCE</a></li>
                <li><a href="#privacy" className="hover:text-vortex-indigo transition">Privacy SDK</a></li>
                <li><a href="#api" className="hover:text-vortex-indigo transition">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-vortex-indigo transition">Documentation</a></li>
                <li><a href="#" className="hover:text-vortex-indigo transition">API Reference</a></li>
                <li><a href="#compliance" className="hover:text-vortex-indigo transition">Compliance</a></li>
                <li><a href="#abstraction" className="hover:text-vortex-indigo transition">Vendor Abstraction</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-vortex-indigo transition">LanOnasis Platform</Link></li>
                <li><a href="#" className="hover:text-vortex-indigo transition">About</a></li>
                <li><a href="#" className="hover:text-vortex-indigo transition">Contact</a></li>
                <li><a href="#" className="hover:text-vortex-indigo transition">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 LanOnasis. All rights reserved. Licensed under MIT.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#privacy" className="hover:text-vortex-indigo transition">Privacy</a>
              <a href="#" className="hover:text-vortex-indigo transition">Terms</a>
              <a href="#security" className="hover:text-vortex-indigo transition">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
