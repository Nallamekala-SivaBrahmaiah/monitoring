import { NextRequest, NextResponse } from 'next/server';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  suggestion?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, osType = 'ubuntu', packageName = '' } = body;

    if (!command || typeof command !== 'string' || !command.trim()) {
      return NextResponse.json({
        success: false,
        isValid: false,
        error: 'Command string is required for validation',
      }, { status: 400 });
    }

    const trimmed = command.trim();
    const issues: ValidationIssue[] = [];
    let fixedCommand = trimmed;

    // 1. Syntax Check: Unclosed quotes
    const singleQuotes = (trimmed.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      issues.push({
        severity: 'error',
        type: 'syntax',
        message: 'Unbalanced single quotes detected.',
        suggestion: 'Ensure every opening quote has a matching closing quote.',
      });
    }

    const doubleQuotes = (trimmed.match(/"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      issues.push({
        severity: 'error',
        type: 'syntax',
        message: 'Unbalanced double quotes detected.',
        suggestion: 'Ensure every opening double quote has a matching closing quote.',
      });
    }

    // 2. Syntax Check: Unbalanced parentheses and braces
    const openParen = (trimmed.match(/\(/g) || []).length;
    const closeParen = (trimmed.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      issues.push({
        severity: 'error',
        type: 'syntax',
        message: 'Unbalanced parentheses `()` detected.',
      });
    }

    // 3. Dangerous commands check
    if (/rm\s+-rf\s+\/($|\s)/.test(trimmed) || /rm\s+-rf\s+\/\*/.test(trimmed)) {
      issues.push({
        severity: 'error',
        type: 'security',
        message: 'CRITICAL HAZARD: Root filesystem deletion pattern `rm -rf /` detected!',
        suggestion: 'Remove dangerous deletion command immediately.',
      });
    }

    // 4. Missing non-interactive flags (-y) for package managers
    const isAptInstall = /apt(-get)?\s+install/.test(trimmed);
    const isYumInstall = /(yum|dnf)\s+install/.test(trimmed);

    if (isAptInstall && !/\s+-y(\s|$)/.test(trimmed) && !/\s+--yes(\s|$)/.test(trimmed)) {
      issues.push({
        severity: 'warning',
        type: 'automation',
        message: 'Missing non-interactive confirmation flag `-y` in `apt install`. Execution will hang waiting for user prompt.',
        suggestion: 'Add `-y` flag to allow unattended automated installation.',
      });
      fixedCommand = fixedCommand.replace(/apt(-get)?\s+install/g, (match) => `${match} -y`);
    }

    if (isYumInstall && !/\s+-y(\s|$)/.test(trimmed) && !/\s+--assumeyes(\s|$)/.test(trimmed)) {
      issues.push({
        severity: 'warning',
        type: 'automation',
        message: 'Missing non-interactive confirmation flag `-y` in `yum/dnf install`.',
        suggestion: 'Add `-y` flag to allow unattended automated installation.',
      });
      fixedCommand = fixedCommand.replace(/(yum|dnf)\s+install/g, (match) => `${match} -y`);
    }

    // 5. Privilege Check (sudo requirement)
    const needsRoot = isAptInstall || isYumInstall || /systemctl\s+(start|stop|restart|enable)/.test(trimmed) || /mkdir\s+-p\s+\/etc/.test(trimmed);
    const hasSudo = trimmed.includes('sudo') || trimmed.startsWith('su ');
    if (needsRoot && !hasSudo) {
      issues.push({
        severity: 'warning',
        type: 'privilege',
        message: 'Package management and system services usually require elevated privileges (`sudo`).',
        suggestion: 'Prefix command with `sudo` if running as a non-root user.',
      });
      if (!fixedCommand.startsWith('sudo ')) {
        fixedCommand = `sudo ${fixedCommand}`;
      }
    }

    // 6. OS Compatibility Checks
    if (osType === 'ubuntu' || osType === 'debian') {
      if (isYumInstall) {
        issues.push({
          severity: 'error',
          type: 'compatibility',
          message: '`yum`/`dnf` package manager is not available on Debian/Ubuntu systems.',
          suggestion: 'Use `apt-get update && apt-get install -y <package>` instead.',
        });
      }
      if (/add-apt-repository/.test(trimmed) && !/apt(-get)?\s+update/.test(trimmed)) {
        issues.push({
          severity: 'info',
          type: 'best_practice',
          message: 'After adding a PPA/repository, remember to execute `sudo apt-get update` before installing.',
        });
      }
    } else if (osType === 'amazon_linux' || osType === 'rhel') {
      if (isAptInstall) {
        issues.push({
          severity: 'error',
          type: 'compatibility',
          message: '`apt` package manager is not available on RHEL/Amazon Linux systems.',
          suggestion: 'Use `dnf install -y <package>` or `yum install -y <package>` instead.',
        });
      }
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const hasWarnings = issues.some((i) => i.severity === 'warning');
    const isValid = !hasErrors;

    const status = hasErrors
      ? 'ERROR'
      : hasWarnings
      ? 'WARNING'
      : 'CORRECT';

    return NextResponse.json({
      success: true,
      isValid,
      status,
      packageName,
      osType,
      command: trimmed,
      issues,
      fixedCommand: fixedCommand !== trimmed ? fixedCommand : null,
      message: isValid
        ? hasWarnings
          ? 'Command syntax is valid with optimization recommendations.'
          : 'Command is verified and 100% correct for automated installation.'
        : 'Syntax or compatibility errors detected in command.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
