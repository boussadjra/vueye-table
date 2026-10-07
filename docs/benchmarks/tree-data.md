# Tree benchmark baseline — 7 October 2026

Measured with `pnpm bench:tree` on Windows x64, Node 24.18.0, pnpm 11.17.0 and Vitest 4.1.10. Hardware: Intel Core Ultra 7 155H, 22 logical CPUs, 32 GiB RAM. Each forest uses flat adjacency data with stable numeric keys and chains of three or ten levels. Results include snapshot creation; they do not measure rendering or network requests.

| Nodes   | Levels | Build mean (ms) | Filter mean (ms) | Sort mean (ms) | Expand all + collapse mean (ms) | Single toggle mean (ms) |
| ------- | ------ | --------------- | ---------------- | -------------- | ------------------------------- | ----------------------- |
| 10,000  | 3      | 25.81           | 9.40             | 6.74           | 10.85                           | 2.82                    |
| 10,000  | 10     | 21.51           | 4.23             | 4.54           | 8.38                            | 0.74                    |
| 100,000 | 3      | 390.61          | 44.32            | 99.20          | 135.76                          | 41.92                   |
| 100,000 | 10     | 400.42          | 68.05            | 81.11          | 238.01                          | 30.95                   |

The 100,000-node review budgets for this machine are mean build ≤1,000 ms, filter ≤250 ms, sort ≤250 ms, expand-all/collapse ≤500 ms and a single toggle ≤100 ms. Every measured mean is within budget. These are review targets, not timing assertions in CI.

Large cases have few samples (three for build and expand-all/collapse). Build relative margins of error reach 171%; concurrent tool activity and garbage collection affect these short runs. Re-run on a quiet machine for regression comparisons rather than treating this as a precise cross-machine guarantee. The command records min/max, percentiles, sample counts and relative error in `test-results/tree-bench.json`.

Build creates a keyed forest in linear time. Filter and sibling sorting stay cached during expansion. A single toggle modifies the visible subtree; projecting the snapshot still scales with visible rows. Three-level input has more visible roots than ten-level input, which explains its higher collapsed-toggle cost. Full expansion includes every data row. These checks do not establish production readiness.
