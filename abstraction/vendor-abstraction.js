/**
 * Vendor Abstraction Layer
 * Ensures complete separation between client requests and vendor implementations
 */

class VendorAbstractionLayer {
  constructor() {
    this.vendorMappings = new Map();
    this.clientSchemas = new Map();
    this.vendorConfigs = new Map();
    this.initializeAbstractions();
  }

  initializeAbstractions() {
    // Payment Processing Abstraction
    this.registerAbstraction('payment', {
      client: {
        initializeTransaction: {
          schema: {
            amount: { type: 'number', required: true },
            currency: { type: 'string', default: 'NGN' },
            email: { type: 'string', required: true },
            reference: { type: 'string', required: false },
            metadata: { type: 'object', required: false }
          }
        },
        verifyTransaction: {
          schema: {
            reference: { type: 'string', required: true }
          }
        },
        createCustomer: {
          schema: {
            email: { type: 'string', required: true },
            firstName: { type: 'string', required: false },
            lastName: { type: 'string', required: false },
            phone: { type: 'string', required: false }
          }
        }
      },
      vendors: {
        'paystack': {
          adapter: 'paystack-api',
          mappings: {
            initializeTransaction: {
              tool: 'initialize-transaction',
              transform: (input) => ({
                email: input.email,
                amount: input.amount * 100, // Convert to kobo
                currency: input.currency,
                reference: input.reference || `ref_${Date.now()}`,
                callback_url: process.env.CALLBACK_URL
              })
            },
            verifyTransaction: {
              tool: 'verify-transaction',
              transform: (input) => ({ reference: input.reference })
            },
            createCustomer: {
              tool: 'create-customer',
              transform: (input) => ({
                email: input.email,
                first_name: input.firstName,
                last_name: input.lastName,
                phone: input.phone
              })
            }
          }
        },
        'flutterwave': {
          adapter: 'flutterwave-v3',
          mappings: {
            initializeTransaction: {
              tool: 'initialize-transaction',
              transform: (input) => ({
                email: input.email,
                amount: input.amount,
                currency: input.currency,
                reference: input.reference || `fw_${Date.now()}`,
                callback_url: process.env.CALLBACK_URL
              })
            },
            verifyTransaction: {
              tool: 'verify-transaction',
              transform: (input) => ({ reference: input.reference })
            },
            createCustomer: {
              tool: 'create-customer',
              transform: (input) => ({
                email: input.email,
                first_name: input.firstName,
                last_name: input.lastName,
                phone: input.phone
              })
            }
          }
        },
        'sayswitch': {
          adapter: 'sayswitch-api-integration',
          mappings: {
            initializeTransaction: {
              tool: 'initialize-transaction',
              transform: (input) => ({
                email: input.email,
                amount: input.amount,
                currency: input.currency,
                reference: input.reference || `ss_${Date.now()}`,
                callback_url: process.env.CALLBACK_URL
              })
            },
            verifyTransaction: {
              tool: 'verify-transaction',
              transform: (input) => ({ reference: input.reference })
            },
            createCustomer: {
              tool: 'create-customer',
              transform: (input) => ({
                email: input.email,
                first_name: input.firstName,
                last_name: input.lastName,
                phone: input.phone
              })
            }
          }
        }
      }
    });

    // Banking Abstraction
    this.registerAbstraction('banking', {
      client: {
        getAccountBalance: {
          schema: {
            accountId: { type: 'string', required: true }
          }
        },
        transferFunds: {
          schema: {
            fromAccount: { type: 'string', required: true },
            toAccount: { type: 'string', required: true },
            amount: { type: 'number', required: true },
            currency: { type: 'string', default: 'NGN' },
            reference: { type: 'string', required: false }
          }
        },
        verifyAccount: {
          schema: {
            accountNumber: { type: 'string', required: true },
            bankCode: { type: 'string', required: true }
          }
        }
      },
      vendors: {
        'wise': {
          adapter: '7-wise-multicurrency-account-mca-platform-api-s',
          mappings: {
            getAccountBalance: {
              tool: 'multi-currency-account-manage-mca-get-multi-currency-account',
              transform: (input) => ({ accountId: input.accountId })
            },
            transferFunds: {
              tool: 'transfers-create-transfer',
              transform: (input) => ({
                sourceAccount: input.fromAccount,
                targetAccount: input.toAccount,
                amount: { value: input.amount, currency: input.currency },
                reference: input.reference || `wise_${Date.now()}`
              })
            }
          }
        },
        'bap': {
          adapter: 'bap',
          mappings: {
            verifyAccount: {
              tool: 'account-name-verify',
              transform: (input) => ({
                account_number: input.accountNumber,
                bank_code: input.bankCode
              })
            }
          }
        }
      }
    });

    // Infrastructure Abstraction
    this.registerAbstraction('infrastructure', {
      client: {
        createTunnel: {
          schema: {
            port: { type: 'number', required: true },
            subdomain: { type: 'string', required: false },
            region: { type: 'string', default: 'us' }
          }
        },
        listTunnels: {
          schema: {}
        }
      },
      vendors: {
        'ngrok': {
          adapter: 'ngrok-api',
          mappings: {
            createTunnel: {
              tool: 'tunnels-start-tunnel',
              transform: (input) => ({
                addr: input.port,
                subdomain: input.subdomain,
                region: input.region
              })
            },
            listTunnels: {
              tool: 'tunnels-list-tunnels',
              transform: () => ({})
            }
          }
        }
      }
    });
  }

