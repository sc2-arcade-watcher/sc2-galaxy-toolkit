# SC2Layout schema

XML Schema of SC2Layout document from StarCraft II.

Used in:

* [VSC SC2Layout Extension](https://marketplace.visualstudio.com/items?itemName=talv.sc2layouts)
* [Documentation of SC2Layout](https://mapster.talv.space/ui-layout) - statically generated

## Contribution guide

Validate your changes before commiting by running `./validate.sh` (requires `xmllint` to work).

If you've write-access to this repository feel free to push directly `master`. If not, fork the repository and submit pull request.

If your changes are considerable (i.e. restructuring or renaming existing definitions), consider submitting PR for review.

### Testing in VSC

In order to instruct VSC extension to load schema files from custom path, simply put this to your config file.

```json
{
    "sc2layout.schema.localPath": "/home/kk/dev/sc2-layout-schema"
}
```
> `/home/kk/dev/sc2-layout-schema` in this example points to local clone of this repository and should of course be replaced with your own path.

### Tagging releases

This repo is meant to use `Major.Minor` versioning.

VSC extension is setup to auto-download only tagged releases of matching `Major` number.

There are no strict guidelines when to tag a new release - initial plan was to simply always pull recent `master`. But due to fact that schema model is not final, I've opted for tagged releases to avoid bricking VSC extension of users who may not be using most recent version.

In short, contributors are welcome to increament `Minor` version and tag any commit they like. No changelogs required.

### Recommended tools

* Visual Studio Code
* https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml
* https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig
