# Flat append benchmark baseline — 7 October 2026

`pnpm bench:streaming` measures appending 100 source rows to 10k/100k existing rows, including a new snapshot and readonly data publication. Every sample starts with a fresh table and warmed indexing/filtering/sorting, prepared outside the timed operation. Default pagination reads the first page; no full data materialization, local pending edits, expanded details, trees, rendering or network work is included.

The Windows x64 development machine uses Node 24.18.0, pnpm 11.17.0 and Vitest 4.1.10, with an Intel Core Ultra 7 155H, 22 logical CPUs and 32 GiB RAM.

| Existing rows | Order    | Mean (ms) | Observed p99 (ms) | Samples | Relative margin of error |
| ------------- | -------- | --------: | ----------------: | ------: | -----------------------: |
| 10,000        | Unsorted |    0.2850 |            0.6761 |      71 |                   ±8.98% |
| 10,000        | Sorted   |    3.8732 |            5.8721 |       6 |                  ±28.81% |
| 100,000       | Unsorted |    1.5428 |           12.6739 |      13 |                 ±134.24% |
| 100,000       | Sorted   |   45.6865 |           52.5927 |       5 |                  ±19.03% |

Review budgets on this machine are unsorted mean ≤5 ms / observed p99 ≤25 ms, and sorted mean ≤100 ms / observed p99 ≤200 ms. Recorded values meet those targets. This short development run includes a large unsorted outlier at 100k and few sorted samples; relative error limits precision, so it does not establish a timing scaling law or a cross-machine guarantee. Re-run on a quiet machine before making comparisons. Distributions are saved in `test-results/streaming-bench.json`.

Unit tests separately count key/filter calls to prove that flat append only indexes and filters new rows and that paging reuses those results. Unsorted lists share chunks and project rows lazily; full array reading/copying remains O(n). Sorted append merges old rows with sorted incoming matches. Hierarchical rebuilding, upsert/removal, query/column changes, pending-metadata projection and expanded detail enumeration retain their documented costs. These budgets are review evidence, not CI timing assertions.
