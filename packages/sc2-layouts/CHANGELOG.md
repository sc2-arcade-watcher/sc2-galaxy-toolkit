# Change Log

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
