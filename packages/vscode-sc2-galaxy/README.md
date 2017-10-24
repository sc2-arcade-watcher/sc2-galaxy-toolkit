# StarCraft 2 Galaxy Script for Visual Studio Code

**Visual Studio Code** extension providing language support for **StarCraft 2 Galaxy Script**.

## Features

- Grammar:
    - [x] Syntax highliting.
    - [x] Basic snippets.
- Real time code diagnostics, reporting about:
    - [x] Parse errors.
    - [x] Reference of undeclared symbol.
    - [x] Incorrect number of arguments provided within function call.
    - [ ] Type missmatch.
    - [ ] Declared but unused symbols.
- Providers:
    - [x] Context aware code completions.
    - [x] Signature help for functions.
    - [x] Document and workspace symbols navigation.
    - [x] Symbols show definitions (goto *click*).
    - [ ] Symbols hover info.
    - [ ] Symbols show references.

Parser is meant to be error tolerant - when parse error occurs it will try to recover and continue processing rest of the code.

Extension is also capable of parsing *Trigger Libraries* from *SC2Mod* archives in order to provide extended documentation.\
Currently it does that only for *Native library*. Although it is planned to load all libraries defined within dependencies of currently opened map/mod, by reading its *DocumentHeader*.

Following language statements are not yet propertly supported: `typedef`, `structref`, `arrayref`.

*Notice: This extension is just a wrapper around [plaxtony](https://github.com/Talv/plaxtony) - this library does all the heavy work.*

---

## Showcase

### Real time code diagnostics

![diagnostics](doc/diagnostics.gif)

### Code completions

![code-completions](doc/code-completions.gif)

### Function signature information

![signature-help](doc/signature-help.gif)

### Goto definition

![goto-definition](doc/goto-definition.gif)

### Symbol navigation

![symbol-navigation](doc/symbol-navigation.gif)

---

## How to use this extension in combination with **SC2 Editor**

To avoid copy-pasting code into **Custom script element** within trigger editor, or manually reimporting *.galaxy* files after every change, it is advised to save the map in unpacked format - that is **.SC2Components** in save dialog.

![save dialog](doc/sc2-editor-save-dialog.png)

This will expose your map files to be accessed through the filesystem, then simply open map directory within **VS Code editor**.

It's also advised to not write your code directly to `MapScript.galaxy` as it might be easly overriden by **Trigger module** of **SC2 Editor**. The better way is to create a **Custom script elemen** and include your scripts in there.

Scripts can be saved in any directory within the map, even root directory. No manual file re-importing in **SC2 Editor** is required. Your scripts will be read on demand - always up to date.

For Example:

![custom script](doc/sc2-editor-custom-script-include.png)

Note the **Initialization Function** at the bottom

Inside your map directory create new folder named `scripts`. There you can insert your galaxy files:

`scripts/main.galaxy`:
```c
bool onInit(bool testConds, bool runActions) {
    UIDisplayMessage(PlayerGroupActive(), c_messageAreaSubtitle, StringToText("HELLO WORLD"));
    return true;
}

void main() {
    // this is your entry point
    TriggerAddEventMapInit(TriggerCreate("onInit"));
}
```

### Mixing GUI Elements with Custom scripts

It is possible to declare certain **Functions** and **Actions** as **Native** within **Trigger module**. This basically just creates a reference to a function you must declare on your own.

![native action element](doc/sc2-editor-action-element-native.png)

Then somewhere in your scripts make a declaration:

```c
void action(string parameter) {
    // ...
}
```

Such action can be used in **Trigger module**.

![native action call](doc/sc2-editor-action-use.png)

### Example maps

- [sc2-sef](https://gitlab.com/Talv/sc2-sef) - **Ice Baneling Escape: Cold Voyage** in *Arcade*.