/**
 * @fileoverview Implements Mandelbots
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright (c) Jeff Parsons 2017
 *
 * This file is part of an open-source project (https://github.com/jeffpar/mandelbot) with no formal license.
 * All portions not licensed from other sources may be freely reused.  Any derivative work just needs to provide
 * attribution along with the above copyright.
 *
 * Portions copyright 2012 by Christian Stigen Larsen and licensed under [Apache License](http://www.apache.org/licenses/LICENSE-2.0),
 * Version 2.0.  Those portions are clearly identified in [mandelbot.js](https://github.com/jeffpar/mandelbot/blob/master/src/mandelbot.js)
 * and must be accompanied by the same Apache License if they are redistributed.
 */

"use strict";

// import * as BigNumber from "./bignumber/bignumber";

let idTimeout = 0;
let activeMandelbots = [];
let iNextMandelbot = 0;
let msTimeslice = (1000 / 60)|0;
let nMaxIterationsPerNumber = 100;      // default maximum iterations per number
let nMaxIterationsPerTimeslice;         // updated by a one-time call to calibrate() using normal numbers
let nMaxBigIterationsPerTimeslice;      // updated by a one-time call to calibrate() using BigNumbers instead

let DEBUG = false;

/**
 * @class Mandelbot
 * @unrestricted
 * @property {number} viewWidth
 * @property {number} viewHeight
 * @property {number} gridWidth
 * @property {number} gridHeight
 * @property {number|BigNumber} xCenter
 * @property {number|BigNumber} yCenter
 * @property {number|BigNumber} xDistance
 * @property {number|BigNumber} yDistance
 * @property {boolean} bigNumbers
 * @property {number} colorScheme
 * @property {number} nMaxIterations
 * @property {string} statusMessage
 * @property {Array.<number>} aResults
 * @property {HTMLCanvasElement} canvasView
 * @property {CanvasRenderingContext2D} contextView
 * @property {ImageData} imageGrid
 * @property {HTMLCanvasElement} canvasGrid
 * @property {CanvasRenderingContext2D} contextGrid
 * @property {number} colPos
 * @property {number} rowPos
 * @property {number|BigNumber} xLeft
 * @property {number|BigNumber} xInc
 * @property {number|BigNumber} yTop
 * @property {number|BigNumber} xInc
 * @property {number|BigNumber} xPos
 * @property {number|BigNumber} yPos
 */
