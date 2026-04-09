const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const YAML = require('yaml');
const { getDefaultConfig } = require('../schema/rules-schema');
const { resolveRootPathOrExit } = require('./shared');

const DEFAULT_DIAGRAMRC = Object.freeze({
  patterns: '**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.go,**/*.rs',
  exclude: 'node_modules/**,.git/**,dist/**,build/**',
  maxFiles: 500,
  theme: 'default',
});

const DEFAULT_CI_STEP = `# Sample GitHub Actions steps for diagram-cli
- name: Install dependencies
  run: npm ci

- name: Install diagram CLI
  run: npm install --no-save @brainwav/diagram

- name: Validate architecture rules
  run: npx --no-install diagram validate .

- name: Generate compact architecture artifacts
  run: npx --no-install diagram generate-all . --output-dir .diagram --artifact-profile agent

- name: Refresh AI context pack
  run: npx --no-install diagram context .

- name: Upload diagram artifacts
  uses: actions/upload-artifact@v4
  with:
    name: diagram-artifacts
    path: .diagram
`;

function writeFileSafely(filePath, content, force) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { flag: force ? 'w' : 'wx' });
}

function registerInitCommand(program) {
  program
    .command('init [path]')
    .description('Bootstrap architecture policy + diagram defaults + CI sample step')
    .option('--force', 'Overwrite existing generated files', false)
    .action((targetPath, options) => {
      const root = resolveRootPathOrExit(targetPath);
      const architecturePath = path.join(root, '.architecture.yml');
      const diagramRcPath = path.join(root, '.diagramrc');
      const ciSamplePath = path.join(root, '.diagram', 'ci', 'github-actions-step.yml');

      // Preflight: check all targets if force is not set
      if (!options.force) {
        const existingFiles = [];
        if (fs.existsSync(architecturePath)) existingFiles.push(architecturePath);
        if (fs.existsSync(diagramRcPath)) existingFiles.push(diagramRcPath);
        if (fs.existsSync(ciSamplePath)) existingFiles.push(ciSamplePath);

        if (existingFiles.length > 0) {
          console.error(chalk.red('❌ Initialization blocked: one or more files already exist.'));
          existingFiles.forEach(file => console.error(chalk.gray(`   - ${file}`)));
          console.error(chalk.gray('Fix: rerun with `diagram init . --force` to overwrite generated starter files.'));
          process.exit(2);
        }
      }

      try {
        writeFileSafely(
          architecturePath,
          YAML.stringify(getDefaultConfig(), { indent: 2, lineWidth: 0 }),
          options.force
        );
        writeFileSafely(
          diagramRcPath,
          `${JSON.stringify(DEFAULT_DIAGRAMRC, null, 2)}\n`,
          options.force
        );
        writeFileSafely(ciSamplePath, DEFAULT_CI_STEP, options.force);
      } catch (error) {
        if (error.code === 'EEXIST') {
          console.error(chalk.red('❌ Initialization blocked: one or more files already exist.'));
          console.error(chalk.gray('Fix: rerun with `diagram init . --force` to overwrite generated starter files.'));
          process.exit(2);
        }
        throw error;
      }

      console.log(chalk.green('✅ diagram init complete'));
      console.log(chalk.gray(`  Created: ${architecturePath}`));
      console.log(chalk.gray(`  Created: ${diagramRcPath}`));
      console.log(chalk.gray(`  Created: ${ciSamplePath}`));
      console.log(chalk.cyan('\nNext steps:'));
      console.log('  1) Edit `.architecture.yml` to match your real layer boundaries.');
      console.log('  2) Run `diagram validate .` and commit passing rules.');
      console.log('  3) Copy `.diagram/ci/github-actions-step.yml` into your workflow YAML.');
    });
}

module.exports = {
  registerInitCommand,
};
