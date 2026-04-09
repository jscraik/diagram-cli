const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execFileSync } = require('child_process');
const { getNpxCommandCandidates, getFfmpegCommandCandidates } = require('../utils/commands');
const { isShallowClone } = require('../workflow/git-helpers');
const { resolveRootPathOrExit } = require('./shared');
const { buildMachineEnvelope } = require('./output');

function checkMermaidCli() {
  const candidates = getNpxCommandCandidates(process.platform);
  for (const candidate of candidates) {
    try {
      const output = execFileSync(candidate, ['-y', '@mermaid-js/mermaid-cli', 'mmdc', '--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        timeout: 10000,
      }).trim();
      return { status: 'pass', message: output || 'mermaid-cli available' };
    } catch (_error) {
      // Try next candidate.
    }
  }
  return {
    status: 'warn',
    message: 'Mermaid CLI is not currently available via npx',
    fix: 'npm install -g @mermaid-js/mermaid-cli',
  };
}

function checkPlaywright() {
  const quickLaunchScript = [
    'const { chromium } = require("playwright");',
    '(async () => {',
    '  const browser = await chromium.launch({ headless: true });',
    '  await browser.close();',
    '})().catch((error) => {',
    '  console.error(error.message || String(error));',
    '  process.exit(1);',
    '});',
  ].join('\n');
  let pkg = null;
  try {
    pkg = require.resolve('playwright');
  } catch (_resolveError) {
    pkg = null;
  }

  if (pkg) {
    try {
      execFileSync('node', ['-e', quickLaunchScript], {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        timeout: 15000,
      });
      return { status: 'pass', message: `playwright runtime verified (${pkg})` };
    } catch (_launchError) {
      return {
        status: 'warn',
        message: 'Playwright package found but Chromium runtime is unavailable',
        fix: 'npx playwright install chromium',
      };
    }
  }

  const candidates = getNpxCommandCandidates(process.platform);
  for (const candidate of candidates) {
    try {
      const output = execFileSync(candidate, ['playwright', '--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        timeout: 10000,
      }).trim();
      return { status: 'pass', message: output || 'playwright CLI available' };
    } catch (_playwrightError) {
      // Try next npx candidate.
    }
  }
  return {
    status: 'warn',
    message: 'Playwright runtime not detected',
    fix: 'npx playwright install chromium',
  };
}

function checkFfmpeg() {
  const candidates = getFfmpegCommandCandidates(process.platform);
  for (const candidate of candidates) {
    try {
      const output = execFileSync(candidate, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
      });
      const firstLine = output.split('\n')[0] || `${candidate} available`;
      return { status: 'pass', message: firstLine.trim() };
    } catch (_error) {
      // Continue.
    }
  }
  return {
    status: 'warn',
    message: 'ffmpeg not detected',
    fix: 'brew install ffmpeg',
  };
}

function removeDoctorProbeDirIfCreated(diagramDir, existedBefore) {
  if (existedBefore) {
    return;
  }
  try {
    fs.rmdirSync(diagramDir);
  } catch (_cleanupError) {
    // Keep directory if not empty or not removable.
  }
}

function checkWritePermissions(root) {
  const diagramDir = path.join(root, '.diagram');
  const existedBefore = fs.existsSync(diagramDir);
  try {
    if (!existedBefore) {
      fs.mkdirSync(diagramDir, { recursive: true });
    }
    const probePath = path.join(diagramDir, '.doctor-write-probe');
    fs.writeFileSync(probePath, 'ok');
    fs.rmSync(probePath, { force: true });
    removeDoctorProbeDirIfCreated(diagramDir, existedBefore);
    return { status: 'pass', message: `write access confirmed for ${diagramDir}` };
  } catch (error) {
    removeDoctorProbeDirIfCreated(diagramDir, existedBefore);
    return {
      status: 'fail',
      message: `write access failed for ${diagramDir}: ${error.message}`,
      fix: `chmod -R u+rw "${diagramDir}"`,
    };
  }
}

