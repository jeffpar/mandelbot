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
 * @param {string} [idStatus]
 */
function initViewport(idCanvas, idStatus)
{
    let viewport = new Viewport(idCanvas, idStatus);
    if (viewport.canvas) {
        activeViewports.push(viewport);
    }
}

/**
 * @class Viewport
 * @unrestricted
 *
 * @property {HTMLCanvasElement} canvas
 * @property {CanvasRenderingContext2D} context
 * @property {Element} status
 */
class Viewport {

    /**
     * Viewport(idCanvas)
     *
     * @this {Viewport}
     * @param {string} idCanvas
     * @param {string} [idStatus]
     */
    constructor(idCanvas, idStatus) {
        this.canvas = document.getElementById(idCanvas);
        if (this.canvas) {
            this.context = this.canvas.getContext("2d");
            if (this.context) {
                this.init(this.context);
            }
        }
        if (idStatus) {
            this.status = document.getElementById(idStatus);
            if (this.status) {
                this.status.innerHTML = new BigNumber(42).toString();
            }
        }
    }

    /**
     * init(context)
     *
     * @param {CanvasRenderingContext2D} context
     */
    init(context)
    {
        context.beginPath();
        context.rect(0, 0, this.canvas.width, this.canvas.height);
        context.fillStyle = Viewport.randomColor();
        context.fill();
    }

    /**
     * randomColor()
     *
     * Courtesy of https://www.paulirish.com/2009/random-hex-color-code-snippets/
     *
     * @return {string}
     */
    static randomColor()
    {
        return '#'+Math.floor(Math.random()*16777215).toString(16).toUpperCase();
    }
}
