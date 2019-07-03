# StarCraft II Layouts

Visual Studio Code extension introducing extensive support for **SC2Layout** language, utilized in games like StarCraft II and Heroes of the Storm.

> Schema files of `SC2Layout` are hosted in its own [repository](https://github.com/SC2Mapster/sc2layout-schema), from which this extension will always pull most recent version.

## Contribution guide

**Requirements**

 * yarn: https://yarnpkg.com

**Initial setup**
```
git clone https://github.com/Talv/sc2-layouts.git
cd sc2-layouts
git submodule update
yarn install
```

**Dev tasks**

* `yarn run build:watch` - compile `.ts` files and watch for changes
* `yarn run test` - run tests

**Testing extension in VSCode**

https://code.visualstudio.com/api/working-with-extensions/testing-extension

## Features

### Custom abbreviations

Quick and convenient way for inserting code snippets.

They function the same way as normal code completions, with one exception - they're supposed to be triggered directly inside content of XML element. Upon accepting they'll be expanded to include all boilerplate code.

#### Frame declarations

Syntax: __`:`__*`FrameType`*

![abbrv-frame-declaration](assets/abbrv-frame-declaration.png)

#### Desc overrides

Syntax: __`/`__*`Filename/Path/ToTheFrame/Image`*

![abbrv-desc-override](assets/abbrv-desc-override.png)

 * Works with Frames, Animations, Stategroups.
 * Special `#` character at the end is utilized to accept suggestion and expand to choosed element.
 * Suggestions list can be triggered only within root element (`<Desc>`).

#### Template overloading

Syntax: __`.`__*`Name`*

![abbrv-template-overloading](assets/abbrv-template-overloading.png)

 * Suggestions list will exclude elements that are already extended in scope of current declaration.
 * Works with deeply nested elements.
 * Not limited to templates - it will also provide suggestions when extending frame within another layout file etc.

---

### Custom panels

Accessible from the activity bar on the left - it will open in a separate container.

![desc-tree-props](assets/desc-tree-props.png)

#### Desc tree

All layout files from the workspace and their content arranged in a tree.

#### Frame properties

Provides basic informations about selected frame in corresponding DescTree panel. It includes:

 * Native hookup list
 * Desc types of a frame and its fields
 * Class types of a frame and its properties

---

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
