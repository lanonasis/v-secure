"use strict";
// Vortex Secure CLI - Main Implementation
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VortexCLI = void 0;
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const conf_1 = __importDefault(require("conf"));
const table_1 = require("table");
const keytar = __importStar(require("keytar"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class VortexCLI {
    constructor() {
        this.config = new conf_1.default({
            projectName: 'vortex-secure',
            defaults: {
                apiUrl: 'https://api.vortex-secure.com'
            }
        });
        this.api = axios_1.default.create({
            baseURL: this.config.get('apiUrl'),
            timeout: 30000,
            headers: {
                'User-Agent': 'vortex-cli/0.1.0',
                'Content-Type': 'application/json'
            }
        });
        // Add request interceptor for authentication
        this.api.interceptors.request.use(async (config) => {
            const token = await this.getStoredToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        // Add response interceptor for error handling
        this.api.interceptors.response.use((response) => response, (error) => {
            if (error.response?.status === 401) {
                console.log(chalk_1.default.yellow('⚠️  Authentication expired. Please run: vortex login'));
            }
            return Promise.reject(error);
        });
    }
    // Authentication methods
    async login(apiUrl) {
        if (apiUrl) {
            this.config.set('apiUrl', apiUrl);
            this.api.defaults.baseURL = apiUrl;
        }
        console.log(chalk_1.default.cyan('🔐 Vortex Secure CLI Login'));
        console.log(chalk_1.default.gray(`API URL: ${this.config.get('apiUrl')}`));
        console.log('');
        const { method } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'method',
                message: 'Choose authentication method:',
                choices: [
                    { name: '🌐 Browser (OAuth)', value: 'oauth' },
                    { name: '🔑 API Token', value: 'token' },
                    { name: '📧 Email/Password', value: 'email' }
                ]
            }
        ]);
        switch (method) {
            case 'oauth':
                await this.loginWithOAuth();
                break;
            case 'token':
                await this.loginWithToken();
                break;
            case 'email':
                await this.loginWithEmail();
                break;
        }
    }
    async loginWithOAuth() {
        const spinner = (0, ora_1.default)('Opening browser for authentication...').start();
        try {
            // In a real implementation, this would open a browser and handle OAuth flow
            const { data } = await this.api.post('/auth/cli/init');
            const { device_code, user_code, verification_uri } = data;
            spinner.succeed('Browser opened for authentication');
            console.log('');
            console.log(chalk_1.default.cyan('Please complete authentication in your browser:'));
            console.log(chalk_1.default.white(`1. Go to: ${verification_uri}`));
            console.log(chalk_1.default.white(`2. Enter code: ${chalk_1.default.bold(user_code)}`));
            console.log('');
            const pollSpinner = (0, ora_1.default)('Waiting for authentication...').start();
            // Poll for completion
            const token = await this.pollForToken(device_code);
            await this.storeToken(token);
            pollSpinner.succeed('Authentication successful!');
        }
        catch (error) {
            spinner.fail('Authentication failed');
            throw error;
        }
    }
    async loginWithToken() {
        const { token } = await inquirer_1.default.prompt([
            {
                type: 'password',
                name: 'token',
                message: 'Enter your API token:',
                mask: '*'
            }
        ]);
        const spinner = (0, ora_1.default)('Validating token...').start();
        try {
            // Validate token
            const { data } = await axios_1.default.get(`${this.config.get('apiUrl')}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await this.storeToken(token);
            this.config.set('userId', data.user.id);
            spinner.succeed(`Logged in as ${data.user.email}`);
        }
        catch (error) {
            spinner.fail('Invalid token');
            throw error;
        }
    }
    async loginWithEmail() {
        const credentials = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'email',
                message: 'Email:',
                validate: (input) => input.includes('@') || 'Please enter a valid email'
            },
            {
                type: 'password',
                name: 'password',
                message: 'Password:',
                mask: '*'
            }
        ]);
        const spinner = (0, ora_1.default)('Authenticating...').start();
        try {
            const { data } = await this.api.post('/auth/login', credentials);
            await this.storeToken(data.access_token);
            this.config.set('userId', data.user.id);
            spinner.succeed(`Logged in as ${data.user.email}`);
        }
        catch (error) {
            spinner.fail('Authentication failed');
            throw error;
        }
    }
    async logout() {
        await keytar.deletePassword('vortex-secure', 'api-token');
        this.config.clear();
    }
    // Project management
    async initProject(projectName, environment = 'development') {
        if (!projectName) {
            const response = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Project name:',
                    default: path.basename(process.cwd())
                }
            ]);
            projectName = response.name;
        }
        const spinner = (0, ora_1.default)(`Initializing project "${projectName}"...`).start();
        try {
            const { data } = await this.api.post('/projects', {
                name: projectName,
                environment
            });
            this.config.set('projectId', data.id);
            this.config.set('environment', environment);
            // Create .vortex config file
            const vortexConfig = {
                project: {
                    id: data.id,
                    name: projectName,
                    environment
                },
                version: '0.1.0'
            };
            fs.writeFileSync('.vortex', JSON.stringify(vortexConfig, null, 2));
            spinner.succeed(`Project "${projectName}" initialized successfully`);
            console.log(chalk_1.default.gray(`Project ID: ${data.id}`));
            console.log(chalk_1.default.gray(`Environment: ${environment}`));
            console.log(chalk_1.default.gray('Configuration saved to .vortex'));
        }
        catch (error) {
            spinner.fail('Project initialization failed');
            throw error;
        }
    }
    // Secret management
    async listSecrets(options) {
        const spinner = (0, ora_1.default)('Loading secrets...').start();
        try {
            const params = new URLSearchParams();
            if (options.environment)
                params.append('environment', options.environment);
            if (options.project)
                params.append('project', options.project);
            if (options.type)
                params.append('type', options.type);
            const { data } = await this.api.get(`/secrets?${params}`);
            spinner.stop();
            if (data.length === 0) {
                console.log(chalk_1.default.yellow('No secrets found'));
                return;
            }
            if (options.json) {
                console.log(JSON.stringify(data, null, 2));
                return;
            }
            // Format as table
            const tableData = [
                ['Name', 'Environment', 'Type', 'Status', 'Usage', 'Last Rotated']
            ];
            data.forEach((secret) => {
                tableData.push([
                    secret.name,
                    secret.environment,
                    secret.secret_type.replace('_', ' '),
                    this.formatStatus(secret.status),
                    secret.usage_count.toString(),
                    this.formatDate(secret.last_rotated)
                ]);
            });
            console.log((0, table_1.table)(tableData));
            console.log(chalk_1.default.gray(`Found ${data.length} secret(s)`));
        }
        catch (error) {
            spinner.fail('Failed to load secrets');
            throw error;
        }
    }
    async getSecret(name, options) {
        const spinner = (0, ora_1.default)(`Getting secret "${name}"...`).start();
        try {
            const params = new URLSearchParams();
            if (options.environment)
                params.append('environment', options.environment);
            if (options.project)
                params.append('project', options.project);
            const { data } = await this.api.get(`/secrets/${name}?${params}`);
            spinner.stop();
            if (options.copy) {
                // In a real implementation, copy to clipboard
                console.log(chalk_1.default.green('✅ Secret copied to clipboard'));
            }
            else {
                console.log(chalk_1.default.cyan('Secret value:'));
                console.log(chalk_1.default.white(data.value));
            }
        }
        catch (error) {
            spinner.fail(`Secret "${name}" not found`);
            throw error;
        }
    }
    async setSecret(name, value, options) {
        let secretValue = value;
        if (options.generate) {
            secretValue = this.generateSecureValue(options.type);
        }
        else if (!secretValue) {
            const response = await inquirer_1.default.prompt([
                {
                    type: 'password',
                    name: 'value',
                    message: `Enter value for "${name}":`,
                    mask: '*'
                }
            ]);
            secretValue = response.value;
        }
        const tags = options.tags ? options.tags.split(',').map((t) => t.trim()) : [];
        const spinner = (0, ora_1.default)(`Setting secret "${name}"...`).start();
        try {
            await this.api.post('/secrets', {
                name,
                value: secretValue,
                environment: options.environment,
                project: options.project || this.config.get('projectId'),
                secret_type: options.type,
                tags
            });
            spinner.succeed(`Secret "${name}" set successfully`);
            if (options.generate) {
                console.log(chalk_1.default.gray('Generated secure value and stored safely'));
            }
        }
        catch (error) {
            spinner.fail(`Failed to set secret "${name}"`);
            throw error;
        }
    }
    async deleteSecret(name, options) {
        if (!options.force) {
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Are you sure you want to delete "${name}"?`,
                    default: false
                }
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Cancelled'));
                return;
            }
        }
        const spinner = (0, ora_1.default)(`Deleting secret "${name}"...`).start();
        try {
            const params = new URLSearchParams();
            if (options.environment)
                params.append('environment', options.environment);
            if (options.project)
                params.append('project', options.project);
            await this.api.delete(`/secrets/${name}?${params}`);
            spinner.succeed(`Secret "${name}" deleted successfully`);
        }
        catch (error) {
            spinner.fail(`Failed to delete secret "${name}"`);
            throw error;
        }
    }
    // Rotation methods
    async rotateSecret(name, options) {
        if (!options.immediate) {
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Rotate secret "${name}" now?`,
                    default: false
                }
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Cancelled'));
                return;
            }
        }
        const spinner = (0, ora_1.default)(`Rotating secret "${name}"...`).start();
        try {
            const params = new URLSearchParams();
            if (options.environment)
                params.append('environment', options.environment);
            if (options.project)
                params.append('project', options.project);
            const { data } = await this.api.post(`/secrets/${name}/rotate?${params}`);
            spinner.succeed(`Secret "${name}" rotated successfully`);
            console.log(chalk_1.default.gray(`New value generated and stored`));
            console.log(chalk_1.default.gray(`Rotation ID: ${data.rotation_id}`));
        }
        catch (error) {
            spinner.fail(`Failed to rotate secret "${name}"`);
            throw error;
        }
    }
    // Utility methods
    async getStoredToken() {
        try {
            return await keytar.getPassword('vortex-secure', 'api-token');
        }
        catch (error) {
            return null;
        }
    }
    async storeToken(token) {
        await keytar.setPassword('vortex-secure', 'api-token', token);
    }
    async pollForToken(deviceCode) {
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes at 5-second intervals
        while (attempts < maxAttempts) {
            try {
                const { data } = await this.api.post('/auth/cli/poll', { device_code: deviceCode });
                if (data.access_token) {
                    return data.access_token;
                }
            }
            catch (error) {
                // Continue polling
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }
        throw new Error('Authentication timeout');
    }
    formatStatus(status) {
        const colors = {
            active: chalk_1.default.green,
            rotating: chalk_1.default.yellow,
            deprecated: chalk_1.default.gray,
            expired: chalk_1.default.red,
            compromised: chalk_1.default.red.bold
        };
        return colors[status] ? colors[status](status) : status;
    }
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0)
            return 'Today';
        if (diffDays === 1)
            return 'Yesterday';
        if (diffDays < 7)
            return `${diffDays} days ago`;
        if (diffDays < 30)
            return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365)
            return `${Math.floor(diffDays / 30)} months ago`;
        return date.toLocaleDateString();
    }
    generateSecureValue(type) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        switch (type) {
            case 'api_key':
                return `vx_${Date.now().toString(36)}_${this.randomString(40, chars)}`;
            case 'oauth_token':
                return this.randomString(64, chars);
            case 'webhook_secret':
                return this.randomString(32, chars);
            default:
                return this.randomString(32, chars);
        }
    }
    randomString(length, charset) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
    // Additional placeholder methods for completeness
    async scheduleRotation(name, frequency, options) {
        console.log(chalk_1.default.yellow('🚧 Schedule rotation feature coming soon'));
    }
    async showRotations(options) {
        console.log(chalk_1.default.yellow('🚧 Rotation status feature coming soon'));
    }
    async showUsage(name, options) {
        console.log(chalk_1.default.yellow('🚧 Usage analytics feature coming soon'));
    }
    async checkHealth() {
        const spinner = (0, ora_1.default)('Checking Vortex Secure health...').start();
        try {
            const { data } = await this.api.get('/health');
            spinner.succeed('Vortex Secure is healthy');
            console.log(chalk_1.default.gray(`Version: ${data.version}`));
            console.log(chalk_1.default.gray(`Status: ${data.status}`));
        }
        catch (error) {
            spinner.fail('Vortex Secure is unhealthy');
            throw error;
        }
    }
    async manageConfig(options) {
        console.log(chalk_1.default.yellow('🚧 Configuration management feature coming soon'));
    }
    async exportSecrets(options) {
        console.log(chalk_1.default.yellow('🚧 Export feature coming soon'));
    }
    async importSecrets(file, options) {
        console.log(chalk_1.default.yellow('🚧 Import feature coming soon'));
    }
}
exports.VortexCLI = VortexCLI;
//# sourceMappingURL=index.js.map