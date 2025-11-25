const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * Compliance Manager - Handles PCI, GDPR, PSD2, and other regulatory compliance
 */
class ComplianceManager extends EventEmitter {
  constructor() {
    super();
    this.regulations = {
      PCI_DSS: new PCIComplianceValidator(),
      GDPR: new GDPRComplianceValidator(),
      PSD2: new PSD2ComplianceValidator(),
      SOX: new SOXComplianceValidator(),
      HIPAA: new HIPAAComplianceValidator()
    };
    
    this.auditLog = [];
    this.complianceCache = new Map();
  }

  /**
   * Validate service compliance against all applicable regulations
   */
  async validateServiceCompliance(serviceConfig) {
    const results = {
      serviceId: serviceConfig.id,
      timestamp: new Date(),
      overall: 'COMPLIANT',
      regulations: {},
      violations: [],
      recommendations: []
    };

    // Check each regulation
    for (const [regulation, validator] of Object.entries(this.regulations)) {
      try {
        const validationResult = await validator.validate(serviceConfig);
        results.regulations[regulation] = validationResult;

        if (!validationResult.compliant) {
          results.overall = 'NON_COMPLIANT';
          results.violations.push(...validationResult.violations);
          results.recommendations.push(...validationResult.recommendations);
        }
      } catch (error) {
        results.regulations[regulation] = {
          compliant: false,
          error: error.message,
          violations: [`Validation error: ${error.message}`]
        };
        results.overall = 'ERROR';
      }
    }

    // Cache results
    this.complianceCache.set(serviceConfig.id, results);

    // Emit compliance event
    this.emit('compliance:validated', results);

    // Log audit entry
    this.logAuditEntry('COMPLIANCE_VALIDATION', {
      serviceId: serviceConfig.id,
      result: results.overall,
      violationCount: results.violations.length
    });

    return results;
  }

  /**
   * Enforce data handling compliance
   */
  enforceDataHandling(serviceId, data, operation = 'process') {
    const service = this.getServiceConfig(serviceId);
    let processedData = { ...data };

    // Apply PCI DSS protections
    if (service?.compliance?.pci) {
      processedData = this.applyPCIProtections(processedData, operation);
    }

    // Apply GDPR protections
    if (service?.compliance?.gdpr) {
      processedData = this.applyGDPRProtections(processedData, operation);
    }

    // Apply PSD2 protections
    if (service?.compliance?.psd2) {
      processedData = this.applyPSD2Protections(processedData, operation);
    }

    // Log data handling
    this.logAuditEntry('DATA_HANDLING', {
      serviceId,
      operation,
      dataFields: Object.keys(data),
      protectionsApplied: this.getAppliedProtections(service)
    });

    return processedData;
  }

  /**
   * Apply PCI DSS data protections
   */
  applyPCIProtections(data, operation) {
    const protectedData = { ...data };
    
    // Mask credit card numbers
    if (protectedData.cardNumber) {
      protectedData.cardNumber = this.maskCardNumber(protectedData.cardNumber);
    }

    // Encrypt sensitive PCI data
    const pciFields = ['cvv', 'pin', 'track1', 'track2', 'magneticStripe'];
    pciFields.forEach(field => {
      if (protectedData[field]) {
        protectedData[field] = this.encryptSensitiveData(protectedData[field]);
      }
    });

    // Remove prohibited fields
    const prohibitedFields = ['cvv2', 'cvc2', 'cid', 'cav2'];
    prohibitedFields.forEach(field => {
      if (protectedData[field]) {
        delete protectedData[field];
        this.logAuditEntry('PCI_FIELD_REMOVED', { field, operation });
      }
    });

    return protectedData;
  }

