Representation of a [data button](https://sc2mapster.wiki.gg/wiki/Data/Buttons).

### Usage example of `ButtonOtherUnit`

How to use `ButtonOtherUnit`. This property contains the UnitTag of the item unit.

```xml
<Frame type="CommandButton" name="Button00">
    <Frame type="UnitFrame" name="Item">
        <Anchor relative="$parent"/>

        <!-- This stategroup is needed for the ButtonOtherUnit property bind to actually work. -->
        <StateGroup name="ItemState">
            <DefaultState val="NoItem"/>
     
            <State name="HasItem">
                <When type="Property" frame="$parent/NormalImage" operator="NotEqual" Texture="" index="0" />
                <Action type="SetProperty" UnitTag="{$parent/@ButtonOtherUnit}"/>
            </State>

            <State name="NoItem"/>
        </StateGroup>
    </Frame>
</Frame>
```