class Mandelbot {
    /**
     * Mandelbot(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, bigNumbers, colorScheme, idStatus)
     *
     * The constructor records information about the View canvas (eg, its dimensions, 2D context, etc), and then
     * creates the internal Grid canvas using the supplied dimensions, which usually match the View canvas dimensions
     * but may differ if a different aspect ratio or scaling effect is desired.  See initView() and initGrid().
     *
     * Any of the four x,y coordinate parameters can be specified as numbers OR strings, because strings may be needed
     * to represent BigNumbers that can't be expressed as a 64-bit floating-point numbers.  If bigNumbers is true, then
     * those parameters are passed through to the BigNumber constructor as-is; otherwise, those parameters are coerced
     * to numbers using the unary "plus" operator.
     *
     * @this {Mandelbot}
     * @param {string} idCanvas (the id of an existing view canvas; required)
     * @param {number} [gridWidth] (grid canvas width; default is view canvas width)
     * @param {number} [gridHeight] (grid canvas height; default is view canvas height)
     * @param {number|string} [xCenter] (the x coordinate of the center of the initial image; default is -0.5)
     * @param {number|string} [yCenter] (the y coordinate of the center of the initial image; default is 0)
     * @param {number|string} [xDistance] (the distance from xCenter to the right and left sides of the initial image; default is 1.5)
     * @param {number|string} [yDistance] (the distance from yCenter to the top and bottom of the initial image; default is 1.5)
     * @param {boolean} [bigNumbers] (true to use BigNumbers for all floating-point calculations; default is false)
     * @param {number} [colorScheme] (one of the Mandelbot.COLORSCHEME values; default is GRAY)
     * @param {string} [idStatus] (the id of an existing status control, if any)
     */
    constructor(idCanvas, gridWidth = 0, gridHeight = 0, xCenter = -0.5, yCenter = 0, xDistance = 1.5, yDistance = 1.5, bigNumbers = false, colorScheme, idStatus)
    {
        if (!bigNumbers) {
            /*
             * Since the x,y parameters are allowed to be numbers OR strings, and since BigNumber support was
             * not requested, we coerce those parameters to numbers using the unary "plus" operator; if they are
             * are already numeric values, the operator has no effect, and if any value was negative, don't worry,
             * it will remain negative.
             */
            this.xCenter = +xCenter;
            this.yCenter = +yCenter;
            this.xDistance = Math.abs(+xDistance);
            this.yDistance = Math.abs(+yDistance);
        } else {
            this.xCenter = new BigNumber(xCenter);
            this.yCenter = new BigNumber(yCenter);
            this.xDistance = new BigNumber(xDistance).abs();
            this.yDistance = new BigNumber(yDistance).abs();
        }
        this.bigNumbers = bigNumbers;
        this.colorScheme = (colorScheme !== undefined? colorScheme : Mandelbot.COLORSCHEME.GRAY);
        this.nMaxIterations = Mandelbot.getMaxIterations(this.xDistance, this.yDistance);
        this.statusMessage = "X: " + this.xCenter + " (+/-" + this.xDistance + ") Y: " + this.yCenter + " (+/-" + this.yDistance + ") Iterations: " + this.nMaxIterations + (bigNumbers? " (BigNumbers)" : "");
        this.aResults = [0, 0, 0, 0];
        try {
            /*
             * Why the try/catch?  Bad things CAN happen here; for example, bogus dimensions can cause
             * the createImageData() call in initGrid() to barf.  So rather than trying to imagine every
             * possible failure here, let's just catch and display any errors.
             */
            if (this.initView(idCanvas) && this.initGrid(gridWidth || this.viewWidth, gridHeight || this.viewHeight)) {
                this.prepGrid();
            }
        } catch(err) {
            this.statusMessage = err.message;
        }
        if (idStatus) {
            this.status = document.getElementById(idStatus);
            if (this.status) this.status.textContent = this.statusMessage;
        }
    }

    /**
     * initView(idCanvas)
     *
     * @this {Mandelbot}
     * @param {string} idCanvas
     * @return {boolean}
     */
    initView(idCanvas)
    {
        this.canvasView = /** @type {HTMLCanvasElement} */ (document.getElementById(idCanvas));
        if (this.canvasView) {
            this.viewWidth = this.canvasView.width;
            this.viewHeight = this.canvasView.height;
            this.contextView = this.canvasView.getContext("2d");
            if (this.contextView) {
                /*
                 * TODO: Verify that this property really only has much (if any) effect when the View context has HIGHER
                 * resolution than the Grid context, and that it only makes sense on the View context; also, I'm not sure
                 * how many browsers really support it, and which browsers require special prefixes on the property (eg,
                 * 'mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', etc).  Finally, if it's possible that some users
                 * really WANT to produce low-res "fuzzy" images, then consider adding a parameter to control this setting.
                 *
                 * Refer to: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
                 */
                this.contextView['imageSmoothingEnabled'] = false;
                this.initTouch(this.canvasView);
                return true;
            }
        }
        this.statusMessage = "Missing view canvas";
        return false;
    }

    /**
     * initGrid(gridWidth, gridHeight)
     *
     * @this {Mandelbot}
     * @param {number} gridWidth
     * @param {number} gridHeight
     * @return {boolean}
     */
    initGrid(gridWidth, gridHeight)
    {
        this.imageGrid = this.contextView.createImageData(gridWidth, gridHeight);
        if (this.imageGrid) {
            this.canvasGrid = /** @type {HTMLCanvasElement} */ (document.createElement("canvas"));
            if (this.canvasGrid) {
                this.canvasGrid.width = this.gridWidth = gridWidth;
                this.canvasGrid.height = this.gridHeight = gridHeight;
                if (this.contextGrid = this.canvasGrid.getContext("2d")) {
                    return true;
                }
            }
        }
        this.statusMessage = "Unable to create grid canvas";
        return false;
    }

