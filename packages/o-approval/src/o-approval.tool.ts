import { ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { APPROVAL_METHODS } from './methods/approval.methods.js';
import { oApprovalConfig, ApprovalMode, ApprovalPreferences } from './interfaces/approval-config.js';
import { ApprovalRequest } from './interfaces/approval-request.js';
import { ApprovalResponse, ApprovalDecision } from './interfaces/approval-response.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeAddress } from '@olane/o-node';

const DEFAULT_TIMEOUT = 180000; // 3 minutes in milliseconds

export class oApprovalTool extends oLaneTool {
  private mode: ApprovalMode;
  private preferences: ApprovalPreferences;

  constructor(config: oApprovalConfig) {
    super({
      ...config,
      address: config?.address || new oNodeAddress('o://approval'),
      description: 'Human approval service for AI actions',
      methods: APPROVAL_METHODS,
    });
    this.mode = config.mode || 'allow';
    this.preferences = config.preferences || {
      whitelist: [],
      blacklist: [],
      timeout: DEFAULT_TIMEOUT,
    };
  }

  /**
   * Check if approval is needed for a given tool/method combination
   */
  private needsApproval(toolAddress: string, method: string): boolean {
    const toolMethod = `${toolAddress}/${method}`;

    // Check blacklist first - always deny
    if (this.preferences.blacklist?.includes(toolMethod)) {
      return false; // Will be denied, but doesn't need approval prompt
    }

    // Check whitelist - always allow
    if (this.preferences.whitelist?.includes(toolMethod)) {
      return false; // Pre-approved
    }

    // Determine based on mode
    switch (this.mode) {
      case 'allow':
        return false; // No approval needed
      case 'review':
        return true; // Always require approval
      case 'auto':
        // In auto mode, only methods marked with requiresApproval need approval
        // This will be checked by the caller
        return true;
      default:
        return false;
    }
  }

  /**
   * Request human approval for an action
   */
  async _tool_request_approval(request: oRequest): Promise<ToolResult> {
    try {
      const toolAddress = request.params.toolAddress as string;
      const method = request.params.method as string;
      const params = request.params.params;
      const intent = request.params.intent as string | undefined;

      const approvalRequest: ApprovalRequest = {
        toolAddress,
        method,
        params,
        intent,
        timestamp: Date.now(),
      };

      const toolMethod = `${toolAddress}/${method}`;

      // Check if this action is blacklisted
      if (this.preferences.blacklist?.includes(toolMethod)) {
        this.logger.warn(`Action denied by blacklist: ${toolMethod}`);
        return {
          success: false,
          error: 'Action denied by approval blacklist',
          approved: false,
        };
      }

      // Check if this action is whitelisted
      if (this.preferences.whitelist?.includes(toolMethod)) {
        this.logger.info(`Action pre-approved by whitelist: ${toolMethod}`);
        return {
          success: true,
          approved: true,
          decision: 'approve',
        };
      }

      // Check if approval is needed based on mode
      if (!this.needsApproval(toolAddress, method)) {
        this.logger.debug(`Approval not required for ${toolMethod} (mode: ${this.mode})`);
        return {
          success: true,
          approved: true,
          decision: 'approve',
        };
      }

      // Format the approval prompt
      const question = this.formatApprovalPrompt(approvalRequest);

      // Request approval from human
      this.logger.info(`Requesting approval for: ${toolMethod}`);

      const timeout = this.preferences.timeout || DEFAULT_TIMEOUT;
      const approvalPromise = this.use(new oAddress('o://human'), {
        method: 'question',
        params: { question },
      });

      // Implement timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Approval timeout')), timeout)
      );

      try {
        const response = await Promise.race([approvalPromise, timeoutPromise]);
        const answer = (response.result.data as any)?.answer?.trim().toLowerCase();

        // Parse the response
        const decision = this.parseApprovalResponse(answer);

        // Handle preference storage
        if (decision === 'always') {
          await this.addToWhitelist(toolMethod);
          this.logger.info(`Added to whitelist: ${toolMethod}`);
        } else if (decision === 'never') {
          await this.addToBlacklist(toolMethod);
          this.logger.info(`Added to blacklist: ${toolMethod}`);
        }

        const approved = decision === 'approve' || decision === 'always';

        this.logger.info(`Approval decision for ${toolMethod}: ${decision} (approved: ${approved})`);

        return {
          success: true,
          approved,
          decision,
          timestamp: Date.now(),
        };
      } catch (error: any) {
        // Timeout or error - default to deny
        this.logger.error(`Approval timeout or error for ${toolMethod}:`, error.message);
        return {
          success: false,
          error: error.message || 'Approval timeout',
          approved: false,
          decision: 'deny',
        };
      }
    } catch (error: any) {
      this.logger.error('Error in approval request:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        approved: false,
      };
    }
  }

  /**
   * Format the approval prompt for the human
   */
  private formatApprovalPrompt(request: ApprovalRequest): string {
    const paramsStr = JSON.stringify(request.params, null, 2);

    return `
Action requires approval:
  Tool: ${request.toolAddress}
  Method: ${request.method}
  Parameters: ${paramsStr}
  ${request.intent ? `Intent: ${request.intent}` : ''}

Response options:
  - 'approve' - Allow this action once
  - 'deny' - Reject this action
  - 'always' - Always allow ${request.toolAddress}/${request.method}
  - 'never' - Never allow ${request.toolAddress}/${request.method}

Your response:`.trim();
  }

  /**
   * Parse the human's approval response
   */
  private parseApprovalResponse(answer: string): ApprovalDecision {
    if (!answer) return 'deny';

    if (answer.includes('approve') || answer.includes('yes') || answer.includes('allow')) {
      return 'approve';
    } else if (answer.includes('always')) {
      return 'always';
    } else if (answer.includes('never')) {
      return 'never';
    } else {
      return 'deny';
    }
  }

  /**
   * Add a tool/method to the whitelist
   */
  private async addToWhitelist(toolMethod: string): Promise<void> {
    if (!this.preferences.whitelist) {
      this.preferences.whitelist = [];
    }
    if (!this.preferences.whitelist.includes(toolMethod)) {
      this.preferences.whitelist.push(toolMethod);
      await this.savePreferences();
    }
  }

  /**
   * Add a tool/method to the blacklist
   */
  private async addToBlacklist(toolMethod: string): Promise<void> {
    if (!this.preferences.blacklist) {
      this.preferences.blacklist = [];
    }
    if (!this.preferences.blacklist.includes(toolMethod)) {
      this.preferences.blacklist.push(toolMethod);
      await this.savePreferences();
    }
  }

  /**
   * Save preferences to OS config
   */
  private async savePreferences(): Promise<void> {
    try {
      // Save preferences via the leader node's config
      await this.use(new oAddress('o://leader'), {
        method: 'update_approval_preferences',
        params: { preferences: this.preferences },
      });
    } catch (error: any) {
      this.logger.error('Failed to save approval preferences:', error.message);
    }
  }

  /**
   * Set an approval preference manually
   */
  async _tool_set_preference(request: oRequest): Promise<ToolResult> {
    try {
      const toolMethod = request.params.toolMethod as string;
      const preference = request.params.preference as string;

      if (preference === 'allow') {
        await this.addToWhitelist(toolMethod);
        return {
          success: true,
          message: `Added ${toolMethod} to whitelist`,
        };
      } else if (preference === 'deny') {
        await this.addToBlacklist(toolMethod);
        return {
          success: true,
          message: `Added ${toolMethod} to blacklist`,
        };
      } else {
        return {
          success: false,
          error: 'Invalid preference. Use "allow" or "deny"',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get the current approval mode
   */
  async _tool_get_mode(request: oRequest): Promise<ToolResult> {
    return {
      success: true,
      mode: this.mode,
      preferences: this.preferences,
    };
  }

  /**
   * Set the approval mode
   */
  async _tool_set_mode(request: oRequest): Promise<ToolResult> {
    try {
      const mode = request.params.mode as string;

      if (!['allow', 'review', 'auto'].includes(mode)) {
        return {
          success: false,
          error: 'Invalid mode. Use "allow", "review", or "auto"',
        };
      }

      this.mode = mode as ApprovalMode;
      this.logger.info(`Approval mode set to: ${this.mode}`);

      // Save mode to OS config
      await this.use(new oAddress('o://leader'), {
        method: 'update_approval_mode',
        params: { mode: this.mode },
      });

      return {
        success: true,
        mode: this.mode,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}
