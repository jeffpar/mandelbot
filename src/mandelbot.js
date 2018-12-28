/**
 * @fileoverview Implements Mandelbots
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright Copyright © 2017 [Jeff Parsons](mailto:Jeff@pcjs.org)
 *
 * This file is part of an open-source project (https://github.com/jeffpar/mandelbot) with no formal license.
 * All portions not licensed from other sources may be freely reused.  Any derivative work just needs to provide
 * attribution along with the above copyright.
 *
 * Portions copyright 2012 Christian Stigen Larsen and licensed under [Apache License](http://www.apache.org/licenses/LICENSE-2.0),
 * Version 2.0.  Those portions are clearly identified in [mandelbot.js](https://github.com/jeffpar/mandelbot/blob/master/src/mandelbot.js)
 * and must be accompanied by the same Apache License if they are redistributed.
 */

"use strict";

// import * as BigNumber from "./bignumber/bignumber";

/**
 * DEBUG
 *
 * Set to false by the Closure Compiler to disable debug-only code, assertions, etc.
 *
 * @define {boolean}
 */
let DEBUG = true;

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
 * The class must be marked "unrestricted" because the Closure Compiler's default ("struct") requires
 * that all class properties be defined in the body of the constructor, which is too restrictive.  I'd
 * prefer a compilation mode somewhere between "struct" and "unrestricted" that requires all properties
 * to be defined either by the constructor or any methods it calls, because that would help catch any
 * lazily defined properties that may not not be initialized in time.  But that's not an option.
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
 * @property {number} palette
 * @property {number} shape
 * @property {number} colorBgnd
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
 * @property {number} widthUpdate
 * @property {number|BigNumber} xLeft
 * @property {number|BigNumber} xInc
 * @property {number|BigNumber} yTop
 * @property {number|BigNumber} xInc
 * @property {number|BigNumber} xUpdate
 * @property {number|BigNumber} yUpdate
 */
