# Grouping benchmark baseline — 29 October 2026

`pnpm bench:grouping` measures 10k and 100k flat rows grouped into 100 regions and 20 teams per
region. A sum aggregate reads the amount column. Pagination shows five root groups: 500 leaves
at 10k, and 5,000 leaves at 100k. Initial grouping includes table creation, indexing, buckets,
aggregates and the first snapshot. Cached expansion measures collapse and expand plus both
snapshots. Append measures 100 incoming rows plus a new snapshot. Fresh warmed tables are prepared
outside each cached-expansion/append sample. No DOM, network, pending edits or sorting is included.

The Windows x64 development machine uses Node 24.22.1, pnpm 11.17.0 and Vitest 4.1.11, with an
Intel Core Ultra 7 155H, 22 logical CPUs and 32 GiB RAM.

| Rows    | Operation                     | Mean (ms) | Observed p99 (ms) | Samples | Relative margin of error |
| ------- | ----------------------------- | --------: | ----------------: | ------: | -----------------------: |
| 10,000  | Initial grouping and snapshot |   56.4091 |           64.2716 |       5 |                  ±16.66% |
| 10,000  | Cached collapse and expand    |    2.3370 |            3.1602 |       9 |                  ±14.17% |
| 10,000  | Append 100 rows and snapshot  |   57.0552 |           90.8337 |       5 |                  ±52.24% |
| 100,000 | Initial grouping and snapshot |    419.73 |            457.40 |       5 |                  ±12.97% |
| 100,000 | Cached collapse and expand    |   17.7779 |           18.8150 |       5 |                   ±7.85% |
| 100,000 | Append 100 rows and snapshot  |    198.45 |            220.62 |       5 |                  ±12.61% |

Review budgets for this machine are:

| Rows    | Initial mean / observed p99 | Cached expansion mean / observed p99 | Append mean / observed p99 |
| ------- | --------------------------- | ------------------------------------ | -------------------------- |
| 10,000  | ≤100 / 150 ms               | ≤10 / 20 ms                          | ≤100 / 150 ms              |
| 100,000 | ≤600 / 900 ms               | ≤30 / 60 ms                          | ≤300 / 500 ms              |

This run meets those budgets. The short samples and the 10k append variance limit precision;
observed p99 is effectively a sample maximum here, not a reliable tail-latency estimate. Results
are a development baseline, not cross-machine guarantees or CI timing assertions. The report is
saved in `test-results/grouping-bench.json`.

Tests count bucket and aggregate callbacks separately: expansion, selection, widths and paging
do not regroup; append/upsert/removal run aggregates only on affected group paths. Membership
scanning still scales with the filtered/sorted input. Cached expansion traverses visible entries;
the larger benchmark exposes ten times as many visible leaves. Full exports, all-row selection,
query changes and sorting have their own input-sized work.