    /**
     * initTouch(control)
     *
     * @this {Mandelbot}
     * @param {HTMLCanvasElement} control
     */
    initTouch(control)
    {
        let mandelbot = this;

        if (!this.controlTouch) {
            this.controlTouch = control;

            control.addEventListener(
                'touchstart',
                function onTouchStart(event) { mandelbot.processTouchEvent(event, true); },
                false                   // we'll specify false for the 'useCapture' parameter for now...
            );
            control.addEventListener(
                'touchmove',
                function onTouchMove(event) { mandelbot.processTouchEvent(event); },
                true
            );
            control.addEventListener(
                'touchend',
                function onTouchEnd(event) { mandelbot.processTouchEvent(event, false); },
                false                   // we'll specify false for the 'useCapture' parameter for now...
            );

            /*
             * Using desktop mouse events to simulate touch events should only be enabled as needed.
             */
            if (DEBUG) {
                control.addEventListener(
                    'mousedown',
                    function onMouseDown(event) { mandelbot.processTouchEvent(event, true); },
                    false               // we'll specify false for the 'useCapture' parameter for now...
                );
                control.addEventListener(
                    'mousemove',
                    function onMouseMove(event) { if (mandelbot.xTouch >= 0) mandelbot.processTouchEvent(event); },
                    true
                );
                control.addEventListener(
                    'mouseup',
                    function onMouseUp(event) { mandelbot.processTouchEvent(event, false); },
                    false               // we'll specify false for the 'useCapture' parameter for now...
                );
            }

            this.xTouch = this.yTouch = -1;

            /*
             * As long as fTouchDefault is false, we call preventDefault() on every touch event, to prevent
             * the page from moving/scrolling while the canvas is processing touch events.  However, there must
             * also be exceptions to permit the soft keyboard to activate; see processTouchEvent() for details.
             */
            this.fTouchDefault = false;
        }
    }

    /**
     * processTouchEvent(event, fStart)
     *
     * If nTouchConfig is non-zero, touch event handlers are installed, which pass their events to this function.
     *
     * What we do with those events here depends on the value of nTouchConfig.  Originally, the only supported
     * configuration was the experimental conversion of touch events into arrow keys, based on an invisible grid
     * that divided the screen into thirds; that configuration is now identified as Video.TOUCH.KEYGRID.
     *
     * The new preferred configuration is Video.TOUCH.MOUSE, which does little more than allow you to "push" the
     * simulated mouse around.  If Video.TOUCH.MOUSE is enabled, it's already been confirmed the machine has a mouse.
     *
     * @this {Mandelbot}
     * @param {Event} event object from a 'touch' event
     * @param {boolean} [fStart] (true if 'touchstart', false if 'touchend', undefined if 'touchmove')
     */
    processTouchEvent(event, fStart)
    {
        let xTouch, yTouch;

        // if (!event) event = window.event;

        /*
         * Touch coordinates (that is, the pageX and pageY properties) are relative to the page, so to make
         * them relative to the canvas, we must subtract the canvas's left and top positions.  This Apple web page:
         *
         *      https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingMouseandTouchControlstoCanvas/AddingMouseandTouchControlstoCanvas.html
         *
         * makes it sound simple, but it turns out we have to walk the canvas' entire "parentage" of DOM elements
         * to get the exact offsets.
         *
         * TODO: Determine whether the getBoundingClientRect() code used in panel.js for mouse events can also
         * be used here to simplify this annoyingly complicated code for touch events.
         */
        let xTouchOffset = 0;
        let yTouchOffset = 0;
        let control = this.controlTouch;

        do {
            if (!isNaN(control.offsetLeft)) {
                xTouchOffset += control.offsetLeft;
                yTouchOffset += control.offsetTop;
            }
        } while ((control = control.offsetParent));

        /*
         * Due to the responsive nature of our pages, the displayed size of the canvas may be smaller than the
         * allocated size, and the coordinates we receive from touch events are based on the currently displayed size.
         */
        let xScale =  this.viewWidth / this.controlTouch.offsetWidth;
        let yScale = this.viewHeight / this.controlTouch.offsetHeight;

        /**
         * @name Event
         * @property {Array} targetTouches
         */
        if (!event.targetTouches || !event.targetTouches.length) {
            xTouch = event.pageX;
            yTouch = event.pageY;
        } else {
            xTouch = event.targetTouches[0].pageX;
            yTouch = event.targetTouches[0].pageY;
        }

        xTouch = Math.round((xTouch - xTouchOffset) * xScale);
        yTouch = Math.round((yTouch - yTouchOffset) * yScale);

        if (!this.fTouchDefault) event.preventDefault();

        this.xTouch = xTouch;
        this.yTouch = yTouch;

        if (DEBUG) {
            console.log("processTouchEvent(" + (fStart? "touchStart" : (fStart === false? "touchEnd" : "touchMove")) + ",x=" + this.xTouch + ",y=" + this.yTouch);
        }

        if (fStart === false) {
            this.xTouch = this.yTouch = -1;
        }
    }

