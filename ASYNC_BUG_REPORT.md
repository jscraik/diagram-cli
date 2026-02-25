# Async/Await Bug Report - diagram-cli

> Historical snapshot: this report reflects point-in-time analysis from its date and is not the source of truth for current project status. Use README.md and CHANGELOG.md for current behavior.


**Date:** 2026-02-24  
**Scope:** Race conditions and async/await problems in diagram-cli codebase  
**Files Analyzed:** src/**/*.js (12 source files)

---

## Summary

Found **6 bugs** across the codebase:
- **1 Critical** bug causing runtime ReferenceError
- **2 High** severity issues with unhandled process failures
- **2 Medium** severity issues with error handling gaps
- **1 Low** severity issue with missing cleanup error handling

---

## Critical Bugs

### BUG-001: ReferenceError - Using `ffmpegCmd` Before Declaration
**File:** `src/video.js`  
**Lines:** 171, 175  
**Severity:** CRITICAL

#### Description
The `ffmpegCmd` variable is used in `execSync()` calls at lines 171 and 175 before it is declared at line 190. This causes a `ReferenceError` at runtime when the function attempts to auto-detect the codec.

#### Code:
```javascript
// Lines 168-181 in video.js
let codec = 'libx264';
try {
  // Check if libx264 is available
  execSync(`"${ffmpegCmd}" -encoders | grep libx264`, { stdio: 'pipe' });  // ❌ ffmpegCmd not defined yet
} catch (e) {
  try {
    execSync(`"${ffmpegCmd}" -encoders | grep h264_videotoolbox`, { stdio: 'pipe' });  // ❌ Same issue
    codec = 'h264_videotoolbox';
  } catch (e2) {
    codec = 'mpeg4';
  }
}
// ... ffmpegCmd is defined at line 190
let ffmpegCmd = 'ffmpeg';
```

#### Impact
Video generation will crash immediately with `ReferenceError: Cannot access 'ffmpegCmd' before initialization`.

#### Proposed Fix:
Move the ffmpeg path detection logic (lines 190-209) to before line 168:

```javascript
async function generateVideo(mermaidCode, outputPath, options = {}) {
  // ... validation code ...

  // Find ffmpeg FIRST (moved from line 190)
  let ffmpegCmd = 'ffmpeg';
  try {
    execSync('which ffmpeg', { stdio: 'pipe' });
  } catch (e) {
    const possiblePaths = [/* ... */];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        ffmpegCmd = p;
        break;
      }
    }
  }

  // NOW safe to use ffmpegCmd
  let codec = 'libx264';
  try {
    execSync(`"${ffmpegCmd}" -encoders | grep libx264`, { stdio: 'pipe' });
  } catch (e) {
    // ...
  }
  // ... rest of function
}
```

---

## High Severity Bugs

### BUG-002: Unhandled spawn() Error - Browser Opening Can Crash Process
**File:** `src/diagram.js`  
**Lines:** 577-581  
**Severity:** HIGH

#### Description
The `spawn()` call to open the browser URL has no error handling. If the command fails (e.g., `xdg-open` not found on Linux, or the URL is invalid), it will emit an 'error' event that is not caught, causing an unhandled exception and potential process termination.

#### Code:
```javascript
if (options.open && url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  const child = spawn(cmd, platform === 'win32' ? ['', url] : [url], { 
    stdio: 'ignore', 
    detached: true 
  });
  child.unref();  // ❌ No error handler attached
}
```

#### Impact
- Process may crash if browser opening fails
- No user feedback when browser cannot be opened
- On Windows, `start` command may fail silently or with unhandled error

#### Proposed Fix:
```javascript
if (options.open && url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  const child = spawn(cmd, platform === 'win32' ? ['', url] : [url], { 
    stdio: 'ignore', 
    detached: true 
  });
  
  child.on('error', (err) => {
    console.warn(chalk.yellow(`⚠️  Could not open browser: ${err.message}`));
  });
  
  child.unref();
}
```

---

