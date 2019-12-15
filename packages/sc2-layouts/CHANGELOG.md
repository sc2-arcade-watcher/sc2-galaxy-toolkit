# Change Log

## [[1.0.2]](https://github.com/Talv/sc2-layouts/compare/v1.0.1...v1.0.2) - 2019-12-15

* Bugfixes
* Updated `sc2-data` to `4.11.0`

## [[1.0.1]](https://github.com/Talv/sc2-layouts/compare/v1.0.0...v1.0.1) - 2019-11-06

* Fixed multiple flaws in regards to handling content updates in SC2Layout documents. Most importantly content of dirty files wasn't being indexed as soon as it was intended, despite having enough processing capacity. There was hardcoded delay of 300ms occuring after every change. Effectively all services (such as code completions) relaying on fresh data were delayed with their response by at least 300ms.
* And other minor bugfixes..

## [[1.0.0]](https://github.com/Talv/sc2-layouts/compare/v0.11.2...v1.0.0) - 2019-10-26

* Refactored codebase in order to adopt [LSP](https://microsoft.github.io/language-server-protocol/). All heavy work performed by extension will now take place in its own system process. Instead of being run together with all other extensions in the same process managed by VSC.
    * > Previous setup had many disadvantages. Especially on installations where there was a lot of other active extensions, possibly interrupting tasks of each other on slow CPUs - considering it was all running in the same physicial thread.
* Added a command `SC2 Layout: Analyze Workspace` which will perform analysis on all layout files existing in the project workspace. Resulting raport will be printed to a temporary text document in VSC editor.
    * > Consider installing [Log File Highlighter](https://marketplace.visualstudio.com/items?itemName=emilast.LogFileHighlighter) for the best experience. It might improve the colorization rules, and solve eventual issues related to opening file links included in the output.
* Added case insensitive matching of elements across the desc tree (i.e. referencing templates). Previously it would've been reported as error due to lack of support, now it will be a warning, since it's still unwanted behavior.
* Schema:
    * [Updated schema definitions to match current version of SC2 (`4.10.0`)](https://github.com/SC2Mapster/sc2layout-schema/commit/d2acaee3ac2e67de5c4c6e822247fdda814905a1). It was done in a semi-automatic process, thus coverage should be quite solid.
    * Handling of [type alternations have been improved](https://github.com/Talv/sc2-layouts/commit/3e111b10506c4dd62f20f2c8bf462d87bc4010a0). Thus far it was only used to [enhance schema of `CFrameControllerKeyCutscene`](https://github.com/SC2Mapster/sc2layout-schema/commit/262aaff4308467a9811410090a7af06068836b96).
* Updated `sc2-data` to `4.10.4`
* Bunch of other minor fixes/improvements.

## [0.11.2] - 2019-09-03

* Bugfixes:
    * [allow `documentDiagnosticsDelay` to be set to `false` - to disable providing code diagnostics for dirty files](https://github.com/Talv/sc2-layouts/commit/10a8444a92d8836ffd419a02c95b7de9840a07db)
    * [properly filter document selector to not clash with extensions like Gitlens etc.](https://github.com/Talv/sc2-layouts/commit/b523e6205ecc4a1a5cb68b79905f8090f591ba43)
    * [add very basic support for code completions based on frame context in Stategroups and Animations without a parent frame - when they're used as templates](https://github.com/Talv/sc2-layouts/commit/4f33d4d27040ebc645b7becb5b3db5b0d78e5cf2)
* Updated `sc2-data` to `4.10.1`

## [0.11.1] - 2019-08-19

* Added abbreviation for [inserting properties/fields of choosen frame class](README.md#properties-of-a-frame-class).
* Fixed incorrect configuration of indentation rules - the flaw was most noticeable during copy-pasting chunks of code, where first line could be indented twice, which in turn would screw up formatting of pasted snippet entirely. Indent rules should now be pretty solid: VSC's built-in commands such as `Reindex Lines` or `Reindent Selected Lines` can now freely used.

## [0.11.0] - 2019-07-03

* Added native frame hookup declarations to the schema.
* Hookups of a frame type are now validated:
    * Reporting about omitted elements which are flagged as obligatory.
    * Reporting about missmatched type.
    * Aliasing via `HookupAlias` property is supported.
* Introduced custom abbreviations to enhance code completions capabilities. Head over to [README#custom-abbreviations](README.md#custom-abbreviations) to learn how to use them.
* Frame properties panel improvements:
    * Added section listing hookups of a frame. Required hookups are prefixed with `* `.
    * Added section listing desc types of a frame, along with their fields.

## [0.10.1] - 2019-06-20

* Hotfix https://github.com/Talv/sc2-layouts/commit/4a89c573ecb7b2a510a75f6a77d3fc2bd5f2b816

## [0.10.0] - 2019-06-20

* Improved population strategy for `sc2layout-schema`. Documentation/localization text entries have been moved to separate markdown files. Each time new version is fetched it will be fully indexed just once and then cached to speed up loading times.
* Added `sc2layout.dataPath` config option. It allows to customize the source path from where built-in mods are going to be read. This extension is bundled with minimal set of files required to work, but updates aren't always frequent enough. In which case you may want to use more up to date version, such as [SC2GameData](https://github.com/SC2Mapster/SC2GameData).
* Removed default keybinding for opening SC2Layout container in the sidebar (`ctrl+shift+w`).
* Updated `sc2-data` to `4.9.2`
* Fixed `$ancestor[type=X]` failing to find the frame.
* Fixed missing code completions in `Stategroup` and `Animation` elements.

## [0.9.1] - 2019-06-18

* Fixed missing `request` dependency resulting in error during initialization.

## [0.9.0] - 2019-06-13

* Added experimental frame properties panel which works in accordance to existing DescTree. Properties panel will display any selected node from DescTree.
* Moved schema files of `SC2Layout` to separate [repository](https://github.com/SC2Mapster/sc2layout-schema). They won't be bundled with the extension anymore. Instead extension will download them automatically in form of a zipball, of most recently Git tagged commit under default configuration.
* Tooltips shown on hover will now redirect to documentation of respective frame/type.
* Minor improvements and some code refactoring.

## [0.8.0] - 2019-05-22

* Added support for `ItemDesc` and `DescInternal` fields (goto definition, code completions etc.)
* Added basic ReferenceProvider, currently only capable of listing templates usage
* Improved color decorator to properly handle constants, and colorize them if they hold color value. Works in TextEditor view and on code completions list.
* Fixed `StateGroup` snippet to include `DefaultState` in more correct order. Added `stategroupDefaultState` config option.
* Updated `sc2-data` to `4.9.0`

## [0.7.0] - 2019-01-09

* Added color picker and its visual indicator. It will appear in attributes that accept `Color` type, or have `Mixed` type - such as constants, if applicable. Supports hexadecimal and decimal notation, and optionally an alpha component.
* Hover provider (mouseover tooltips that will appear for):
    * Desc/Frame selectors - each part of selection will have different tooltip displaying the name of Desc it resolves to, and a list of definitions from each layout that contributes (templates, overrides etc.).
* Code completions:
    * Suggestions of frame/animation/stategroup names in context of their definition (`name` attribute). List includes frames that are either inherited from a specified template, or are already existing - in cases when some top level frame is being overriden with elements inside (`GameUI/UIContainer` etc.).
    * Fixed incorrect completions provided for property bind expression placed in a `StateSetPropertyAction` that was targetting frame other than `$this`. It would previously suggest the path in relation to where the stategroup was placed, now it will respect the target frame and provide suggestions in its relation.
* Goto definition (<kbd>CTRL-CLICK</kbd> behavior):
    * Added support for:
        * Property bind expressions
            * Each selector will navigate to definition of the frame it has been resolved to
            * Property will navigate to the field in a resolved frame where it is being initialized
        * Frame names:
            * In case of extending template it will navigate to the definition/definitions from the template
            * In case of overriding element from another file desc it will navigate to original layout where this element was created, and all other places where that element is being extended - if any (other layouts).
    * Each fragment of `template` attribute is now treated separate. What allows it to navigate to definition of choosen element in case of nested templates, or simply navigate to the layout file where that template was placed.
* Schema:
    * Further corrections/additions to various elements. Primarily concerning `UnitStatusFrame` and its family.
    * Added missing animation controllers: `CutsceneProperty` and `CutscenePropertyReal`.
* Other:
    * Added partial support for newly introduced *ConstantFactional* and *AssetFactional* (`###` and `@@@`)
    * Updated `sc2-data` to `4.8.0`
    * Changed default settings of `sc2layout.builtinMods`: all campaign dependencies, as well as coop mod is now indexed by default. This can be overridden globably or per workspace.
    * Files in Desc Tree will now be ordered alphabetically
    * Enhanced internal frame hierarchy builder - in order to make code completions concerning frame selections across hierarchy a little more richer:
        * Better support for multi-level template inclusion.
        * Overrides targetting the same `FileDesc` will now be merged - in other words layout `C` will now be aware about changes made by layout `B`, where both of them have been extending the same location in layout `A`. Obvious example is `GameUI` that is pretty much always touched from more than one layout.

## [0.6.1] - 2018-12-18

* Minor bugfixes & improvements
* Schema:
    * Added descriptions to some animation related elements
    * Added animation drivers
    * Filled missing type hints around unit status bars and other decorated frames.

## [0.6.0] - 2018-12-11

* General
  * Improvements to initial indexing process:
    * Added notification window with progress bar & info what is being currently processed
    * Code diagnostics won't be provided untill all files have been indexed
    * After making changes to the workspace reindexing won't be triggered automatically. Instead confirmation from the user will be requested.
* Code completions:
  * State group names and their states will be suggested in various places (`<When type="StateGroup">`, animation controllers etc.)
  * Property names will be suggested in `CFrameControllerProperty` (`<Controller type="Property" property="">`)
* Bugfixes:
  * Fixed leak in indexer that could cause a soft-lock of the extension in certain conditions.
  * [Diagnostics] Fixed expression parser refusing to accept identifiers that begin with digits (in templates and property bind expressions)

## [0.5.1] - 2018-12-03

* Bugfixes:
  * Fixed error occuring when opening layout file without any folders in the workspace
  * Fixed detecting nested sc2mod/sc2map directories inside workspace folders (Windows specific issue).

## [0.5.0] - 2018-12-02

* General
  * Campaign dependencies will be indexed as default alongside of `Core.SC2Mod`
  * Improvements to the parser - it should now be more tolerant and verbose when dealing with XML syntax errors.
  * Added some rules to schema and code checker - it should be able to spot more mistakes.
* Tree view
  * Added dedicated Desc Tree for indexed layout files. It can be accessed in separate tab in `Activity Bar` [<kbd>CTRL-SHIFT-W</kbd>].
  * Added command `Reveal Active File in Desc Tree`
  * It's functionality is currently limited to serving as an overview for browsing indexed elements, further features may be added in future updates.
* Code completions:
  * Added suggestions for in-built event names in animations (`OnShown` etc.)
  * Custom defined events will be suggested in
    * `CFrameControllerKeyEvent`
    * `CFrameStateSendEventAction`
  * Property names as attributes in
    * `CFrameStateConditionProperty`
    * `CFrameStateSetPropertyAction`
  * Animation names in
    * `CFrameStateConditionAnimationState`
    * `CFrameStateSetAnimationPropAction`
    * `CFrameControllerAnimationSpeed`
    * `CFrameControllerAnimation`
* Goto definition
  * For events referenced in
    * `CFrameControllerKeyEvent`
    * `CFrameStateSendEventAction`

## [0.4.1] - 2018-11-06

* Bugfixes:
  * Parser: `CFrame` will be used as fallback, for unknown frame types
  * Schema: fix too restrictive regex on `<constant>` name
  * Schema: added `Nullable` option to schema of simple type. Nullable indicates that value of the field can be set to an empty string
    which is as a way for nulling out anything that was set previously
    * Fields that take flags have this set implicitly
    * Color is now assumed to be nullable property
  * Added support for backslash as expression delimeter.
  * Added `.SC2Interface` to list of valid archive extensions (in order of external files to be recognized - `Assets.txt` etc.)

## [0.4.0] - 2018-11-05

* Implemented FrameTree builder
  * Added support for template inclusion
  * Added support for merging of node declarations from multiple layouts, which are targetting the same FileDesc
  * Frame tree is expanded incrementally - only to the degree required to resolve selection.
  * Custom frame handles are now supported.
  * Most of built-in selectors are now supported (`$sibling` not yet working - will fallback to `$this`. also `$layer` not supported at all for the time being)
* Code diagnostics will now be provided for dirty files - saving is no longer required (idle time configurable).
* Increased verbosity of diagnostics:
  * Scalar types such as uint, int, color etc. will now be validated
  * Checking for existance of FileDesc (`file=`)
  * Checking for existance of templates
* Definition provider:
  * Added support for selection expressions: each fragment of selection will be resolved as separate, and will point to the declaration of matching node (i.e. clicking on `$ancestor[oftype=Control]` which has match will navigate to its declaration).
  * Added support for `FileDescName` (`file=`)
  * Added support for `DescTemplateName` (templates)
* Document symbols provider:
  * Added hierarchical view
  * Added selection ranges for each node.
* Added workspace symbols provider:
  * Nodes will be provided with their fully qualified names (list isn't limited to top-level nodes of each file).
  * Prefixing query with `#` will provide list of constants from the workspace, instead of declaration nodes.
* Code completions:
  * When expanding XML element with single attribute, last tab-stop will now be placed at the end of line as default (configurable).
  * Added variants to suggestions list for all kinds of `Controller` in animations, and `When/Action` in stategroups.
  * Added variants for `StateGroup` expansion. Featuring `StateGroup:One`, `StateGroup:Two` .. (up to 5). Number indicates how many `State` elements will be placeholded. Also `DefaultState` will be pre-set, linking to `State` which was inserted first.
  * Removed static snippets file entirely. `!desc` previously exisiting snippet will now be suggested only when applicable - when file doesn't have its root `<Desc>` element. Also it was renamed to `fdesc` (`!` was causing issues).

## [0.3.0] - 2018-10-16

* Added indexing of SC2 `(GameStrings|GameHotkeys|Assets|AssetsProduct).txt` and `FontStyles.SC2Style`. These files will be watched for changes and reloaded if edited externally.
* Code completions:
  * Suggestions for `@` will now be provided for `Image`,`Text`,`Hotkey`,`Style`
  * Suggestions for `frame` attribute in animations `<Controller>`,`<Event>`; and stategroups `<When>`,`<Action>`
  * Frame names and built-in handles will now be provided in context of property bind
  * Basic suggestions for `[@name=]` in `$ancestor`
* Schema:
  * `CUnitStatusBarDesc`: fixed `['Tiled', 'ReductionShown']`
  * Added type matching of animation `<Controller>`s - this will improve code completions aswell as validation verbosity
  * `<StateGroup>` is now allowed under `<Desc>`; added `template` attr
* Fixed code completions for tags not appearing upon typing `<`

## [0.2.0] - 2018-10-09

### Added

* Code suggestions for each side of `<Anchor>`
* Code suggestions within property bind context
* Basic validation of property binding

### Fixed

* Schema: missing elements on UnitStatusBar

## [0.1.0] - 2018-10-07

* Initial release
