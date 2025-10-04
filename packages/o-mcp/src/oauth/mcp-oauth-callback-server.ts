import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import { EventEmitter } from 'events';

interface CallbackResult {
  code: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * HTTP server for handling OAuth callbacks
 *
 * This server runs locally to receive the OAuth redirect after user authorization.
 * It automatically shuts down after receiving the callback.
 */
export class McpOAuthCallbackServer {
  private app: Express;
  private server: Server | null = null;
  private port: number = 3334;
  private events: EventEmitter;
  private callbackResult: CallbackResult | null = null;

  constructor(port?: number) {
    if (port) {
      this.port = port;
    }
    this.app = express();
    this.events = new EventEmitter();
    this.setupRoutes();
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // OAuth callback endpoint
    this.app.get('/oauth/callback', (req: Request, res: Response) => {
      const { code, state, error, error_description } = req.query;

      if (error) {
        this.callbackResult = {
          code: '',
          error: error as string,
          error_description: error_description as string,
        };
        res.send(`
          <html>
            <head><title>OAuth Error</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #d32f2f;">Authentication Failed</h1>
              <p style="color: #666;">Error: ${error}</p>
              <p style="color: #666;">${error_description || ''}</p>
              <p style="margin-top: 40px; color: #999;">You can close this window.</p>
            </body>
          </html>
        `);
      } else if (code) {
        this.callbackResult = {
          code: code as string,
          state: state as string,
        };
        res.send(`
          <html>
            <head><title>OAuth Success</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #4caf50;">✓ Authentication Successful</h1>
              <p style="color: #666;">You have successfully authenticated with the MCP server.</p>
              <p style="margin-top: 40px; color: #999;">You can close this window.</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
      } else {
        this.callbackResult = {
          code: '',
          error: 'invalid_request',
          error_description: 'No code or error in callback',
        };
        res.status(400).send(`
          <html>
            <head><title>OAuth Error</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #d32f2f;">Invalid Callback</h1>
              <p style="color: #666;">The OAuth callback was missing required parameters.</p>
              <p style="margin-top: 40px; color: #999;">You can close this window.</p>
            </body>
          </html>
        `);
      }

      // Emit callback event
      this.events.emit('callback', this.callbackResult);
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', port: this.port });
    });
  }

  /**
   * Start the callback server
   */
  async start(port?: number): Promise<void> {
    if (port) {
      this.port = port;
    }

    if (this.server) {
      throw new Error('Callback server is already running');
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(
            `OAuth callback server listening on http://localhost:${this.port}`,
          );
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            reject(
              new Error(
                `Port ${this.port} is already in use. Please close other OAuth flows or choose a different port.`,
              ),
            );
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the callback server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.server = null;
          this.callbackResult = null;
          resolve();
        }
      });
    });
  }

  /**
   * Wait for OAuth callback
   * @param timeout Timeout in milliseconds (default: 5 minutes)
   */
  async waitForCallback(timeout: number = 300000): Promise<CallbackResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.events.removeAllListeners('callback');
        reject(
          new Error(
            'OAuth callback timeout. User did not complete authentication.',
          ),
        );
      }, timeout);

      this.events.once('callback', (result: CallbackResult) => {
        clearTimeout(timeoutId);

        if (result.error) {
          reject(
            new Error(
              `OAuth error: ${result.error}. ${result.error_description || ''}`,
            ),
          );
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Get the callback URL
   */
  getCallbackUrl(): string {
    return `http://localhost:${this.port}/oauth/callback`;
  }

  /**
   * Get the current port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }
}
