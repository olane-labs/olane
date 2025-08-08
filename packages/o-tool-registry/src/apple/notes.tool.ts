import { oTool, oToolConfig } from '@olane/o-tool';
import { oAddress, oRequest, oVirtualNode } from '@olane/o-core';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export class NotesTool extends oTool(oVirtualNode) {
  private jxaScriptPath: string;

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://notes'),
      description: 'Tool to interact with Apple Notes',
    });

    // Set the path to the JXA script
    this.jxaScriptPath = path.join(__dirname, 'notes.jxa');
  }

  private async executeJxaScript(
    command: string,
    args: string[] = [],
  ): Promise<any> {
    try {
      const commandArgs = [command, ...args]
        .map((arg) => `"${arg.replace(/"/g, '\\"')}"`)
        .join(' ');
      const fullCommand = `${this.jxaScriptPath} ${commandArgs}`;

      this.logger.debug(`Executing JXA command: ${fullCommand}`);

      const { stdout, stderr } = await execAsync(fullCommand);

      if (stderr) {
        this.logger.warn(`JXA stderr: ${stderr}`);
      }

      const result = JSON.parse(stdout.trim());
      return result;
    } catch (error) {
      this.logger.error(`Failed to execute JXA script: ${error}`);
      throw new Error(`JXA execution failed: ${error.message}`);
    }
  }

  async _tool_get_notes(request: oRequest): Promise<any> {
    try {
      this.logger.debug('Getting all notes from Apple Notes');
      const result = await this.executeJxaScript('get_notes');

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: result.data,
        message: `Retrieved ${result.data.length} notes successfully`,
      };
    } catch (error) {
      this.logger.error(`Error getting notes: ${error}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async _tool_create_note(request: oRequest): Promise<any> {
    try {
      const { title, body, folder } = request.params as {
        title?: string;
        body?: string;
        folder?: string;
      };

      if (!title || !body) {
        return {
          success: false,
          error: 'Title and body are required for creating a note',
        };
      }

      this.logger.debug(`Creating note with title: ${title}`);

      const args = [title, body];
      if (folder) {
        args.push(folder);
      }

      const result = await this.executeJxaScript('create_note', args);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: result.data,
        message: 'Note created successfully',
      };
    } catch (error) {
      this.logger.error(`Error creating note: ${error}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async _tool_update_note(request: oRequest): Promise<any> {
    try {
      const { id, title, body } = request.params as {
        id?: string;
        title?: string;
        body?: string;
      };

      if (!id || !title || !body) {
        return {
          success: false,
          error: 'ID, title, and body are required for updating a note',
        };
      }

      this.logger.debug(`Updating note with ID: ${id}`);

      const result = await this.executeJxaScript('update_note', [
        id,
        title,
        body,
      ]);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: result.data,
        message: 'Note updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating note: ${error}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async _tool_delete_note(request: oRequest): Promise<any> {
    try {
      const { id } = request.params as { id?: string };

      if (!id) {
        return {
          success: false,
          error: 'ID is required for deleting a note',
        };
      }

      this.logger.debug(`Deleting note with ID: ${id}`);

      const result = await this.executeJxaScript('delete_note', [id]);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        message: result.message || 'Note deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting note: ${error}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async _tool_get_folders(request: oRequest): Promise<any> {
    try {
      this.logger.debug('Getting all folders from Apple Notes');
      const result = await this.executeJxaScript('get_folders');

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: result.data,
        message: `Retrieved ${result.data.length} folders successfully`,
      };
    } catch (error) {
      this.logger.error(`Error getting folders: ${error}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async _tool_create_folder(request: oRequest): Promise<any> {
    try {
      const { name } = request.params as { name?: string };

      if (!name) {
        return {
          success: false,
          error: 'Name is required for creating a folder',
        };
      }

      this.logger.debug(`Creating folder with name: ${name}`);

      const result = await this.executeJxaScript('create_folder', [name]);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: result.data,
        message: 'Folder created successfully',
      };
    } catch (error) {
      this.logger.error(`Error creating folder: ${error}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
