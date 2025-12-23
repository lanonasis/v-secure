// Vortex Secure - Automated Rotation System

import { supabase } from './supabase';
import { VortexEncryption } from './encryption';
import type { Secret, RotationPolicy, UsageMetric } from '../types/secrets';

export class RotationScheduler {
  private static readonly OVERLAP_GRACE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(private masterPassword: string) {}

  /**
   * Schedule automatic rotation for a secret
   */
  async scheduleRotation(secretId: string, frequencyDays: number = 90): Promise<void> {
    try {
      const overlapHours = Math.min(48, Math.max(6, frequencyDays * 0.1 * 24)); // 10% of rotation period, min 6h, max 48h
      
      const { data, error } = await supabase
        .from('rotation_policies')
        .upsert({
          secret_id: secretId,
          frequency_days: frequencyDays,
          overlap_hours: overlapHours,
          auto_rotate: true,
          next_rotation: new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log the scheduling event
      await this.logUsageMetric(secretId, 'rotate', true, 'Rotation scheduled');
      console.log(`✅ Rotation scheduled for secret ${secretId} every ${frequencyDays} days`);
    } catch (error) {
      await this.logUsageMetric(secretId, 'rotate', false, error.message);
      throw new Error(`Failed to schedule rotation: ${error.message}`);
    }
  }

  /**
   * Rotate a secret immediately
   */
  async rotateSecret(secretId: string, newValue?: string): Promise<{ oldValue: string; newValue: string }> {
    const startTime = Date.now();
    
    try {
      // Get current secret
      const { data: secret, error: fetchError } = await supabase
        .from('secrets')
        .select('*')
        .eq('id', secretId)
        .single();

      if (fetchError) throw fetchError;
      if (!secret) throw new Error('Secret not found');

      // Decrypt current value
      const currentValue = await VortexEncryption.decrypt(secret.encrypted_value, this.masterPassword);

      // Generate new value if not provided
      const rotatedValue = newValue || this.generateNewSecretValue(secret.secret_type);

      // Encrypt new value
      const encryptedNewValue = await VortexEncryption.encrypt(rotatedValue, this.masterPassword);

      // Update secret with new value
      const { error: updateError } = await supabase
        .from('secrets')
        .update({
          encrypted_value: encryptedNewValue,
          last_rotated: new Date().toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', secretId);

      if (updateError) throw updateError;

      // Update rotation policy next rotation date
      await this.updateNextRotationDate(secretId);

      // Notify dependent services
      await this.notifyDependentServices(secretId, rotatedValue);

      // Log successful rotation
      const responseTime = Date.now() - startTime;
      await this.logUsageMetric(secretId, 'rotate', true, null, responseTime);

      console.log(`✅ Secret ${secretId} rotated successfully`);
      
      return {
        oldValue: currentValue,
        newValue: rotatedValue
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.logUsageMetric(secretId, 'rotate', false, error.message, responseTime);
      
      // Log security event for failed rotation
      await this.logSecurityEvent(secretId, 'failed_rotation', 'medium', error.message);
      
      throw new Error(`Secret rotation failed: ${error.message}`);
    }
  }

  /**
   * Generate new secret value based on type
   */
  private generateNewSecretValue(secretType: string): string {
    switch (secretType) {
      case 'api_key':
        return VortexEncryption.generateAPIKey('vx');
      case 'oauth_token':
        return VortexEncryption.generateSecurePassword(64);
      case 'webhook_secret':
        return VortexEncryption.generateSecurePassword(32);
      case 'encryption_key':
        return VortexEncryption.generateSecurePassword(44); // Base64 256-bit key
      case 'database_url':
        // For database URLs, we'd typically integrate with the database provider's API
        // For now, just generate a secure password part
        return VortexEncryption.generateSecurePassword(32);
      default:
        return VortexEncryption.generateSecurePassword(32);
    }
  }

  /**
   * Update next rotation date for a secret
   */
  private async updateNextRotationDate(secretId: string): Promise<void> {
    const { data: policy } = await supabase
      .from('rotation_policies')
      .select('frequency_days')
      .eq('secret_id', secretId)
      .single();

    if (policy) {
      const nextRotation = new Date(Date.now() + policy.frequency_days * 24 * 60 * 60 * 1000);
      
      await supabase
        .from('rotation_policies')
        .update({ next_rotation: nextRotation.toISOString() })
        .eq('secret_id', secretId);
    }
  }

  /**
   * Notify dependent services of secret rotation
   */
  private async notifyDependentServices(secretId: string, newValue: string): Promise<void> {
    try {
      // Get notification webhooks from rotation policy
      const { data: policy } = await supabase
        .from('rotation_policies')
        .select('notification_webhooks')
        .eq('secret_id', secretId)
        .single();

      if (!policy?.notification_webhooks?.length) return;

      // Send webhook notifications
      const notifications = policy.notification_webhooks.map(async (webhook) => {
        try {
          const response = await fetch(webhook, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Vortex-Event': 'secret.rotated',
              'X-Vortex-Secret-ID': secretId
            },
            body: JSON.stringify({
              event: 'secret.rotated',
              secret_id: secretId,
              new_value: newValue, // In production, you might want to encrypt this
              timestamp: new Date().toISOString(),
              rotation_id: `rot_${Date.now()}`
            })
          });

          if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}`);
          }
        } catch (error) {
          console.error(`Webhook notification failed for ${webhook}:`, error);
          // Log webhook failure but don't fail the rotation
          await this.logSecurityEvent(secretId, 'failed_rotation', 'low', `Webhook notification failed: ${error.message}`);
        }
      });

      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Error notifying dependent services:', error);
    }
  }

  /**
   * Check for secrets that need rotation
   */
  async checkPendingRotations(): Promise<Secret[]> {
    const { data: policies, error } = await supabase
      .from('rotation_policies')
      .select(`
        *,
        secrets (*)
      `)
      .eq('auto_rotate', true)
      .lt('next_rotation', new Date().toISOString());

    if (error) {
      console.error('Error checking pending rotations:', error);
      return [];
    }

    return policies.map(policy => policy.secrets).filter(Boolean);
  }

  /**
   * Execute batch rotation for multiple secrets
   */
  async executeBatchRotation(secretIds: string[]): Promise<{
    successful: string[];
    failed: { secretId: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { secretId: string; error: string }[] = [];

    // Process rotations in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < secretIds.length; i += batchSize) {
      const batch = secretIds.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(async (secretId) => {
          await this.rotateSecret(secretId);
          return secretId;
        })
      );

      results.forEach((result, index) => {
        const secretId = batch[index];
        if (result.status === 'fulfilled') {
          successful.push(secretId);
        } else {
          failed.push({
            secretId,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }

    return { successful, failed };
  }

  /**
   * Get rotation history for a secret
   */
  async getRotationHistory(secretId: string, limit: number = 50): Promise<UsageMetric[]> {
    const { data, error } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('secret_id', secretId)
      .eq('operation', 'rotate')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Log usage metrics
   */
  private async logUsageMetric(
    secretId: string,
    operation: 'access' | 'rotate' | 'create' | 'update' | 'delete',
    success: boolean,
    errorMessage?: string,
    responseTimeMs?: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('usage_metrics').insert({
        secret_id: secretId,
        operation,
        user_id: user?.id,
        success,
        error_message: errorMessage,
        response_time_ms: responseTimeMs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log usage metric:', error);
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    secretId: string,
    eventType: 'unauthorized_access' | 'failed_rotation' | 'anomaly_detected' | 'compliance_violation',
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('security_events').insert({
        secret_id: secretId,
        event_type: eventType,
        severity,
        description,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Validate rotation policy
   */
  static validateRotationPolicy(frequencyDays: number, overlapHours: number): {
    isValid: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let isValid = true;

    if (frequencyDays < 1) {
      isValid = false;
      recommendations.push('Rotation frequency must be at least 1 day');
    }

    if (frequencyDays > 365) {
      recommendations.push('Consider rotating more frequently than once per year for better security');
    }

    if (overlapHours < 1) {
      isValid = false;
      recommendations.push('Overlap period must be at least 1 hour');
    }

    if (overlapHours > frequencyDays * 24 * 0.5) {
      recommendations.push('Overlap period should not exceed 50% of rotation frequency');
    }

    // Security recommendations based on frequency
    if (frequencyDays > 90) {
      recommendations.push('Consider rotating high-risk secrets more frequently (every 30-90 days)');
    }

    return { isValid, recommendations };
  }
}