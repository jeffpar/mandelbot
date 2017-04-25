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

/**
 * DEBUG can be set to true to enable debug-only code, assertions, etc.
 *
 * @define {boolean}
 */
let DEBUG = false;

let idTimeout = 0;
let activeMandelbots = [];
let iNextMandelbot = 0;
let msTimeslice = (1000 / 60)|0;
let nMaxIterationsPerNumber = 100;      // default maximum iterations per number
let nMaxIterationsPerTimeslice;         // updated by a one-time call to calibrate() using normal numbers
let nMaxBigIterationsPerTimeslice;      // updated by a one-time call to calibrate() using BigNumbers instead

/**
 * TODO: Bring the Mandelbot class property definitions up-to-date.
 *
 * It must be marked "unrestricted" because the Closure Compiler's default ("struct") requires that
 * all class properties be defined in the body of the constructor, which is extremely restrictive.
 * It should be sufficient for all properties to be defined by the constructor or any methods it calls.
 *
 * @class Mandelbot
 * @unrestricted
 * @property {string|undefined} idView
 * @property {Object} hashTable
 * @property {boolean} bigNumbers
 * @property {number} widthView
 * @property {number} heightView
 * @property {number} widthGrid
 * @property {number} heightGrid
 * @property {number|BigNumber} xCenter
 * @property {number|BigNumber} yCenter
 * @property {number|BigNumber} dxCenter
 * @property {number|BigNumber} dyCenter
 * @property {number} colorScheme
 * @property {Array.<number>} aResults
 * @property {Array.<string>} aPrevious
 * @property {HTMLCanvasElement} canvasView
 * @property {CanvasRenderingContext2D} contextView
 * @property {HTMLCanvasElement} canvasGrid
 * @property {CanvasRenderingContext2D} contextGrid
 * @property {ImageData} imageGrid
 * @property {Element|undefined} controlSelect
 * @property {Element|null} controlStatus
 * @property {string} messageStatus
 * @property {Element|null} controlPrevious
 * @property {number} nMaxIterations
 * @property {number} colUpdate
 * @property {number} rowUpdate
 * @property {number|BigNumber} xLeft
 * @property {number|BigNumber} xInc
 * @property {number|BigNumber} yTop
 * @property {number|BigNumber} xInc
 * @property {number|BigNumber} xUpdate
 * @property {number|BigNumber} yUpdate
 */
