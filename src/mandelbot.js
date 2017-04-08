/**
 * @fileoverview Implements Mandelbots
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright mandelbot.js Copyright (c) Jeff Parsons 2017
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
    constructor(idCanvas, cxGrid, cyGrid, idStatus) {
        this.canvasScreen = /** @type {HTMLCanvasElement} */ (document.getElementById(idCanvas));
        if (this.initScreen()) {
            this.initGrid(cxGrid, cyGrid);
        }
        if (idStatus) {
            this.status = document.getElementById(idStatus);
            if (this.status) {
                this.status.innerHTML = new BigNumber(42).toString();
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
        let nRGB = Viewport.randomColor();
        for (let y = 0; y < this.cyGrid; y++) {
            for (let x = 0; x < this.cxGrid; x++) {
                this.setGridPixel(x, y, nRGB);
            }
        }

        let xDirty = 0;
        let yDirty = 0;
        let cxDirty = this.cxGrid;
        let cyDirty = this.cyGrid;
        this.contextGrid.putImageData(this.imageGrid, 0, 0, xDirty, yDirty, cxDirty, cyDirty);

        this.contextScreen.drawImage(this.canvasGrid, 0, 0, this.canvasGrid.width, this.canvasGrid.height, 0, 0, this.cxScreen, this.cyScreen);
    }

    /**
     * setGridPixel(x, y, nRGB)
     *
     * @this {Viewport}
     * @param {number} x
     * @param {number} y
     * @param {number} nRGB
     */
    setGridPixel(x, y, nRGB)
    {
        let i = (x + y * this.imageGrid.width) * 4;
        this.imageGrid.data[i] = nRGB & 0xff;
        this.imageGrid.data[i+1] = (nRGB >> 8) & 0xff;
        this.imageGrid.data[i+2] = (nRGB >> 16) & 0xff;
        this.imageGrid.data[i+3] = 0xff;
    }

    /**
     * randomColor()
     *
     * @return {number}
     */
    static randomColor()
    {
        return Math.floor(Math.random() * 0x1000000);
    }
}
