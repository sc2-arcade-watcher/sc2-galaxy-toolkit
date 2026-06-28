TBD

___

## name

TBD

## template

TBD

## file

TBD

## speed

TBD

Speed factor (defaults to `1`). Can be a negative value, which makes it play in reverse.

## flags

TBD

___

## Event

Specifies to what events animation will respond to, and what actions to perform.

## Driver

Specifies driver of the animation timeline, as an alternative/addition to standard clock time.

## Controller

Executive part of animation. It can alter various properties depending on the type of controller.

Controllers drive what the animation actually does, whether it shows/hides something, moves it around the screen or changes its color. There are many different controllers to achieve different things and the list continues to grow over time. There are quite a few components to individual controllers, but the primary attributes are `Type`, `End` and `Frame`. You can also give controllers a `Name` which is useful for overriding templated animations. Many controllers will have additional attributes specific to that type of controller. Inside a controller you will find a sequence of "Keys" which perform specific actions at specific times in the controller's timeline.