# Contributing

I don't think this project is popular enough to attract any developers. However, in case I'm wrong, feel free to get in touch.

For now this section will simply focus on listing all essential steps required to setup dev env, and get it to build & run from sources.

## Workflow

### Requirements

* yarn - https://yarnpkg.com

### Initial setup

```sh
git clone https://github.com/Talv/sc2-layouts.git vscode-sc2-layout
cd vscode-sc2-layout
yarn install
```

__.gitignore'd stuff that might be essential__

`./sc2-data` <- https://github.com/SC2Mapster/SC2GameData

### Dev tasks

Compile `.ts` files and watch for changes

> `yarn run build:watch`

Run tests

> `yarn run test`

Index & cache sc2layout schema files. With a file-watcher re-running process on every change.\
`$SC2_LAYOUT_SCHEMA` <- https://github.com/SC2Mapster/sc2layout-schema

> `fd . $SC2_LAYOUT_SCHEMA/sc2layout -e xml | entr -s 'node out/src/bin/s2ldev.js cache $SC2_LAYOUT_SCHEMA/sc2layout test/fixtures/schema/sc-min.json'`

### Testing extension in VSCode

To run extension in VSC in dev mode, use configured profile in `launch.json`, named `Launch Extension`.

https://code.visualstudio.com/api/working-with-extensions/testing-extension - this might be helpful aswell. Although it focuses on running unit tests [1] within VSC. But it's enough to switch launch profile to default one, and other parts of tutorial should still apply.

---

> [1] Currently existing unit tests aren't dependant on VSC, and can be run directly in Node. Long term goal is to split this plugin to standalone library that will do only the backend stuff, and use LSP as communication layer.