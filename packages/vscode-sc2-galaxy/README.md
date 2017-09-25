# vscode-sc2-galaxy

Visual Studio Code extension providing language support for StarCraft 2 Galaxy Script.

Utilizes [plaxtony](https://github.com/Talv/plaxtony) for AST processing.

## Features

- Grammar:
    - [x] Syntax highliting.
    - [x] Snippets.
- Diagontics:
    - [x] Syntax checking.
    - [ ] Type checking (referencing undefined symbols, type missmatch etc.).
    - [ ] Reporting about unused symbols
- Providers:
    - [x] Code completions. (Partly implemented - won't resolve preceding expression to provide context based completions).
    - [ ] Signature help. In case of *natives*, descriptions from Trigger module will be given.
    - [x] Document and workspace symbols navigation.
    - [ ] Symbols show definitions.
    - [ ] Symbols show references.

*work in progress*

## Screenshots

![Syntax](images/syntax.png)