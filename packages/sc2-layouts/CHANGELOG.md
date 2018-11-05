# Change Log

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
