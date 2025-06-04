# Unibear Security System

## Overview

Unibear implements a **blocklist-based security system** to prevent the LLM from executing potentially harmful commands. This approach is more flexible and secure than allowlists, as it doesn't restrict legitimate development commands while blocking dangerous operations.

## Security Features

### 🚫 **Blocked Commands**
The following commands are completely blocked:
- **System modification**: `rm`, `chmod`, `sudo`, `dd`, `format`, `fdisk`
- **Process control**: `kill`, `killall`, `shutdown`, `reboot`
- **User management**: `passwd`, `usermod`, `userdel`
- **System services**: `systemctl`, `service`, `crontab`
- **Shell execution**: `eval`, `exec`, `source`

### 🔍 **Dangerous Patterns**
Regular expressions block command patterns like:
- `rm -rf /` - Recursive deletion from root
- `curl site | sh` - Piping downloads to shell
- `; rm` or `&& rm` - Command chaining with rm
- Writing to system devices: `> /dev/sda`
- Accessing system files: `/etc/passwd`, `/etc/shadow`

### ⚠️ **High-Risk Operations**
Commands requiring extra confirmation:
- `git push --force` - Force push operations
- `npm publish` - Package publishing
- `deno publish` - Deno package publishing
- `cargo publish` - Rust crate publishing

## How It Works

1. **Command Parsing**: Extracts base command from input
2. **Blocklist Check**: Compares against blocked commands
3. **Pattern Matching**: Tests against dangerous regex patterns
4. **Risk Assessment**: Determines if extra confirmation is needed
5. **User Confirmation**: Always requires explicit confirmation before execution

## Usage Examples

### ✅ **Allowed Commands**
```bash
git status           # Safe git operations
npm run dev          # Development scripts
deno task build      # Build tasks
ls -la              # File listing
cat README.md       # File reading
```

### ❌ **Blocked Commands**
```bash
rm -rf /            # System deletion
sudo anything       # Elevated privileges
chmod 777 /etc      # Permission changes
kill -9 1           # Process termination
```

### ⚠️ **High-Risk Commands**
```bash
git push --force    # Requires extra confirmation
npm publish         # Requires extra confirmation
```

## Configuration

The security system can be extended at runtime:

```typescript
import { CommandSecurityChecker } from "./security.ts";

const checker = new CommandSecurityChecker();

// Add more blocked commands
checker.addBlockedCommands(['custom-dangerous-cmd']);

// Add more blocked patterns
checker.addBlockedPatterns([/dangerous-pattern/]);
```

## Benefits

- **Flexible**: Doesn't restrict legitimate development workflows
- **Secure**: Blocks known dangerous operations and patterns
- **Transparent**: Clear error messages explain why commands are blocked
- **Extensible**: Easy to add new security rules
- **User-Friendly**: Allows all safe development commands without friction

## Security Philosophy

> **Blocklist > Allowlist**: Rather than trying to predict all legitimate commands (impossible and restrictive), we block known dangerous ones and allow everything else with user confirmation.

This approach ensures developers can use any tool they need while preventing the LLM from accidentally executing harmful commands.