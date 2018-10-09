# StarCraft II Layouts

Visual Studio Code extension introducing support for SC2Layouts language, utilized in games like StarCraft II and Heroes of the Storm.

> NOTE: This is pre-release - extension should be quite handy and usable at this momemt. But there's lot of code that needs refactoring etc. before it will be possible to implement all planned features.

...

quick video preview: https://gfycat.com/TinyAngelicFirecrest

## TODO

* Code completions:
  * Suggest properties in:
    * State groups `CFrameStateConditionProperty`, `CFrameStateSetPropertyAction` as attr names
    * Animation keys `CFrameControllerProperty` in `property` attr value
  * Suggest animation names
  * Suggest state group names and their states
  * Suggest `@` asset references
  * Suggest filenames of .dds textures. Filelist from standard mods should be pre-built and distributed with extension. Additionally filewatcher on project workspace for local assets.
  * Suggest layout filenames in `<Include>`
* Goto definition (ctrl-click):
  * Frame names - when overriden by `file=` or extended from `template=`
  * Desc selection:
    * `template=` and `file=` on `Frame` | `Animation`
    * In elements that specify `ItemDesc`; support `$root` aswell as relative selection
  * Frame selectors - each fragment within selection should be treaten separate, and deduce targeted Desc declaration (support `$ancestor` etc.). Unless target of selection cannot be deduced from the current context.
  * `@` Asset references from txt files
  * `@` and `*@` catalog ids - `CSound`, `CActorSound`
* Schema:
  * Add type alternations for `<Controller>` and its `<Key>`s
* Internal improvements:
  * Add support for `template` and `file` when building `DescTree`. So that we can offer better completions and target deduction in regards to frame selectors and property binding.
  * Attempt to keep track of elements that are result of extending from `template`, or `file` override. In order to be able to incrementally update the state of `DescTree`, without having to pre-process all layouts again.
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
* Split core code to separate package, implement LSP. Add unit tests & cleanup code.