    /**
     * prepGrid()
     *
     * Prepares colPos and rowPos (the next position on the grid to be updated), along with xPos and yPos
     * (the x and y coordinates associated with that grid position) and xInc and yInc, the intermediate
     * incremental x and y values that are constant for the duration of the next overall updateGrid() operation.
     *
     * @this {Mandelbot}
     */
    prepGrid()
    {
        this.colPos = this.rowPos = 0;
        if (!this.bigNumbers) {
            this.xLeft = this.xCenter - this.xDistance;
            this.xInc = (this.xDistance * 2) / this.gridWidth;
            this.yTop = this.yCenter + this.yDistance;
            this.yInc = (this.yDistance * 2) / this.gridHeight;
            this.xPos = this.xLeft;
            this.yPos = this.yTop;
        } else {
            this.xLeft = this.xCenter.minus(this.xDistance);
            this.xInc = this.xDistance.times(2).dividedBy(this.gridWidth).round(20);
            this.yTop = this.yCenter.plus(this.yDistance);
            this.yInc = this.yDistance.times(2).dividedBy(this.gridHeight).round(20);
            this.xPos = this.xLeft.plus(0);     // simple way of generating a new BigNumber with the same value
            this.yPos = this.yTop.plus(0);
        }
    }

    /**
     * updateGrid()
     *
     * Continues updating the Mandelbot's grid where we left off, until either the entire grid has been updated OR
     * we have exhausted the maximum number of iterations allowed for the current timeslice.
     *
     * @this {Mandelbot}
     * @return {boolean} (true if grid was updated, false if no change)
     */
    updateGrid()
    {
        let fUpdated = false;
        let colDirty = this.colPos;
        let rowDirty = this.rowPos;
        let colsDirty = 0, rowsDirty = 0;
        let nMaxIterationsTotal = Math.floor((this.bigNumbers? nMaxBigIterationsPerTimeslice : nMaxIterationsPerTimeslice) / activeMandelbots.length);
        while (this.rowPos < this.gridHeight) {
            while (nMaxIterationsTotal > 0 && this.colPos < this.gridWidth) {
                let m = this.nMaxIterations;
                let n = Mandelbot.isMandelbrot(this.xPos, this.yPos, m, this.aResults);
                this.setGridPixel(this.rowPos, this.colPos, Mandelbot.getColor(this.colorScheme, this.aResults));
                if (!this.bigNumbers) {
                    this.xPos += this.xInc;
                } else {
                    this.xPos = this.xPos.plus(this.xInc);
                }
                this.colPos++;
                if (!rowsDirty) colsDirty++;
                nMaxIterationsTotal -= (m - n);
                fUpdated = true;
            }
            if (nMaxIterationsTotal <= 0) break;
            this.colPos = 0;
            if (!this.bigNumbers) {
                this.xPos = this.xLeft;
                this.yPos -= this.yInc;
            } else {
                this.xPos = this.xLeft.plus(0);
                this.yPos = this.yPos.minus(this.yInc);
            }
            this.rowPos++;
            rowsDirty++;
            colDirty = 0; colsDirty = this.gridWidth;
        }
        if (fUpdated) {
            if (this.colPos > 0) rowsDirty++;
            this.drawGrid(colDirty, rowDirty, colsDirty, rowsDirty);
        }
        return fUpdated;
    }

