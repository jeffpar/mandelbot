---
permalink: /
mandelbots:
  - id: default
    widthView: 1024
    widthStyle: 100%
    palette: blue
    bigNumbers: false
    idStatus: status1
    idReset: reset1
    idPrevious: prev1
---

# Welcome to the Mandelbot Project

A single Mandelbot is shown below.  For more Mandelbots, see [Demos](/demos/).

Using a mouse or touch device, you can drag a rectangle around a region, and then click or tap inside the rectangle
to begin drawing the new region.  Click or tap outside the rectangle to cancel.

Re-center an image by clicking/tapping on the point to use as the new center, and use the `Reset` and `Previous` buttons
below the image to either start over or recalculate a previous image.

{% include mandelbot.html id="default" %}
