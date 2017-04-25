---
permalink: /
mandelbots:
  - id: mandelbot1
    widthView: 1024
    heightView: 1024
    widthStyle: 100%
    colorScheme: Mandelbot.COLOR_SCHEME.HSV3
    bigNumbers: false
    idStatus: status1
    idReset: reset1
    idPrevious: prev1
---

Welcome to Mandelbot
--------------------

This page demonstrates a single Mandelbot.  Using a mouse or touch device, you can drag a rectangle around a region,
and then click or tap inside the rectangle to begin drawing the new region. 

{% include mandelbot.html id="mandelbot1" %}
