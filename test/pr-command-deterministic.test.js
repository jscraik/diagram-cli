const {
  normalizeListOption,
  compareStringsDeterministically,
  sortPrImpactResultDeterministically,
} = require("../src/workflow/pr-command");

describe("workflow pr deterministic helpers", () => {
  it("normalizes undefined list inputs before splitList", () => {
    const captured = [];
    const splitList = (value) => {
      captured.push(value);
      return value ? value.split(",") : [];
    };

    const result = normalizeListOption(undefined, splitList);
    expect(result).to.deep.equal([]);
    expect(captured).to.deep.equal([""]);
  });

  it("uses deterministic code-point string comparison", () => {
    expect(compareStringsDeterministically("b", "a")).to.equal(1);
    expect(compareStringsDeterministically("a", "b")).to.equal(-1);
    expect(compareStringsDeterministically("a", "a")).to.equal(0);
  });

  it("sorts PR impact fields deterministically without mutating duration", () => {
    const result = {
      changedFiles: ["z.js", "a.js"],
      renamedFiles: [
        { from: "src/z.js", to: "src/a.js" },
        { from: "src/a.js", to: "src/z.js" },
        { from: "src/a.js", to: "src/a.js" },
      ],
      deletedFiles: ["z-del.js", "a-del.js"],
      addedFiles: ["z-add.js", "a-add.js"],
      unmodeledChanges: ["z-unmodeled", "a-unmodeled"],
      changedComponents: [
        {
          filePath: "src/z.js",
          dependenciesAdded: ["z-dep", "a-dep"],
          dependenciesRemoved: ["z-rm", "a-rm"],
          roleTagsAdded: ["z-role", "a-role"],
          roleTagsRemoved: ["z-old", "a-old"],
          roleTags: ["z-tag", "a-tag"],
        },
        {
          filePath: "src/a.js",
          dependenciesAdded: ["z2", "a2"],
          dependenciesRemoved: ["z2-rm", "a2-rm"],
          roleTagsAdded: ["z2-role", "a2-role"],
          roleTagsRemoved: ["z2-old", "a2-old"],
          roleTags: ["z2-tag", "a2-tag"],
        },
      ],
      dependencyEdgeDelta: {
        added: ["z-edge", "a-edge"],
        removed: ["z-edge-rm", "a-edge-rm"],
      },
      blastRadius: {
        impactedComponents: ["z-impact", "a-impact"],
      },
      risk: {
        flags: ["z-flag", "a-flag"],
      },
      agentSummary: {
        riskReasons: ["z-reason", "a-reason"],
      },
      _meta: {
        durationMs: 1234,
      },
    };

    sortPrImpactResultDeterministically(result);

    expect(result.changedFiles).to.deep.equal(["a.js", "z.js"]);
    expect(result.renamedFiles.map((item) => `${item.from}|${item.to}`)).to.deep.equal([
      "src/a.js|src/a.js",
      "src/a.js|src/z.js",
      "src/z.js|src/a.js",
    ]);
    expect(result.changedComponents.map((item) => item.filePath)).to.deep.equal(["src/a.js", "src/z.js"]);
    expect(result.changedComponents[0].dependenciesAdded).to.deep.equal(["a2", "z2"]);
    expect(result.changedComponents[1].roleTags).to.deep.equal(["a-tag", "z-tag"]);
    expect(result.dependencyEdgeDelta.added).to.deep.equal(["a-edge", "z-edge"]);
    expect(result.blastRadius.impactedComponents).to.deep.equal(["a-impact", "z-impact"]);
    expect(result.risk.flags).to.deep.equal(["a-flag", "z-flag"]);
    expect(result.agentSummary.riskReasons).to.deep.equal(["a-reason", "z-reason"]);
    expect(result._meta.durationMs).to.equal(1234);
  });
});
