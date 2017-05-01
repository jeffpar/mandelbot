#!/usr/bin/env node
/**
 * @fileoverview Converts JavaScript to Markdown
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a>
 * @copyright Copyright © 2017 [Jeff Parsons](mailto:Jeff@pcjs.org)
 *
 * This file is part of an open-source project (https://github.com/jeffpar/mandelbot) with no formal license.
 * All portions not licensed from other sources may be freely reused.  Any derivative work just needs to provide
 * attribution along with the above copyright.
 */

"use strict";

let fs      = require("fs");
let path    = require("path");
let mkdirp  = require("mkdirp");

/**
 * @typedef {{
 *  type:   number,
 *  text:   string
 * }} Block
 */

/**
 * @class JSMD
 * @property {Array.<Block>} aBlocks
 * @property {boolean} fDebug
 */
class JSMD {

    /**
     * @constructor
     */
    constructor()
    {
        this.aBlocks = [];
        this.fDebug = false;
    }

    /**
     * loadFile(sFile, done)
     *
     * @this {JSMD}
     * @param {string} sFile
     * @param {function(Error|null)} done
     */
    loadFile(sFile, done)
    {
        let obj = this;
        let options = {encoding: "utf8"};

        if (this.fDebug) console.log("loadFile(" + sFile + ")");

        fs.readFile(sFile, options, function(err, buf) {
            if (err) {
                console.log(err.message);
                done(err);
                return;
            }
            done(obj.parseFile(buf));
        });
    }

    /**
     * parseFile(buf)
     *
     * Parses the given file data.
     *
     * @this {JSMD}
     * @param {Buffer|string} buf
     * @return {Error|null}
     */
    parseFile(buf)
    {
        if (typeof buf == "string") {
            let comment, sText = buf;
            while (comment = sText.match(/(^|\n) *\/\*\*([\s\S]*?)\*\//)) {
                let text, type;
                if (comment.index) {
                    type = 1;
                    text = "```javascript\n" + sText.substr(0, comment.index) + "\n```\n";
                    this.aBlocks.push({type, text});
                }
                type = 0;
                text = comment[2];
                let sPrefix = "";
                let asLines = text.split("\n");
                text = "";
                for (let i = 0; i < asLines.length; i++) {
                    let line = asLines[i];
                    let parts = line.match(/(^\s*\*?)\s*(.*)/);
                    if (!sPrefix && parts[1]) {
                        sPrefix = parts[1];
                    }
                    if (sPrefix == parts[1]) line = parts[2];
                    if (text) text += '\n';
                    text += line;
                }
                this.aBlocks.push({type, text});
                sText = sText.substr(comment.index + comment[0].length);
            }
            return null;
        }
        return new Error("unsupported buffer type: " + (typeof buf));
    }

    /**
     * writeFile(sFile, fOverwrite)
     *
     * @this {JSMD}
     * @param {string} [sFile]
     * @param {boolean} [fOverwrite]
     */
    writeFile(sFile, fOverwrite)
    {
        if (this.aBlocks.length) {
            let sText = "";
            for (let iBlock = 0; iBlock < this.aBlocks.length; iBlock++) {
                if (sText) sText += '\n';
                sText += this.aBlocks[iBlock].text;
            }
            if (sFile) {
                try {
                    if (fs.existsSync(sFile) && !fOverwrite) {
                        console.log(sFile + " exists, use --overwrite to rewrite");
                    } else {
                        let sDirName = path.dirname(sFile);
                        if (!fs.existsSync(sDirName)) mkdirp.sync(sDirName);
                        fs.writeFileSync(sFile, sText);
                        console.log(sText.length + "-byte file saved as " + sFile);
                    }
                } catch(err) {
                    console.log(err.message);
                }
            } else {
                console.log(sText);
            }
        }
    }
}

/**
 * CLI()
 *
 * Provides a command-line interface for the JSMD class.
 *
 * Usage:
 *
 *      jsmd ({path}|{URL})
 *
 * Example:
 *
 *      node modules/jsmd/jsmd.js src/mandelbot.js
 */
JSMD.CLI = function()
{
    let args = process.argv;

    if (args.length <= 2) {
        console.log("usage: " + args[0] + ' ' + args[1] + " {path}");
        return;
    }

    let sFile = args[2];
    if (!sFile) {
        console.log("bad or missing input filename");
        return;
    }

    let jsmd = new JSMD();
    jsmd.loadFile(sFile, function(err) {
        if (!err) {
            jsmd.writeFile();
        }
    });
};

JSMD.CLI();
