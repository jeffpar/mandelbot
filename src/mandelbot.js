/**
 * @fileoverview Implements Mandelbots
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright (c) Jeff Parsons 2017
 *
 * This file is part of an open-source project (mandelbot) and may be freely reused.
 * Any derivative work just needs to provide attribution along with the above copyright.
 */

"use strict";

let activeViewports = [];

/**
 * initViewport(idCanvas, cxGrid, cyGrid, xCenter, yCenter, xDistance, yDistance, idStatus)
 *
 * @param {string} idCanvas
 * @param {number} [cxGrid]
 * @param {number} [cyGrid]
 * @param {number} [xCenter]
 * @param {number} [yCenter]
 * @param {number} [xDistance]
 * @param {number} [yDistance]
 * @param {string} [idStatus]
 */
function initViewport(idCanvas, cxGrid, cyGrid, xCenter, yCenter, xDistance, yDistance, idStatus)
{
    let viewport = new Viewport(idCanvas, cxGrid, cyGrid, xCenter, yCenter, xDistance, yDistance, idStatus);
    if (viewport.canvasView) {
        activeViewports.push(viewport);
    }
}

window['initViewport'] = initViewport;

/**
 * @class Viewport
 * @unrestricted
 */
class Viewport {

    /**
     * Viewport(idCanvas, cxGrid, cyGrid, xCenter, yCenter, xDistance, yDistance, idStatus)
     *
     * The constructor initializes information about the View canvas (eg, its dimensions, 2D context, etc), and then
     * creates the internal Grid canvas using the supplied dimensions, which usually match the View canvas dimensions
     * but may differ if a different aspect ratio or scaling effect is desired.  See initView() and initGrid().
     *
     * @this {Viewport}
     * @param {string} idCanvas (the id of an existing view canvas; required)
     * @param {number} [cxGrid] (grid canvas width; default is view canvas width)
     * @param {number} [cyGrid] (grid canvas height; default is view canvas height)
     * @param {number} [xCenter]
     * @param {number} [yCenter]
     * @param {number} [xDistance]
     * @param {number} [yDistance]
     * @param {string} [idStatus] (the id of an existing status control, if any)
     */
    constructor(idCanvas, cxGrid = 0, cyGrid = 0, xCenter = -0.5, yCenter = 0, xDistance = 1, yDistance = 1, idStatus = "")
    {
        this.xCenter = xCenter;
        this.yCenter = yCenter;
        this.xDistance = xDistance;
        this.yDistance = yDistance;
        this.statusMessage = "Interactive images coming soon";
        try {
            /*
             * Why the try/catch?  Bad things CAN happen here; for example, bogus dimensions can cause
             * the createImageData() call in initGrid() to barf.  So rather than trying to imagine every
             * possible failure here, let's just catch and display any errors.
             */
            if (this.initView(idCanvas)) {
                this.initGrid(cxGrid || this.cxView, cyGrid || this.cyView);
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
            this.cxView = this.canvasView.width;
            this.cyView = this.canvasView.height;
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
     * initGrid(cxGrid, cyGrid)
     *
     * @this {Viewport}
     * @param {number} cxGrid
     * @param {number} cyGrid
     * @return {boolean}
     */
    initGrid(cxGrid, cyGrid)
    {
        this.imageGrid = this.contextView.createImageData(cxGrid, cyGrid);
        if (this.imageGrid) {
            this.canvasGrid = document.createElement("canvas");
            if (this.canvasGrid) {
                this.canvasGrid.width = this.cxGrid = cxGrid;
                this.canvasGrid.height = this.cyGrid = cyGrid;
                if (this.contextGrid = this.canvasGrid.getContext("2d")) {
                    this.drawGrid();
                    return true;
                }
            }
        }
        this.statusMessage = "Unable to create grid canvas";
        return false;
    }

    /**
     * drawGrid()
     *
     * @this {Viewport}
     */
    drawGrid()
    {
        let yTop = this.yCenter + this.yDistance;
        let yInc = (this.yDistance * 2) / this.cyGrid;
        for (let row = 0; row < this.cyGrid; row++) {
            let xLeft = this.xCenter - this.xDistance;
            let xInc = (this.xDistance * 2) / this.cxGrid;
            for (let col = 0; col < this.cxGrid; col++) {
                let nRGB = Viewport.isMandelbrot(xLeft, yTop, 100)? -1 : 0;
                this.setGridPixel(row, col, nRGB);
                xLeft += xInc;
            }
            yTop -= yInc;
        }

        let xDirty = 0;
        let yDirty = 0;
        let cxDirty = this.cxGrid;
        let cyDirty = this.cyGrid;
        this.contextGrid.putImageData(this.imageGrid, 0, 0, xDirty, yDirty, cxDirty, cyDirty);

        this.contextView.drawImage(this.canvasGrid, 0, 0, this.cxGrid, this.cyGrid, 0, 0, this.cxView, this.cyView);
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
        let i = (row * this.cxGrid + col) * 4;
        this.imageGrid.data[i] = nRGB & 0xff;
        this.imageGrid.data[i+1] = (nRGB >> 8) & 0xff;
        this.imageGrid.data[i+2] = (nRGB >> 16) & 0xff;
        this.imageGrid.data[i+3] = 0xff;
    }

    /**
     * isMandelbrot(x, y, nMax)
     *
     * @this {Viewport}
     * @param {number} x
     * @param {number} y
     * @param {number} nMax (iterations)
     * @return {number} (of iterations remaining, 0 if presumed to be in the Mandelbrot set)
     */
    static isMandelbrot(x, y, nMax)
    {
        let a = 0, b = 0, ta = 0, tb = 0, m;
        do {
            b = 2 * a * b + y;
            a = ta - tb + x;
            m = (ta = a * a) + (tb = b * b);
        } while (--nMax > 0 && m < 4);
        return nMax;
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
