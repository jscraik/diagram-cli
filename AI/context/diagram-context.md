# Diagram Context Pack

Generated: 2026-02-27T23:03:57Z

## Agent-first index

| Diagram | Type | Path | Summary |
| --- | --- | --- | --- |
| architecture | module-graph | AI/diagrams/architecture.mmd | Module-level architecture graph showing repository structure and dependency direction. |
| class | class-model | AI/diagrams/class.mmd | Class/module model for the principal command and rule objects. |
| dependency | module-graph | AI/diagrams/dependency.mmd | Dependency map showing external packages and internal import boundaries. |
| flow | module-graph | AI/diagrams/flow.mmd | Command flow across major phases in the diagram CLI pipeline. |
| sequence | sequence-flow | AI/diagrams/sequence.mmd | Execution sequence for the current CLI surface and dependencies. |

## Detailed diagrams

## architecture

- Type: module-graph
- Path: AI/diagrams/architecture.mmd
- Summary: Module-level architecture graph showing repository structure and dependency direction.

```mermaid
graph TD
  subgraph src_25a66342["src"]
    video_0cab1c96["video"]
    rules_6c621d1a["rules"]
    graph_eef93e1d["graph"]
    diagram_2c20a6b0["diagram"]
  end
  subgraph scripts_8c5967fd["scripts"]
    deep_regression_4f028409["deep-regression"]
  end
  subgraph src_schema_1bffb211["src/schema"]
    rules_schema_1b0ae367["rules-schema"]
  end
  subgraph src_utils_0f13bc3a["src/utils"]
    commands_10f5f77e["commands"]
  end
  subgraph src_rules_03243834["src/rules"]
    factory_06c8aaa9["factory"]
  end
  subgraph src_formatters_8f43a42a["src/formatters"]
    junit_018bb207["junit"]
    json_02bd175f["json"]
    index_1bc04b52["index"]
    console_93d8874c["console"]
  end
  subgraph src_rules_types_aab1b408["src/rules/types"]
    import_rule_641ce46a["import-rule"]
    base_cae66217["base"]
  end
  video_0cab1c96 --> commands_10f5f77e
  rules_6c621d1a --> factory_06c8aaa9
  rules_6c621d1a --> graph_eef93e1d
  diagram_2c20a6b0 --> commands_10f5f77e
  diagram_2c20a6b0 --> video_0cab1c96
  diagram_2c20a6b0 --> rules_6c621d1a
  diagram_2c20a6b0 --> graph_eef93e1d
  diagram_2c20a6b0 --> factory_06c8aaa9
  diagram_2c20a6b0 --> index_1bc04b52
  diagram_2c20a6b0 --> rules_schema_1b0ae367
  deep_regression_4f028409 --> commands_10f5f77e
  factory_06c8aaa9 --> import_rule_641ce46a
  index_1bc04b52 --> console_93d8874c
  index_1bc04b52 --> json_02bd175f
  index_1bc04b52 --> junit_018bb207
  import_rule_641ce46a --> base_cae66217
  style index_1bc04b52 fill:#4f46e5,color:#fff
```

## class

- Type: class-model
- Path: AI/diagrams/class.mmd
- Summary: Class/module model for the principal command and rule objects.

```mermaid
classDiagram
  class diagram_2c20a6b0 {
    +src/diagram.js
  }
  class import_rule_641ce46a {
    +src/rules/types/import-rule.js
  }
```

## dependency

- Type: module-graph
- Path: AI/diagrams/dependency.mmd
- Summary: Dependency map showing external packages and internal import boundaries.