### BUG-003: Unsafe execSync() Without Try-Catch - Video Compilation Failure
**File:** `src/video.js`  
**Line:** 235  
**Severity:** HIGH

#### Description
The main ffmpeg command execution at line 235 is outside any try-catch block (only inside the outer try at line 60). If ffmpeg fails (invalid codec, missing input files, disk full), the error propagates but leaves the browser potentially open and temp files not cleaned up properly.

#### Code:
```javascript
// Inside try block starting at line 60
execSync(`"${ffmpegCmd}" ${args.map(escapeShellArg).join(' ')}`, {
  stdio: 'pipe'
});  // ❌ If this throws, error handling is okay BUT...

console.log(chalk.green('✅ Video saved:'), outputPath);

const stats = fs.statSync(outputPath);  // ❌ ...if execution reaches here but file wasn't created
```

#### Additional Issue
After successful ffmpeg execution, `fs.statSync(outputPath)` at line 242 could throw if the file wasn't created (race condition or ffmpeg bug).

#### Impact
- Partial cleanup on ffmpeg failure
- Potential secondary error from statSync if output file missing

#### Proposed Fix:
```javascript
// Build ffmpeg command safely
const args = [
  '-y',
  '-framerate', String(fps),
  '-i', path.join(framesDir, 'frame-%04d.png'),
  '-c:v', codec,
  '-pix_fmt', pixFmt,
  '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
  outputPath
];

try {
  execSync(`"${ffmpegCmd}" ${args.map(escapeShellArg).join(' ')}`, {
    stdio: 'pipe'
  });
} catch (error) {
  throw new Error(`Video compilation failed: ${error.message}`);
}

// Verify output file exists before stat
if (!fs.existsSync(outputPath)) {
  throw new Error('Video file was not created');
}

const stats = fs.statSync(outputPath);
```

---

## Medium Severity Bugs

### BUG-004: Silent glob Failures May Cause Incomplete Analysis
**File:** `src/diagram.js`  
**Lines:** 164-169  
**Severity:** MEDIUM

#### Description
When `glob()` throws an exception (invalid pattern, permission denied), the error is caught and only logged as a warning. The function continues with incomplete file list, potentially missing critical files in the analysis.

#### Code:
```javascript
for (const pattern of patterns) {
  if (!pattern || pattern.trim() === '') continue;
  try {
    const matches = await glob(pattern.trim(), { cwd: rootPath, absolute: true, ignore: exclude });
    files.push(...matches);
  } catch (e) {
    console.warn(chalk.yellow(`⚠️  Invalid pattern: ${pattern}`));  // ❌ Silently continues
  }
}
```

#### Impact
- User may not notice analysis is incomplete
- Architecture rules may pass incorrectly due to missing files
- No way to force strict mode (fail on any pattern error)

#### Proposed Fix:
```javascript
const strictMode = options.strict || process.env.DIAGRAM_STRICT === 'true';

for (const pattern of patterns) {
  if (!pattern || pattern.trim() === '') continue;
  try {
    const matches = await glob(pattern.trim(), { cwd: rootPath, absolute: true, ignore: exclude });
    files.push(...matches);
  } catch (e) {
    const message = `Invalid pattern: ${pattern} - ${e.message}`;
    if (strictMode) {
      throw new Error(message);
    }
    console.warn(chalk.yellow(`⚠️  ${message}`));
  }
}
```

---

### BUG-005: Temp File Cleanup Race Condition in diagram.js
**File:** `src/diagram.js`  
**Lines:** 564-566  
**Severity:** MEDIUM

#### Description
The temp file is written and then immediately unlinked after `execSync()`. If `execSync()` throws but the error is caught, the temp file cleanup at line 566 is skipped, leaving temp files behind.