function checkNpmCacheHealth() {
  try {
    const cachePath = execFileSync('npm', ['config', 'get', 'cache'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 10000,
    }).trim();
    if (!cachePath) {
      return { status: 'warn', message: 'npm cache path is empty', fix: 'npm config set cache ~/.npm' };
    }

    try {
      fs.mkdirSync(cachePath, { recursive: true });
      const probePath = path.join(cachePath, '.doctor-npm-cache-probe');
      fs.writeFileSync(probePath, 'ok');
      fs.rmSync(probePath, { force: true });
      return { status: 'pass', message: `npm cache writable: ${cachePath}` };
    } catch (error) {
      return {
        status: 'fail',
        message: `npm cache not writable: ${cachePath} (${error.message})`,
        fix: `sudo chown -R "$(id -u):$(id -g)" "${cachePath}"`,
      };
    }
  } catch (error) {
    return {
      status: 'warn',
      message: `could not read npm cache config: ${error.message}`,
      fix: 'npm config get cache',
    };
  }
}

function registerDoctorCommand(program) {
  program
    .command('doctor [path]')
    .description('Run environment diagnostics for diagram workflows')
    .option('--format <type>', 'Output format (text, json)', 'text')
    .option('--deterministic', 'Use deterministic machine output', false)
    .action((targetPath, options) => {
      const root = resolveRootPathOrExit(targetPath);
      const checks = [
        { id: 'mermaid_cli', label: 'Mermaid CLI', ...checkMermaidCli() },
        { id: 'playwright', label: 'Playwright', ...checkPlaywright() },
        { id: 'ffmpeg', label: 'ffmpeg', ...checkFfmpeg() },
        {
          id: 'git_shallow_clone',
          label: 'Git history depth',
          ...(isShallowClone(root)
            ? { status: 'warn', message: 'shallow clone detected', fix: 'git fetch --unshallow' }
            : { status: 'pass', message: 'full git history available' }),
        },
        { id: 'write_permissions', label: 'Write permissions', ...checkWritePermissions(root) },
        { id: 'npm_cache', label: 'npm cache health', ...checkNpmCacheHealth() },
      ];

      const summary = {
        pass: checks.filter((check) => check.status === 'pass').length,
        warn: checks.filter((check) => check.status === 'warn').length,
        fail: checks.filter((check) => check.status === 'fail').length,
      };
      const formatStr = (options.format || 'text').toLowerCase();
      if (formatStr === 'json') {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'doctor',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          status: summary.fail > 0 ? 'failure' : 'success',
          data: { checks, summary },
          errors: checks.filter((check) => check.status === 'fail'),
          agentSummary: {
            changedComponents: 0,
            riskReasons: checks.filter((check) => check.status !== 'pass').map((check) => check.id),
            suggestedReviewerChecks: [
              'Resolve all fail-status diagnostics before CI artifact generation.',
              'Treat warn-status diagnostics as reliability debt if not immediately blocking.',
            ],
          },
        });
        console.log(JSON.stringify(payload, null, 2));
        process.exit(summary.fail > 0 ? 1 : 0);
      }

      console.log(chalk.blue('\n🩺 diagram doctor'));
      for (const check of checks) {
        const icon = check.status === 'pass' ? '✅' : (check.status === 'warn' ? '⚠️' : '❌');
        const line = `${icon} ${check.label}: ${check.message}`;
        if (check.status === 'pass') {
          console.log(chalk.green(line));
        } else if (check.status === 'warn') {
          console.log(chalk.yellow(line));
        } else {
          console.log(chalk.red(line));
        }
        if (check.fix) {
          console.log(chalk.gray(`   Fix: ${check.fix}`));
        }
      }

      console.log(chalk.cyan('\nNext steps:'));
      console.log('  1) Resolve any ❌ checks first, then rerun `diagram doctor`.');
      console.log('  2) Run `diagram generate-all . --artifact-profile agent` once diagnostics are clean.');

      process.exit(summary.fail > 0 ? 1 : 0);
    });
}

module.exports = {
  registerDoctorCommand,
};