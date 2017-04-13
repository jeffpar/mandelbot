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
let msTimeslice = (1000 / 60)|0;
let nMaxIterationsPerNumber = 100;      // default maximum iterations
let nMaxIterationsPerTimeslice;         // this is updated by calibrate()
let activeViewports = [];
let iNextViewport = 0;

/**
 * @class Viewport
 * @unrestricted
 * @property {boolean} fBigNumbers
 * @property {number|BigNumber} xCenter
 * @property {number|BigNumber} yCenter
 * @property {number|BigNumber} xDistance
 * @property {number|BigNumber} yDistance
 * @property {number} nColorScheme
 * @property {number} nMaxIterations
 * @property {string} statusMessage
 * @property {Array.<number>} aResults
 * @property {HTMLCanvasElement} canvasView
 * @property {number} viewWidth
 * @property {number} viewHeight
 * @property {CanvasRenderingContext2D} contextView
 * @property {ImageData} imageGrid
 * @property {HTMLCanvasElement} canvasGrid
 * @property {number} gridWidth
 * @property {number} gridHeight
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
class Viewport {
    /**
     * Viewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, colorScheme, idStatus)
     *
     * The constructor records information about the View canvas (eg, its dimensions, 2D context, etc), and then
     * creates the internal Grid canvas using the supplied dimensions, which usually match the View canvas dimensions
     * but may differ if a different aspect ratio or scaling effect is desired.  See initView() and initGrid().
     *
     * Rather than add more parameters to an already parameter-filled constructor, we will detect when the caller
     * wants to use BigNumbers by virtue of the (x,y) parameters containing strings instead of numbers.
     *
     * @this {Viewport}
     * @param {string} idCanvas (the id of an existing view canvas; required)
     * @param {number} [gridWidth] (grid canvas width; default is view canvas width)
     * @param {number} [gridHeight] (grid canvas height; default is view canvas height)
     * @param {number|string} [xCenter] (the x coordinate of the center of the initial image; default is -0.5)
     * @param {number|string} [yCenter] (the y coordinate of the center of the initial image; default is 0)
     * @param {number|string} [xDistance] (the distance from xCenter to the right and left sides of the initial image; default is 1.5)
     * @param {number|string} [yDistance] (the distance from yCenter to the top and bottom of the initial image; default is 1.5)
     * @param {number} [colorScheme] (one of the Viewport.COLORSCHEME values; default is GRAY)
     * @param {string} [idStatus] (the id of an existing status control, if any)
     */
    constructor(idCanvas, gridWidth = 0, gridHeight = 0, xCenter = -0.5, yCenter = 0, xDistance = 1.5, yDistance = 1.5, colorScheme, idStatus)
    {
        this.fBigNumbers = false;
        if (typeof xCenter == "number") {
            this.xCenter = xCenter;
            this.yCenter = yCenter;
            this.xDistance = Math.abs(xDistance);
            this.yDistance = Math.abs(yDistance);
        } else {
            this.fBigNumbers = true;
            this.xCenter = new BigNumber(xCenter);
            this.yCenter = new BigNumber(yCenter);
            this.xDistance = new BigNumber(xDistance).abs();
            this.yDistance = new BigNumber(yDistance).abs();
        }
        this.colorScheme = (colorScheme !== undefined? colorScheme : Viewport.COLORSCHEME.GRAY);
        this.nMaxIterations = this.getMaxIterations();  // formerly hard-coded to nMaxIterationsPerNumber
        this.statusMessage = "X: " + this.xCenter + " (+/-" + this.xDistance + ") Y: " + this.yCenter + " (+/-" + this.yDistance + ") Iterations: " + this.nMaxIterations;
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
        if (!this.fBigNumbers) {
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
     * Continues updating the Viewport's grid where we left off.
     *
     * @this {Viewport}
     * @return {boolean} (true if grid was updated, false if no change)
     */
    updateGrid()
    {
        let fUpdated = false;
        let colDirty = this.colPos;
        let rowDirty = this.rowPos;
        let colsDirty = 0, rowsDirty = 0;
        let nMaxIterationsUpdate = Math.floor(nMaxIterationsPerTimeslice / activeViewports.length);
        while (this.rowPos < this.gridHeight) {
            while (nMaxIterationsUpdate > 0 && this.colPos < this.gridWidth) {
                let m = this.nMaxIterations;
                let n = Viewport.isMandelbrot(this.xPos, this.yPos, m, this.aResults);
                this.setGridPixel(this.rowPos, this.colPos, this.getColor(this.aResults));
                if (!this.fBigNumbers) {
                    this.xPos += this.xInc;
                } else {
                    this.xPos = this.xPos.plus(this.xInc);
                }
                this.colPos++;
                if (!rowsDirty) colsDirty++;
                nMaxIterationsUpdate -= (m - n);
                fUpdated = true;
            }
            if (nMaxIterationsUpdate <= 0) break;
            this.colPos = 0;
            if (!this.fBigNumbers) {
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
     * @this {Viewport}
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

    /**
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
        let nRGB = 0;           // 0 is black (0x000000), used for numbers in the Mandelbrot set

        if (aResults[1]) {      // if the number is NOT in the Mandelbrot set, then choose another color

            let v = Viewport.getSmoothColor(aResults);

            switch (this.colorScheme) {
            case Viewport.COLORSCHEME.BW:
            default:
                nRGB = -1;      // -1 is white (0xffffff)
                break;
            case Viewport.COLORSCHEME.HSV1:
                nRGB = Viewport.getRGBFromHSV(360 * v / aResults[0], 1.0, 1.0);
                break;
            case Viewport.COLORSCHEME.HSV2:
            case Viewport.COLORSCHEME.HSV3:
                nRGB = Viewport.getRGBFromHSV(360 * v / aResults[0], 1.0, 10.0 * v / aResults[0]);
                if (this.colorScheme == 3) {
                    nRGB = (nRGB & 0xff00ff00) | ((nRGB >> 16) & 0xff) | ((nRGB & 0xff) << 16);     // swap red and blue
                }
                break;
            case Viewport.COLORSCHEME.GRAY:
                v = Math.floor(512.0 * v / aResults[0]);
                if (v > 0xff) v = 0xff;
                nRGB = v | (v << 8) | (v << 16);
                break;
            }
        }
        return nRGB;
    }

    /**
     * getMaxIterations()
     *
     * Adapted from code in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @this {Viewport}
     * @return {number}
     */
    getMaxIterations()
    {
        return Math.floor(223.0 / Math.sqrt(0.001 + 4.0 * Math.min(this.xDistance, this.yDistance)));
    }

    /**
     * calibrate(nIterationsStart, nCalibrations, fBigNumbers)
     *
     * Estimate how many isMandelbrot() iterations can be performed in TIMESLICE milliseconds.
     * The process starts by performing the half the default (maximum) number of iterations for
     * a single Mandelbrot number.  Then it doubles the number of iterations until TIMESLICE
     * is equaled or exceeded.
     *
     * @param {number} [nIterationsStart]
     * @param {number} [nCalibrations]
     * @param {boolean} [fBigNumbers]
     * @return {number} (of operations to perform before yielding)
     */
    static calibrate(nIterationsStart = 0, nCalibrations = 1, fBigNumbers = false)
    {
        let nIterationsAvg = 0, nLoops = 0;
        do {
            let nIterationsTotal = 0;
            let msStart = Date.now(), msTotal;
            let nIterationsInc = (nMaxIterationsPerNumber / 2)|0;
            do {
                nIterationsInc *= 2;
                let x = fBigNumbers? new BigNumber(-0.5) : -0.5;
                let y = fBigNumbers? new BigNumber(0) : 0;
                let n = Viewport.isMandelbrot(x, y, nIterationsStart + nIterationsInc);
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
         *      [2]: the last square calculated using the real portion (x)
         *      [3]: the last square calculated using the imaginary portion (y)
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
        return 5 + n - Viewport.LOG_HALFBASE - Math.log(Math.log(aResults[2] + aResults[3])) * Viewport.LOG_BASE;
    }
}

Viewport.COLORSCHEME = {
    BW:     0,  // B&W
    HSV1:   1,  // HSV1
    HSV2:   2,  // HSV2
    HSV3:   3,  // HSV3
    GRAY:   4   // GRAYSCALE
};

Viewport.LOG_BASE = 1.0 / Math.log(2.0);
Viewport.LOG_HALFBASE = Math.log(0.5) * Viewport.LOG_BASE;

nMaxIterationsPerTimeslice = Viewport.calibrate(0, 8);

/**
 * initViewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, colorScheme, idStatus, fAutoUpdate)
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
 * @param {number} [colorScheme]
 * @param {string} [idStatus]
 * @param {boolean} [fAutoUpdate] (true to add the Viewport to the set of automatically updated Viewports)
 * @return {Viewport}
 */
function initViewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, colorScheme, idStatus, fAutoUpdate = true)
{
    let viewport = new Viewport(idCanvas, gridWidth, gridHeight, xCenter, yCenter, xDistance, yDistance, colorScheme, idStatus);
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
        idTimeout = 0;
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
    if (fInit && !idTimeout) {
        idTimeout = setTimeout(updateViewports, 0);
    }
}

window['initViewport'] = initViewport;
