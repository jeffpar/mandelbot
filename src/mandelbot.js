/**
 * @fileoverview Implements Mandelbots
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright © Jeff Parsons 2017
 *
 * This file is part of an open-source project (mandelbot) and may be freely reused.
 * Any derivative work just needs to provide attribution along with the above copyright.
 */

"use strict";

let activeViewports = [];

/**
 * initViewport(id)
 *
 * @param {string} id
 */
function initViewport(id)
{
    let viewport = new Viewport(id);
    if (viewport.canvas) {
        activeViewports.push(viewport);
    }
}

/**
 * @class
 * @unrestricted
 * @property {HTMLCanvasElement} canvas
 * @property {CanvasRenderingContext2D} context
 */
class Viewport {

    /**
     * Viewport(id)
     *
     * @this {Viewport}
     * @param {string} id
     */
    constructor(id) {
        this.canvas = document.getElementById(id);
        if (this.canvas) {
            this.context = this.canvas.getContext("2d");
            if (this.context) {
                this.init(this.context);
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