    /**
     * drawGrid(colDirty, rowDirty, colsDirty, rowsDirty)
     *
     * @this {Mandelbot}
     * @param {number} [colDirty]
     * @param {number} [rowDirty]
     * @param {number} [colsDirty]
     * @param {number} [rowsDirty]
     */
    drawGrid(colDirty = 0, rowDirty = 0, colsDirty = this.gridWidth, rowsDirty = this.gridHeight)
    {
        this.contextGrid.putImageData(this.imageGrid, 0, 0, colDirty, rowDirty, colsDirty, rowsDirty);
        this.contextView.drawImage(this.canvasGrid, 0, 0, this.gridWidth, this.gridHeight, 0, 0, this.viewWidth, this.viewHeight);
    }

    /**
     * setGridPixel(row, col, nRGB)
     *
     * @this {Mandelbot}
     * @param {number} row
     * @param {number} col
     * @param {number} nRGB
     */
    setGridPixel(row, col, nRGB)
    {
        let i = (row * this.gridWidth + col) * 4;
        this.imageGrid.data[i] = nRGB & 0xff;
        this.imageGrid.data[i+1] = (nRGB >> 8) & 0xff;
        this.imageGrid.data[i+2] = (nRGB >> 16) & 0xff;
        this.imageGrid.data[i+3] = 0xff;
    }

    /**
     * calibrate(nIterationsStart, nCalibrations, bigNumbers)
     *
     * Estimate how many isMandelbrot() iterations can be performed in TIMESLICE milliseconds.
     * The process starts by performing the half the default (maximum) number of iterations for
     * a single Mandelbrot number.  Then it doubles the number of iterations until TIMESLICE
     * is equaled or exceeded.
     *
     * @param {number} [nIterationsStart]
     * @param {number} [nCalibrations]
     * @param {boolean} [bigNumbers]
     * @return {number} (of operations to perform before yielding)
     */
    static calibrate(nIterationsStart = 0, nCalibrations = 1, bigNumbers = false)
    {
        let nIterationsAvg = 0, nLoops = 0;
        do {
            let nIterationsTotal = 0;
            let msStart = Date.now(), msTotal;
            let nIterationsInc = (nMaxIterationsPerNumber / 2)|0;
            do {
                nIterationsInc *= 2;
                let x = bigNumbers? new BigNumber(-0.5) : -0.5;
                let y = bigNumbers? new BigNumber(0) : 0;
                let n = Mandelbot.isMandelbrot(x, y, nIterationsStart + nIterationsInc);
                msTotal = Date.now() - msStart;
                if (msTotal >= msTimeslice) break;
                nIterationsTotal += (nIterationsStart + nIterationsInc) - n;
                nIterationsStart = 0;
            } while (true);
            nIterationsAvg += nIterationsTotal;
            if (nCalibrations) nIterationsStart = Math.floor(nIterationsTotal / nCalibrations);
            nLoops++;
        } while (--nCalibrations > 0);
        return Math.floor(nIterationsAvg / nLoops);
    }

