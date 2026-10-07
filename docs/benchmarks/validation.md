# Validation benchmark baseline — 7 October 2026

`pnpm bench:validation` measures a 10,000-cell paste with parsing, inclusive editor bounds, synchronous cell validation, pending-change recording, snapshot projection and baseline reset. One numeric column alternates two valid values over 10,000 rows, with pagination disabled. Undo retention is disabled for the repeated timing run; undo behavior is verified separately in the test suite.

The Windows x64 development machine uses Node 24.18.0, pnpm 11.17.0 and Vitest 4.1.10, with an Intel Core Ultra 7 155H, 22 logical CPUs and 32 GiB RAM.

| Cells  | Mean (ms) | Minimum (ms) | Maximum / observed p99 (ms) | Samples | Relative margin of error |
| ------ | --------: | -----------: | --------------------------: | ------: | -----------------------: |
| 10,000 |    108.83 |        62.20 |                      184.61 |      10 |                  ±23.29% |

Review budgets on this machine are mean ≤250 ms and observed p99 ≤500 ms. Both measured targets pass. This is a short development baseline with few samples, not a CI timing assertion or a cross-machine latency guarantee. Re-run on a quiet machine for comparisons. The command saves distributions in `test-results/validation-bench.json`; rendering, network calls and async validator work are excluded.
