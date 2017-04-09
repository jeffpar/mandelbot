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
    if (viewport.canvasScreen) {
        activeViewports.push(viewport);
    }
}

/**
 * @class Viewport
 * @unrestricted
 *
 * @property {HTMLCanvasElement} canvasScreen
 * @property {CanvasRenderingContext2D} contextScreen
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
        this.canvasScreen = /** @type {HTMLCanvasElement} */ (document.getElementById(idCanvas));
        if (this.initScreen()) {
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
     * initScreen()
     *
     * @this {Viewport}
     * @return {boolean}
     */
    initScreen()
    {
        if (this.canvasScreen) {
            this.cxScreen = this.canvasScreen.width;
            this.cyScreen = this.canvasScreen.height;
            this.contextScreen = this.canvasScreen.getContext("2d");
        }
        return !!this.contextScreen;
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
        this.imageGrid = this.contextScreen.createImageData(cxGrid, cyGrid);
        if (this.imageGrid) {
            this.canvasGrid = document.createElement("canvas");
            if (this.canvasGrid) {
                this.canvasGrid.width = cxGrid;
                this.canvasGrid.height = cyGrid;
                if (this.contextGrid = this.canvasGrid.getContext("2d")) {
                    this.drawGrid();
                }
            }
        }
        return !!this.contextGrid;
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
                let nRGB = Viewport.isMandelbrot(xLeft, yTop, 100)? 0 : -1;
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

        this.contextScreen.drawImage(this.canvasGrid, 0, 0, this.canvasGrid.width, this.canvasGrid.height, 0, 0, this.cxScreen, this.cyScreen);
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
     * isMandelbrot(cr, ci, nMax)
     *
     * @this {Viewport}
     * @param {number} cr
     * @param {number} ci
     * @param {number} nMax
     */
    static isMandelbrot(cr, ci, nMax)
    {
        let zr = cr;
        let zi = ci;
        for (let i = 0; i < nMax; i++) {
            let zrNew = zr * zr;
            let ziNew = zi * zi;
            if (zrNew + ziNew > 4) {
                return false;
            }
            zrNew = zrNew - ziNew + cr;
            ziNew = (zr * zi * 2) + ci;
            zr = zrNew;
            zi = ziNew;
        }
        return true;
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
