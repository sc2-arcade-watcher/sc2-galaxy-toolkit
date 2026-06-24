TBD

___

## OnShown

When the target frame becomes `Visible`. This can occur by the frame itself becoming visible or a parent of this frame becoming visible as visibility is inherited.

## OnHidden

When the target frame becomes not visible. This can occur by the frame itself becoming not visible or a parent of this frame becoming not visible as visibility is inherited.

## OnEnabled

When the target frame becomes `Enabled`. This can occur by the frame itself becoming enabled or a parent of this frame becoming enabled as enabling/disabling is inherited.

## OnDisabled

When the target frame becomes `Disabled`. This can occur by the frame itself becoming disabled or a parent of this frame becoming disabled as enabling/disabling is inherited.

## OnMouseDown

When the user clicks down on the mouse on the target frame (fires immediately when they click, does not wait for release).

## OnMouseUp

When the user releases the mouse button after clicking down on the target frame.

## OnMouseEnter

When the user's mouse enters the clickable area of the target frame (no clicking or releasing required, just hovering over).

## OnMouseExit

When the user's mouse exits the clickable area of the target frame (no clicking or releasing required, just hovering).

## OnMouseWheelIncrement

-

## OnMouseWheelDecrement

-

## OnClick

When the user clicks the target frame. Can only target `Control` frames or subtypes such as `Button`.

## OnDoubleClick

When the user doubleclicks the target frame. Can only target `Control` frames or subtypes such as `Button`.

## OnDragStart

Fires off the first time the user moves the mouse while holding down a click on the target control frame. Can only target `Control` frames or subtypes such as `Button`.

## OnDrag

Fires off every time the user moves the mouse while holding down a click on the target control frame. Can only target `Control` frames or subtypes such as `Button`.

## OnDragEnd

Fires off once the user lets go of the mouse click after executing a drag on the target control frame. Can only target `Control` frames or subtypes such as `Button`.

## OnKeyDown

NMI. Can only target `Control` frames or subtypes such as `Button`.

## OnKeyUp

NMI. Can only target `Control` frames or subtypes such as `Button`.

## OnKeyRepeat

NMI. Can only target `Control` frames or subtypes such as `Button`.

## OnFocusGained

-

## OnFocusLost

-

## Toggled

When the target frame's `Toggled` property enters the `True` state. Can only target frames with the `Toggled` property such as `Button`.

## Normal

When the target frame's `Toggled` property enters the `False` state. Can only target frames with the `Toggled` property such as `Button`.

## Pushed

When the target frame's `Pushed` property enters the `True` state. Can only target frames with the `Pushed` property such as `Button`.

## OnEnterPressed

`CEditBox` only