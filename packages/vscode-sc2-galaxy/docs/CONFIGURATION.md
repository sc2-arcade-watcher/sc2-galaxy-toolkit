## Configuration

### General

Allows providing external directories when looking up for dependencies.
It is good to put path to SC2 directory here.
> * CASC and MPQ archives are not supported.
> * Usually dependency links are prefixed with `mods/`.
> * The extension itself is being shipped with all of default
```json
{
    "sc2galaxy.s2mod.sources": [
        "c:\\SC2"
    ]
}
```

What localizations files shall be indexed.\
Currently it affects only *gamelinks* hints - *Units* etc.\
TriggersStrings are hardcoded to *enUS*
```json
{
    "sc2galaxy.localization": "enUS",
}
```

Allows overriding dependency links for local workspace. As well as forcing indexing of extra ones.
```json
{
    "sc2galaxy.s2mod.overrides": {
        "mods/core.sc2mod": "c:\\stuff\\core.SC2Mod"
    },
    "sc2galaxy.s2mod.extra": {
        "mods/liberty.sc2mod": "c:\\stuff\\liberty.SC2Mod"
    }
}
```
>`"archive link": "absolute path"`

### Code completions
As default function are not filled with any placeholder arguments (since we have *signature tooltip*).
It is possible to placehold arguments basing on metadata from *Triggers* scheme with following config.
```json
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