    /**
     * isMandelbrot(x, y, nMax, aResults)
     *
     * This is where the magic happens.  As https://en.wikipedia.org/wiki/Mandelbrot_set explains:
     *
     *      The Mandelbrot set is the set of complex numbers c for which the function f(z) = z^2 + c does not
     *      diverge when iterated from z = 0.
     *
     *      Mandelbrot set images may be created by sampling the complex numbers and determining, for each sample
     *      point c, whether the result of iterating the above function goes to infinity.  Treating the real and
     *      imaginary parts of c as image coordinates (x + yi) on the complex plane, pixels may then be colored
     *      according to how rapidly the sequence z^2 + c diverges, with the color 0 (black) usually used for points
     *      where the sequence does not diverge.
     *
     * @param {number|BigNumber} x
     * @param {number|BigNumber} y
     * @param {number} [nMax] (iterations)
     * @param {Array.<number>} [aResults] (optional buffer to return additional data)
     * @return {number} (of iterations remaining, 0 if presumed to be in the Mandelbrot set)
     */
    static isMandelbrot(x, y, nMax, aResults)
    {
        nMax = nMax || nMaxIterationsPerNumber;
        let n = nMax;
        /*
         * Let's restate the Mandelbrot function slightly, using z{n} to indicate the nth iteration of z:
         *
         *      z{n+1} = z{n}^2 + c
         *
         * z is a complex number of the form (a + bi), where a and b are real and imaginary coefficients; ditto for c.
         *
         * z{0}, the initial z, is (0 + 0i), and the coefficients for c are passed to us: (x + yi).
         *
         * The n+1 iteration requires that we calculate the square of the nth iteration, which means squaring (a + bi):
         *
         *      (a + bi) * (a + bi)
         *
         * which expands to:
         *
         *      (a * a) + (2 * a * b * i) + (b * i * b * i)
         *
         * which can be simplified (since i * i = -1):
         *
         *      (a * a) + (2 * a * b * i) - (b * b)
         *
         * So the real and imaginary coefficients for z{n+1}, after adding c, which we said was (x + yi), are:
         *
         *      a{n+1} = (a * a) - (b * b) + x
         *      b{n+1} = (2 * a * b) + y
         *
         * We also need to know the magnitude of this result, because if the magnitude equals or exceeds 2, then the
         * number is not part of the Mandelbrot set (ie, it has "escaped").
         *
         * The magnitude, m, comes from the Pythagorean theorem:
         *
         *      m = Math.sqrt(a^2 + b^2)
         *
         * To avoid a sqrt() operation, we can simply calculate m = (a * a) + (b * b) and compare that to 4 instead;
         * happily, we've already calculated (a * a) and (b * b), so calculating m is just an additional, um, addition.
         *
         * TODO: I need to find something conclusive regarding whether the "escape" criteria is >= 2 or > 2.  The code
         * assumes the former, in part because this is what the original Scientific American article from August 1985 said:
         *
         *      A straightforward result in the theory of complex-number iterations guarantees that the iterations
         *      will drive z to infinity if and only if at some stage z reaches a size of 2 or greater.
         *
         * so I'm sticking with that (although, admittedly, the article is not 100% consistent on this point).
         */
        let aa = 0, bb = 0;
        if (typeof x == "number") {
            let a = 0, b = 0, m;
            do {
                b = 2 * a * b + y;
                a = aa - bb + x;
                m = (aa = a * a) + (bb = b * b);
            } while (--n > 0 && m < 4);
            if (n && aResults) {
                let l = 4;  // iterate a few (4) more times to provide more detail; see http://linas.org/art-gallery/escape/escape.html
                do {
                    b = 2 * a * b + y;
                    a = aa - bb + x;
                    aa = a * a; bb = b * b;
                } while (--l > 0);
            }
        } else {
            let a = new BigNumber(0), b = new BigNumber(0), ta = new BigNumber(0), tb = new BigNumber(0);
            do {
                b = a.times(b).times(2).plus(y).round(20);
                a = ta.minus(tb).plus(x);
                ta = a.times(a).round(20);
                tb = b.times(b).round(20);
            } while (--n > 0 && ta.plus(tb).lt(4));
            if (n && aResults) {
                let l = 4;  // iterate a few (4) more times to provide more detail; see http://linas.org/art-gallery/escape/escape.html
                do {
                    b = a.times(b).times(2).plus(y).round(20);
                    a = ta.minus(tb).plus(x);
                    ta = a.times(a).round(20);
                    tb = b.times(b).round(20);
                } while (--l > 0);
                aa = ta.toNumber();
                bb = tb.toNumber();
            }
        }
        /*
         * If a results array is provided, we fill it in with:
         *
         *      [0]: the number of iterations specified (ie, the maximum)
         *      [1]: the number of iterations remaining (if 0, then presumed to be in the Mandelbrot set)
         *      [2]: the last square calculated for the real portion of the last z
         *      [3]: the last square calculated for the imaginary portion of the last z
         *
         * Callers generally only care about the second value (which is the same as the function's return value),
         * but all four values provide additional information about "how close" the number is to the Mandelbrot set.
         */
        if (aResults) {
            aResults[0] = nMax;
            aResults[1] = n;
            aResults[2] = aa;
            aResults[3] = bb;
        }
        return n;
    }

