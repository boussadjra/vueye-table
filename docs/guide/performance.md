# Performance and scale

Virtualization bounds rendered rows and columns. It does not remove the cost of receiving,
indexing, filtering or sorting source data. Choose the loading strategy before the viewport.

| Work                 | Cost and tradeoff                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eager tree input     | Build indexes the loaded forest in O(n); source objects remain caller-owned.                                                                                      |
| Lazy children        | Reduces initial input, memory and network work. Expansion fetches children; selection and aggregation know loaded descendants unless the service supplies totals. |
| Tree filter/sort     | Filters loaded nodes and sorts siblings. Expansion reuses cached results.                                                                                         |
| Expansion            | A toggle updates the visible subtree; snapshot projection still scales with visible rows. Expand-all can expose every loaded node.                                |
| Virtual view         | Renders the window plus overscan and retained active/editor items. Trees are flattened before windowing; details also occupy layout space.                        |
| Flat unsorted append | Indexes/filters incoming rows, shares readonly chunks and lazily projects rows. Reading/copying the full data array remains O(n).                                 |
| Sorted append        | Sorts new matches and merges existing order. Upsert/removal, trees or query changes may rebuild stages.                                                           |
| Editing              | Parsing, validation and copy-on-write run for affected cells/paths. Pending records and projection add work; async network latency belongs to the application.    |

## Recorded development baselines

These are committed 7 October 2026 measurements, not new measurements from this docs change.
Machine: Windows x64, Intel Core Ultra 7 155H, 22 logical CPUs, 32 GiB RAM; Node 24.18.0,
pnpm 11.17.0, Vitest 4.1.10. Linked reports give samples, error margins, budgets and exclusions.

| Case                                          |      Recorded mean |
| --------------------------------------------- | -----------------: |
| Build 100k tree nodes, 3 / 10 levels          | 390.61 / 400.42 ms |
| Filter 100k tree nodes, 3 / 10 levels         |   44.32 / 68.05 ms |
| Single toggle, 100k tree nodes, 3 / 10 levels |   41.92 / 30.95 ms |
| Paste and validate 10k cells                  |          108.83 ms |
| Append 100 rows to 100k, unsorted / sorted    |    1.54 / 45.69 ms |

See [tree](/benchmarks/tree-data), [validation](/benchmarks/validation) and
[append](/benchmarks/streaming) reports. Short runs have few samples and substantial relative
error. These are review evidence, not cross-machine guarantees or CI latency assertions.
They exclude rendering and network work.

```sh
pnpm bench:tree
pnpm bench:validation
pnpm bench:streaming
```

Run serially on a quiet machine; distributions go under `test-results/`. Compare equivalent
fixtures and versions. Try the [100k-row example](/examples/virtual-components),
[lazy file explorer](/examples/file-explorer) and [editable tree](/examples/budget-tree).
Those demos do not establish a production capacity limit. See [virtualization](/guide/virtualization)
for custom measurement.
