# Plaxtony

Set of libraries to work with *StarCraft II* map files.

## Galaxy script

### Parser

Code parsing implementation was heavly inspiried by *TypeScript* parser. (Some chunks of code were even directly re-used.)\
By a result it is very error tolerant, and can handle most of syntax errors within the code, and proceed with parsing the rest of it.

### Static analysis

Parsed AST is fully traversed. Symbol table is being built during indexing process.

### Language Server Protocol

Implemented providers:

- [x] Document symbols
- [x] Workspace symbols
- [x] Code completions
- [x] Function signature help
- [x] Symbol definitions
- [x] Symbol hover documentation tooltips

## Triggers

Basic capabilities of parsing `Triggers` | `TriggerLib` | `SC2Lib` XML files.

- Elements list with their metadata
- Associating elements with their auto generated symbols within galaxy code.
- Elements documentation from `TriggerStrings.txt` files.

## GameData catalogs

...

## Usage examples

- [vscode-sc2-galaxy](https://github.com/Talv/vscode-sc2-galaxy) -  Visual Studio Code extension