# Color Picker

This color picker is built from looking at the color picker on [DuckDuckGo](https://duckduckgo.com/?q=hsv+to+rgb&ia=answer).

On the left side is a square with a color in the upper right, white in the upper left, and black on the bottom. On the right side of that is a bar with the different color hues. To the right of that are colors.

Moving in the square in the left to the upper right, S and V in HSV get set to zero. Selecting the red at the top of the hue bar, the RGB gets set to 255, 0, 0. Then moving down, this can be observed:

- It starts with all red. RGB is 255, 0, 0 and hue is 0
- Green gets added to red. RGB is 255, 255, 0 and hue is 60
- The red gets removed, leaving just green. RGB is 0, 255, 0 and hue is 120
- Blue gets added to green. RGB is 0, 255, 255 and hue is 180.
- The green gets removed, leaving just blue. RGB is 0, 0, 255 and hue is 240.
- Red gets added to blue. RGB is 255, 0, 255 and hue is 300.
- The blue gets removed, leaving just red. RGB is back to 255, 0, 0 and the hue is 0.

On the left side, saturation and value can be identified. On the left side, it is white to black, indicating that from left to right the saturation goes from 0 to 100. The remaining is value. It goes 0 to 100 from bottom to top.