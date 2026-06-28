Can calculate distance and angle between two frames. It uses frame's center as origin point.

### Example: Distance with an offset

In the example `LookAtFrame` is used to build a line connecting two dots on the screen. Additionally it shows how to shorten the line for extra spacing.

![](https://i.imgur.com/1SFR3ri.png)

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Desc>
    <!-- Test22.SC2Layout -->
    <Frame type="Image" name="DotTemplate">
        <Width val="20"/>
        <Height val="20"/>
        <Color val="136,255,73,73"/>
        <Texture val="Assets/Textures/ui_ingame_coop_topbar_stetmann_stetelliteflavordisplay_chargeicon_charged.dds"/>
    </Frame>

    <Frame type="Image" name="ConnectorTemplate">
        <Width val="100"/>
        <Height val="4"/>
        <RotationPosition val="MiddleLeft"/>
        <Color val="136,255,73,73"/>
        <Texture val="Assets/Textures/ui_ingame_coop_topbar_stetmann_stetelliteflavordisplay_connectorgradient.dds"/>
    </Frame>

    <Frame type="LookAtFrame" name="SetupConnectorTemplate">
        <StateGroup name="LazySetup">
            <State name="Init">
                <!--
                    this condition seems to do the needed magic: it won't setup the binding until Distance is calculated
                    and if we attempt to property bind it before it has been calculated we're getting `invalid property binding`
                    the only place where @Distance can be directly bound seems to be `Width` and `Height` properties
                    not entirely sure why, but I believe it's because of some circular dependency which UI cannot handle in this case
                    .. that or, LookAtFrame is partially bugged and @Distance isn't properly initialized?
                    either way, lazyloading solves that
                -->
                <When type="Property" frame="$this" operator="GreaterThan" Distance="0"/>
            </State>
        </StateGroup>

        <Frame type="MathFrame" name="ReducedLength">
            <B val="26"/>
            <!-- ^ offset should be 20, added +3*2 intentionally to show there's actually a gap -->
            <Operator val="Subtract"/>
        </Frame>
    </Frame>

    <Frame type="Frame" name="GameUI/UIContainer" file="GameUI">
        <Frame type="Frame" name="Test22">
            <Anchor side="Top" relative="$parent" pos="Mid" offset="0"/>
            <Anchor side="Left" relative="$parent" pos="Mid" offset="-300"/>
            <Width val="600"/>
            <Height val="600"/>

            <Frame type="Image" name="QuadrantIcon01" template="Test22/DotTemplate">
                <Anchor side="Top" relative="$parent" pos="Min" offset="0"/>
                <Anchor side="Left" relative="$parent" pos="Min" offset="0"/>
            </Frame>

            <Frame type="Image" name="QuadrantIcon02" template="Test22/DotTemplate">
                <Anchor side="Top" relative="$parent" pos="Min" offset="78"/>
                <Anchor side="Left" relative="$parent" pos="Min" offset="430"/>
            </Frame>

            <Frame type="Image" name="Connector_1" template="Test22/ConnectorTemplate">
                <Anchor side="Top" relative="$parent/QuadrantIcon01" pos="Mid" offset="0"/>
                <Anchor side="Bottom" relative="$parent/QuadrantIcon01" pos="Mid" offset="0"/>
                <Anchor side="Left" relative="$parent/QuadrantIcon01" pos="Mid" offset="13"/>
                <!-- ^ offset should be 10, added +3 intentionally to show there's actually a gap -->
                <Width val="{$parent/SetupConnector_1/@Distance}"/>
                <Rotation val="{$parent/SetupConnector_1/@Angle}"/>
            </Frame>

            <Frame type="LookAtFrame" name="SetupConnector_1" template="Test22/SetupConnectorTemplate">
                <SourceFrame val="$parent/QuadrantIcon01"/>
                <DestFrame val="$parent/QuadrantIcon02"/>

                <StateGroup name="LazySetup">
                    <State name="Init">
                        <Action type="SetProperty" frame="ReducedLength" A="{$parent/@Distance}"/>
                        <Action type="SetProperty" frame="$parent/Connector_1" Width="{$parent/SetupConnector_1/ReducedLength/@Result}"/>
                    </State>
                </StateGroup>
            </Frame>
        </Frame>
    </Frame>
</Desc>
```