  /**
   * Apply GDPR data protections
   */
  applyGDPRProtections(data, operation) {
    const protectedData = { ...data };

    // Pseudonymize personal identifiers
    const personalFields = ['email', 'phone', 'ssn', 'nationalId'];
    personalFields.forEach(field => {
      if (protectedData[field]) {
        protectedData[field] = this.pseudonymizeData(protectedData[field]);
      }
    });

    // Apply data minimization
    if (operation === 'analytics') {
      protectedData = this.minimizeDataForAnalytics(protectedData);
    }

    // Add consent tracking
    if (!protectedData.consentId && this.requiresConsent(data)) {
      throw new Error('GDPR consent required but not provided');
    }

    return protectedData;
  }

  /**
   * Apply PSD2 data protections
   */
  applyPSD2Protections(data, operation) {
    const protectedData = { ...data };

    // Strong Customer Authentication (SCA) validation
    if (this.requiresSCA(operation, data)) {
      if (!this.validateSCA(data)) {
        throw new Error('PSD2 Strong Customer Authentication required');
      }
    }

    // Transaction monitoring
    if (data.amount && parseFloat(data.amount) > 30) {
      this.logAuditEntry('PSD2_TRANSACTION_MONITORING', {
        amount: data.amount,
        currency: data.currency,
        operation
      });
    }

    return protectedData;
  }

  /**
   * Mask credit card number for PCI compliance
   */
  maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 6) return cardNumber;
    
    const cleaned = cardNumber.replace(/\D/g, '');
    const first6 = cleaned.substring(0, 6);
    const last4 = cleaned.substring(cleaned.length - 4);
    const masked = '*'.repeat(cleaned.length - 10);
    
    return `${first6}${masked}${last4}`;
  }

  /**
   * Encrypt sensitive data
   */
  encryptSensitiveData(data) {
    const algorithm = 'aes-256-gcm';
    const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('compliance-encryption'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm
    };
  }

  /**
   * Pseudonymize personal data for GDPR
   */
  pseudonymizeData(data) {
    const hash = crypto.createHash('sha256');
    hash.update(data + process.env.PSEUDONYM_SALT || 'default-salt');
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Minimize data for analytics (GDPR)
   */
  minimizeDataForAnalytics(data) {
    const allowedFields = [
      'timestamp', 'amount', 'currency', 'country', 
      'merchantCategory', 'transactionType'
    ];
    
    const minimized = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        minimized[field] = data[field];
      }
    });
    
    return minimized;
  }

  /**
   * Check if operation requires Strong Customer Authentication
   */
  requiresSCA(operation, data) {
    // PSD2 SCA requirements
    const scaOperations = ['payment', 'transfer', 'account_access'];
    
    if (!scaOperations.includes(operation)) return false;
    
    // Amount threshold (€30 for contactless)
    if (data.amount && parseFloat(data.amount) > 30) return true;
    
    // Cumulative amount threshold
    if (this.checkCumulativeAmount(data)) return true;
    
    return false;
  }

  /**
   * Validate Strong Customer Authentication
   */
  validateSCA(data) {
    const factors = [];
    
    // Something you know (password, PIN)
    if (data.password || data.pin) factors.push('knowledge');
    
    // Something you have (device, token)
    if (data.deviceId || data.token) factors.push('possession');
    
    // Something you are (biometric)
    if (data.biometric || data.fingerprint) factors.push('inherence');
    
    // PSD2 requires at least 2 factors
    return factors.length >= 2;
  }

  /**
   * Check cumulative transaction amount
   */
  checkCumulativeAmount(data) {
    // Implementation would check transaction history
    // This is a simplified version
    return false;
  }

  /**
   * Check if data requires GDPR consent
   */
  requiresConsent(data) {
    const consentRequiredFields = [
      'email', 'phone', 'address', 'personalId', 
      'biometric', 'location', 'behavioralData'
    ];
    
    return consentRequiredFields.some(field => data[field]);
  }

  /**
   * Get applied protections for a service
   */
  getAppliedProtections(service) {
    const protections = [];
    
    if (service?.compliance?.pci) protections.push('PCI_DSS');
    if (service?.compliance?.gdpr) protections.push('GDPR');
    if (service?.compliance?.psd2) protections.push('PSD2');
    if (service?.compliance?.sox) protections.push('SOX');
    if (service?.compliance?.hipaa) protections.push('HIPAA');
    
    return protections;
  }

  /**
   * Log audit entry
   */
  logAuditEntry(action, details) {
    const entry = {
      timestamp: new Date(),
      action,
      details,
      id: crypto.randomUUID()
    };
    
    this.auditLog.push(entry);
    this.emit('audit:logged', entry);
    
    // Persist to secure audit storage
    this.persistAuditEntry(entry);
  }

  /**
   * Persist audit entry to secure storage
   */
  async persistAuditEntry(entry) {
    // Implementation would write to secure, tamper-proof storage
    // For now, we'll write to a secure log file
    const fs = require('fs').promises;
    const logPath = 'logs/compliance-audit.log';
    
    try {
      await fs.appendFile(logPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to persist audit entry:', error);
    }
  }

  /**
   * Get compliance status for a service
   */
  getComplianceStatus(serviceId) {
    return this.complianceCache.get(serviceId) || {
      serviceId,
      overall: 'UNKNOWN',
      lastChecked: null
    };
  }

  /**
   * Get audit trail
   */
  getAuditTrail(filters = {}) {
    let filtered = this.auditLog;
    
    if (filters.serviceId) {
      filtered = filtered.filter(entry => 
        entry.details.serviceId === filters.serviceId
      );
    }
    
    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action);
    }
    
    if (filters.since) {
      filtered = filtered.filter(entry => 
        entry.timestamp >= new Date(filters.since)
      );
    }
    
    return filtered;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport() {
    const report = {
      timestamp: new Date(),
      services: [],
      summary: {
        total: 0,
        compliant: 0,
        nonCompliant: 0,
        errors: 0
      }
    };
    
    for (const [serviceId, status] of this.complianceCache.entries()) {
      report.services.push(status);
      report.summary.total++;
      
      switch (status.overall) {
        case 'COMPLIANT':
          report.summary.compliant++;
          break;
        case 'NON_COMPLIANT':
          report.summary.nonCompliant++;
          break;
        case 'ERROR':
          report.summary.errors++;
          break;
      }
    }
    
    return report;
  }
}

