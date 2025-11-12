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
  Fingerprint
} from 'lucide-react'
import Link from 'next/link'

export default function VortexShieldPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-vortex-indigo" />
              <span className="text-2xl font-bold gradient-text">VortexShield</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-vortex-indigo transition">Features</a>
              <a href="#security" className="text-gray-600 hover:text-vortex-indigo transition">Security</a>
              <a href="#compliance" className="text-gray-600 hover:text-vortex-indigo transition">Compliance</a>
              <a href="#api" className="text-gray-600 hover:text-vortex-indigo transition">API</a>
              <Link href="/" className="text-gray-600 hover:text-vortex-indigo transition">
                All Services
              </Link>
              <button className="px-6 py-2 bg-gradient-to-r from-vortex-blue to-vortex-indigo text-white rounded-lg hover:shadow-lg transition">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm mb-6">
              <ShieldCheck className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">SOC 2 • ISO 27001 • GDPR Compliant</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance">
              <span className="gradient-text">Security Infrastructure</span>
              <br />
              <span className="text-gray-800">for Cross-Border Safety</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Enterprise-grade secret management without the enterprise complexity.
              Born from real-world production needs and refined through rigorous security standards.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button className="px-8 py-4 bg-gradient-to-r from-vortex-blue to-vortex-indigo text-white rounded-lg font-semibold text-lg hover:shadow-xl transition transform hover:-translate-y-1">
                Start Free Trial
              </button>
              <button className="px-8 py-4 bg-white text-vortex-indigo border-2 border-vortex-indigo rounded-lg font-semibold text-lg hover:bg-vortex-indigo hover:text-white transition">
                View Documentation
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
              {[
                { label: '99.99%', sublabel: 'Uptime SLA' },
                { label: 'AES-256', sublabel: 'Encryption' },
                { label: '<100ms', sublabel: 'Response Time' },
                { label: 'SOC 2', sublabel: 'Certified' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 shadow-md">
                  <div className="text-3xl font-bold text-vortex-indigo">{stat.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{stat.sublabel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Core Capabilities</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
              <div key={idx} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 border border-gray-200 card-hover">
                <div className="text-vortex-indigo mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
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
      <section id="security" className="py-20 bg-gradient-to-br from-vortex-indigo to-vortex-purple text-white">
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
      <section id="api" className="py-20 bg-gray-900 text-white">
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
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <div className="bg-gray-900 px-6 py-3 border-b border-gray-700">
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
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
              <div className="bg-gray-900 px-6 py-3 border-b border-gray-700">
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
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 lg:col-span-2">
              <div className="bg-gray-900 px-6 py-3 border-b border-gray-700">
                <h3 className="font-semibold text-sm text-gray-300">MCP Integration (AI Tool Access)</h3>
              </div>
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="language-typescript">{`// Register an MCP tool
const tool = await apiKeyService.registerMCPTool({
  toolId: 'claude-code-assistant',
  toolName: 'Claude Code Assistant',
  permissions: {
    keys: ['GITHUB_TOKEN', 'AWS_ACCESS_KEY'],
    environments: ['development', 'staging'],
    maxConcurrentSessions: 3,
    maxSessionDuration: 900
  },
  autoApprove: false,
  riskLevel: 'medium'
}, userId);

// Request access to secrets
const requestId = await apiKeyService.createMCPAccessRequest({
  toolId: 'claude-code-assistant',
  keyNames: ['GITHUB_TOKEN'],
  environment: 'development',
  justification: 'Code review automation',
  estimatedDuration: 600
});`}</code>
              </pre>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button className="px-8 py-4 bg-gradient-to-r from-vortex-blue to-vortex-indigo text-white rounded-lg font-semibold text-lg hover:shadow-xl transition">
              View Full API Documentation
            </button>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Trusted Across</span> Industries
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From fintech to healthcare, VortexShield secures Africa's digital economy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Database className="w-8 h-8" />,
                title: 'Financial Services',
                description: 'PCI DSS compliant payment processing and transaction security'
              },
              {
                icon: <Cloud className="w-8 h-8" />,
                title: 'SaaS Platforms',
                description: 'Multi-tenant secret management and API key lifecycle'
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: 'Cross-Border Commerce',
                description: 'Secure international transactions and compliance automation'
              },
              {
                icon: <BarChart className="w-8 h-8" />,
                title: 'Data Analytics',
                description: 'Encrypted data processing and GDPR-compliant storage'
              },
            ].map((useCase, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 card-hover">
                <div className="text-vortex-indigo mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-bold mb-2 text-gray-800">{useCase.title}</h3>
                <p className="text-sm text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Ready */}
      <section id="compliance" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="gradient-text">Compliance-Ready</span> from Day One
              </h2>
              <p className="text-xl text-gray-600">
                Built-in support for global compliance standards and regulatory frameworks
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-gray-800">✅ Current Standards</h3>
                  <ul className="space-y-3">
                    {[
                      'OWASP Top 10 (2023)',
                      'SOC 2 Type II',
                      'ISO 27001:2022',
                      'PCI DSS 4.0',
                      'GDPR Compliance',
                      'NIST Cybersecurity Framework'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-gray-800">🚀 Compliance Features</h3>
                  <ul className="space-y-3">
                    {[
                      'Immutable audit trails',
                      'HMAC-signed logs',
                      'Data retention policies',
                      'Access reports generation',
                      'Encryption status tracking',
                      'Real-time compliance monitoring'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-vortex-blue via-vortex-indigo to-vortex-purple text-white">
        <div className="container-custom text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Secure Your Infrastructure?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join forward-thinking companies across Africa that trust VortexShield for their security needs
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="px-8 py-4 bg-white text-vortex-indigo rounded-lg font-semibold text-lg hover:shadow-xl transition transform hover:-translate-y-1">
              Start Free Trial
            </button>
            <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white hover:text-vortex-indigo transition">
              Schedule Demo
            </button>
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
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container-custom">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-6 h-6 text-vortex-indigo" />
                <span className="text-lg font-bold text-white">VortexShield</span>
              </div>
              <p className="text-sm">
                Security infrastructure for cross-border safety. Part of the LanOnasis platform suite.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#security" className="hover:text-white transition">Security</a></li>
                <li><a href="#api" className="hover:text-white transition">API</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition">Security Guide</a></li>
                <li><a href="#" className="hover:text-white transition">Compliance</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white transition">LanOnasis Platform</Link></li>
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">
              © 2024 LanOnasis. All rights reserved. Licensed under MIT.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="#" className="hover:text-white transition">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