class Mandelbot {
    /**
     * Mandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, colorScheme, idView, idStatus)
     *
     * The constructor records information about the View canvas (eg, its dimensions, 2D context, etc), and then
     * creates the internal Grid canvas using the supplied dimensions, which usually match the View canvas dimensions
     * unless a different aspect ratio or scaling effect is desired.  See initView() and initGrid().
     *
     * The Grid canvas represents the Cartesian coordinate grid onto which all the complex numbers are plotted,
     * after they have passed through the Mandelbrot set calculations.  The Grid canvas is then drawn onto the View
     * canvas.  The use of two canvases also enables double-buffering, which helps eliminate animation flicker.
     * Take, for example, the selection rectangle: as the rectangle changes shape, it must be erased and redrawn,
     * but since both those operations are performed on the Grid canvas first, before View canvas is updated, there's
     * no risk of flicker.
     *
     * Any of the four x,y coordinate parameters can be specified as numbers OR strings, because strings may be needed
     * to represent BigNumbers that can't be expressed as a 64-bit floating-point numbers.  If bigNumbers is true, then
     * those parameters are passed through to the BigNumber constructor as-is; otherwise, those parameters are coerced
     * to numbers using the unary "plus" operator.
     *
     * @this {Mandelbot}
     * @param {number} [widthGrid] (grid canvas width; default is view canvas width)
     * @param {number} [heightGrid] (grid canvas height; default is view canvas height)
     * @param {number|string} [xCenter] (the x coordinate of the center of the initial image; default is -0.5)
     * @param {number|string} [yCenter] (the y coordinate of the center of the initial image; default is 0)
     * @param {number|string} [dxCenter] (the distance from xCenter to the right and left sides of the initial image; default is 1.5)
     * @param {number|string} [dyCenter] (the distance from yCenter to the top and bottom of the initial image; default is 1.5)
     * @param {boolean} [bigNumbers] (true to use BigNumbers for all floating-point calculations; default is false)
     * @param {number} [colorScheme] (one of the Mandelbot.COLOR_SCHEME values; default is GRAY)
     * @param {string} [idView] (the id of an existing view canvas, if any)
     * @param {string} [idStatus] (the id of an existing status control, if any)
     */
    constructor(widthGrid = 0, heightGrid = 0,
                xCenter = Mandelbot.DEFAULT.XCENTER, yCenter = Mandelbot.DEFAULT.YCENTER,
                dxCenter = Mandelbot.DEFAULT.DXCENTER, dyCenter = Mandelbot.DEFAULT.DYCENTER,
                bigNumbers, colorScheme, idView, idStatus)
    {
        this.getURLHash(idView);
        this.bigNumbers = bigNumbers || false;
        this.colorScheme = (colorScheme !== undefined? colorScheme : Mandelbot['COLOR_SCHEME']['GRAY']);
        this.aResults = [0, 0, 0, 0];
        this.aPrevious = [];
        try {
            /*
             * Why the try/catch?  Bad things CAN happen here; for example, bogus dimensions can cause
             * the createImageData() call in initGrid() to barf.  So rather than trying to imagine every
             * possible failure here, let's just catch and display any errors.
             */
            this.addControl(Mandelbot['CONTROL_STATUS'], idStatus);
            if (this.initView(idView) && this.initGrid(widthGrid || this.widthView, heightGrid || this.heightView)) {
                this.xReset = this.getURLValue(Mandelbot.KEY.XCENTER, this.xDefault = xCenter);
                this.yReset = this.getURLValue(Mandelbot.KEY.YCENTER, this.yDefault = yCenter);
                this.dxReset = this.getURLValue(Mandelbot.KEY.DXCENTER, this.dxDefault = dxCenter, true);
                this.dyReset = this.getURLValue(Mandelbot.KEY.DYCENTER, this.dyDefault = dyCenter, true);
                this.prepGrid(this.xReset, this.yReset, this.dxReset, this.dyReset, false);
            }
        } catch(err) {
            this.updateStatus(err.message);
        }
    }

    /**
     * addControl(name, id)
     *
     * @this {Mandelbot}
     * @param {string} name
     * @param {string} [id] (if empty, this is method is a no-op)
     */
    addControl(name, id)
    {
        let mandelbot = this;
        let control = id? document.getElementById(id) : null;

        switch (name) {

        case Mandelbot['CONTROL_STATUS']:
            this.controlStatus = control;
            this.updateStatus();
            break;

        case Mandelbot['CONTROL_RESET']:
            /*
             * The RESET control, if any, doesn't need to be recorded, because this one-time initialization is all that's required.
             */
            if (control) {
                control.onclick = function onReset() {
                    /*
                     * If RESET is clicked when all coordinates are already at their reset values, then revert to our built-in defaults.
                     */
                    mandelbot.aPrevious = [];
                    mandelbot.updatePrevious();
                    if (mandelbot.xCenter == mandelbot.xReset && mandelbot.yCenter == mandelbot.yReset) {
                        if (mandelbot.dxCenter == mandelbot.dxReset && mandelbot.dyCenter == mandelbot.dyReset) {
                            mandelbot.prepGrid(Mandelbot.DEFAULT.XCENTER, Mandelbot.DEFAULT.YCENTER,
                                               Mandelbot.DEFAULT.DXCENTER, Mandelbot.DEFAULT.DYCENTER);
                            return;
                        }
                    }
                    mandelbot.prepGrid(mandelbot.xReset, mandelbot.yReset, mandelbot.dxReset, mandelbot.dyReset);
                };
            }
            this.updateStatus();
            break;

        case Mandelbot['CONTROL_PREVIOUS']:
            this.controlPrevious = control;
            if (control) {
                control.onclick = function onPrevious() {
                    let hash = mandelbot.aPrevious.pop();
                    if (hash != null) {
                        mandelbot.getURLHash(mandelbot.idView, hash);
                        let x  = mandelbot.getURLValue(Mandelbot.KEY.XCENTER,  mandelbot.xDefault);
                        let y  = mandelbot.getURLValue(Mandelbot.KEY.YCENTER,  mandelbot.yDefault);
                        let dx = mandelbot.getURLValue(Mandelbot.KEY.DXCENTER, mandelbot.dxDefault);
                        let dy = mandelbot.getURLValue(Mandelbot.KEY.DYCENTER, mandelbot.dyDefault);
                        mandelbot.prepGrid(x, y, dx, dy);
                        mandelbot.updatePrevious();
                    }
                }
            }
            this.updatePrevious();
            break;
        }
    }