/**
 * PCI DSS Compliance Validator
 */
class PCIComplianceValidator {
  async validate(serviceConfig) {
    const violations = [];
    const recommendations = [];
    
    // Check for secure transmission
    if (!serviceConfig.baseUrl.startsWith('https://')) {
      violations.push('PCI-DSS 4.1: Must use HTTPS for all communications');
    }
    
    // Check authentication requirements
    if (!serviceConfig.authentication || serviceConfig.authentication.type === 'none') {
      violations.push('PCI-DSS 8.1: Strong authentication required');
    }
    
    // Check for data encryption
    if (!this.hasEncryptionConfig(serviceConfig)) {
      recommendations.push('PCI-DSS 3.4: Implement data encryption at rest and in transit');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }
  
  hasEncryptionConfig(serviceConfig) {
    // Check if service has encryption configuration
    return serviceConfig.encryption || 
           serviceConfig.authentication?.type === 'hmac' ||
           serviceConfig.authentication?.type === 'oauth2';
  }
}

/**
 * GDPR Compliance Validator
 */
class GDPRComplianceValidator {
  async validate(serviceConfig) {
    const violations = [];
    const recommendations = [];
    
    // Check for consent management
    if (this.handlesPersonalData(serviceConfig) && !this.hasConsentManagement(serviceConfig)) {
      violations.push('GDPR Art. 6: Consent management required for personal data processing');
    }
    
    // Check for data subject rights
    if (!this.hasDataSubjectRights(serviceConfig)) {
      recommendations.push('GDPR Art. 15-22: Implement data subject rights (access, rectification, erasure)');
    }
    
    // Check for privacy by design
    if (!this.hasPrivacyByDesign(serviceConfig)) {
      recommendations.push('GDPR Art. 25: Implement privacy by design and default');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }
  
  handlesPersonalData(serviceConfig) {
    const personalDataEndpoints = serviceConfig.endpoints?.filter(ep => 
      ep.tags?.includes('personal-data') || 
      ep.path.includes('user') || 
      ep.path.includes('customer')
    );
    return personalDataEndpoints && personalDataEndpoints.length > 0;
  }
  
  hasConsentManagement(serviceConfig) {
    return serviceConfig.endpoints?.some(ep => 
      ep.path.includes('consent') || ep.tags?.includes('consent')
    );
  }
  
  hasDataSubjectRights(serviceConfig) {
    const rightsEndpoints = ['access', 'rectification', 'erasure', 'portability'];
    return rightsEndpoints.some(right => 
      serviceConfig.endpoints?.some(ep => 
        ep.path.includes(right) || ep.tags?.includes(right)
      )
    );
  }
  
  hasPrivacyByDesign(serviceConfig) {
    return serviceConfig.privacy?.byDesign || false;
  }
}

/**
 * PSD2 Compliance Validator
 */
class PSD2ComplianceValidator {
  async validate(serviceConfig) {
    const violations = [];
    const recommendations = [];
    
    // Check for Strong Customer Authentication
    if (this.isPaymentService(serviceConfig) && !this.hasSCAImplementation(serviceConfig)) {
      violations.push('PSD2 Art. 97: Strong Customer Authentication required for payment services');
    }
    
    // Check for API security
    if (!this.hasAPISecurityStandards(serviceConfig)) {
      violations.push('PSD2 RTS: API security standards must be implemented');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }
  
  isPaymentService(serviceConfig) {
    return serviceConfig.tags?.includes('payment') || 
           serviceConfig.endpoints?.some(ep => 
             ep.path.includes('payment') || ep.path.includes('transfer')
           );
  }
  
  hasSCAImplementation(serviceConfig) {
    return serviceConfig.authentication?.sca || 
           serviceConfig.endpoints?.some(ep => ep.tags?.includes('sca'));
  }
  
  hasAPISecurityStandards(serviceConfig) {
    return serviceConfig.baseUrl.startsWith('https://') && 
           serviceConfig.authentication && 
           serviceConfig.authentication.type !== 'none';
  }
}

/**
 * SOX Compliance Validator
 */
class SOXComplianceValidator {
  async validate(serviceConfig) {
    const violations = [];
    const recommendations = [];
    
    // Check for audit trails
    if (!this.hasAuditTrail(serviceConfig)) {
      violations.push('SOX 404: Audit trail required for financial data access');
    }
    
    // Check for access controls
    if (!this.hasAccessControls(serviceConfig)) {
      violations.push('SOX 302: Access controls required for financial systems');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }
  
  hasAuditTrail(serviceConfig) {
    return serviceConfig.monitoring?.auditTrail || false;
  }
  
  hasAccessControls(serviceConfig) {
    return serviceConfig.authentication && 
           serviceConfig.authentication.type !== 'none';
  }
}

/**
 * HIPAA Compliance Validator
 */
class HIPAAComplianceValidator {
  async validate(serviceConfig) {
    const violations = [];
    const recommendations = [];
    
    // Check for encryption
    if (!this.hasEncryption(serviceConfig)) {
      violations.push('HIPAA 164.312: Encryption required for PHI');
    }
    
    // Check for access controls
    if (!this.hasAccessControls(serviceConfig)) {
      violations.push('HIPAA 164.308: Access controls required');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }
  
  hasEncryption(serviceConfig) {
    return serviceConfig.baseUrl.startsWith('https://') && 
           serviceConfig.encryption;
  }
  
  hasAccessControls(serviceConfig) {
    return serviceConfig.authentication && 
           serviceConfig.authentication.type !== 'none';
  }
}

module.exports = ComplianceManager;