    /**
     * getColor(colorScheme, aResults)
     *
     * Adapted from code in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @param {number} colorScheme
     * @param {Array.<number>} aResults
     * @return {number}
     */
    static getColor(colorScheme, aResults)
    {
        let nRGB = 0;           // 0 is black (0x000000), used for numbers in the Mandelbrot set

        if (aResults[1]) {      // if the number is NOT in the Mandelbrot set, then choose another color

            let v = Mandelbot.getSmoothColor(aResults);

            switch (colorScheme) {
            case Mandelbot.COLORSCHEME.BW:
            default:
                nRGB = -1;      // -1 is white (0xffffff)
                break;
            case Mandelbot.COLORSCHEME.HSV1:
                nRGB = Mandelbot.getRGBFromHSV(360 * v / aResults[0], 1.0, 1.0);
                break;
            case Mandelbot.COLORSCHEME.HSV2:
            case Mandelbot.COLORSCHEME.HSV3:
                nRGB = Mandelbot.getRGBFromHSV(360 * v / aResults[0], 1.0, 10.0 * v / aResults[0]);
                if (colorScheme == 3) {
                    nRGB = (nRGB & 0xff00ff00) | ((nRGB >> 16) & 0xff) | ((nRGB & 0xff) << 16);     // swap red and blue
                }
                break;
            case Mandelbot.COLORSCHEME.GRAY:
                v = Math.floor(512.0 * v / aResults[0]);
                if (v > 0xff) v = 0xff;
                nRGB = v | (v << 8) | (v << 16);
                break;
            }
        }
        return nRGB;
    }

    /**
     * getMaxIterations(xDistance, yDistance)
     *
     * Adapted from code in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @param {number} xDistance
     * @param {number} yDistance
     * @return {number}
     */
    static getMaxIterations(xDistance, yDistance)
    {
        return Math.floor(223.0 / Math.sqrt(0.001 + 4.0 * Math.min(xDistance, yDistance)));
    }

    /**
     * getRGBFromHSV(h, s, v)
     *
     * Adapted from hsv_to_rgb() in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @param {number} h (0 to 360)
     * @param {number} s (0.0 to 1.0)
     * @param {number} v (0.0 to 1.0)
     * @return {number}
     */
    static getRGBFromHSV(h, s, v)
    {
        if (v > 1.0) v = 1.0;

        let hp = h / 60.0;
        let c = v * s;
        let x = c * (1 - Math.abs((hp % 2) - 1));

        let r = 0, g = 0, b = 0;
        if (hp < 1) {
            r = c; g = x;
        } else if (hp < 2) {
            r = x; g = c;
        } else if (hp < 3) {
            g = c; b = x;
        } else if (hp < 4) {
            g = x; b = c;
        } else if (hp < 5) {
            r = x; b = c;
        } else {
            r = c; b = x;
        }

        let m = v - c;
        r = (r + m) * 255;
        g = (g + m) * 255;
        b = (b + m) * 255;

        return (r & 0xff) | ((g & 0xff) << 8) | ((b & 0xff) << 16);
    }

