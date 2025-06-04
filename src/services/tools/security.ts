// Security configuration for CLI command execution
export interface SecurityConfig {
  blockedCommands: string[];
  blockedPatterns: RegExp[];
  requireConfirmationPatterns: RegExp[];
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  // Blacklist of dangerous commands
  blockedCommands: [
    "rm", "rmdir", "del", "delete", "format", "fdisk",
    "kill", "killall", "pkill", "sudo", "su", "chmod", 
    "chown", "dd", "mkfs", "mount", "umount", "crontab",
    "service", "systemctl", "shutdown", "reboot", "halt",
    "passwd", "usermod", "userdel", "groupdel", "useradd",
    "groupadd", "iptables", "ufw", "firewall-cmd",
    "shred", "wipe", "eval", "exec", "source", ".",
    "history", "fc"
  ],
  
  // Dangerous patterns to block
  blockedPatterns: [
    /rm\s+-rf\s+\//,           // rm -rf /
    />\s*\/dev\/sd[a-z]/,      // Writing to disk devices  
    /\/etc\/passwd/,           // System files
    /\/etc\/shadow/,
    /\/etc\/sudoers/,
    /curl.*\|\s*sh/,           // Pipe curl to shell
    /wget.*\|\s*sh/,           // Pipe wget to shell
    /;\s*rm\s/,                // Command chaining with rm
    /&&\s*rm\s/,               // Command chaining with rm
    /\|\s*sh$/,                // Pipe to shell
    /\|\s*bash$/,              // Pipe to bash
    /\/tmp\/.*\|\s*sh/,        // Execute from tmp
  ],
  
  // Patterns requiring extra confirmation
  requireConfirmationPatterns: [
    /git\s+push.*--force/,     // Force push operations
    /npm\s+publish/,           // Package publishing
    /deno\s+publish/,
    /cargo\s+publish/,
    /docker\s+run.*--privileged/, // Privileged containers
    /docker\s+exec.*--privileged/,
  ]
};

export class CommandSecurityChecker {
  constructor(private config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {}
  
  checkCommand(command: string): {
    allowed: boolean;
    reason?: string;
    requiresExtraConfirmation?: boolean;
  } {
    const trimmedCommand = command.trim();
    const parts = trimmedCommand.split(/\s+/);
    const baseCommand = parts[0];
    
    // Check blocked commands
    if (this.config.blockedCommands.includes(baseCommand)) {
      return {
        allowed: false,
        reason: `Command '${baseCommand}' is blocked for security reasons`
      };
    }
    
    // Check blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(trimmedCommand)) {
        return {
          allowed: false,
          reason: `Command matches blocked pattern: potentially dangerous operation`
        };
      }
    }
    
    // Check if requires extra confirmation
    for (const pattern of this.config.requireConfirmationPatterns) {
      if (pattern.test(trimmedCommand)) {
        return {
          allowed: true,
          requiresExtraConfirmation: true
        };
      }
    }
    
    return { allowed: true };
  }
  
  // Method to update security config at runtime
  updateConfig(newConfig: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
  
  // Method to add blocked commands at runtime
  addBlockedCommands(commands: string[]) {
    this.config.blockedCommands.push(...commands);
  }
  
  // Method to add blocked patterns at runtime
  addBlockedPatterns(patterns: RegExp[]) {
    this.config.blockedPatterns.push(...patterns);
  }
}