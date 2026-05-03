const { expect } = require('chai');
const fs = require('node:fs');
const path = require('node:path');

describe('refresh diagram context script', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'refresh-diagram-context.sh');

  it('uses deterministic generation and separates volatile refresh state', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).to.include('--check)');
    expect(script).to.include('--deterministic');
    expect(script).to.include('CONTEXT_DETERMINISTIC=1');
    expect(script).to.include('refresh-state.local.json');
    expect(script).to.include('del(.rootPath)');
    expect(script).to.include('copy_if_changed');
  });
});