    /**
     * getSmoothColor(aResults)
     *
     * Adapted from smoothColor() in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @param {Array.<number>} aResults
     * @return {number}
     */
    static getSmoothColor(aResults)
    {
        let n = aResults[0] - aResults[1];
        return 5 + n - Mandelbot.LOG_HALFBASE - Math.log(Math.log(aResults[2] + aResults[3])) * Mandelbot.LOG_BASE;
    }
}

Mandelbot.COLORSCHEME = {
    BW:     0,  // B&W
    HSV1:   1,  // HSV1
    HSV2:   2,  // HSV2
    HSV3:   3,  // HSV3
    GRAY:   4   // GRAYSCALE
};

Mandelbot.LOG_BASE = 1.0 / Math.log(2.0);
Mandelbot.LOG_HALFBASE = Math.log(0.5) * Mandelbot.LOG_BASE;

nMaxIterationsPerTimeslice = Mandelbot.calibrate(0, 8);
nMaxBigIterationsPerTimeslice = Mandelbot.calibrate(0, 8, true);

/**
 * initMandelbot(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, bigNumbers, colorScheme, idStatus, fAutoUpdate)
 *
 * Global function for creating new Mandelbots.
 *
 * @param {string} idCanvas
 * @param {number} [gridWidth]
 * @param {number} [gridHeight]
 * @param {number|string|undefined} [xCenter]
 * @param {number|string|undefined} [yCenter]
 * @param {number|string|undefined} [xDistance]
 * @param {number|string|undefined} [yDistance]
 * @param {boolean} [bigNumbers]
 * @param {number|undefined} [colorScheme]
 * @param {string} [idStatus]
 * @param {boolean} [fAutoUpdate] (true to add the Mandelbot to the set of automatically updated Mandelbots)
 * @return {Mandelbot}
 */
function initMandelbot(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, bigNumbers, colorScheme, idStatus, fAutoUpdate = true)
{
    let mandelbot = new Mandelbot(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, bigNumbers, colorScheme, idStatus);
    if (fAutoUpdate) addMandelbot(mandelbot);
    return mandelbot;
}

/**
 * addMandelbot(mandelbot)
 *
 * Adds the Mandelbot to the array of auto-updated Mandelbots.  initMandelbot() does this automatically, unless told otherwise.
 *
 * @param {Mandelbot} mandelbot
 */
function addMandelbot(mandelbot)
{
    activeMandelbots.push(mandelbot);
    updateMandelbots(true);
}

/**
 * updateMandelbots(fInit)
 *
 * setTimeout() handler for updating all Mandelbots.  addMandelbot() does this automatically to ensure an update has been scheduled.
 *
 * @param {boolean} [fInit]
 */
function updateMandelbots(fInit)
{
    if (!fInit) {
        idTimeout = 0;
        let nMandelbots = activeMandelbots.length;
        while (nMandelbots--) {
            let mandelbot = activeMandelbots[iNextMandelbot];
            if (mandelbot.updateGrid()) {
                /*
                 * Since the grid was updated, we set the fInit flag to ensure that at least one more updateMandelbots()
                 * call will be scheduled via setTimeout().  Even though it's possible that the grid was FULLY updated,
                 * I'm happy to wait until the next updateMandelbots() call to find that out; updateGrid() will then report
                 * there was nothing to update, and once ALL the grids on the page report the same thing, we'll stop
                 * scheduling these calls.
                 */
                fInit = true;
            }
            if (++iNextMandelbot >= activeMandelbots.length) iNextMandelbot = 0;
        }
    }
    /*
     * Schedule a new call for immediate execution if there were any updates (otherwise, we assume all our work is done).
     */
    if (fInit && !idTimeout) {
        idTimeout = setTimeout(updateMandelbots, 0);
    }
}

window['initMandelbot'] = initMandelbot;
