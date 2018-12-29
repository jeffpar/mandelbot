/**
 * @fileoverview Gulp file for Mandelbot
 * @author <a href="mailto:Jeff@pcjs.org">Jeff Parsons</a> (@jeffpar)
 * @copyright © Jeff Parsons 2017-2019
 */

 "use strict";

var gulp = require("gulp");
var gulpClosureCompiler = require('google-closure-compiler').gulp();
var gulpSourceMaps = require('gulp-sourcemaps');

gulp.task("default", function() {
    return gulp.src("./src/mandelbot.js", {base: "./"})
        .pipe(gulpSourceMaps.init())
        .pipe(gulpClosureCompiler({
            assume_function_wrapper: true,
            charset: "UTF-8",
            compilation_level: "ADVANCED",
            define: ["DEBUG=false"],
            externs: ["src/externs.js"],
            warning_level: "VERBOSE",
            language_in: "ES6",
            language_out: "ES5",
            output_wrapper: "(function(){%output%})()",
            js_output_file: "src/mandelbot.min.js",
            create_source_map: true
        }))
        .pipe(gulpSourceMaps.write("./"))
        .pipe(gulp.dest("./"));
});
