const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execFileSync } = require('child_process');
const { getNpxCommandCandidates, getFfmpegCommandCandidates } = require('../utils/commands');
const { isShallowClone } = require('../workflow/git-helpers');
const { resolveRootPathOrExit } = require('./shared');
const { buildMachineEnvelope } = require('./output');

/**
 * Checks whether the Mermaid CLI can be invoked via npx from the specified project root.
 *
 * Attempts platform-specific npx command candidates to run `@mermaid-js/mermaid-cli --version`.
 * @param {string} root - Filesystem path used as the child process working directory when probing.
 * @returns {{status: 'pass'|'warn', message: string, fix?: string}} An object describing the probe result.
 * - `status: 'pass'` when a candidate successfully returns version output; `message` contains the trimmed output or `'mermaid-cli available'`.
 * - `status: 'warn'` when no candidate succeeded; `message` explains the absence and `fix` suggests `npm install -g @mermaid-js/mermaid-cli`.
 */
function checkMermaidCli(root) {
  const candidates = getNpxCommandCandidates(process.platform);
  for (const candidate of candidates) {
    try {
      const output = execFileSync(candidate, ['-y', '@mermaid-js/mermaid-cli', '--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: root,
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

/**
 * Verify that Playwright (and its Chromium runtime) is available for the project at the given root.
 *
 * Attempts to resolve a local `playwright` package and perform a headless Chromium launch; if not found, falls back to checking available npx candidates for the Playwright CLI.
 *
 * @param {string} root - Filesystem path of the project root used to resolve packages and run probes.
 * @returns {{status: 'pass'|'warn'|'fail', message: string, fix?: string}} `status` is `'pass'` when a runtime or CLI was detected; `'warn'` when Playwright is present but Chromium is unavailable or no runtime/CLI was detected. `message` summarises the detection result; `fix` provides an installation hint when applicable.
 */
function checkPlaywright(root) {
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
    pkg = require.resolve('playwright', { paths: [path.join(root, 'node_modules')] });
  } catch (_resolveError) {
    pkg = null;
  }

  if (pkg) {
    try {
      execFileSync('node', ['-e', quickLaunchScript], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: root,
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
        cwd: root,
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

/**
 * Checks whether an ffmpeg executable can be invoked from the environment.
 *
 * Tries to detect a usable ffmpeg binary and, on success, returns a pass result whose message is the first line of ffmpeg's version output (trimmed). If detection fails, returns a warning with a platform-appropriate installation hint in `fix`.
 *
 * @param {string} root - Directory used as the current working directory when probing for ffmpeg.
 * @returns {{status: 'pass'|'warn', message: string, fix?: string}} `status` is `'pass'` when ffmpeg was detected, otherwise `'warn'`. `message` summarises the detection or the absence; `fix` is provided for the `'warn'` case with an installation hint.
 */
function checkFfmpeg(root) {
  const candidates = getFfmpegCommandCandidates(process.platform);
  for (const candidate of candidates) {
    try {
      const output = execFileSync(candidate, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: root,
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
  let installHint = 'install ffmpeg and ensure it is on PATH';
  if (process.platform === 'darwin') {
    installHint = 'brew install ffmpeg';
  } else if (process.platform === 'linux') {
    installHint = 'sudo apt install ffmpeg';
  } else if (process.platform === 'win32') {
    installHint = 'Install ffmpeg (for example with winget: winget install Gyan.FFmpeg)';
  }
  return {
    status: 'warn',
    message: 'ffmpeg not detected',
    fix: installHint,
  };
}

/**
 * Remove the probe directory created by the doctor checks if it did not exist beforehand.
 *
 * Attempts to remove `diagramDir` only when `existedBefore` is false; errors during removal are ignored.
 * @param {string} diagramDir - Filesystem path of the probe directory to remove.
 * @param {boolean} existedBefore - Whether the directory existed prior to the probe. If `true`, no action is taken.
 */
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

/**
 * Verifies that the process can create and remove files under the repository diagram directory.
 *
 * Attempts to create a probe file inside <root>/.diagram and cleans up any probe artifacts it created.
 *
 * @param {string} root - Filesystem path of the repository root to test write access for.
 * @returns {{status: 'pass'|'fail', message: string, fix?: string}} An object where `status` is `'pass'` when write access is confirmed or `'fail'` when it is not; `message` describes the outcome; `fix` suggests a permission command when applicable.
 */
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

/**
 * Check that npm's cache directory is configured and is writable.
 *
 * Attempts to read the npm cache path from configuration and verify write access by creating and removing a probe file.
 *
 * @returns {{status: 'pass'|'warn'|'fail', message: string, fix?: string}}
 * - `status: 'pass'` when the cache directory is writable; `message` contains the cache path.
 * - `status: 'warn'` when the cache path is empty or the npm config could not be read; `fix` suggests how to inspect or set the cache.
 * - `status: 'fail'` when the cache path exists but is not writable; `message` contains the path and error, and `fix` suggests permission commands (platform-specific).
 */
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
      let fix = `sudo chown -R "$(id -u):$(id -g)" "${cachePath}"`;
      if (process.platform === 'win32') {
        fix = `Run an elevated PowerShell and grant cache access (for example: takeown /F "${cachePath}" /R /D Y && icacls "${cachePath}" /grant "%USERNAME%":(OI)(CI)F /T).`;
      }
      return {
        status: 'fail',
        message: `npm cache not writable: ${cachePath} (${error.message})`,
        fix,
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

/**
 * Register the `doctor` CLI command that runs environment diagnostics for a diagram project.
 *
 * The command performs a fixed set of checks (Mermaid CLI, Playwright, ffmpeg, Git history depth,
 * write permissions and npm cache health), summarises results, and prints output in either text
 * (default) or JSON formats. When invoked the command will call `process.exit` with a non-zero
 * status if any checks fail or if `--strict` is set and warnings are present.
 *
 * @param {import('commander').Command} program - Commander program instance to register the command on.
 */
function registerDoctorCommand(program) {
  program
    .command('doctor [path]')
    .description('Run environment diagnostics for architecture evidence workflows')
    .option('--format <type>', 'Output format (text, json)', 'text')
    .option('--strict', 'Fail when diagnostics include warnings', false)
    .option('--deterministic', 'Use deterministic machine output', false)
    .action((targetPath, options) => {
      const root = resolveRootPathOrExit(targetPath);
      const checks = [
        { id: 'mermaid_cli', label: 'Mermaid CLI', ...checkMermaidCli(root) },
        { id: 'playwright', label: 'Playwright', ...checkPlaywright(root) },
        { id: 'ffmpeg', label: 'ffmpeg', ...checkFfmpeg(root) },
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
      const strictFailure = Boolean(options.strict) && checks.some((check) => check.status === 'warn');
      const failedChecks = checks.filter((check) => check.status === 'fail');
      const exitCode = (failedChecks.length > 0 || strictFailure) ? 1 : 0;

      const summary = {
        pass: checks.filter((check) => check.status === 'pass').length,
        warn: checks.filter((check) => check.status === 'warn').length,
        fail: failedChecks.length,
      };
      const formatStr = (options.format || 'text').toLowerCase();
      if (formatStr === 'json') {
        const payload = buildMachineEnvelope({
          schemaVersion: '1.0',
          command: 'doctor',
          rootPath: root,
          deterministic: Boolean(options.deterministic),
          status: exitCode === 0 ? 'success' : 'failure',
          data: { checks, summary },
          errors: [
            ...failedChecks,
            ...(strictFailure ? [{ id: 'strict_warn_policy', message: 'Strict mode treats warnings as failures.' }] : []),
          ],
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
        process.exit(exitCode);
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
      console.log('  1) Resolve any ❌ checks first, then rerun `archscope doctor`.');
      console.log('  2) Run `archscope generate-all . --artifact-profile agent` once diagnostics are clean.');

      process.exit(exitCode);
    });
}

module.exports = {
  registerDoctorCommand,
};