```mermaid
graph LR
  playwright_7827e8eb["playwright"] --> video_0cab1c96
  fs_dce7cce0["fs"] --> video_0cab1c96
  path_a0af9f86["path"] --> video_0cab1c96
  os_840a8dcf["os"] --> video_0cab1c96
  crypto_da2f073e["crypto"] --> video_0cab1c96
  child_process_f2d8255a["child_process"] --> video_0cab1c96
  url_28e5ebab["url"] --> video_0cab1c96
  chalk_c886ff11["chalk"] --> video_0cab1c96
  video_0cab1c96 --> commands_10f5f77e
  yaml_9831daaa["yaml"] --> rules_6c621d1a
  fs_dce7cce0["fs"] --> rules_6c621d1a
  path_a0af9f86["path"] --> rules_6c621d1a
  picomatch_0bf97c7b["picomatch"] --> rules_6c621d1a
  rules_6c621d1a --> factory_06c8aaa9
  rules_6c621d1a --> graph_eef93e1d
  commander_fc2dff6a["commander"] --> diagram_2c20a6b0
  fs_dce7cce0["fs"] --> diagram_2c20a6b0
  path_a0af9f86["path"] --> diagram_2c20a6b0
  glob_28c2dec1["glob"] --> diagram_2c20a6b0
  chalk_c886ff11["chalk"] --> diagram_2c20a6b0
  child_process_f2d8255a["child_process"] --> diagram_2c20a6b0
  os_840a8dcf["os"] --> diagram_2c20a6b0
  crypto_da2f073e["crypto"] --> diagram_2c20a6b0
  zlib_0ea55c28["zlib"] --> diagram_2c20a6b0
  diagram_2c20a6b0 --> commands_10f5f77e
  diagram_2c20a6b0 --> video_0cab1c96
  diagram_2c20a6b0 --> rules_6c621d1a
  diagram_2c20a6b0 --> graph_eef93e1d
  diagram_2c20a6b0 --> factory_06c8aaa9
  diagram_2c20a6b0 --> index_1bc04b52
  diagram_2c20a6b0 --> rules_schema_1b0ae367
  yaml_9831daaa["yaml"] --> diagram_2c20a6b0
  assert_25450689["assert"] --> deep_regression_4f028409
  fs_dce7cce0["fs"] --> deep_regression_4f028409
  os_840a8dcf["os"] --> deep_regression_4f028409
  path_a0af9f86["path"] --> deep_regression_4f028409
  child_process_f2d8255a["child_process"] --> deep_regression_4f028409
  deep_regression_4f028409 --> commands_10f5f77e
  zod_4f63cf5c["zod"] --> rules_schema_1b0ae367
  os_840a8dcf["os"] --> commands_10f5f77e
  path_a0af9f86["path"] --> commands_10f5f77e
  factory_06c8aaa9 --> import_rule_641ce46a
  fs_dce7cce0["fs"] --> junit_018bb207
  path_a0af9f86["path"] --> junit_018bb207
  fs_dce7cce0["fs"] --> json_02bd175f
  path_a0af9f86["path"] --> json_02bd175f
  index_1bc04b52 --> console_93d8874c
  index_1bc04b52 --> json_02bd175f
  index_1bc04b52 --> junit_018bb207
  chalk_c886ff11["chalk"] --> console_93d8874c
  import_rule_641ce46a --> base_cae66217
  path_a0af9f86["path"] --> import_rule_641ce46a
  picomatch_0bf97c7b["picomatch"] --> import_rule_641ce46a
  style playwright_7827e8eb fill:#f59e0b,color:#fff
  style fs_dce7cce0 fill:#f59e0b,color:#fff
  style path_a0af9f86 fill:#f59e0b,color:#fff
  style os_840a8dcf fill:#f59e0b,color:#fff
  style crypto_da2f073e fill:#f59e0b,color:#fff
  style child_process_f2d8255a fill:#f59e0b,color:#fff
  style url_28e5ebab fill:#f59e0b,color:#fff
  style chalk_c886ff11 fill:#f59e0b,color:#fff
  style yaml_9831daaa fill:#f59e0b,color:#fff
  style picomatch_0bf97c7b fill:#f59e0b,color:#fff
  style commander_fc2dff6a fill:#f59e0b,color:#fff
  style glob_28c2dec1 fill:#f59e0b,color:#fff
  style zlib_0ea55c28 fill:#f59e0b,color:#fff
  style assert_25450689 fill:#f59e0b,color:#fff
  style zod_4f63cf5c fill:#f59e0b,color:#fff
```

## flow

- Type: module-graph
- Path: AI/diagrams/flow.mmd
- Summary: Command flow across major phases in the diagram CLI pipeline.

```mermaid
flowchart TD
  Start(["Start"])
  video_0cab1c96["video"]
  Start --> video_0cab1c96
  rules_6c621d1a["rules"]
  video_0cab1c96 --> rules_6c621d1a
  graph_eef93e1d["graph"]
  rules_6c621d1a --> graph_eef93e1d
  diagram_2c20a6b0["diagram"]
  graph_eef93e1d --> diagram_2c20a6b0
  deep_regression_4f028409["deep-regression"]
  diagram_2c20a6b0 --> deep_regression_4f028409
  rules_schema_1b0ae367["rules-schema"]
  deep_regression_4f028409 --> rules_schema_1b0ae367
  commands_10f5f77e["commands"]
  rules_schema_1b0ae367 --> commands_10f5f77e
  factory_06c8aaa9["factory"]
  commands_10f5f77e --> factory_06c8aaa9
  End(["End"])
  factory_06c8aaa9 --> End
```

## sequence

- Type: sequence-flow
- Path: AI/diagrams/sequence.mmd
- Summary: Execution sequence for the current CLI surface and dependencies.

```mermaid
sequenceDiagram
  participant index_1bc04b52 as index
```

