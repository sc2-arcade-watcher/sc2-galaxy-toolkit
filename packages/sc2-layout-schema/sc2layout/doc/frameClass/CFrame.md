___

## AcceptsMouse

Determines if frame can receive mouse events.

If not set, mouse events will propagate further among covered frames. If none of the frames will grab the input, events will be handled out to GameWorld.

- Frame will accept mouse inputs. Good use for frames like Frame or Image is to block tooltips underneath images.

**Mouse Input Types**
- *CFrame Input Types*
  - Mouse Enter/Leave Frame
- *CControl Input Types*
  - Mouse Clicks (Requires the correct mouse buttons `AllowedButtons` to be set. `Left` is on by default on most frames)
  - Hovering

## AcceptsMouseDropTarget

Determines if frame can accept drag & drop events.

Most likely useless thing, due to the fact that it's used only in single place by Blizzard. To manage drag & drops in Arcade lobbies - frames of this type are restricted to Blizzard.

## AcceptsMouseTooltip

TBD

## Alpha

Determines the transparency of the element, by adjusting its Alpha channel.

- `0` - completely transparent
- `128` - 50% transparent
- `255` - completely opaque

It will also affect children elements.

## AlphaMaskSiblings

TBD

## AlphaMaskTexture

TBD

## Anchor

Used to position a frame. A frame can have up to 4 anchors.

- At least two sides of an element must be anchored in order for it work work properly.
- When anchors are set for pair of the Sides, then final Width/Height will be determined automatically.
- It's possible to anchor all sides within single definition, by ommiting `side` attribute \
i.e. `<Anchor relative="$parent" />` - will use the anchors of an parent element.

**Examples**

```xml
<Anchor side="Left" relative="$parent/SiblingFrame" pos="Max" offset="0"/>
<Anchor side="Right" relative="$parent/SiblingFrame" pos="1.25" offset="0"/>
<Anchor side="Top" relative="$parent/SiblingFrame" pos="-1.0" offset="0"/>
```

## AnchorUseDeviceOffset

TBD

## AnimLogging

Enables verbose logging of animations defined inside this frame.

## AutoSizeClamps

TBD

## Batch

TBD

## BatchGroup

TBD

## BatchImages

TBD

## BatchText

TBD

## Blur

Enables blurring the frame and its children. The actual blur factor is determined by *BlurAmount*.

## BlurAmount

The amount a frame will be blurred. `Blur` need to be set as `True` for this feature to work.

## BlurMode

The blending mode used for BlurShader.

## CollapseLayout

Works in conjunction with `PreserveAnchorOffset`. Generally when a frame is collapsed, other frames anchoring to it will ignore their offsets and will be placed right at the Left and Top anchor of the collpased frame. With `PreserveAnchorOffset`, anchoring items will preserve their offset.

## Color

TBD

## ContextMenu

TBD

## ContextMenuButtons

TBD

## Debugging

TBD

## DisabledAlpha

Alpha value when frame is in disabled state

## DragHovered

TBD

## Enabled

Enables / disables frame. It might have different results that will vary basing on the type of the frame.

- Typically used on `Control` frames.

## Handle

Unique global identifier. Allows referencing the frame from any place within hierarchy, by using defined handle prefixed with `$`, i.e. `$MyHandle`.

- There is a lot of handles defined by Blizzard across default UI. Such as `GameUI`, `GameUI_CommandPanel`, `GameUI_MenuBar` etc.

## Height

Height of the frame

- Sets the Height to an explicit value.
- Overrides auto-calculated height using Anchors.

## HitTestTexture

TBD

## HookupAlias

Allows to define an alias that can be used for redirecting the *hookup* action, which is used to retrieve named *FrameDesc* within the current frame.

Often times specialized Frame types can require definition of child/children frames for various reasons. These specialized frames expect the child to be under the name explicitly defined within game code. By using `HookupAlias` we can redirect the hookup to the frame named as we like.

Most likely this also affects hookup actions called from Galaxy VM - `DialogControlHookup`.

## IgnoreParentAlpha

Allows a child element to ignore the `Alpha` settings of its parent

## IgnoreParentColor

Allows a child element to ignore the `color` settings of its parent

## Preload

TBD

## PreserveAnchorOffset

Works in conjunction with `CollapseLayout`. Generally when a frame its collapsed, other frames anchoring to it will ignore their offsets and be placed right at the Left and Top anchor of the collpased frame. With this property, anchoring items will preserve their offset.

## RenderPriority

Render priority of the element (`512` is default value). Frames with higher priority will render on top of others.

When this property is not set, rendering priority is determined by the order in which elements were defined.

Caveats:
- **This property will take effect only among sibling elements**. To sort out issues with render priority across the frame hierarchy, you must inspect all affected nodes and set them up appropriately.
- Cannot be used to re-order elements that use different `RenderType`.

## RenderType

Render type of the element

- `HDR` = high-dynamic-range lighting the UI will use the maps lighting system.
- `LDR` = low dynamic range the UI will render as is no lighting gets added.
- `Offscreen` = Won't render the frame at all
- `RTT` = Render To Texture

__`LDR` always renders above `HDR`__

## ReportsStats

TBD

## SnapToDevicePixels

TBD

## Tooltip

TBD

## TooltipAnchorPosition

TBD

## TooltipDelayed

TBD

## TooltipFrame

TBD

## Unclipped

Allows a frame to be rendered outside its parent countainer bounds.

Normally if a Frame were to render part or all of it outside the parent bounds, it will only display what fits inside the bounds. Unclipped frames will render in its entirety on the screens regardless of any of its parents.

**This has a performance cost, so use with caution.**

## UseAlternateTime

Specifies which kind of time should be used for animations of this frame.

By default when this property is set to `False`, animations are bound to real time provded by the OS.

However when this is set to `True` (AlternateTime enabled), animations will use the `gametime` and should remain synced across the players. By that they'll also become subject of lag or will even completely cease in scenarios where game will stop progressing (game pause, "lag").

## UseTooltip

TBD

## VisibilityOnFade

Determines whether animations that use `Fade` controller will toggle Visibility state of the frame, once they're finished.

## Visible

Determines visibility of the frame.

## Width

Width of the frame

- Sets the `Width` to an explicit value.
- Overrides auto-calculated `Width` using Anchors.