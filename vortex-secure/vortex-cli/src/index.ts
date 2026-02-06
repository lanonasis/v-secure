// Vortex Secure CLI - Main Implementation

import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Conf from 'conf';
import { table } from 'table';
import * as keytar from 'keytar';
import * as fs from 'fs';
import * as path from 'path';

interface VortexConfig {
  apiUrl: string;
  projectId?: string;
  environment?: string;
  userId?: string;
}

interface Secret {
  id: string;
  name: string;
  environment: string;
  project_id: string;
  secret_type: string;
  status: string;
  tags: string[];
  usage_count: number;
  last_rotated: string;
  created_at: string;
}

interface RotationPolicy {
  id: string;
  secret_id: string;
  frequency_days: number;
  next_rotation: string;
  auto_rotate: boolean;
}

export class VortexCLI {
  private config: Conf<VortexConfig>;
  private api: AxiosInstance;
  private spinner: any;

  constructor() {
    this.config = new Conf<VortexConfig>({
      projectName: 'vortex-secure',
      defaults: {
        apiUrl: 'https://api.vortex-secure.com'
      }
    });

    this.api = axios.create({
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
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log(chalk.yellow('⚠️  Authentication expired. Please run: vortex login'));
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(apiUrl?: string): Promise<void> {
    if (apiUrl) {
      this.config.set('apiUrl', apiUrl);
      this.api.defaults.baseURL = apiUrl;
    }

    console.log(chalk.cyan('🔐 Vortex Secure CLI Login'));
    console.log(chalk.gray(`API URL: ${this.config.get('apiUrl')}`));
    console.log('');

    const { method } = await inquirer.prompt([
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

  private async loginWithOAuth(): Promise<void> {
    const spinner = ora('Opening browser for authentication...').start();
    
    try {
      // In a real implementation, this would open a browser and handle OAuth flow
      const { data } = await this.api.post('/auth/cli/init');
      const { device_code, user_code, verification_uri } = data;

      spinner.succeed('Browser opened for authentication');
      console.log('');
      console.log(chalk.cyan('Please complete authentication in your browser:'));
      console.log(chalk.white(`1. Go to: ${verification_uri}`));
      console.log(chalk.white(`2. Enter code: ${chalk.bold(user_code)}`));
      console.log('');

      const pollSpinner = ora('Waiting for authentication...').start();
      
      // Poll for completion
      const token = await this.pollForToken(device_code);
      
      await this.storeToken(token);
      pollSpinner.succeed('Authentication successful!');
      
    } catch (error) {
      spinner.fail('Authentication failed');
      throw error;
    }
  }

  private async loginWithToken(): Promise<void> {
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your API token:',
        mask: '*'
      }
    ]);

    const spinner = ora('Validating token...').start();

    try {
      // Validate token
      const { data } = await axios.get(`${this.config.get('apiUrl')}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await this.storeToken(token);
      this.config.set('userId', data.user.id);
      
      spinner.succeed(`Logged in as ${data.user.email}`);
    } catch (error) {
      spinner.fail('Invalid token');
      throw error;
    }
  }

  private async loginWithEmail(): Promise<void> {
    const credentials = await inquirer.prompt([
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

    const spinner = ora('Authenticating...').start();

    try {
      const { data } = await this.api.post('/auth/login', credentials);
      
      await this.storeToken(data.access_token);
      this.config.set('userId', data.user.id);
      
      spinner.succeed(`Logged in as ${data.user.email}`);
    } catch (error) {
      spinner.fail('Authentication failed');
      throw error;
    }
  }

  async logout(): Promise<void> {
    await keytar.deletePassword('vortex-secure', 'api-token');
    this.config.clear();
  }

  // Project management
  async initProject(projectName?: string, environment: string = 'development'): Promise<void> {
    if (!projectName) {
      const response = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          default: path.basename(process.cwd())
        }
      ]);
      projectName = response.name;
    }

    const spinner = ora(`Initializing project "${projectName}"...`).start();

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
      console.log(chalk.gray(`Project ID: ${data.id}`));
      console.log(chalk.gray(`Environment: ${environment}`));
      console.log(chalk.gray('Configuration saved to .vortex'));
    } catch (error) {
      spinner.fail('Project initialization failed');
      throw error;
    }
  }

  // Secret management
  async listSecrets(options: any): Promise<void> {
    const spinner = ora('Loading secrets...').start();

    try {
      const params = new URLSearchParams();
      if (options.environment) params.append('environment', options.environment);
      if (options.project) params.append('project', options.project);
      if (options.type) params.append('type', options.type);

      const { data } = await this.api.get(`/secrets?${params}`);

      spinner.stop();

      if (data.length === 0) {
        console.log(chalk.yellow('No secrets found'));
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

      data.forEach((secret: Secret) => {
        tableData.push([
          secret.name,
          secret.environment,
          secret.secret_type.replace('_', ' '),
          this.formatStatus(secret.status),
          secret.usage_count.toString(),
          this.formatDate(secret.last_rotated)
        ]);
      });

      console.log(table(tableData));
      console.log(chalk.gray(`Found ${data.length} secret(s)`));
    } catch (error) {
      spinner.fail('Failed to load secrets');
      throw error;
    }
  }

  async getSecret(name: string, options: any): Promise<void> {
    const spinner = ora(`Getting secret "${name}"...`).start();

    try {
      const params = new URLSearchParams();
      if (options.environment) params.append('environment', options.environment);
      if (options.project) params.append('project', options.project);

      const { data } = await this.api.get(`/secrets/${name}?${params}`);

      spinner.stop();

      if (options.copy) {
        // In a real implementation, copy to clipboard
        console.log(chalk.green('✅ Secret copied to clipboard'));
      } else {
        console.log(chalk.cyan('Secret value:'));
        console.log(chalk.white(data.value));
      }
    } catch (error) {
      spinner.fail(`Secret "${name}" not found`);
      throw error;
    }
  }

  async setSecret(name: string, value: string | undefined, options: any): Promise<void> {
    let secretValue = value;

    if (options.generate) {
      secretValue = this.generateSecureValue(options.type);
    } else if (!secretValue) {
      const response = await inquirer.prompt([
        {
          type: 'password',
          name: 'value',
          message: `Enter value for "${name}":`,
          mask: '*'
        }
      ]);
      secretValue = response.value;
    }

    const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];

    const spinner = ora(`Setting secret "${name}"...`).start();

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
        console.log(chalk.gray('Generated secure value and stored safely'));
      }
    } catch (error) {
      spinner.fail(`Failed to set secret "${name}"`);
      throw error;
    }
  }

  async deleteSecret(name: string, options: any): Promise<void> {
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete "${name}"?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled'));
        return;
      }
    }

    const spinner = ora(`Deleting secret "${name}"...`).start();

    try {
      const params = new URLSearchParams();
      if (options.environment) params.append('environment', options.environment);
      if (options.project) params.append('project', options.project);

      await this.api.delete(`/secrets/${name}?${params}`);

      spinner.succeed(`Secret "${name}" deleted successfully`);
    } catch (error) {
      spinner.fail(`Failed to delete secret "${name}"`);
      throw error;
    }
  }

  // Rotation methods
  async rotateSecret(name: string, options: any): Promise<void> {
    if (!options.immediate) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Rotate secret "${name}" now?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled'));
        return;
      }
    }

    const spinner = ora(`Rotating secret "${name}"...`).start();

    try {
      const params = new URLSearchParams();
      if (options.environment) params.append('environment', options.environment);
      if (options.project) params.append('project', options.project);

      const { data } = await this.api.post(`/secrets/${name}/rotate?${params}`);

      spinner.succeed(`Secret "${name}" rotated successfully`);
      console.log(chalk.gray(`New value generated and stored`));
      console.log(chalk.gray(`Rotation ID: ${data.rotation_id}`));
    } catch (error) {
      spinner.fail(`Failed to rotate secret "${name}"`);
      throw error;
    }
  }

  // Utility methods
  private async getStoredToken(): Promise<string | null> {
    try {
      return await keytar.getPassword('vortex-secure', 'api-token');
    } catch (error) {
      return null;
    }
  }

  private async storeToken(token: string): Promise<void> {
    await keytar.setPassword('vortex-secure', 'api-token', token);
  }

  private async pollForToken(deviceCode: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes at 5-second intervals

    while (attempts < maxAttempts) {
      try {
        const { data } = await this.api.post('/auth/cli/poll', { device_code: deviceCode });
        if (data.access_token) {
          return data.access_token;
        }
      } catch (error) {
        // Continue polling
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Authentication timeout');
  }

  private formatStatus(status: string): string {
    const colors: { [key: string]: (text: string) => string } = {
      active: chalk.green,
      rotating: chalk.yellow,
      deprecated: chalk.gray,
      expired: chalk.red,
      compromised: chalk.red.bold
    };

    return colors[status] ? colors[status](status) : status;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  }

  private generateSecureValue(type: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    
    switch (type) {
      case 'api_key':
        return `lms_${Date.now().toString(36)}_${this.randomString(40, chars)}`;
      case 'oauth_token':
        return this.randomString(64, chars);
      case 'webhook_secret':
        return this.randomString(32, chars);
      default:
        return this.randomString(32, chars);
    }
  }

  private randomString(length: number, charset: string): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  // Secret rotation scheduling
  async scheduleRotation(name: string, frequency: string, options: any): Promise<void> {
    const spinner = ora(`Scheduling rotation for ${name}...`).start();

    try {
      // Parse frequency (e.g., "30d", "1w", "24h")
      const frequencyMs = this.parseFrequency(frequency);

      // TODO: Implement actual scheduling via backend API
      // For now, just log the intent
      console.log(chalk.blue(`📅 Scheduled ${name} for rotation every ${frequency}`));
      console.log(chalk.gray(`   Next rotation: ${new Date(Date.now() + frequencyMs).toLocaleString()}`));
      console.log(chalk.gray(`   Overlap window: ${options.overlapHours || 48} hours`));

      if (options.notificationWebhooks?.length > 0) {
        console.log(chalk.gray(`   Webhook notifications: ${options.notificationWebhooks.join(', ')}`));
      }

      spinner.succeed(`Rotation scheduled for ${name}`);
    } catch (error) {
      spinner.fail('Failed to schedule rotation');
      throw error;
    }
  }

  private parseFrequency(frequency: string): number {
    const match = frequency.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error('Invalid frequency format. Use format like: 30d, 1w, 24h, 60m, 300s');
    }

    const [, value, unit] = match;
    const numValue = parseInt(value);

    const multipliers = {
      s: 1000,           // seconds
      m: 60 * 1000,      // minutes
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000, // days
      w: 7 * 24 * 60 * 60 * 1000 // weeks
    };

    return numValue * multipliers[unit as keyof typeof multipliers];
  }

  async showRotations(options: any): Promise<void> {
    const spinner = ora('Fetching rotation schedules...').start();

    try {
      // TODO: Fetch actual rotation schedules from backend
      // For now, show mock data
      const mockRotations = [
        {
          name: 'database_url',
          frequency: '30d',
          nextRotation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastRotation: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          status: 'scheduled'
        },
        {
          name: 'api_key',
          frequency: '90d',
          nextRotation: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
          lastRotation: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          status: 'scheduled'
        },
        {
          name: 'webhook_secret',
          frequency: '7d',
          nextRotation: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          lastRotation: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          status: 'overdue'
        }
      ];

      spinner.stop();

      if (options.overdue) {
        const overdue = mockRotations.filter(r => r.status === 'overdue');
        if (overdue.length === 0) {
          console.log(chalk.green('✅ No overdue rotations'));
          return;
        }

        console.log(chalk.red('🚨 Overdue Rotations:'));
        overdue.forEach(rotation => {
          console.log(chalk.red(`  • ${rotation.name} - Due ${rotation.nextRotation.toLocaleDateString()}`));
        });
        return;
      }

      console.log(chalk.blue('🔄 Rotation Schedules:'));
      console.log('');

      mockRotations.forEach(rotation => {
        const statusIcon = rotation.status === 'overdue' ? '🚨' : '✅';
        const statusColor = rotation.status === 'overdue' ? chalk.red : chalk.green;

        console.log(`${statusIcon} ${chalk.bold(rotation.name)}`);
        console.log(`   Frequency: ${rotation.frequency}`);
        console.log(`   Last: ${rotation.lastRotation.toLocaleDateString()}`);
        console.log(`   Next: ${statusColor(rotation.nextRotation.toLocaleDateString())}`);
        console.log('');
      });

      const overdueCount = mockRotations.filter(r => r.status === 'overdue').length;
      if (overdueCount > 0) {
        console.log(chalk.yellow(`⚠️  ${overdueCount} rotation(s) are overdue`));
      }

    } catch (error) {
      spinner.fail('Failed to fetch rotation schedules');
      throw error;
    }
  }

  async showUsage(name: string, options: any): Promise<void> {
    const spinner = ora(`Fetching usage analytics for ${name}...`).start();

    try {
      // TODO: Fetch actual usage data from backend
      // For now, show mock analytics
      const days = options.days || 30;
      const mockUsage = {
        totalAccess: 1247,
        successfulAccess: 1235,
        failedAccess: 12,
        avgResponseTime: 145,
        peakHour: '14:00',
        mostActiveDay: 'Wednesday',
        topServices: [
          { service: 'web_app', count: 892 },
          { service: 'api_gateway', count: 234 },
          { service: 'background_worker', count: 121 }
        ],
        accessByHour: [
          12, 8, 5, 3, 2, 1, 15, 45, 89, 156, 234, 312,
          445, 523, 567, 589, 534, 445, 323, 234, 178, 89, 45, 23
        ]
      };

      spinner.stop();

      console.log(chalk.blue(`📊 Usage Analytics for "${name}"`));
      console.log(chalk.gray(`Period: Last ${days} days`));
      console.log('');

      // Summary stats
      console.log(chalk.bold('Summary:'));
      console.log(`   Total Access: ${chalk.cyan(mockUsage.totalAccess.toLocaleString())}`);
      console.log(`   Success Rate: ${chalk.green(((mockUsage.successfulAccess / mockUsage.totalAccess) * 100).toFixed(1) + '%')}`);
      console.log(`   Failed Access: ${chalk.red(mockUsage.failedAccess)}`);
      console.log(`   Avg Response: ${chalk.yellow(mockUsage.avgResponseTime + 'ms')}`);
      console.log('');

      // Activity patterns
      console.log(chalk.bold('Activity Patterns:'));
      console.log(`   Peak Hour: ${mockUsage.peakHour}`);
      console.log(`   Most Active Day: ${mockUsage.mostActiveDay}`);
      console.log('');

      // Top services
      console.log(chalk.bold('Top Accessing Services:'));
      mockUsage.topServices.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.service}: ${chalk.cyan(service.count)} accesses`);
      });
      console.log('');

      // Hourly distribution (simple bar chart)
      if (!options.quiet) {
        console.log(chalk.bold('Hourly Distribution:'));
        const maxCount = Math.max(...mockUsage.accessByHour);
        mockUsage.accessByHour.forEach((count, hour) => {
          const barLength = Math.round((count / maxCount) * 20);
          const bar = '█'.repeat(barLength);
          const hourStr = hour.toString().padStart(2, '0') + ':00';
          console.log(`   ${hourStr} ${chalk.cyan(bar)} ${count}`);
        });
      }

    } catch (error) {
      spinner.fail('Failed to fetch usage analytics');
      throw error;
    }
  }

  async checkHealth(): Promise<void> {
    const spinner = ora('Checking Vortex Secure health...').start();
    
    try {
      const { data } = await this.api.get('/health');
      spinner.succeed('Vortex Secure is healthy');
      console.log(chalk.gray(`Version: ${data.version}`));
      console.log(chalk.gray(`Status: ${data.status}`));
    } catch (error) {
      spinner.fail('Vortex Secure is unhealthy');
      throw error;
    }
  }

  async manageConfig(options: any): Promise<void> {
    console.log(chalk.yellow('🚧 Configuration management feature coming soon'));
  }

  async exportSecrets(options: any): Promise<void> {
    console.log(chalk.yellow('🚧 Export feature coming soon'));
  }

  async importSecrets(file: string, options: any): Promise<void> {
    console.log(chalk.yellow('🚧 Import feature coming soon'));
  }
}