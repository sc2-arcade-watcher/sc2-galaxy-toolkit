___

## A

First operand

## B

Second operand

## Operator

Type of math operation

The is the Operator of a MathFrame. It is a required field for the frame to give a result.

It can have the following values: Add, Subtract, Multiply, Divide, Negate, Modulo, Absolute, Random

When calculating the results if the value of Operator is Add, Subtract, Multiply, Divide, or Modulo: it does `A` __(Operator)__ `B`.

If the value is Negate, the result is -1 * A

If the value is Absolute, the result is the absolute value of A

If it's random, the result is a random value between A and B. This value will change only if the input values change.

## Result

The is the result value of a MathFrame given as a decimal value. This is a READ-ONLY value.

## ResultCeil

This is the value of Result rounded up.

## ResultInt

The is the result value of a MathFrame given as an integer value. This is a READ-ONLY value.

## ResultRound

This is the value of Result rounded to the nearest integer value.

## ResultValid

The ResultValid is given as a Boolean value.

This will be true if you are not dividing by 0 or B < A for a random generator.
