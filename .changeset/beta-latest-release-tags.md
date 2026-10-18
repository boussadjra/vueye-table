---
"@vueye-table/core": patch
"@vueye-table/vue": patch
"@vueye-table/headless": patch
"@vueye-table/styled": patch
"vueye-table": patch
"@vueye-table/nuxt": patch
---

Publish each beta on both the `beta` and `latest` npm channels so default installs receive the
current beta across all six packages. Repair missing or outdated release tags when the publisher
is re-run, without republishing versions that already exist. An explicit `--tag` updates only
that channel. Trusted publishing for tag updates requires npm 11.21.0 or newer and **Allow npm
dist-tag** enabled for each package's trusted publisher.
