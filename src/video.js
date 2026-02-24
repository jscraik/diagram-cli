const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Escape HTML to prevent injection
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Safe shell argument escaping
function escapeShellArg(arg) {
  if (process.platform === 'win32') {
    return `"${arg.replace(/"/g, '""')}"`;
  }
  if (arg.includes("'")) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return `'${arg}'`;
}

async function generateVideo(mermaidCode, outputPath, options = {}) {
  const {
    duration = 5,
    fps = 30,
    width = 1280,
    height = 720,
    theme = 'dark'
  } = options;

  // Validate inputs
  if (duration < 1 || duration > 60) {
    throw new Error('Duration must be between 1 and 60 seconds');
  }
  if (fps < 1 || fps > 60) {
    throw new Error('FPS must be between 1 and 60');
  }
  if (width < 100 || width > 3840) {
    throw new Error('Width must be between 100 and 3840');
  }
  if (height < 100 || height > 2160) {
    throw new Error('Height must be between 100 and 2160');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-video-'));
  const framesDir = path.join(tempDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  let browser = null;
  let tempFiles = [tempDir];

  try {
    console.log(chalk.blue('🎬 Starting video generation...'));
    console.log(chalk.gray(`   Resolution: ${width}x${height}`));
    console.log(chalk.gray(`   Duration: ${duration}s @ ${fps}fps`));

    // Create HTML page with mermaid (escaped to prevent XSS)
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      background: ${theme === 'dark' ? '#1a1a2e' : '#ffffff'};
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #diagram {
      opacity: 0;
      transform: scale(0.95);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    #diagram.ready {
      opacity: 1;
      transform: scale(1);
    }
    .mermaid {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .loading {
      color: ${theme === 'dark' ? '#fff' : '#333'};
      font-size: 18px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">Generating diagram...</div>
  <div id="diagram" class="mermaid">
${escapeHtml(mermaidCode)}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${theme}',
      securityLevel: 'loose'
    });
    
    // Fade in when ready
    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('diagram').classList.add('ready');
    }, 500);
  </script>
</body>
</html>`;

    const htmlPath = path.join(tempDir, 'diagram.html');
    fs.writeFileSync(htmlPath, htmlContent);
    tempFiles.push(htmlPath);

    // Launch browser with timeout
    console.log(chalk.blue('🌐 Launching browser...'));
    browser = await chromium.launch({ timeout: 60000 });
    const page = await browser.newPage({
      viewport: { width, height }
    });

    // Handle Windows paths correctly
    const fileUrl = 'file://' + (process.platform === 'win32' ? '/' : '') + htmlPath.replace(/\\/g, '/');
    await page.goto(fileUrl, { timeout: 30000 });

    // Wait for mermaid to render
    await page.waitForSelector('#diagram.ready', { timeout: 30000 });
    
    // Additional wait for SVG to be fully rendered
    await page.waitForTimeout(1000);

    console.log(chalk.blue('📸 Capturing frames...'));
    
    const totalFrames = duration * fps;
    
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(framesDir, `frame-${String(i).padStart(4, '0')}.png`);
      await page.screenshot({ path: framePath, type: 'png' });
      
      // Progress indicator
      if (i % fps === 0 || i === totalFrames - 1) {
        const progress = Math.round(((i + 1) / totalFrames) * 100);
        process.stdout.write(`\r   ${progress}% (${i + 1}/${totalFrames} frames)`);
      }
    }
    
    console.log(''); // New line after progress
    await browser.close();
    browser = null;

    // Compile video with ffmpeg
    console.log(chalk.blue('🎞️  Compiling video...'));
    
    const ext = path.extname(outputPath).toLowerCase();
    // Auto-detect available codec
    let codec = 'libx264';
    try {
      // Check if libx264 is available
      execSync(`"${ffmpegCmd}" -encoders | grep libx264`, { stdio: 'pipe' });
    } catch (e) {
      // Try hardware encoders
      try {
        execSync(`"${ffmpegCmd}" -encoders | grep h264_videotoolbox`, { stdio: 'pipe' });
        codec = 'h264_videotoolbox';
      } catch (e2) {
        // Fall back to mpeg4 which is usually available
        codec = 'mpeg4';
      }
    }
    
    if (ext === '.webm') {
      codec = 'libvpx-vp9';
    }
    
    const pixFmt = 'yuv420p';
    
    // Find ffmpeg
    let ffmpegCmd = 'ffmpeg';
    try {
      execSync('which ffmpeg', { stdio: 'pipe' });
    } catch (e) {
      // Try common paths
      const possiblePaths = [
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/opt/homebrew/bin/ffmpeg',
        '/opt/homebrew/opt/ffmpeg/bin/ffmpeg',
        path.join(os.homedir(), '.local/share/mise/installs/ffmpeg/current/bin/ffmpeg'),
        path.join(os.homedir(), '.local/share/mise/installs/ffmpeg/8.0.1/bin/ffmpeg')
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          ffmpegCmd = p;
          break;
        }
      }
    }
    
    // Verify ffmpeg exists
    try {
      execSync(`"${ffmpegCmd}" -version`, { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`ffmpeg not found. Install with: brew install ffmpeg (Mac) or apt install ffmpeg (Linux)`);
    }
    
    // Build ffmpeg command safely
    const args = [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(framesDir, 'frame-%04d.png'),
      '-c:v', codec,
      '-pix_fmt', pixFmt
    ];
    
    // Skip -crf for newer ffmpeg versions that don't support it
    // Use -b:v instead for bitrate control if needed
    
    // Add resolution filter for compatibility
    args.push('-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
    
    args.push(outputPath);
    
    execSync(`"${ffmpegCmd}" ${args.map(escapeShellArg).join(' ')}`, {
      stdio: 'pipe'
    });
    
    console.log(chalk.green('✅ Video saved:'), outputPath);
    
    // Get file size
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(chalk.gray(`   Size: ${sizeMB} MB`));
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return { outputPath };
    
  } catch (error) {
    // Cleanup on error
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    
    // Don't delete temp dir on error so user can debug
    console.log(chalk.yellow('⚠️  Error occurred. Temp files kept at:'), tempDir);
    
    throw error;
  }
}

async function generateAnimatedSVG(mermaidCode, outputPath, options = {}) {
  const { theme = 'dark' } = options;
  
  console.log(chalk.blue('✨ Generating animated SVG...'));
  
  // Escape the mermaid code for HTML
  const escapedCode = escapeHtml(mermaidCode);
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { margin: 0; background: transparent; }
  </style>
</head>
<body>
  <div class="mermaid">
${escapedCode}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${theme}',
      securityLevel: 'loose'
    });
  </script>
</body>
</html>`;

  let browser = null;
  let tempFile = null;
  
  try {
    browser = await chromium.launch({ timeout: 60000 });
    const page = await browser.newPage();
    
    tempFile = path.join(os.tmpdir(), `diagram-${Date.now()}.html`);
    fs.writeFileSync(tempFile, htmlContent);
    
    const fileUrl = 'file://' + (process.platform === 'win32' ? '/' : '') + tempFile.replace(/\\/g, '/');
    await page.goto(fileUrl, { timeout: 30000 });
    await page.waitForSelector('.mermaid svg', { timeout: 30000 });
    await page.waitForTimeout(500);
    
    // Extract SVG and add animation
    const svgContent = await page.evaluate(() => {
      const svg = document.querySelector('.mermaid svg');
      if (!svg) return null;
      
      // Add CSS animation
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      const nodes = document.querySelectorAll('.node');
      const edges = document.querySelectorAll('.edgePath');
      
      let css = `
        .node { 
          opacity: 0; 
          animation: fadeIn 0.5s ease forwards;
        }
        .edgePath { 
          opacity: 0; 
          animation: fadeIn 0.3s ease forwards;
        }
      `;
      
      for (let i = 0; i < nodes.length; i++) {
        css += `.node:nth-of-type(${i + 1}) { animation-delay: ${i * 0.1}s; }\n`;
      }
      for (let i = 0; i < edges.length; i++) {
        css += `.edgePath:nth-of-type(${i + 1}) { animation-delay: ${(i + 1) * 0.15}s; }\n`;
      }
      
      css += `
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `;
      
      style.textContent = css;
      svg.appendChild(style);
      
      return svg.outerHTML;
    });
    
    await browser.close();
    browser = null;
    
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    if (svgContent) {
      fs.writeFileSync(outputPath, svgContent);
      console.log(chalk.green('✅ Animated SVG saved:'), outputPath);
    } else {
      throw new Error('Failed to generate SVG - no SVG element found');
    }
    
    return { outputPath };
    
  } catch (error) {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
    throw error;
  }
}

module.exports = { generateVideo, generateAnimatedSVG };