class Mandelbot {
    /**
     * Mandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, palette, shape, idView, idStatus)
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
     * Any of the coordinate parameters (x,y,dx,dy) can be specified as numbers OR strings, since strings may be needed
     * to represent BigNumbers that can't be expressed as a 64-bit floating-point numbers.  If bigNumbers is true, then
     * those parameters are passed through to the BigNumber constructor as-is; otherwise, those parameters are coerced
     * to numbers using the unary "plus" operator.
     *
     * @this {Mandelbot}
     * @param {number} [widthGrid] (grid canvas width; default is view canvas width or 200)
     * @param {number} [heightGrid] (grid canvas height; default is view canvas height or 200)
     * @param {number|string} [xCenter] (the x coordinate of the center of the image; default is -0.65)
     * @param {number|string} [yCenter] (the y coordinate of the center of the image; default is 0)
     * @param {number|string} [dxCenter] (the distance from xCenter to the sides of the image; default is 1.5)
     * @param {number|string} [dyCenter] (the distance from yCenter to the top/bottom of the image; default is 1.5)
     * @param {boolean} [bigNumbers] (true to use BigNumbers for floating-point calculations; default is false)
     * @param {number} [palette] (one of the Mandelbot.PALETTE values; default is GRAY)
     * @param {number} [shape] (one of the Mandelbot.SHAPE values; default is RECT)
     * @param {string} [idView] (the id of an existing view canvas, if any)
     * @param {string} [idStatus] (the id of an existing status control, if any)
     */
    constructor(widthGrid = 0, heightGrid = 0,
                xCenter = Mandelbot.DEFAULT.XCENTER,
                yCenter = Mandelbot.DEFAULT.YCENTER,
                dxCenter, dyCenter, bigNumbers, palette, shape, idView, idStatus)
    {
        if (DEBUG) this.logDebug = [];
        this.getURLHash(idView);
        this.bigNumbers = !!this.getURLValue(Mandelbot.KEY.BIGNUMBERS, bigNumbers || false);
        this.palette = /** @type {number} */ (this.getURLValue(Mandelbot.KEY.PALETTE, palette || Mandelbot['PALETTE']['GRAY']));
        this.shape = shape || Mandelbot['SHAPE']['RECT'];
        /*
         * TODO: Allow the caller to specify the background color; useful if the page contains a non-rectangular
         * view or non-default color.
         */
        this.colorBgnd = 0xffffff;
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
                dxCenter = dxCenter || Mandelbot.DEFAULT.DXCENTER;
                dyCenter = dyCenter || (Mandelbot.DEFAULT.DYCENTER * (this.heightGrid / this.widthGrid));
                this.xReset  = this.getURLValue(Mandelbot.KEY.XCENTER, this.xDefault = xCenter, false);
                this.yReset  = this.getURLValue(Mandelbot.KEY.YCENTER, this.yDefault = yCenter, false);
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
             * The RESET control, if any, doesn't need to be recorded, because this one-time initialization is all
             * that's required.
             */
            if (control) {
                control.onclick = function onReset() {
                    /*
                     * If RESET is clicked after all coordinates have already returned to the page's reset values,
                     * then revert to the built-in defaults (think of it as a hard reset, as opposed to a soft reset).
                     */
                    mandelbot.aPrevious = [];
                    mandelbot.updatePrevious();
                    if (mandelbot.xCenter == mandelbot.xReset && mandelbot.yCenter == mandelbot.yReset) {
                        if (mandelbot.dxCenter == mandelbot.dxReset && mandelbot.dyCenter == mandelbot.dyReset) {
                            mandelbot.prepGrid(Mandelbot.DEFAULT.XCENTER,  Mandelbot.DEFAULT.YCENTER,
                                               Mandelbot.DEFAULT.DXCENTER, Mandelbot.DEFAULT.DYCENTER * (mandelbot.heightGrid / mandelbot.widthGrid));
                            return;
                        }
                    }
                    mandelbot.prepGrid(mandelbot.xReset, mandelbot.yReset, mandelbot.dxReset, mandelbot.dyReset);
                };
            }
            break;

        case Mandelbot['CONTROL_PREVIOUS']:
            this.controlPrevious = control;
            if (control) {
                control.onclick = function onPrevious() {
                    let hash = mandelbot.aPrevious.pop();
                    if (hash != null) {
                        mandelbot.getURLHash(mandelbot.idView, hash);
                        mandelbot.bigNumbers = !!mandelbot.getURLValue(Mandelbot.KEY.BIGNUMBERS, mandelbot.bigNumbers);
                        mandelbot.palette = /** @type {number} */ (mandelbot.getURLValue(Mandelbot.KEY.PALETTE, mandelbot.palette));
                        let x  = mandelbot.getURLValue(Mandelbot.KEY.XCENTER,  mandelbot.xDefault, false);
                        let y  = mandelbot.getURLValue(Mandelbot.KEY.YCENTER,  mandelbot.yDefault, false);
                        let dx = mandelbot.getURLValue(Mandelbot.KEY.DXCENTER, mandelbot.dxDefault, true);
                        let dy = mandelbot.getURLValue(Mandelbot.KEY.DYCENTER, mandelbot.dyDefault, true);
                        mandelbot.prepGrid(x, y, dx, dy);
                        mandelbot.updatePrevious();
                    }
                }
            }
            this.updatePrevious();
            break;

        case Mandelbot['CONTROL_DOWNLOAD']:
            if (control) {
                control.onclick = function onDownload() {
                    let name = "mandelbot.png";
                    let url = mandelbot.canvasView.toDataURL("image/png");
                    let link = document.createElement('a');
                    if (link && typeof link.download != 'string') link = null;
                    if (link) {
                        link.href = url;
                        link.download = name;
                        document.body.appendChild(link);    // Firefox allegedly requires the link to be in the body
                        link.click();
                        document.body.removeChild(link);
                        window.alert('Check your Downloads folder for ' + name + '.');
                    }
                    else {
                        window.open(url);
                        window.alert('Check your browser for a new window/tab containing the requested data' + (name? (' (' + name + ')') : ''));
                    }
                }
            }
            break;

        case Mandelbot['CONTROL_DEBUG']:
            if (DEBUG && control) {
                this.controlDebug = control;
                control.onclick = function onDebug() {
                    mandelbot.updateStatus();
                };
            }
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
                     * TODO: Verify that this property really only has much (if any) effect when the View context
                     * has HIGHER resolution than the Grid context, and that it only makes sense on the View context;
                     * also, I'm not sure how many browsers really support it, and which browsers require special
                     * prefixes on the property (eg, 'mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', etc).
                     * Finally, if it's possible that some users really WANT to produce low-res "fuzzy" images, then
                     * consider adding a parameter to control this setting.
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
     * If no width and/or height is specified, and no view width or height is available, we use defaults.
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
            this.canvasGrid.width = this.widthGrid = widthGrid || Mandelbot.DEFAULT.WGRID;
            this.canvasGrid.height = this.heightGrid = heightGrid || Mandelbot.DEFAULT.HGRID;
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
             * colStart and rowStart record the last 'touchstart' or 'mousedown' position on the grid;
             * they will be propagated to colSelect and rowSelect if/when movement is detected, and they
             * will be reset to -1 when movement has ended (eg, 'touchend' or 'mouseup').
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
             * As long as fSelectDefault is false, processSelectAction() will call preventDefault()
             * on every event, to prevent the page from moving/scrolling while we process select events.
             */
            this.fSelectDefault = false;

            /*
             * NOTE: The mouse event handlers below deal only with events where the left button is involved
             * (ie, left button is pressed, down, or released).
             */
            control.addEventListener(
                'touchstart',
                function onTouchStart(event) {
                    mandelbot.processSelectAction(Mandelbot.ACTION.PRESS, event);
                }
            );
            control.addEventListener(
                'touchmove',
                function onTouchMove(event) {
                    mandelbot.processSelectAction(Mandelbot.ACTION.MOVE, event);
                }
            );
            control.addEventListener(
                'touchend',
                function onTouchEnd(event) {
                    mandelbot.processSelectAction(Mandelbot.ACTION.RELEASE, event);
                }
            );
            control.addEventListener(
                'mousedown',
                function onMouseDown(event) {
                    if (!event.button) {
                        mandelbot.processSelectAction(Mandelbot.ACTION.PRESS, event);
                    }
                }
            );
            control.addEventListener(
                'mousemove',
                function onMouseMove(event) {
                    /*
                     * Sadly, the 'buttons' property is not supported in all browsers (eg, Safari),
                     * so my original test for the left button (event.buttons & 0x1) is not sufficient.
                     * Instead, we'll rely on our own colStart/rowStart properties, which should only
                     * be positive after 'mousedown' and before 'mouseup'.
                     */
                    if (mandelbot.colStart >= 0) {
                        mandelbot.processSelectAction(Mandelbot.ACTION.MOVE, event);
                    }
                }
            );
            control.addEventListener(
                'mouseup',
                function onMouseUp(event) {
                    if (!event.button) {
                        mandelbot.processSelectAction(Mandelbot.ACTION.RELEASE, event);
                    }
                }
            );
            control.addEventListener(
                'mouseout',
                function onMouseUp(event) {
                    if (mandelbot.colStart >= 0) {
                        mandelbot.processSelectAction(Mandelbot.ACTION.RELEASE, event);
                    }
                }
            );
        }
    }

    /**
     * processSelectAction(action, event)
     *
     * Although this may appear to be an event handler, I prefer to think of it as an "action handler";
     * it deals with specific user actions that are usually accompanied by an Event object, but the exact
     * nature of the Event object, if any, will vary according to browser and device.
     *
     * @this {Mandelbot}
     * @param {number} action
     * @param {Event} [event] (eg, the object from a 'touch' or 'mouse' event)
     */
    processSelectAction(action, event)
    {
        let colView, rowView, colGrid, rowGrid;

        if (action < Mandelbot.ACTION.RELEASE) {
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
            colGrid = Math.round((this.widthGrid * colView) / this.widthView);
            rowGrid = Math.round((this.heightGrid * rowView) / this.heightView);
        }

        if (!this.fSelectDefault) event.preventDefault();

        this.hideSelection();

        if (action == Mandelbot.ACTION.PRESS) {
            /*
             * All we do is record the grid position of that event, transitioning colStart and rowStart
             * from negative to non-negative values (grid positions cannot be negative).
             */
            this.colStart = colGrid;
            this.rowStart = rowGrid;
            this.msStart = Date.now();
            if (DEBUG) this.logDebug.push("press action x,y=" + this.colStart + "," + this.rowStart);
        }
        else if (action == Mandelbot.ACTION.MOVE) {
            /*
             * In the case of a mouse, this can happen all the time, whether a button is 'down' or not, but
             * our event listener automatically suppresses all moves except those where the left button is down.
             *
             * Also, we don't want to change the selection unless the delta is at least some minimal amount
             * (eg, 10 points), because otherwise we could mis-detect a sloppy click/tap as some tiny selection.
             */
            let colDelta = Math.abs(this.colStart - colGrid), rowDelta = Math.abs(this.rowStart - rowGrid);
            if (colDelta >= 10 && rowDelta >= 10) {
                this.colSelect = this.colStart;
                this.rowSelect = this.rowStart;
                this.widthSelect = colGrid - this.colSelect;
                this.heightSelect = rowGrid - this.rowSelect;
                /*
                 * Constrain the selection rectangle to one whose aspect ratio matches that of the grid;
                 * if needed, we arbitrarily modify the width (not the height) to bring it into compliance.
                 */
                let aspectGrid = Math.abs(this.widthGrid / this.heightGrid);
                let aspectSelect = Math.abs(this.widthSelect / this.heightSelect);
                if (aspectSelect != aspectGrid) {
                    let widthSelect = Math.abs((this.widthGrid * this.heightSelect) / this.heightGrid);
                    this.widthSelect = (this.widthSelect < 0)? -widthSelect : widthSelect;
                }
                if (DEBUG) this.logDebug.push("move action dx,dy=" + this.widthSelect + "," + this.heightSelect);
            }
        }
        else if (action == Mandelbot.ACTION.RELEASE) {
            /*
             * Here's the overall RELEASE logic:
             *
             *      if this is a click/tap (msRelease < 200ms)
             *          if there is a selection rectangle
             *              if the click/tap is INSIDE the rectangle
             *                  calculate new position and range
             *              else
             *                  cancel the selection
             *          else
             *              calculate new position only
             *      else
             *          do nothing (most likely, the user just finished making a new selection)
             *
             * All 'mouseup' events include a position, and on iOS touch devices, the 'touchend' event includes
             * a position as well.  Sadly, on Android touch devices, the 'touchend' event does NOT include a position,
             * so the colGrid and rowGrid variables we calculate above cannot be relied upon here.
             *
             * However, since our main concern here is what to do on click/tap action, we should be able to rely on
             * colStart and rowStart (we assumed that the apple did not fall far from the tree).
             */
            let msRelease = Date.now() - this.msStart;
            if (msRelease < 200) {

                if (DEBUG) this.logDebug.push("click action x,y=" + this.colStart + "," + this.rowStart + " dx,dy=" + this.widthSelect + "," + this.heightSelect);

                let xCenter, yCenter, dxCenter, dyCenter;

                if (this.widthSelect && this.heightSelect) {
                    /*
                     * Since there's a selection rectangle, let's see if this RELEASE occurred inside or
                     * outside the rectangle.
                     */
                    let colBeg = this.colSelect;
                    let rowBeg = this.rowSelect;
                    let colEnd = this.colSelect + this.widthSelect;
                    let rowEnd = this.rowSelect + this.heightSelect;
                    /*
                     * Since the width and/or height can be negative (if the selection extended above or to
                     * the left of the starting position), swap the beginning and ending positions as needed
                     * to simplify the range check below.
                     */
                    if (colEnd < colBeg) {
                        colBeg = colEnd;
                        colEnd = this.colSelect;
                    }
                    if (rowEnd < rowBeg) {
                        rowBeg = rowEnd;
                        rowEnd = this.rowSelect;
                    }
                    if (this.colStart > colBeg && this.colStart < colEnd && this.rowStart > rowBeg && this.rowStart <= rowEnd) {
                        /*
                         * The action occurred inside the selection, so calculate a new range.
                         */
                        if (DEBUG) this.logDebug.push("click inside " + colBeg + "," + rowBeg + "--" + colEnd + "," + rowEnd);

                        if (!this.bigNumbers) {
                            dxCenter = ((colEnd - colBeg) * this.xInc) / 2;
                            dyCenter = ((rowEnd - rowBeg) * this.yInc) / 2;
                            xCenter = this.xLeft + (colBeg * this.xInc) + dxCenter;
                            yCenter = this.yTop  - (rowBeg * this.yInc) - dyCenter;
                        } else {
                            dxCenter = this.xInc.times(colEnd - colBeg).dividedBy(2);
                            dyCenter = this.yInc.times(rowEnd - rowBeg).dividedBy(2);
                            xCenter = this.xLeft.plus(this.xInc.times(colBeg)).plus(dxCenter);
                            yCenter = this.yTop.minus(this.yInc.times(rowBeg)).minus(dyCenter);
                        }
                        this.prepGrid(xCenter, yCenter, dxCenter, dyCenter, true);
                    }
                    else {
                        if (DEBUG) this.logDebug.push("click outside " + colBeg + "," + rowBeg + "--" + colEnd + "," + rowEnd);
                    }
                }
                else {
                    /*
                     * Since there's NO selection rectangle, treat this as a re-positioning operation.
                     */
                    if (!this.bigNumbers) {
                        xCenter = this.xLeft + (this.colStart * this.xInc);
                        yCenter = this.yTop  - (this.rowStart * this.yInc);
                    } else {
                        xCenter = this.xLeft.plus(this.xInc.times(this.colStart));
                        yCenter = this.yTop.minus(this.yInc.times(this.rowStart));
                    }
                    this.prepGrid(xCenter, yCenter, this.dxCenter, this.dyCenter, true);
                }
                this.colSelect = this.rowSelect = -1;
                this.widthSelect = this.heightSelect = 0;
            }
            else {
                /*
                 * Here, we assume the RELEASE simply signals the end of a selection operation; nothing to do (yet).
                 */
                if (DEBUG) this.logDebug.push("release action x,y=" + this.colSelect + "," + this.rowSelect + " dx,dy=" + this.widthSelect + "," + this.heightSelect);
            }
            this.colStart = this.rowStart = -1;
            this.msStart = 0;
        }
        else {
            if (DEBUG) this.logDebug.push("unrecognized action: " + action);
        }

        this.showSelection();
    }

    /**
     * hideSelection()
     *
     * This removes any selection rectangle from the grid by simply redrawing all image data onto the grid,
     * after first ensuring that none of the grid positions contain transparent values (ie, zero alpha).
     *
     * There are many optimizations we could perform here to reduce the amount grid canvas we are touching.
     * For example, we could re-enable those commented-out putImageData() parameters; however, it's not quite
     * that simple, because the strokeRect() performed by showSelection() actually touches more pixels than that.
     *
     * @this {Mandelbot}
     */
    hideSelection()
    {
        if (this.colSelect >= 0) {
            if (this.fZeroAlpha) {
                let n = this.widthGrid * this.heightGrid * 4;
                for (let i = 0; i < n; i += 4) this.imageGrid.data[i + 3] = 0xff;
                this.fZeroAlpha = false;
            }
            this.contextGrid.putImageData(this.imageGrid, 0, 0 /*, this.colSelect, this.rowSelect, this.widthSelect, this.heightSelect */);
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
     * fUpdate defaults to true; it must be explicitly set to false to prevent the updateHash() and updateMandelbots()
     * calls, which only the constructor does, and it must be explicitly set to true for updateHash() to also update
     * the stack of hashes in the aPrevious array; otherwise, it's assumed that the caller just popped (or reset) the
     * array, so we don't want updateHash() interfering.
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
        if (!this.bigNumbers) {
            this.xCenter = xCenter;
            this.yCenter = yCenter;
            this.dxCenter = dxCenter;
            this.dyCenter = dyCenter;
            /*
             * I ran into a very strange Chrome-only bug, where if I immediately used any of the four
             * preceding properties, the following calculations would *sometimes* result in NaN values.
             * Setting breakpoints in the code, adding more logging, etc, would eliminate the bug.
             *
             *      this.xLeft = this.xCenter - this.dxCenter;
             *      this.xInc = (this.dxCenter * 2) / this.widthGrid;
             *      this.yTop = this.yCenter + this.dyCenter;
             *      this.yInc = (this.dyCenter * 2) / this.heightGrid;
             *
             * It's probably a symptom of the fact that those are new properties being added to the object,
             * which may force V8 to change its assumptions about the shape of the object at an inopportune
             * time.  However, this function IS called from the constructor, so I consider it part of the
             * object's initialization sequence.  Having separate initializers for those properties in the
             * constructor, only to have them reinitialized by this function, seems silly.
             */
            this.xLeft = xCenter - dxCenter;
            this.xInc = (dxCenter * 2) / this.widthGrid;
            this.yTop = yCenter + dyCenter;
            this.yInc = (dyCenter * 2) / this.heightGrid;
            console.log("prepGrid(" + this.idView + "): " + this.xCenter + "-" + this.dxCenter + " " + this.widthGrid + " (" + this.xLeft + "+" + this.xInc + ")");
        }
        else {
            /*
             * Normally, if bigNumbers is true, the inputs will already be BigNumbers, but there is at least
             * one exception: when onReset() calls us with hard-coded numbers.  Since the BigNumber constructor
             * accepts both numbers and BigNumbers, the simplest solution is to always call the constructor.
             */
            this.xCenter = new BigNumber(xCenter);
            this.yCenter = new BigNumber(yCenter);
            this.dxCenter = new BigNumber(dxCenter);
            this.dyCenter = new BigNumber(dyCenter);
            this.xLeft = this.xCenter.minus(this.dxCenter);
            this.xInc = this.dxCenter.times(2).dividedBy(this.widthGrid).round(20);
            this.yTop = this.yCenter.plus(this.dyCenter);
            this.yInc = this.dyCenter.times(2).dividedBy(this.heightGrid).round(20);
        }
        this.updateRow(0);
        /*
         * It's best to (re)initialize the entire grid with the background color, so that if we need to erase
         * a selection rectangle from a portion of the grid that hasn't been calculated yet -- either because
         * shape is non-zero (ie, not a rectangle) or because the calculation process hasn't reached the bottom
         * of the grid yet -- that erasure can easily be done by blasting the entire grid image onto the grid
         * canvas; see hideSelection() for details.
         *
         * One wrinkle you'll notice here is that we're calling setGridPoint() with the alpha parameter set to
         * zero, which means all uncalculated points are initially transparent.  We do this so that, as long
         * as you don't make any selections, all grid positions outside the calculation area remain transparent,
         * allowing you to save the final image with transparency intact.  However, the first time you make a
         * selection, hideSelection() will write non-zero (0xff) alpha values into all grid positions, ensuring
         * that any selection rectangle will be properly erased.
         */
        this.fZeroAlpha = true;
        for (let row = 0; row < this.heightGrid; row++) {
            for (let col = 0; col < this.widthGrid; col++) {
                this.setGridPoint(col, row, this.colorBgnd, 0);
            }
        }
        this.nMaxIterations = Mandelbot.getMaxIterations(this.dxCenter, this.dyCenter);
        this.updateStatus("X: " + this.xCenter + ", Y: " + this.yCenter + ", D: +/-" + this.dxCenter + ", Max Iterations: " + this.nMaxIterations + (this.bigNumbers? " (BigNumbers)" : ""));
        if (fUpdate !== false) {
            this.updateHash(fUpdate);
            updateMandelbots(true);
        }
    }

    /**
     * updateRow(row)
     *
     * In a rectangular world, this merely needs to set colUpdate to zero and widthUpdate to widthGrid.
     *
     * In a circular world, we must calculate the starting colUpdate appropriate for the current row and
     * then update widthUpdate to match.  Imagine we have a grid that's 30x30, so the corresponding grid radius
     * is 15 units.  For each row, we must determine the point on the grid where the grid radius intersects
     * the current grid row, and begin calculating at that point.
     *
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . * * * * * * * * * * * . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . C . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *      . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
     *
     * On the above grid, the coordinates of C are (0,0), so if we're working on the second row from the top,
     * it has the equation y = 14, and the equation representing the circular boundary intersecting that row is
     * x^2 + y^2 = 15^2.  The value for x is therefore sqrt(15^2 - y^2), or sqrt(225 - 196), or +/-5.39, which
     * we round to +/-5.
     *
     * @this {Mandelbot}
     * @param {number} row
     */
    updateRow(row)
    {
        this.rowUpdate = row;
        if (!this.shape) {
            this.colUpdate = 0;
            this.widthUpdate = this.widthGrid;
        } else {
            let r = Math.trunc(this.heightGrid / 2);
            let y = r - this.rowUpdate;
            let x = Math.round(Math.sqrt((r * r) - (y * y)));
            this.colUpdate = Math.trunc(this.widthGrid / 2) - x;
            this.widthUpdate = x * 2;
        }
        if (!this.bigNumbers) {
            this.xUpdate = this.xLeft + this.xInc * this.colUpdate;
            if (!row) {
                this.yUpdate = this.yTop;
            } else {
                this.yUpdate -= this.yInc;
            }
        } else {
            this.xUpdate = this.xLeft.plus(this.xInc.times(this.colUpdate));
            if (!row) {
                this.yUpdate = this.yTop.plus(0);
            } else {
                this.yUpdate = this.yUpdate.minus(this.yInc);
            }
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
            while (nMaxIterationsTotal > 0 && this.widthUpdate-- > 0) {
                let m = this.nMaxIterations;
                let n = Mandelbot.isMandelbrot(this.xUpdate, this.yUpdate, m, this.aResults);
                this.setGridPoint(this.colUpdate++, this.rowUpdate, Mandelbot.getColor(this.palette, this.aResults));
                if (!this.bigNumbers) {
                    this.xUpdate += this.xInc;
                } else {
                    this.xUpdate = this.xUpdate.plus(this.xInc);
                }
                if (!heightDirty) widthDirty++;
                nMaxIterationsTotal -= (m - n);
                fUpdated = true;
            }
            if (nMaxIterationsTotal <= 0) break;
            this.updateRow(this.rowUpdate + 1);
            heightDirty++;
            colDirty = 0;
            widthDirty = this.widthGrid;
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
     * If the hash portion of the URL contains values for idView, store those values in hashTable;
     * if this is a "headless" Mandelbot (idView is not set), then its hash table will be empty.
     *
     * TODO: We don't currently support encoding values for multiple Mandelbots in a single URL; all
     * we do is verify that the current URL hash is for the current Mandelbot.  Only the Mandelbot
     * that last updated the URL via updateHash() will be successful.
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
     * If init is a boolean, then the hash is evaluated as a boolean, but the return value is always a number (0 or 1);
     * we don't want to the muddy the waters by making boolean another possible return type, so callers will generally
     * apply "!!" to the result to produce a real boolean.
     *
     * If abs is defined (true or false), then the return value is either a number or a BigNumber, as appropriate;
     * if abs is NOT defined, the return value is ALWAYS a number.  For example, abs is omitted from keys like PALETTE,
     * which is always a number (never a BigNumber).
     *
     * Unfortunately, the Closure Compiler isn't smart enough to realize that whenever abs is omitted, the return
     * type is always number, so those callers will want to coerce (cast) the return value to number.
     *
     * @this {Mandelbot}
     * @param {string} key
     * @param {number|string|boolean} init
     * @param {boolean} [abs] (true to return absolute value)
     * @return {number|BigNumber}
     */
    getURLValue(key, init, abs)
    {
        let hash = this.hashTable[key];
        if (typeof init == 'boolean') {
            return (hash && (hash == 'true' || +hash) || !hash && init)? 1 : 0;
        }
        let value;
        init = hash || init;
        if (this.bigNumbers && abs !== undefined) {
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
            /*
             * I used to encode BIGNUMBERS only if it was true (since the default is false), but
             * then it becomes difficult to override the setting on pages that set bigNumbers to true,
             * so now we always encode.
             */
            hash += '&' + Mandelbot.KEY.BIGNUMBERS + '=' + this.bigNumbers;
            hash += '&' + Mandelbot.KEY.PALETTE + '=' + this.palette;
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
        message = message || this.messageStatus || "";
        if (DEBUG) {
            if (message) console.log(message);
            for (let i = 0; i < this.logDebug.length; i++) {
                console.log(this.logDebug[i]);
                if (this.controlDebug) {
                    if (message) message += "<br/>";
                    message += this.logDebug[i];
                }
            }
            this.logDebug = [];
        }
        if (!this.controlStatus) {
            this.messageStatus = message;
        } else {
            this.controlStatus.innerHTML = message;
            this.messageStatus = "";
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
     * setGridPoint(col, row, rgb, alpha)
     *
     * @this {Mandelbot}
     * @param {number} col
     * @param {number} row
     * @param {number} rgb
     * @param {number} [alpha]
     */
    setGridPoint(col, row, rgb, alpha = 0xff)
    {
        let i = (col + row * this.widthGrid) * 4;
        this.imageGrid.data[i] = rgb & 0xff;
        this.imageGrid.data[i+1] = (rgb >> 8) & 0xff;
        this.imageGrid.data[i+2] = (rgb >> 16) & 0xff;
        this.imageGrid.data[i+3] = alpha;
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
                let x = bigNumbers? new BigNumber(Mandelbot.DEFAULT.XCENTER) : Mandelbot.DEFAULT.XCENTER;
                let y = bigNumbers? new BigNumber(Mandelbot.DEFAULT.YCENTER) : Mandelbot.DEFAULT.YCENTER;
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
     *      imaginary parts of c as image coordinates (x + yi) on the complex plane, [points] may then be colored
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
         * Let's use z{n} to indicate the nth iteration of z in the Mandelbrot function:
         *
         *      z{n+1} = z{n}^2 + c
         *
         * z is a complex number of the form (a + bi), where a and b are real and imaginary coefficients;
         * the initial z, z{0}, is (0 + 0i).
         *
         * c is also a complex number of the form (x + yi), and it remains constant; the x and y coefficients
         * are inputs to this function.
         *
         * The n+1 iteration requires calculating the square of the nth iteration, which means squaring (a + bi):
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
         * So the real and imaginary coefficients for z{n+1}, after adding the coefficients of c (x and y), are:
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
         * assumes the former, in part because this is what the original Scientific American article from August 1985
         * said:
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
            /*
             * The BigNumber loop.  Note that as and bs ("a squared" and "b squared") are BigNumber
             * values that are converted to normal numbers aa and bb at the end, because at this time,
             * we don't support returning BigNumber values in the results array.
             *
             * TODO: All round() operations need to be reviewed; at the very least, some degree of control
             * over the amount of rounding must eventually be provided.  Some minimum amount of rounding
             * is required, because the BigNumber library doesn't provide any automatic precision control.
             * Without rounding, these values quickly amass huge numbers of digits, and we die.
             */
            let a = new BigNumber(0), b = new BigNumber(0), as = new BigNumber(0), bs = new BigNumber(0);
            do {
                b = a.times(b).times(2).plus(y).round(20);
                a = as.minus(bs).plus(x);
                as = a.times(a).round(20);
                bs = b.times(b).round(20);
            } while (--n > 0 && as.plus(bs).lt(4));
            if (n && aResults) {
                let l = 4;  // iterate a few (4) more times to provide more detail; see http://linas.org/art-gallery/escape/escape.html
                do {
                    b = a.times(b).times(2).plus(y).round(20);
                    a = as.minus(bs).plus(x);
                    as = a.times(a).round(20);
                    bs = b.times(b).round(20);
                } while (--l > 0);
                aa = as.toNumber();
                bb = bs.toNumber();
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
     * getColor(palette, aResults)
     *
     * Adapted from code in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 Christian Stigen Larsen.
     * Licensed in compliance with Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0).
     *
     * @param {number} palette
     * @param {Array.<number>} aResults
     * @return {number}
     */
    static getColor(palette, aResults)
    {
        let rgb = 0;            // 0 is black (0x000000), used for numbers in the Mandelbrot set

        if (aResults[1]) {      // if the number is NOT in the Mandelbrot set, then choose another color

            let fSwap = true;
            let v = Mandelbot.getSmoothColor(aResults);

            switch (palette) {
            case Mandelbot['PALETTE']['BW']:
            default:
                rgb = -1;       // -1 is white (0xffffff)
                break;
            case Mandelbot['PALETTE']['GRAY']:
                v = Math.floor(512.0 * v / aResults[0]);
                if (v > 0xff) v = 0xff;
                rgb = v | (v << 8) | (v << 16);
                break;
            case Mandelbot['PALETTE']['BRIGHT']:
                rgb = Mandelbot.getRGBFromHSV(360 * v / aResults[0], 1.0, 1.0);
                break;
            case Mandelbot['PALETTE']['MUTED']:
                fSwap = false;
                /* falls through */
            case Mandelbot['PALETTE']['BLUE']:
                rgb = Mandelbot.getRGBFromHSV(360 * v / aResults[0], 1.0, 10.0 * v / aResults[0]);
                if (fSwap) {    // swap red and blue bytes
                    rgb = (rgb & 0xff00ff00) | ((rgb >> 16) & 0xff) | ((rgb & 0xff) << 16);
                }
                break;
            }
        }
        return rgb;
    }

    /**
     * getMaxIterations(dxCenter, dyCenter)
     *
     * Adapted from code in https://github.com/cslarsen/mandelbrot-js/blob/master/mandelbrot.js
     * Copyright 2012 Christian Stigen Larsen.
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
     * Copyright 2012 Christian Stigen Larsen.
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
     * Copyright 2012 Christian Stigen Larsen.
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

/*
 * Various Mandelbot defaults, used primarily by the constructor, as well as the onReset() function
 */
Mandelbot.DEFAULT = {
    WGRID:      200,
    HGRID:      200,
    XCENTER:    -0.65,
    YCENTER:    0,
    DXCENTER:   1.5,
    DYCENTER:   1.5
};

/*
 * Various Mandelbot actions; see processSelectAction()
 */
Mandelbot.ACTION = {
    PRESS:      1,      // eg, an action triggered by a 'mousedown' or 'touchstart' event
    MOVE:       2,      // eg, an action triggered by a 'mousemove' or 'touchmove' event
    RELEASE:    3       // eg, an action triggered by a 'mouseup' (or 'mouseout') or 'touchend' event
};

Mandelbot.LOG_BASE = 1.0 / Math.log(2.0);
Mandelbot.LOG_HALFBASE = Math.log(0.5) * Mandelbot.LOG_BASE;

/*
 * Various Mandelbot parameters that we support encoding in the hash ('#') portion of the URL; see updateHash()
 */
Mandelbot.KEY = {
    ID:         "id",
    XCENTER:    "x",
    YCENTER:    "y",
    DXCENTER:   "dx",
    DYCENTER:   "dy",
    BIGNUMBERS: "big",
    PALETTE:    "palette"
};

/*
 * Various Mandelbot palettes supported
 */
Mandelbot['PALETTE'] = {
    'BW':       1,  // B&W
    'GRAY':     2,  // GRAYSCALE
    'BRIGHT':   3,  //
    'MUTED':    4,  //
    'BLUE':     5,  //
};

/*
 * Various Mandelbot display shapes supported
 */
Mandelbot['SHAPE'] = {
    'RECT':     0,
    'CIRCLE':   1
};

Mandelbot['CONTROL_DOWNLOAD'] = "download";
Mandelbot['CONTROL_STATUS']   = "status";
Mandelbot['CONTROL_RESET']    = "reset";
Mandelbot['CONTROL_PREVIOUS'] = "previous";
if (DEBUG) Mandelbot['CONTROL_DEBUG'] = "debug";

nMaxIterationsPerTimeslice = Mandelbot.calibrate(0, 8);
nMaxBigIterationsPerTimeslice = Mandelbot.calibrate(0, 8, true);

/**
 * newMandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, palette, shape, idView, idStatus, fAutoUpdate)
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
 * @param {number|undefined} [palette]
 * @param {number|undefined} [shape]
 * @param {string} [idView]
 * @param {string} [idStatus]
 * @param {boolean} [fAutoUpdate] (true to add the Mandelbot to the set of automatically updated Mandelbots)
 * @return {Mandelbot}
 */
function newMandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, palette, shape, idView, idStatus, fAutoUpdate = true)
{
    let mandelbot = new Mandelbot(widthGrid, heightGrid, xCenter, yCenter, dxCenter, dyCenter, bigNumbers, palette, shape, idView, idStatus);
    if (fAutoUpdate) addMandelbot(mandelbot);
    return mandelbot;
}

/**
 * addMandelbot(mandelbot)
 *
 * Adds the Mandelbot to the array of auto-updated Mandelbots.  newMandelbot() does this by default.
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
 * setTimeout() handler for updating all Mandelbots.  addMandelbot() does this automatically to ensure an update
 * has been scheduled.
 *
 * @param {boolean} [fInit] (true to merely schedule an update; otherwise, perform an update and then schedule another)
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
                 * Since the grid was updated, we set the fInit flag to ensure that at least one more
                 * updateMandelbots() call will be scheduled via setTimeout().  Even though it's possible
                 * that the grid was FULLY updated, I'm happy to wait until the next updateMandelbots()
                 * call to find that out; updateGrid() will then report there was nothing to update, and
                 * once ALL the grids on the page report the same thing, we'll stop scheduling these calls.
                 */
                fInit = true;
            }
            if (++iNextMandelbot >= activeMandelbots.length) iNextMandelbot = 0;
        }
    }
    /*
     * Schedule a new call for immediate execution if there were any updates (otherwise, we assume our work is done).
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
