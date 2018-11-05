# StarCraft II Layouts

Visual Studio Code extension introducing support for SC2Layouts language, utilized in games like StarCraft II and Heroes of the Storm.

* [x] Real time code diagnostics
  * Syntax validation.
  * Schema validation.
  * Post-process binding of the DescTree.
* [x] Rich context aware code completions.
  * XML declarations based on the schema.
  * Frame selection expressions
  * Property bidings
  * Constants
  * External assets.txt files
* [x] Document and workspace symbols navigation list.
* [x] Definitions provider (`<kbd>Ctrl</kbd>` + **Click**)
  * Resolving contextual selectors such as `$ancestor` to its matching declaration within document
  * FileDescName, Templates..
* [x] Tooltips on hover
  * Documentation of UI properties
  * Listing of element attributes and their types
* .. and much more

## Showcase

### Code completions

![completions-tooltips](./assets/completions-tooltips.png)

![completions-enum](./assets/completions-enum.png)

![completions-frametype](./assets/completions-frametype.png)

![completions-assets](./assets/completions-assets.png)

![completions-selectors](./assets/completions-selectors.png)

![completions-templates](./assets/completions-templates.png)

### Goto definition

![image](./assets/definition-selectors.png)

### Document and workspace navigation

![image](./assets/document-navigation.png)

![image](./assets/workspace-navigation-constants.png)

### Code diagnostics

![image](./assets/diagnostics-overview.png)

---

## TODO

* Code completions:
  * Suggest properties in:
    * State groups `CFrameStateConditionProperty`, `CFrameStateSetPropertyAction` as attr names
    * Animation keys `CFrameControllerProperty` in `property` attr value
  * Suggest animation names
  * Suggest animation events
  * Suggest state group names and their states
  * `@` and `*@` catalog ids - `CSound`, `CActorSound`
  * Suggest filenames of .dds textures. Filelist from standard mods should be pre-built and distributed with extension. Additionally filewatcher on project workspace for local assets.
  * Suggest layout filenames in `<Include>`
* Goto definition (ctrl-click):
  * `@` Asset refs
* Add a treeview for layout files and their content:
  * Categorize files based on origin (mod/map name)
  * Add exclusive top-level node `GameUI`. Attempt to include all elements contributed from foreign templates and desc overrides.
  * Contextual actions on frame nodes:
    * Open in current view
    * Override frame in (`New layout file` | `Layout file named ..` from current workspace)
* Extra:
  * Add command `Reload UI` that sends the signal to SC2 process if it's open. (Simulate keystroke through winapi)
  * Add command `Preview Frame` (contextual action from SC2 UI Editor). Will require investigation - it's unknown how editor sends the signal to SC2. It certainly isn't achieved through the command line. ref:
    * https://docs.microsoft.com/en-us/windows/desktop/memory/creating-named-shared-memory
    * https://docs.microsoft.com/en-us/windows/desktop/ipc/pipe-functions

---

Long term goals (_maybe_):

* Documentation:
  * Write labels/documentation for frame properties aswell as other layout elements.
  * Improve formatting of documentation displayed on hover and in code suggestion list.
  * Update http://mapster.talv.space/layouts/frame using new schema made for this extension. Including all documentation and any extra information available.
* Split core code to separate package, implement LSP.
