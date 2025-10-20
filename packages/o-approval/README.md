# @olane/o-approval

Human-in-the-loop approval service for AI actions in Olane OS.

## Overview

The `o-approval` package provides a configurable approval system that allows humans to review and approve AI actions before they are executed. This ensures that sensitive operations require human oversight, making Olane OS suitable for production environments where AI autonomy needs to be controlled.

## Features

- **Configurable Modes**: Switch between `allow`, `review`, and `auto` modes
- **Preference Management**: Whitelist/blacklist specific tool methods
- **Timeout Protection**: Auto-denies actions after configurable timeout (default: 3 minutes)
- **Persistent Preferences**: "Always allow" and "never allow" choices are saved
- **Backward Compatible**: Defaults to `allow` mode for seamless integration
- **Non-Invasive**: Single interception point at task execution level

## Installation

This package is typically included as part of the Olane OS common tools and is automatically registered on all nodes.

```bash
npm install @olane/o-approval
```

## Usage

### CLI Commands

Enable review mode (all AI actions require approval):
```bash
o config set approvalMode=review
```

Disable review mode (default - no approval required):
```bash
o config set approvalMode=allow
```

Enable auto mode (only methods marked with `requiresApproval: true` need approval):
```bash
o config set approvalMode=auto
```

Check current mode:
```bash
o config get approvalMode
```

View approval mode in status:
```bash
o status
```

### Programmatic Usage

#### Initialize Approval Tool

The approval tool is automatically registered by `initCommonTools()`, but you can also create it manually:

```typescript
import { oApprovalTool } from '@olane/o-approval';

const approvalTool = new oApprovalTool({
  name: 'approval',
  parent: parentNode.address,
  leader: leaderNode.address,
  mode: 'review', // 'allow' | 'review' | 'auto'
  preferences: {
    whitelist: ['o://storage/get', 'o://intelligence/prompt'],
    blacklist: ['o://storage/delete'],
    timeout: 180000, // 3 minutes in milliseconds
  },
});

await approvalTool.start();
```

#### Request Approval

```typescript
import { oAddress } from '@olane/o-core';

const response = await node.use(new oAddress('o://approval'), {
  method: 'request_approval',
  params: {
    toolAddress: 'o://storage',
    method: 'delete_file',
    params: { file_path: '/important/document.txt' },
    intent: 'Delete the old configuration file',
  },
});

if (response.result.data.approved) {
  // Proceed with action
  console.log('Action approved');
} else {
  console.log('Action denied:', response.result.data.decision);
}
```

## Approval Flow

When an AI action requires approval, the human receives a prompt like this:

```
Action requires approval:
  Tool: o://storage
  Method: delete_file
  Parameters: {
    "file_path": "/important/document.txt"
  }
  Intent: Clean up old configuration files

Response options:
  - 'approve' - Allow this action once
  - 'deny' - Reject this action
  - 'always' - Always allow o://storage/delete_file
  - 'never' - Never allow o://storage/delete_file

Your response:
```

### Human Responses

- **`approve`**: Allows the action this one time
- **`deny`**: Rejects the action (AI receives an error)
- **`always`**: Adds the tool/method to the whitelist (auto-approves in future)
- **`never`**: Adds the tool/method to the blacklist (auto-denies in future)

## Approval Modes

### `allow` Mode (Default)
- No approval required
- All AI actions execute automatically
- Backward compatible with existing Olane OS instances

### `review` Mode
- All AI actions require human approval
- Every tool execution is intercepted
- Provides maximum human oversight

### `auto` Mode
- Only methods marked with `requiresApproval: true` need approval
- Allows fine-grained control at the method level
- Best for production environments with trusted tools

## API Reference

### Methods

#### `request_approval`

Request human approval for an AI action.

**Parameters:**
- `toolAddress` (string, required): The address of the tool to be called
- `method` (string, required): The method name to be called
- `params` (object, required): The parameters for the method call
- `intent` (string, optional): The original intent that triggered this action

**Returns:**
```typescript
{
  success: boolean;
  approved: boolean;
  decision: 'approve' | 'deny' | 'always' | 'never';
  timestamp: number;
}
```

#### `set_preference`

Store an approval preference (whitelist/blacklist).

**Parameters:**
- `toolMethod` (string, required): The tool/method combination (e.g., "o://storage/delete")
- `preference` (string, required): The preference type: "allow" or "deny"

**Returns:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### `get_mode`

Get the current approval mode.

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  mode: 'allow' | 'review' | 'auto';
  preferences: ApprovalPreferences;
}
```

#### `set_mode`

Set the approval mode.

**Parameters:**
- `mode` (string, required): The approval mode: "allow", "review", or "auto"

**Returns:**
```typescript
{
  success: boolean;
  mode: 'allow' | 'review' | 'auto';
}
```

## Configuration

### Marking Methods as Requiring Approval

To mark a method as requiring approval in `auto` mode, add the `requiresApproval` flag:

```typescript
import { oMethod } from '@olane/o-protocol';

export const MY_METHODS: { [key: string]: oMethod } = {
  delete_file: {
    name: 'delete_file',
    description: 'Delete a file from storage',
    parameters: [...],
    dependencies: [],
    requiresApproval: true, // Requires approval in auto mode
    approvalMetadata: {
      riskLevel: 'high',
      category: 'destructive',
      description: 'Permanently deletes a file',
    },
  },
};
```

## Security Considerations

### Defense in Depth

The approval system provides Layer 4 in the Olane OS security architecture:

1. **Layer 1 (Database)**: RLS policies prevent unauthorized data access
2. **Layer 2 (Application)**: Caller validation ensures proper ownership
3. **Layer 3 (Audit)**: Access logging tracks all operations
4. **Layer 4 (Human-in-the-Loop)**: Approval system prevents unauthorized AI actions

### Best Practices

1. **Use `review` mode in production** for sensitive environments
2. **Use `auto` mode** with carefully marked methods for trusted environments
3. **Regularly review audit logs** for denied actions
4. **Keep whitelist/blacklist minimal** to avoid approval fatigue
5. **Set appropriate timeouts** based on response time expectations

## License

(MIT OR Apache-2.0)

## Related Packages

- [@olane/o-core](../o-core) - Core node functionality
- [@olane/o-lane](../o-lane) - Lane execution and capabilities
- [@olane/o-login](../o-login) - Human/AI agent authentication
- [@olane/o-protocol](../o-protocol) - Protocol definitions
- [@olane/o-tools-common](../o-tools-common) - Common tools initialization
