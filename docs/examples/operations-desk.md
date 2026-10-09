# Operations desk: a real consumer project

The [standalone warehouse app](https://github.com/boussadjra/vueye-table/tree/main/examples/operations-desk)
installs all six published npm packages at **3.0.0-beta.1** and runs a Nuxt server with SQLite. It exercises workflows that
the in-page demos cannot: persistent saves, concurrent revisions, actual HTTP cancellation and SSR
integration.

```sh
cd examples/operations-desk
pnpm install --frozen-lockfile
pnpm dev
# Open http://127.0.0.1:4310
```

Use Node 24.18.0 and pnpm 11.17.0. The generated local database contains 100,000 orders and 2,000
stock items. Inventory also offers a 100,000-row, 24-column virtual grid. Orders support cursor
loading and delayed/outage requests; locations load branches over HTTP; receiving consumes a real
NDJSON stream with multilingual notes.

The [project README](https://github.com/boussadjra/vueye-table/blob/main/examples/operations-desk/README.md)
explains running its isolated HTTP suite. Its
[acceptance matrix](https://github.com/boussadjra/vueye-table/blob/main/examples/operations-desk/ACCEPTANCE.md)
records the browser scenarios and known release gates. It is a local testing project with generated
data, not a production warehouse service.

Follow [the beta acceptance tracker](https://github.com/boussadjra/vueye-table/issues/114) for the
confirmed defects, their fix order, the corrected-alpha acceptance and published-beta retest.
