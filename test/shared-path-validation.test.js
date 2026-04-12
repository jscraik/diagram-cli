const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  resolvePathViaExistingAncestor,
  validateOutputPath,
} = require("../src/commands/shared");

describe("shared path validation", () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "diagram-path-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("resolves nested non-existent paths via the nearest existing ancestor", () => {
    const projectRoot = path.join(tempRoot, "project");
    fs.mkdirSync(projectRoot);
    const canonicalProjectRoot = fs.realpathSync(projectRoot);

    const resolved = validateOutputPath("out/nested/report", projectRoot);
    expect(resolved).to.equal(path.join(canonicalProjectRoot, "out", "nested", "report"));
  });

  it("canonicalizes symlinked ancestors in resolver and output validation", () => {
    const realRoot = path.join(tempRoot, "real-root");
    const linkedRoot = path.join(tempRoot, "linked-root");
    fs.mkdirSync(realRoot);
    fs.symlinkSync(realRoot, linkedRoot);
    const canonicalRealRoot = fs.realpathSync(realRoot);

    const viaResolver = resolvePathViaExistingAncestor(path.join(linkedRoot, "build", "artifacts"));
    expect(viaResolver.startsWith(canonicalRealRoot)).to.equal(true);

    const validated = validateOutputPath("build/artifacts", linkedRoot);
    expect(validated.startsWith(canonicalRealRoot)).to.equal(true);
  });

  it("rejects traversal for both relative and absolute output paths", () => {
    const projectRoot = path.join(tempRoot, "project");
    const outside = path.join(tempRoot, "outside");
    fs.mkdirSync(projectRoot);
    fs.mkdirSync(outside);

    expect(() => validateOutputPath("../outside", projectRoot)).to.throw("directory traversal");
    expect(() => validateOutputPath(outside, projectRoot)).to.throw("directory traversal");
  });

  it("rejects null bytes before root canonicalization is attempted", () => {
    const projectRoot = path.join(tempRoot, "project");
    fs.mkdirSync(projectRoot);

    const originalRealpathSync = fs.realpathSync;
    let called = false;
    fs.realpathSync = (...args) => {
      called = true;
      return originalRealpathSync(...args);
    };

    try {
      expect(() => validateOutputPath("bad\0path", projectRoot)).to.throw("null bytes detected");
      expect(called).to.equal(false);
    } finally {
      fs.realpathSync = originalRealpathSync;
    }
  });

  it("fails gracefully when output path resolves to filesystem root", () => {
    const projectRoot = path.join(tempRoot, "project");
    fs.mkdirSync(projectRoot);

    expect(() => validateOutputPath(path.parse(projectRoot).root, projectRoot)).to.throw(
      "directory traversal"
    );
  });
});
