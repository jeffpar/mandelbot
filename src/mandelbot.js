/**
 * @fileoverview Implements Mandelbots
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright (c) Jeff Parsons 2017
 *
 * This file is part of an open-source project (mandelbot) and may be freely reused.
 * Any derivative work just needs to provide attribution along with the above copyright.
 */

"use strict";

let fYield = false;
let idTimeout = null;
let msTimeslice = (1000 / 60)|0;
let nMaxIterationsPerNumber = 100;
let nMaxIterationsPerTimeslice;         // this is calculated by a call to calibrate() below
let nCurIterationsPerTimeslice = 0;     // this is reset to zero at the start of every updateViewports()
let activeViewports = [];
let iNextViewport = 0;

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
        this.statusMessage = "max iterations per " + msTimeslice + "ms timeslice: " + nMaxIterationsPerTimeslice;
        // this.statusMessage = "Interactive images coming soon";
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
        while (this.rowPos < this.gridHeight) {
            while (this.colPos < this.gridWidth) {
                let nRGB = Viewport.isMandelbrot(this.xPos, this.yPos)? -1 : 0;
                this.setGridPixel(this.rowPos, this.colPos, nRGB);
                this.xPos += this.xInc; this.colPos++;
                if (fYield) {
                    this.drawGrid();
                    return true;
                }
                fUpdated = true;
            }
            this.xPos = this.xLeft; this.colPos = 0;
            this.yPos -= this.yInc; this.rowPos++
        }
        if (fUpdated) {
            this.drawGrid();
        }
        return fUpdated;
    }

    /**
     * drawGrid()
     *
     * NOTE: The "dirty" values below are set to encompass the entire grid; there's currently no calculation
     * of the largest changed ("dirty") region.
     *
     * @this {Viewport}
     */
    drawGrid()
    {
        let xDirty = 0;
        let yDirty = 0;
        let cxDirty = this.gridWidth;
        let cyDirty = this.gridHeight;
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

    /**
     * calibrate(nIterationsStart, nCalibrations)
     *
     * Estimate how operations can be performed in TIMESLICE milliseconds, where operation is
     * defined as one iteration of the Mandelbrot set calculation.  The process starts by performing
     * the default (maximum) number of iterations for a single Mandelbrot number.  Then it doubles
     * the number of iterations until TIMESLICE is equaled or exceeded.
     *
     * @this {Viewport}
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
            if (nCalibrations) nIterationsStart = Math.trunc(nIterationsTotal / nCalibrations);
            nLoops++;
        } while (--nCalibrations > 0);
        return Math.trunc(nIterationsAvg / nLoops);
    }

    /**
     * isMandelbrot(x, y, nMax)
     *
     * @this {Viewport}
     * @param {number} x
     * @param {number} y
     * @param {number} [nMax] (iterations)
     * @return {number} (of iterations remaining, 0 if presumed to be in the Mandelbrot set)
     */
    static isMandelbrot(x, y, nMax = nMaxIterationsPerNumber)
    {
        let a = 0, b = 0, ta = 0, tb = 0, m, n = nMax;
        do {
            b = 2 * a * b + y;
            a = ta - tb + x;
            m = (ta = a * a) + (tb = b * b);
        } while (--n > 0 && m < 4);
        if ((nCurIterationsPerTimeslice += (nMax - n)) >= nMaxIterationsPerTimeslice) fYield = true;
        return n;
    }

    /**
     * randomColor()
     *
     * @return {number}
     */
    // static randomColor()
    // {
    //     return Math.floor(Math.random() * 0x1000000);
    // }
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
    if (idTimeout == null) updateViewports();
}

/**
 * updateViewports()
 *
 * setTimeout() handler for updating all added Viewports.  addViewport() does this automatically if no update has been scheduled.
 */
function updateViewports()
{
    fYield = false;
    idTimeout = null;
    nCurIterationsPerTimeslice = 0;
    let fUpdated = false;
    let nViewports = activeViewports.length;
    while (nViewports--) {
        let viewport = activeViewports[iNextViewport];
        if (viewport.updateGrid()) {
            fUpdated = true;
            break;
        }
        if (++iNextViewport >= activeViewports.length) iNextViewport = 0;
    }
    /*
     * Schedule a new call for immediate execution if there were any updates (otherwise, we assume all our work is done).
     */
    if (fUpdated) {
        idTimeout = setTimeout(updateViewports, 0);
    }
}

window['initViewport'] = initViewport;
