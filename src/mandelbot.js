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

window['initViewport'] = initViewport;

/**
 * initViewport(idCanvas, idStatus)
 *
 * @param {string} idCanvas
 * @param {number} cxGrid
 * @param {number} cyGrid
 * @param {string} [idStatus]
 */
function initViewport(idCanvas, cxGrid, cyGrid, idStatus)
{
    let viewport = new Viewport(idCanvas, cxGrid, cyGrid, idStatus);
    if (viewport.canvasView) {
        activeViewports.push(viewport);
    }
}

/**
 * @class Viewport
 * @unrestricted
 *
 * @property {HTMLCanvasElement} canvasView
 * @property {CanvasRenderingContext2D} contextView
 * @property {Element} status
 */
class Viewport {

    /**
     * Viewport(idCanvas, cxGrid, cyGrid, idStatus)
     *
     * @this {Viewport}
     * @param {string} idCanvas
     * @param {number} cxGrid
     * @param {number} cyGrid
     * @param {string} [idStatus]
     */
    constructor(idCanvas, cxGrid, cyGrid, idStatus)
    {
        this.x = -0.5;
        this.y = 0;
        this.r = 3;
        this.canvasView = /** @type {HTMLCanvasElement} */ (document.getElementById(idCanvas));
        if (this.initView()) {
            this.initGrid(cxGrid, cyGrid);
        }
        if (idStatus) {
            this.status = document.getElementById(idStatus);
            if (this.status) {
                this.status.innerHTML = "Interactive images coming soon.";   // new BigNumber(42).toString();
            }
        }
    }

    /**
     * initView()
     *
     * @this {Viewport}
     * @return {boolean}
     */
    initView()
    {
        if (this.canvasView) {
            this.cxView = this.canvasView.width;
            this.cyView = this.canvasView.height;
            this.contextView = this.canvasView.getContext("2d");
            if (this.contextView) {
                /*
                 * TODO: Verify that this property really only has much (if any) effect when the View context has HIGHER
                 * resolution than the Grid context, and that it only makes sense on the View context; also, I'm not sure
                 * how many browsers really support it, and which browsers require special prefixes on the property (eg,
                 * 'mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', etc).
                 *
                 * Also, if it's possible that some users really WANT to produce low-res "fuzzy" images, then consider
                 * adding a parameter to control this setting.
                 *
                 * Refer to: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
                 */
                this.contextView['imageSmoothingEnabled'] = false;
                return true;
            }
        }
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
        this.cxGrid = cxGrid;
        this.cyGrid = cyGrid;
        this.imageGrid = this.contextView.createImageData(cxGrid, cyGrid);
        if (this.imageGrid) {
            this.canvasGrid = document.createElement("canvas");
            if (this.canvasGrid) {
                this.canvasGrid.width = cxGrid;
                this.canvasGrid.height = cyGrid;
                if (this.contextGrid = this.canvasGrid.getContext("2d")) {
                    this.drawGrid();
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * drawGrid()
     *
     * @this {Viewport}
     */
    drawGrid()
    {
        let yTop = this.y + this.r/2;
        let yInc = this.r / this.cyGrid;
        for (let row = 0; row < this.cyGrid; row++) {
            let xLeft = this.x - this.r/2;
            let xInc = this.r / this.cxGrid;
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

        this.contextView.drawImage(this.canvasGrid, 0, 0, this.canvasGrid.width, this.canvasGrid.height, 0, 0, this.cxView, this.cyView);
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
        let i = (row * this.imageGrid.width + col) * 4;
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