  registerAbstraction(category, config) {
    this.vendorMappings.set(category, config);
    this.clientSchemas.set(category, config.client);
  }

  async executeAbstractedCall(category, operation, input, vendorPreference = null) {
    const abstraction = this.vendorMappings.get(category);
    if (!abstraction) {
      throw new Error(`Unknown category: ${category}`);
    }

    // Validate client input against schema
    const clientSchema = abstraction.client[operation];
    if (!clientSchema) {
      throw new Error(`Unknown operation: ${operation} in category: ${category}`);
    }

    this.validateInput(input, clientSchema.schema);

    // Select vendor (use preference or default to first available)
    const vendors = Object.keys(abstraction.vendors);
    const selectedVendor = vendorPreference && vendors.includes(vendorPreference) 
      ? vendorPreference 
      : vendors[0];

    if (!selectedVendor) {
      throw new Error(`No vendors available for category: ${category}`);
    }

    const vendorConfig = abstraction.vendors[selectedVendor];
    const mapping = vendorConfig.mappings[operation];

    if (!mapping) {
      throw new Error(`Operation ${operation} not supported by vendor: ${selectedVendor}`);
    }

    // Transform client input to vendor format
    const vendorInput = mapping.transform(input);

    // Execute vendor call through adapter
    return await this.executeVendorCall(
      vendorConfig.adapter,
      mapping.tool,
      vendorInput,
      {
        category,
        operation,
        vendor: selectedVendor,
        clientInput: input
      }
    );
  }

  validateInput(input, schema) {
    for (const [field, rules] of Object.entries(schema)) {
      if (rules.required && (input[field] === undefined || input[field] === null)) {
        throw new Error(`Required field missing: ${field}`);
      }

      if (input[field] !== undefined && rules.type) {
        const actualType = typeof input[field];
        if (actualType !== rules.type) {
          throw new Error(`Invalid type for field ${field}: expected ${rules.type}, got ${actualType}`);
        }
      }

      // Apply defaults
      if (input[field] === undefined && rules.default !== undefined) {
        input[field] = rules.default;
      }
    }
  }

  async executeVendorCall(adapter, tool, input, metadata) {
    // This would integrate with your MCP adapter system
    // For now, return a mock response structure
    return {
      success: true,
      data: {
        // Vendor response would be here
        message: `Executed ${tool} on ${adapter}`,
        input,
        metadata
      },
      metadata: {
        vendor: metadata.vendor,
        category: metadata.category,
        operation: metadata.operation,
        timestamp: new Date().toISOString(),
        abstracted: true
      }
    };
  }

  getAvailableCategories() {
    return Array.from(this.vendorMappings.keys());
  }

  getCategoryOperations(category) {
    const abstraction = this.vendorMappings.get(category);
    return abstraction ? Object.keys(abstraction.client) : [];
  }

  getCategoryVendors(category) {
    const abstraction = this.vendorMappings.get(category);
    return abstraction ? Object.keys(abstraction.vendors) : [];
  }

  getClientSchema(category, operation) {
    const abstraction = this.vendorMappings.get(category);
    return abstraction?.client[operation]?.schema || null;
  }
}

module.exports = VendorAbstractionLayer;
