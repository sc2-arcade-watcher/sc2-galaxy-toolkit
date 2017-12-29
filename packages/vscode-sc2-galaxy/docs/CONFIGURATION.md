## Configuration

### General

```js
{
    // Allows providing external directories when looking up for dependencies.
    // It is good to put path to SC2 directory here.
    // - CASC and MPQ archives are not supported.
    // - Usually dependency links are prefixed with `mods/`.
    // - The extension itself is being shipped with default SC2 mods (they're stripped from irrevelant files, also only *enUS* localization is included).
    "sc2galaxy.s2mod.sources": [
        "c:\\SC2"
    ],

    // Allows overriding dependency links for local workspace. As well as forcing indexing of extra ones.
    // "archive link": "absolute path"
    "sc2galaxy.s2mod.overrides": {
        "mods/core.sc2mod": "c:\\stuff\\core.SC2Mod"
    },
    "sc2galaxy.s2mod.extra": {
        "mods/liberty.sc2mod": "c:\\stuff\\liberty.SC2Mod"
    },

    // Which localizations files to index.
    // Currently it affects only *gamelinks* hints - *Units* etc.
    // TriggersStrings are hardcoded to *enUS*
    "sc2galaxy.localization": "enUS",

    // Wait time before reindexing changed dirty files
    "sc2galaxy.documentUpdateDelay": 300,

    // [Code completions]
    // Function expansion behavior
    "sc2galaxy.completion.functionExpand": "None",

    // [References]
    // Search files only from current workspace
    "sc2galaxy.references.currentWorkspaceOnly": false,
}
```

### Code completions
As default function completions are not populated with placeholder arguments (since we have *signature tooltip*).
It is however possible to placehold arguments basing on metadata from *Triggers* scheme with following config.
```js
{
    "sc2galaxy.completion.functionExpand": "ArgumentsDefault"
}
```
Example:
```c
UnitCreate
// would expand to:
UnitCreate(0, null, c_unitCreateConstruct, 1, null, 270.0)
```