    /**
     * initView(idView)
     *
     * If no view is provided, then this is simply treated as a "headless" Mandelbot.
     *
     * @this {Mandelbot}
     * @param {string|undefined} idView
     * @return {boolean}
     */
    initView(idView)
    {
        this.idView = idView;
        this.widthView = this.heightView = 0;
        if (idView) {
            this.canvasView = /** @type {HTMLCanvasElement} */ (document.getElementById(idView));
            if (this.canvasView) {
                this.widthView = this.canvasView.width;
                this.heightView = this.canvasView.height;
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
                    this.initSelect(this.canvasView);
                    return true;
                }
            }
            this.updateStatus("Missing view canvas");
            return false;
        }
        return true;
    }

    /**
     * initGrid(widthGrid, heightGrid)
     *
     * If no width and/or height is specified, and no view width or height is available, we default to 200x200.
     *
     * @this {Mandelbot}
     * @param {number} widthGrid
     * @param {number} heightGrid
     * @return {boolean}
     */
    initGrid(widthGrid, heightGrid)
    {
        this.canvasGrid = /** @type {HTMLCanvasElement} */ (document.createElement("canvas"));
        if (this.canvasGrid) {
            this.canvasGrid.width = this.widthGrid = widthGrid || 200;
            this.canvasGrid.height = this.heightGrid = heightGrid || 200;
            if (this.contextGrid = this.canvasGrid.getContext("2d")) {
                this.imageGrid = this.contextGrid.createImageData(this.widthGrid, this.heightGrid);
                if (this.imageGrid) {
                    return true;
                }
            }
        }
        this.updateStatus("Unable to create grid canvas");
        return false;
    }

    /**
     * initSelect(control)
     *
     * @this {Mandelbot}
     * @param {HTMLCanvasElement} control
     */
    initSelect(control)
    {
        if (!this.controlSelect) {

            let mandelbot = this;

            this.controlSelect = control;

            /*
             * colStart and rowStart record the last 'touchstart' or 'mousedown' coordinates; they will
             * be propagated to colSelect and rowSelect if/when movement is detected, and they will be
             * reset to -1 when movement has ended (eg, 'touchend' or 'mouseup').
             */
            this.colStart = this.rowStart = -1;
            this.msStart = 0;

            /*
             * A selection exists IFF colSelect and rowSelect are positive; widthSelect and heightSelect
             * CAN be negative, if the rectangle is extended above and/or to the left of the starting point,
             * instead of down and to the right, so be careful.
             */
            this.colSelect = this.rowSelect = -1;
            this.widthSelect = this.heightSelect = 0;

            /*
             * As long as fSelectDefault is false, processSelectEvent() will call preventDefault()
             * on every event, to prevent the page from moving/scrolling while we process select events.
             */
            this.fSelectDefault = false;

            control.addEventListener(
                'touchstart',
                function onTouchStart(event) { mandelbot.processSelectEvent(event, true); }
            );
            control.addEventListener(
                'touchmove',
                function onTouchMove(event) { mandelbot.processSelectEvent(event); }
            );
            control.addEventListener(
                'touchend',
                function onTouchEnd(event) { mandelbot.processSelectEvent(event, false); }
            );
            control.addEventListener(
                'mousedown',
                function onMouseDown(event) { mandelbot.processSelectEvent(event, true); }
            );
            control.addEventListener(
                'mousemove',
                function onMouseMove(event) { if (mandelbot.colStart >= 0) mandelbot.processSelectEvent(event); }
            );
            control.addEventListener(
                'mouseup',
                function onMouseUp(event) { mandelbot.processSelectEvent(event, false); }
            );
            control.addEventListener(
                'mouseout',
                function onMouseUp(event) { mandelbot.processSelectEvent(event, false); }
            );
        }
    }

    /**
     * processSelectEvent(event, fStart)
     *
     * @this {Mandelbot}
     * @param {Event} event object from a 'touch' or 'mouse' event
     * @param {boolean} [fStart] (true if 'touchstart/mousedown', false if 'touchend/mouseup', undefined if 'touchmove/mousemove')
     */
    processSelectEvent(event, fStart)
    {
        let colView, rowView;

        /**
         * @name Event
         * @property {Array} targetTouches
         */
        event = event || window.event;

        if (!event.targetTouches || !event.targetTouches.length) {
            colView = event.pageX;
            rowView = event.pageY;
        } else {
            colView = event.targetTouches[0].pageX;
            rowView = event.targetTouches[0].pageY;
        }

        /*
         * Touch coordinates (that is, the pageX and pageY properties) are relative to the page, so to make
         * them relative to the canvas, we must subtract the canvas's left and top positions.  This Apple web page:
         *
         *      https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingMouseandTouchControlstoCanvas/AddingMouseandTouchControlstoCanvas.html
         *
         * makes it sound simple, but it turns out we have to walk the canvas' entire "parentage" of DOM elements
         * to get the exact offsets.
         */
        let colOffset = 0;
        let rowOffset = 0;
        let control = this.controlSelect;
        do {
            if (!isNaN(control.offsetLeft)) {
                colOffset += control.offsetLeft;
                rowOffset += control.offsetTop;
            }
        } while ((control = control.offsetParent));

        /*
         * Due to the responsive nature of our pages, the displayed size of the canvas may be smaller than the
         * allocated size, and the coordinates we receive from events are based on the currently displayed size.
         */
        colView = (colView - colOffset) * (this.widthView / this.controlSelect.offsetWidth);
        rowView = (rowView - rowOffset) * (this.heightView / this.controlSelect.offsetHeight);

        /*
         * Next, we need to convert colView,rowView to colGrid,rowGrid, because the selection rectangle is drawn
         * on the grid canvas, not the view canvas (to avoid unwanted erase/flicker issues as the rectangle changes).
         */
        let colGrid = Math.round((this.widthGrid * colView) / this.widthView);
        let rowGrid = Math.round((this.heightGrid * rowView) / this.heightView);

        if (!this.fSelectDefault) event.preventDefault();

        this.hideSelection();

        if (fStart) {
            this.colStart = colGrid;
            this.rowStart = rowGrid;
            this.msStart = Date.now();
        }
        else if (fStart !== false) {
            this.colSelect = this.colStart;
            this.rowSelect = this.rowStart;
            this.widthSelect = colGrid - this.colSelect;
            this.heightSelect = rowGrid - this.rowSelect;
            if (!this.widthSelect || !this.heightSelect) {
                this.widthSelect = this.heightSelect = 0;
            } else {
                let aspectGrid = Math.abs(this.widthGrid / this.heightGrid);
                let aspectSelect = Math.abs(this.widthSelect / this.heightSelect);
                if (aspectSelect != aspectGrid) {
                    let widthSelect = Math.abs((this.widthGrid * this.heightSelect) / this.heightGrid);
                    this.widthSelect = (this.widthSelect < 0)? -widthSelect : widthSelect;
                }
            }
        }
        else {
            /*
             * If a simple click-and-release or tap occurred, the following conditions should be true (the current
             * grid position will match the starting grid position and/or the click-to-release time will be very short).
             *
             * We only care about this case to determine if the user clicked or tapped inside or outside the selection
             * rectangle, if any.  Clicking/tapping inside the selection triggers a reposition and recalculate.
             */
            let msRelease = Date.now() - this.msStart;
            if (colGrid == this.colStart && rowGrid == this.rowStart || msRelease < 100) {

                let xCenter, yCenter, dxCenter, dyCenter;

                if (this.widthSelect && this.heightSelect) {
                    let colBeg = this.colSelect;
                    let rowBeg = this.rowSelect;
                    let colEnd = this.colSelect + this.widthSelect;
                    let rowEnd = this.rowSelect + this.heightSelect;
                    if (colEnd < colBeg) {
                        colBeg = colEnd;
                        colEnd = this.colSelect;
                    }
                    if (rowEnd < rowBeg) {
                        rowBeg = rowEnd;
                        rowEnd = this.rowSelect;
                    }
                    if (colGrid >= colBeg && colGrid <= colEnd && rowGrid >= rowBeg && rowGrid <= rowEnd) {
                        if (!this.bigNumbers) {
                            dxCenter = ((colEnd - colBeg) * this.xInc) / 2;
                            dyCenter = ((rowEnd - rowBeg) * this.yInc) / 2;
                            xCenter = this.xLeft + (colBeg * this.xInc) + dxCenter;
                            yCenter = this.yTop  - (rowBeg * this.yInc) - dyCenter;
                            this.prepGrid(xCenter, yCenter, dxCenter, dyCenter, true);
                        } else {
                            // this.xCenter = new BigNumber(xCenter);
                            // this.yCenter = new BigNumber(yCenter);
                            // this.dxCenter = new BigNumber(dxCenter).abs();
                            // this.dyCenter = new BigNumber(dyCenter).abs();
                        }
                    }
                    this.widthSelect = this.heightSelect = 0;
                }
                else if (!this.widthSelect && !this.heightSelect) {
                    if (!this.bigNumbers) {
                        xCenter = this.xLeft + (colGrid * this.xInc);
                        yCenter = this.yTop  - (rowGrid * this.yInc);
                        this.prepGrid(xCenter, yCenter, this.dxCenter, this.dyCenter, true);
                    } else {
                        // this.xCenter = new BigNumber(xCenter);
                        // this.yCenter = new BigNumber(yCenter);
                    }
                }
                this.colSelect = this.rowSelect = -1;
            }
            this.colStart = this.rowStart = -1;
            this.msStart = 0;
        }

        this.showSelection();
    }

    /**
     * hideSelection()
     *
     * This removes any selection rectangle from the grid by simply redrawing all image data onto the grid.
     *
     * @this {Mandelbot}
     */
    hideSelection()
    {
        if (this.colSelect >= 0) {
            this.contextGrid.putImageData(this.imageGrid, 0, 0);
            // this.drawGrid(this.colSelect, this.rowSelect, this.widthSelect, this.heightSelect);
        }
    }

    /**
     * showSelection()
     *
     * This draws the selection rectangle, if any, onto the grid, and then refreshes the view from the grid.
     *
     * @this {Mandelbot}
     */
    showSelection()
    {
        if (this.colSelect >= 0) {
            this.contextGrid.lineWidth = 1;
            this.contextGrid.strokeStyle = "#00FF00";
            this.contextGrid.strokeRect(this.colSelect, this.rowSelect, this.widthSelect, this.heightSelect);
        }
        /*
         * We want to refresh the view regardless, in case hideSelection() removed a previously visible selection.
         */
        if (this.contextView) {
            this.contextView.drawImage(this.canvasGrid, 0, 0, this.widthGrid, this.heightGrid, 0, 0, this.widthView, this.heightView);
        }
    }

    /**
     * prepGrid(xCenter, yCenter, dxCenter, dyCenter, fUpdate)
     *
     * Resets colUpdate and rowUpdate (the next position on the grid to be updated) and calculates xUpdate and
     * yUpdate (the x and y coordinates corresponding to that grid position).
     *
     * We also calculate several values that are constant for the next updateGrid() operation: xLeft and yTop are
     * the left-most and top-most x,y values, and xInc and yInc are the appropriate x,y increments.
     *
     * @this {Mandelbot}
     * @param {number|BigNumber} xCenter
     * @param {number|BigNumber} yCenter
     * @param {number|BigNumber} dxCenter
     * @param {number|BigNumber} dyCenter
     * @param {boolean} [fUpdate]
     */
    prepGrid(xCenter, yCenter, dxCenter, dyCenter, fUpdate)
    {
        this.xCenter = xCenter;
        this.yCenter = yCenter;
        this.dxCenter = dxCenter;
        this.dyCenter = dyCenter;
        this.colUpdate = this.rowUpdate = 0;
        if (!this.bigNumbers) {
            this.xLeft = this.xCenter - this.dxCenter;
            this.xInc = (this.dxCenter * 2) / this.widthGrid;
            this.yTop = this.yCenter + this.dyCenter;
            this.yInc = (this.dyCenter * 2) / this.heightGrid;
            this.xUpdate = this.xLeft;
            this.yUpdate = this.yTop;
        } else {
            this.xLeft = this.xCenter.minus(this.dxCenter);
            this.xInc = this.dxCenter.times(2).dividedBy(this.widthGrid).round(20);
            this.yTop = this.yCenter.plus(this.dyCenter);
            this.yInc = this.dyCenter.times(2).dividedBy(this.heightGrid).round(20);
            this.xUpdate = this.xLeft.plus(0);    // simple way of generating a new BigNumber with the same value
            this.yUpdate = this.yTop.plus(0);
        }
        this.nMaxIterations = Mandelbot.getMaxIterations(this.dxCenter, this.dyCenter);
        this.updateStatus("X: " + this.xCenter + " (+/-" + this.dxCenter + ") Y: " + this.yCenter + " (+/-" + this.dyCenter + ") Iterations: " + this.nMaxIterations + (this.bigNumbers? " (BigNumbers)" : ""));
        if (fUpdate !== false) {
            this.updateHash(fUpdate);
            updateMandelbots(true);
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
        let colDirty = this.colUpdate;
        let rowDirty = this.rowUpdate;
        let widthDirty = 0, heightDirty = 0;
        let nMaxIterationsTotal = Math.floor((this.bigNumbers? nMaxBigIterationsPerTimeslice : nMaxIterationsPerTimeslice) / activeMandelbots.length);
        while (this.rowUpdate < this.heightGrid) {
            while (nMaxIterationsTotal > 0 && this.colUpdate < this.widthGrid) {
                let m = this.nMaxIterations;
                let n = Mandelbot.isMandelbrot(this.xUpdate, this.yUpdate, m, this.aResults);
                this.setGridPixel(this.rowUpdate, this.colUpdate, Mandelbot.getColor(this.colorScheme, this.aResults));
                if (!this.bigNumbers) {
                    this.xUpdate += this.xInc;
                } else {
                    this.xUpdate = this.xUpdate.plus(this.xInc);
                }
                this.colUpdate++;
                if (!heightDirty) widthDirty++;
                nMaxIterationsTotal -= (m - n);
                fUpdated = true;
            }
            if (nMaxIterationsTotal <= 0) break;
            this.colUpdate = 0;
            if (!this.bigNumbers) {
                this.xUpdate = this.xLeft;
                this.yUpdate -= this.yInc;
            } else {
                this.xUpdate = this.xLeft.plus(0);
                this.yUpdate = this.yUpdate.minus(this.yInc);
            }
            this.rowUpdate++;
            heightDirty++;
            colDirty = 0; widthDirty = this.widthGrid;
        }
        if (fUpdated) {
            if (this.colUpdate > 0) heightDirty++;
            this.drawGrid(colDirty, rowDirty, widthDirty, heightDirty);
        }
        return fUpdated;
    }

    /**
     * getURLHash(idView, hash)
     *
     * If the hash portion of the URL contains values for the specified idView, store those values in hashTable.
     *
     * @this {Mandelbot}
     * @param {string|undefined} idView
     * @param {string} [hash] (default is location.hash)
     */
    getURLHash(idView, hash = location.hash)
    {
        this.hashTable = {};
        if (idView) {
            let hashTable = {};
            let match, reKeyPair = /([^#&=]+)=([^&]*)/g;
            while (match = reKeyPair.exec(hash)) {
                hashTable[match[1]] = match[2];
            }
            if (hashTable[Mandelbot.KEY.ID] == idView) {
                this.hashTable = hashTable;
            }
        }
    }

    /**
     * getURLValue(key, init, abs)
     *
     * If the specified value has an override in hashTable, use it; otherwise, use the given initial value.
     *
     * @this {Mandelbot}
     * @param {string} key
     * @param {number|string} init
     * @param {boolean} [abs] (true to return absolute value)
     * @return {number|BigNumber}
     */
    getURLValue(key, init, abs)
    {
        let value;
        init = this.hashTable[key] || init;
        if (this.bigNumbers) {
            value = new BigNumber(init);
            if (abs) value = value.abs();
        } else {
            /*
             * Since the initial values are allowed to be numbers OR strings, and since BigNumber support was
             * not requested, we coerce those parameters to numbers using the unary "plus" operator; if they are
             * are already numeric values, the operator has no effect, and if any value was negative, don't worry,
             * it will remain negative.
             */
            value = +init;
            if (abs) value = Math.abs(value);
        }
        return value;
    }

    /**
     * updateHash(fPush)
     *
     * If this Mandelbot has an idView, update the hash portion of the URL with new values.
     *
     * @this {Mandelbot}
     * @param {boolean} [fPush]
     */
    updateHash(fPush)
    {
        if (this.idView) {
            if (fPush) {
                this.aPrevious.push(location.hash);
                this.updatePrevious();
            }
            let hash = Mandelbot.KEY.ID + '=' + this.idView;
            hash += '&' + Mandelbot.KEY.XCENTER  + '=' + this.xCenter;
            hash += '&' + Mandelbot.KEY.YCENTER  + '=' + this.yCenter;
            hash += '&' + Mandelbot.KEY.DXCENTER + '=' + this.dxCenter;
            hash += '&' + Mandelbot.KEY.DYCENTER + '=' + this.dyCenter;
            location.hash = hash;
        }
    }

    /**
     * updatePrevious()
     *
     * The CONTROL_PREVIOUS control, if any, only needs its 'disabled' attribute updated.
     *
     * @this {Mandelbot}
     */
    updatePrevious()
    {
        let sDisabled = 'disabled';
        if (this.controlPrevious) {
            if (this.aPrevious.length) {
                this.controlPrevious.removeAttribute(sDisabled);
            } else {
                this.controlPrevious.setAttribute(sDisabled, sDisabled);
            }
        }
    }

    /**
     * updateStatus(message)
     *
     * @this {Mandelbot}
     * @param {string} [message]
     */
    updateStatus(message)
    {
        message = message || this.messageStatus;
        if (message) {
            if (!this.controlStatus) {
                if (DEBUG) console.log(message);
                this.messageStatus = message;
            } else {
                this.controlStatus.textContent = message;
                this.messageStatus = "";
            }
        }
    }

    /**
     * drawGrid(colDirty, rowDirty, widthDirty, heightDirty)
     *
     * @this {Mandelbot}
     * @param {number} [colDirty]
     * @param {number} [rowDirty]
     * @param {number} [widthDirty]
     * @param {number} [heightDirty]
     */
    drawGrid(colDirty = 0, rowDirty = 0, widthDirty = this.widthGrid, heightDirty = this.heightGrid)
    {
        this.contextGrid.putImageData(this.imageGrid, 0, 0, colDirty, rowDirty, widthDirty, heightDirty);
        if (this.contextView) {
            this.contextView.drawImage(this.canvasGrid, 0, 0, this.widthGrid, this.heightGrid, 0, 0, this.widthView, this.heightView);
        }
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
        let i = (row * this.widthGrid + col) * 4;
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
     * @param {Array.<number>} [aResults] (optional array to return additional data)
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
         * So the real and imaginary coefficients for z{n+1}, after adding c, which is (x + yi), are:
         *
         *      a{n+1} = (a * a) - (b * b) + x
         *      b{n+1} = (2 * a * b) + y
         *
         * We also need to know the magnitude of this result, because if the magnitude equals or exceeds 2, then
         * the number is not part of the Mandelbrot set (ie, it has "escaped").
         *
         * The magnitude, m, comes from calculating the hypotenuse of the right triangle whose sides are a and b,
         * using the Pythagorean theorem:
         *
         *      m = Math.sqrt(a^2 + b^2)
         *
         * To avoid the sqrt() operation, we can simply calculate m = (a * a) + (b * b) and compare that to (2 * 2)
         * or 4 instead; happily, we've already calculated (a * a) and (b * b), so calculating m is just an additional,
         * um, addition.
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

            let fSwap = true;
            let v = Mandelbot.getSmoothColor(aResults);

            switch (colorScheme) {
            case Mandelbot['COLOR_SCHEME']['BW']:
            default:
                nRGB = -1;      // -1 is white (0xffffff)
                break;
            case Mandelbot['COLOR_SCHEME']['HSV1']:
                nRGB = Mandelbot.getRGBFromHSV(360 * v / aResults[0], 1.0, 1.0);
                break;
            case Mandelbot['COLOR_SCHEME']['HSV2']:
                fSwap = false;
                /* falls through */
            case Mandelbot['COLOR_SCHEME']['HSV3']:
                nRGB = Mandelbot.getRGBFromHSV(360 * v / aResults[0], 1.0, 10.0 * v / aResults[0]);
                if (fSwap) {    // swap red and blue bytes
                    nRGB = (nRGB & 0xff00ff00) | ((nRGB >> 16) & 0xff) | ((nRGB & 0xff) << 16);
                }
                break;
            case Mandelbot['COLOR_SCHEME']['GRAY']:
                v = Math.floor(512.0 * v / aResults[0]);
                if (v > 0xff) v = 0xff;
                nRGB = v | (v << 8) | (v << 16);
                break;
            }
        }
        return nRGB;
    }

    /**
     * getMaxIterations(dxCenter, dyCenter)
     *
     * Adapted from code in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 by Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @param {number|BigNumber} dxCenter
     * @param {number|BigNumber} dyCenter
     * @return {number}
     */
    static getMaxIterations(dxCenter, dyCenter)
    {
        let nMin;
        if (typeof dxCenter == "number") {
            nMin = Math.min(dxCenter, dyCenter);
        } else {
            nMin = BigNumber.min(dxCenter, dyCenter);
        }
        return Math.floor(223.0 / Math.sqrt(0.001 + 4.0 * nMin));
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

Mandelbot.DEFAULT = {
    XCENTER:    -0.5,
    YCENTER:    0,
    DXCENTER:   1.5,
    DYCENTER:   1.5
};

Mandelbot.LOG_BASE = 1.0 / Math.log(2.0);
Mandelbot.LOG_HALFBASE = Math.log(0.5) * Mandelbot.LOG_BASE;

Mandelbot.KEY = {
    ID:         "id",
    XCENTER:    "x",
    YCENTER:    "y",
    DXCENTER:   "dx",
    DYCENTER:   "dy"
};

Mandelbot['COLOR_SCHEME'] = {
    'BW':       0,  // B&W
    'HSV1':     1,  // HSV1
    'HSV2':     2,  // HSV2
    'HSV3':     3,  // HSV3
    'GRAY':     4   // GRAYSCALE
};

Mandelbot['CONTROL_STATUS']   = "status";
Mandelbot['CONTROL_RESET']    = "reset";
Mandelbot['CONTROL_PREVIOUS'] = "previous";

nMaxIterationsPerTimeslice = Mandelbot.calibrate(0, 8);
nMaxBigIterationsPerTimeslice = Mandelbot.calibrate(0, 8, true);

/**
 * newMandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, colorScheme, idView, idStatus, fAutoUpdate)
 *
 * Global function for creating new Mandelbots.
 *
 * @param {number} [widthGrid]
 * @param {number} [heightGrid]
 * @param {number|string|undefined} [xCenter]
 * @param {number|string|undefined} [yCenter]
 * @param {number|string|undefined} [dxCenter]
 * @param {number|string|undefined} [dyCenter]
 * @param {boolean} [bigNumbers]
 * @param {number|undefined} [colorScheme]
 * @param {string} [idView]
 * @param {string} [idStatus]
 * @param {boolean} [fAutoUpdate] (true to add the Mandelbot to the set of automatically updated Mandelbots)
 * @return {Mandelbot}
 */
function newMandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, colorScheme, idView, idStatus, fAutoUpdate = true)
{
    let mandelbot = new Mandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, colorScheme, idView, idStatus);
    if (fAutoUpdate) addMandelbot(mandelbot);
    return mandelbot;
}

/**
 * addMandelbot(mandelbot)
 *
 * Adds the Mandelbot to the array of auto-updated Mandelbots.  newMandelbot() does this automatically, unless told otherwise.
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

/*
 * Closure Compiler "hacks" to prevent the renaming of classes, methods, and functions we want to export
 */
window['Mandelbot'] = Mandelbot;
Mandelbot.prototype['addControl'] = Mandelbot.prototype.addControl;
window['newMandelbot'] = newMandelbot;
