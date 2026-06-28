Keys determine the actions of a controller along its timeline. All keys must specify a time in seconds. Most controllers will only accept one type of key. Most controllers use Curve keys, but many do not.
___

## type

The "type" attribute in the context of a controller or key specifies the kind of action that will be applied.

## time

The "time" attribute in a key denotes the exact moment, usually in seconds, when the key's properties or actions should be applied

## timeinc

The "timeinc" attribute in a key specifies the incremental time value relative to the previous key. Instead of defining an absolute time, it indicates how much time should pass after the previous key. This makes it easier to adjust animations without recalculating absolute times for each key.

## in

This specifies the easing function for the beginning of the transition. The easing function will affect how the animation starts, typically by accelerating smoothly.
Example: in="Auto" means that the animation will start with the Auto easing function.

## out

This specifies the easing function for the end of the transition. The easing function will affect how the animation ends, typically by decelerating smoothly.
Example: out="Linear" means that the animation will end with the Linear easing function.

## inout

This specifies the easing function for both the beginning and the end of the transition. The easing function will affect how the animation starts and ends, providing a smooth transition that accelerates at the start and decelerates at the end.
Example: inout="Auto,Linear" means that the animation will start with the Auto easing function and end with the Linear easing function.

## direction

Specifically for the sound controllers. Determines what sound will be played when the animation is playing forward or reversed.
