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
* [x] Definitions provider (<kbd>CTRL+Click</kbd>)
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