#### Code:
```javascript
try {
  const tempFile = path.join(os.tmpdir(), `diagram-${Date.now()}.mmd`);
  const theme = (options.theme || 'default').toLowerCase();
  fs.writeFileSync(tempFile, `%%{init: {'theme': '${theme}'}}%%\n${mermaid}`);
  execSync(`npx -y @mermaid-js/mermaid-cli mmdc -i ${escapeShellArg(tempFile)} -o ${escapeShellArg(options.output)} -b transparent`, { stdio: 'pipe' });
  fs.unlinkSync(tempFile);  // ❌ Only runs if execSync succeeds
  console.log(chalk.green('✅ Rendered to'), options.output);
} catch (e) {
  console.log(chalk.yellow('⚠️  Could not render. Install mermaid-cli: npm i -g @mermaid-js/mermaid-cli'));
  // ❌ tempFile is never cleaned up on failure
}
```

#### Impact
- Temp files accumulate in `/tmp` when rendering fails
- Potential disk space issues with repeated failures

#### Proposed Fix:
```javascript
let tempFile;
try {
  tempFile = path.join(os.tmpdir(), `diagram-${Date.now()}.mmd`);
  const theme = (options.theme || 'default').toLowerCase();
  fs.writeFileSync(tempFile, `%%{init: {'theme': '${theme}'}}%%\n${mermaid}`);
  execSync(`npx -y @mermaid-js/mermaid-cli mmdc -i ${escapeShellArg(tempFile)} -o ${escapeShellArg(options.output)} -b transparent`, { stdio: 'pipe' });
  fs.unlinkSync(tempFile);
  tempFile = null;
  console.log(chalk.green('✅ Rendered to'), options.output);
} catch (e) {
  console.log(chalk.yellow('⚠️  Could not render. Install mermaid-cli: npm i -g @mermaid-js/mermaid-cli'));
} finally {
  // Ensure cleanup happens regardless of success/failure
  if (tempFile && fs.existsSync(tempFile)) {
    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupErr) {
      // Silent cleanup failure
    }
  }
}
```

---

## Low Severity Bugs

### BUG-006: Missing Error Handler for fs.rmSync Cleanup
**File:** `src/video.js`  
**Line:** 247  
**Severity:** LOW

#### Description
The `fs.rmSync()` call at line 247 to clean up temp directory is not wrapped in a try-catch. If the directory is locked or permissions change during execution, it could throw and mask the original error.

#### Code:
```javascript
// Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });  // ❌ Could throw

return { outputPath };
```

#### Impact
- If cleanup fails, the function throws instead of returning successfully
- Original operation may have succeeded but appears to fail
- User sees cleanup error instead of success message

#### Proposed Fix:
```javascript
// Cleanup
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (cleanupErr) {
  // Log but don't fail - the video was successfully created
  if (process.env.DEBUG) {
    console.warn(chalk.yellow('⚠️  Failed to clean up temp directory:'), tempDir);
  }
}

return { outputPath };
```

---

## Additional Observations

### Potential Memory Pressure in Frame Capture Loop
**File:** `src/video.js`  
**Lines:** 148-157

The frame capture loop takes screenshots sequentially but doesn't yield to the event loop. For long videos (60s at 60fps = 3600 frames), this could cause memory pressure. Consider adding `await new Promise(resolve => setImmediate(resolve))` every N frames.

### Browser Timeout Handling
**File:** `src/video.js`  
**Lines:** 129, 299

The browser launch timeouts (60000ms) are reasonable but the page.goto timeouts (30000ms) may not account for slow CDN loading of the mermaid library. Consider adding retry logic for network failures.

---

## Recommendations

1. **Enable strict mode for tests** - Add a `--strict` flag that fails on any file access errors
2. **Add cleanup wrappers** - Use a `withTempDir()` helper that guarantees cleanup
3. **Add process exit handlers** - Register `process.on('exit')` handlers to clean up temp files on unexpected termination
4. **Use async fs operations** - Consider migrating to `fs.promises` for better async flow control

---

## Testing Checklist

- [ ] Test video generation without ffmpeg installed (should give clear error)
- [ ] Test with invalid glob patterns in patterns list
- [ ] Test browser opening with invalid URL
- [ ] Test rendering with missing mermaid-cli
- [ ] Test with read-only temp directory
- [ ] Test with very long video duration (memory check)
