/**
 * @fileoverview Implements Mandelbots
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright (c) Jeff Parsons 2017
 *
 * This file is part of an open-source project (https://github.com/jeffpar/mandelbot) with no formal
 * license.  It may be freely reused.  Any derivative work just needs to provide attribution along with
 * the above copyright.
 */

"use strict";

let idTimeout = null;
let msTimeslice = (1000 / 60)|0;
let nMaxIterationsPerNumber = 100;      // the default value per number
let nMaxIterationsPerViewport;          // this is updated by addViewport()
let nMaxIterationsPerTimeslice;         // this is updated by calibrate()
let activeViewports = [];
let iNextViewport = 0;

let LOG_BASE = 1.0 / Math.log(2.0);
let LOG_HALFBASE = Math.log(0.5) * LOG_BASE;

/**
 * @class Viewport
 * @unrestricted
 */
class Viewport {
    /**
     * Viewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, idStatus)
     *
     * The constructor records information about the View canvas (eg, its dimensions, 2D context, etc), and then
     * creates the internal Grid canvas using the supplied dimensions, which usually match the View canvas dimensions
     * but may differ if a different aspect ratio or scaling effect is desired.  See initView() and initGrid().
     *
     * @this {Viewport}
     * @param {string} idCanvas (the id of an existing view canvas; required)
     * @param {number} [gridWidth] (grid canvas width; default is view canvas width)
     * @param {number} [gridHeight] (grid canvas height; default is view canvas height)
     * @param {number} [xCenter]
     * @param {number} [yCenter]
     * @param {number} [xDistance]
     * @param {number} [yDistance]
     * @param {string} [idStatus] (the id of an existing status control, if any)
     */
    constructor(idCanvas, gridWidth = 0, gridHeight = 0, xCenter = -0.5, yCenter = 0, xDistance = 1, yDistance = 1, idStatus = "")
    {
        this.xCenter = xCenter;
        this.yCenter = yCenter;
        this.xDistance = xDistance;
        this.yDistance = yDistance;
        this.aResults = [0, 0, 0, 0];
        this.nColorMode = 4;
        this.nMaxIterations = nMaxIterationsPerNumber;
        this.statusMessage = "max iterations per " + msTimeslice + "ms timeslice: " + nMaxIterationsPerTimeslice;
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
            if (this.status) {
                this.status.innerHTML = this.statusMessage;     // new BigNumber(42).toString();
            }
        }
    }

    /**
     * initView(idCanvas)
     *
     * @this {Viewport}
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
                return true;
            }
        }
        this.statusMessage = "Missing view canvas";
        return false;
    }

    /**
     * initGrid(gridWidth, gridHeight)
     *
     * @this {Viewport}
     * @param {number} gridWidth
     * @param {number} gridHeight
     * @return {boolean}
     */
    initGrid(gridWidth, gridHeight)
    {
        this.imageGrid = this.contextView.createImageData(gridWidth, gridHeight);
        if (this.imageGrid) {
            this.canvasGrid = document.createElement("canvas");
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
     * prepGrid()
     *
     * Prepares colPos and rowPos (the next position on the grid to be updated), along with xPos and yPos
     * (the x and y coordinates associated with that grid position) and the intermediate incremental x and y
     * values that are constant for the duration of the next overall updateGrid() operation.
     *
     * @this {Viewport}
     */
    prepGrid()
    {
        this.colPos = this.rowPos = 0;
        this.xLeft = this.xCenter - this.xDistance;
        this.xInc = (this.xDistance * 2) / this.gridWidth;
        this.yTop = this.yCenter + this.yDistance;
        this.yInc = (this.yDistance * 2) / this.gridHeight;
        this.xPos = this.xLeft;
        this.yPos = this.yTop;
    }

    /**
     * updateGrid()
     *
     * Continues updating the Viewport's grid at the point where the last call left off.
     *
     * @this {Viewport}
     * @return {boolean} (true if grid was updated, false if no change)
     */
    updateGrid()
    {
        let fUpdated = false;
        let xDirty = this.colPos;
        let yDirty = this.rowPos;
        let cxDirty = 0, cyDirty = 0;
        let nMaxIterationsTotal = nMaxIterationsPerViewport;
        while (this.rowPos < this.gridHeight) {
            while (nMaxIterationsTotal > 0 && this.colPos < this.gridWidth) {
                let m = this.nMaxIterations;
                let n = Viewport.isMandelbrot(this.xPos, this.yPos, m, this.aResults);
                this.setGridPixel(this.rowPos, this.colPos, this.getColor(this.aResults));
                this.xPos += this.xInc; this.colPos++;
                if (!cyDirty) cxDirty++;
                nMaxIterationsTotal -= (m - n);
                fUpdated = true;
            }
            if (nMaxIterationsTotal <= 0) break;
            this.xPos = this.xLeft; this.colPos = 0;
            this.yPos -= this.yInc; this.rowPos++;
            xDirty = 0; cxDirty = this.gridWidth;
            cyDirty++;
        }
        if (fUpdated) {
            if (!cyDirty) cyDirty++;
            this.drawGrid(xDirty, yDirty, cxDirty, cyDirty);
        }
        return fUpdated;
    }

    /**
     * drawGrid(xDirty, yDirty, cxDirty, cyDirty)
     *
     * @this {Viewport}
     * @param {number} [xDirty]
     * @param {number} [yDirty]
     * @param {number} [cxDirty]
     * @param {number} [cyDirty]
     */
    drawGrid(xDirty = 0, yDirty = 0, cxDirty = this.gridWidth, cyDirty = this.gridHeight)
    {
        this.contextGrid.putImageData(this.imageGrid, 0, 0, xDirty, yDirty, cxDirty, cyDirty);
        this.contextView.drawImage(this.canvasGrid, 0, 0, this.gridWidth, this.gridHeight, 0, 0, this.viewWidth, this.viewHeight);
    }

    /**
     * setGridPixel(row, col, nRGB)
     *
     * @this {Viewport}
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

    /*
     * getColor(aResults)
     *
     * Adapted from code in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @this {Viewport}
     * @param {Array.<number>} aResults
     * @return {number}
     */
    getColor(aResults)
    {
        let nRGB = 0;

        if (aResults[1]) {

            let v = Viewport.getSmoothColor(aResults);

            switch (this.nColorMode) {
            case 0:     // B&W
                nRGB = -1;
                break;
            case 1:     // HSV1
                nRGB = Viewport.getRGBFromHSV(360 * v / aResults[0], 1.0, 1.0);
                break;
            case 2:     // HSV2
            case 3:     // HSV3
                nRGB = Viewport.getRGBFromHSV(360 * v / aResults[0], 1.0, 10.0 * v / aResults[0]);
                if (this.nColorMode == 3) {
                    nRGB = (nRGB & 0xff00ff00) | ((nRGB >> 16) & 0xff) | ((nRGB & 0xff) << 16);     // swap red and blue
                }
                break;
            case 4:     // GREYSCALE
                v = Math.floor(512.0 * v / aResults[0]);
                if (v > 0xff) v = 0xff;
                nRGB = v | (v << 8) | (v << 16);
                break;
            }
        }
        return nRGB;
    }

    /**
     * calibrate(nIterationsStart, nCalibrations)
     *
     * Estimate how many isMandelbrot() iterations can be performed in TIMESLICE milliseconds.
     * The process starts by performing the half the default (maximum) number of iterations for
     * a single Mandelbrot number.  Then it doubles the number of iterations until TIMESLICE
     * is equaled or exceeded.
     *
     * @param {number} [nIterationsStart]
     * @param {number} [nCalibrations]
     * @return {number} (of operations to perform before yielding)
     */
    static calibrate(nIterationsStart = 0, nCalibrations = 1)
    {
        let nIterationsAvg = 0, nLoops = 0;
        do {
            let nIterationsTotal = 0;
            let msStart = Date.now(), msTotal;
            let nIterationsInc = (nMaxIterationsPerNumber / 2)|0;
            do {
                nIterationsInc *= 2;
                let n = Viewport.isMandelbrot(-0.5, 0, nIterationsStart + nIterationsInc);
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
     *      The Mandelbrot set is the set of complex numbers c for which the function f(z) = z^2 +c does not
     *      diverge when iterated from z = 0.
     *
     *      Mandelbrot set images may be created by sampling the complex numbers and determining, for each sample
     *      point c, whether the result of iterating the above function goes to infinity.  Treating the real and
     *      imaginary parts of c as image coordinates (x + yi) on the complex plane, pixels may then be colored
     *      according to how rapidly the sequence z^2 + c diverges, with the color 0 (black) usually used for points
     *      where the sequence does not diverge.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} [nMax] (iterations)
     * @param {Array.<number>} [aResults] (optional buffer to return additional data)
     * @return {number} (of iterations remaining, 0 if presumed to be in the Mandelbrot set)
     */
    static isMandelbrot(x, y, nMax, aResults)
    {
        nMax = nMax || nMaxIterationsPerNumber;
        let a = 0, b = 0, ta = 0, tb = 0, m, n = nMax;
        do {
            b = 2 * a * b + y;
            a = ta - tb + x;
            m = (ta = a * a) + (tb = b * b);
        } while (--n > 0 && m < 4);
        /*
         * If a results array is provided, we fill it in with:
         *
         *      [0]: the number of iterations specified (ie, the maximum)
         *      [1]: the number of iterations remaining (if 0, then presumed to be in the Mandelbrot set)
         *      [2]: the last square calculated using the real portion (x)
         *      [3]: the last square calculated using the imaginary portion (y)
         *
         * Callers generally only care about the second value (which is the same as the function's return value),
         * but all four values provide additional information about "how close" the number is to the Mandelbrot set.
         */
        if (aResults) {
            aResults[0] = nMax;
            aResults[1] = n;
            /*
             * We iterate a few (4) more times to provide more detail; see http://linas.org/art-gallery/escape/escape.html
             */
            if (n) {
                n = 4;
                do {
                    b = 2 * a * b + y;
                    a = ta - tb + x;
                    ta = a * a; tb = b * b;
                } while (--n > 0);
            }
            aResults[2] = ta;
            aResults[3] = tb;
        }
        return n;
    }

    /*
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

    /*
     * getSmoothColor(aResults)
     *
     * Adapted from smoothColor() in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @this {Viewport}
     * @param {Array.<number>} aResults
     * @return {number}
     */
    static getSmoothColor(aResults)
    {
        let n = aResults[0] - aResults[1];
        return 5 + n - LOG_HALFBASE - Math.log(Math.log(aResults[2] + aResults[3])) * LOG_BASE;
    }
}

nMaxIterationsPerTimeslice = Viewport.calibrate(0, 8);

/**
 * initViewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, idStatus, fAutoUpdate)
 *
 * Global function for creating new Viewports.
 *
 * @param {string} idCanvas
 * @param {number} [gridWidth]
 * @param {number} [gridHeight]
 * @param {number} [xCenter]
 * @param {number} [yCenter]
 * @param {number} [xDistance]
 * @param {number} [yDistance]
 * @param {string} [idStatus]
 * @param {boolean} [fAutoUpdate] (true to add the Viewport to the set of automatically updated Viewports)
 * @return {Viewport}
 */
function initViewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, idStatus, fAutoUpdate = true)
{
    let viewport = new Viewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, idStatus);
    if (fAutoUpdate) {
        addViewport(viewport);
    }
    return viewport;
}

/**
 * addViewport(viewport)
 *
 * Adds the viewport to the array of auto-updated Viewports.  initViewport() does this automatically, unless told otherwise.
 *
 * @param {Viewport} viewport
 */
function addViewport(viewport)
{
    activeViewports.push(viewport);
    nMaxIterationsPerViewport = Math.floor(nMaxIterationsPerTimeslice / activeViewports.length);
    updateViewports(true);
}

/**
 * updateViewports(fInit)
 *
 * setTimeout() handler for updating all Viewports.  addViewport() does this automatically to ensure an update has been scheduled.
 *
 * @param {boolean} [fInit]
 */
function updateViewports(fInit)
{
    if (!fInit) {
        idTimeout = null;
        let nViewports = activeViewports.length;
        while (nViewports--) {
            let viewport = activeViewports[iNextViewport];
            if (viewport.updateGrid()) fInit = true;
            if (++iNextViewport >= activeViewports.length) iNextViewport = 0;
        }
    }
    /*
     * Schedule a new call for immediate execution if there were any updates (otherwise, we assume all our work is done).
     */
    if (fInit && idTimeout == null) {
        idTimeout = setTimeout(updateViewports, 0);
    }
}

window['initViewport'] = initViewport;
