Assembles text from a list of tokens, and formats it according to specified pattern.

Utility frame - doesn't display anything by itself. Its purpose is to assemble a text, from a list of tokens provided in `Replacement` list, using a pattern set in `FormatText`.

Assembled text is stored in a `Text` property (read-only). Which can be bound to property of another frame, such as `Text` in `Label`.

### Example

```xml
<Frame type="TextFormatFrame" name="ShieldsText">
    <Anchor relative="$parent"/>
    <FormatText val="%0% / %1%"/>
    <Replacement val="{$parent/HealthValues/@Shields}" index="0"/>
    <Replacement val="{$parent/HealthValues/@MaxShields}" index="1"/>
</Frame>
<Frame type="Label" name="FenixCurrentShields">
    <Text val="{$parent/ShieldsText/@Text}"/>
</Frame>
```