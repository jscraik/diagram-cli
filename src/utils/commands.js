const os = require('os');
const path = require('path');

function getOpenCommand(url, platform = process.platform) {
  if (platform === 'darwin') {
    return { cmd: 'open', args: [url] };
  }
  if (platform === 'win32') {
    return { cmd: 'explorer.exe', args: [url] };
  }
  return { cmd: 'xdg-open', args: [url] };
}

function getNpxCommandCandidates(platform = process.platform) {
  if (platform === 'win32') {
    return ['npx.cmd', 'npx'];
  }
  return ['npx'];
}

function getFfmpegCommandCandidates(platform = process.platform, homeDir = os.homedir()) {
  const common = [
    'ffmpeg',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/opt/homebrew/opt/ffmpeg/bin/ffmpeg',
    path.join(homeDir, '.local/share/mise/installs/ffmpeg/current/bin/ffmpeg'),
    path.join(homeDir, '.local/share/mise/installs/ffmpeg/8.0.1/bin/ffmpeg')
  ];

  if (platform === 'win32') {
    return [
      'ffmpeg.exe',
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(homeDir, '.local/share/mise/installs/ffmpeg/current/bin/ffmpeg.exe'),
      path.join(homeDir, '.local/share/mise/installs/ffmpeg/8.0.1/bin/ffmpeg.exe'),
      ...common
    ];
  }

  return common;
}

module.exports = {
  getOpenCommand,
  getNpxCommandCandidates,
  getFfmpegCommandCandidates
};
