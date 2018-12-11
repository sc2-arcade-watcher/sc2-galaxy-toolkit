# Change Log

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
