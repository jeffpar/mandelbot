Mandelbot
---------

Like [package.json](package.json) says, this project will:

	Interactively generate Mandelbrot images in JavaScript using BigNumber.js
	
However, this is a work-in-progress, so there isn't a lot to see here yet.  I started the project as a diversion
and an excuse to learn some new things, including how to use (and possibly modify) the
[BigNumber](https://github.com/jeffpar/bignumber.js) JavaScript library.

The JavaScript code that calculates which numbers are in the Mandelbrot set and graphs them is in [src/mandelbot.js](src/mandelbot.js).
An assortment of old Pascal, C, and 8088 assembly-language code that I wrote over 30 years ago has also been in archived in [src/old](src/old/).

Installation
------------

This project has already been installed at [mandelbot.net](http://mandelbot.net/) using
[GitHub Pages](https://pages.github.com/) and the [gh-pages](https://github.com/jeffpar/mandelbot/tree/gh-pages)
branch of this project.  If you want to install and serve your own local copies of the files, here are the steps
for macOS and the corresponding Terminal commands.

##### Step 1: Clone the project.

	git clone https://github.com/jeffpar/mandelbot.git
	cd mandelbot

##### Step 2: Install [Homebrew](https://brew.sh/) (optional if you already have Ruby).

	/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
	
##### Step 3: Install Ruby (optional if you already have a sufficiently current version of Ruby).

	brew install ruby

##### Step 4: Install Bundler.

	gem install bundler

##### Step 5: Install Jekyll (make sure your current directory is `mandelbot`, because this step requires the project's [Gemfile](Gemfile)). 

	bundle install

##### Step 6: Start the Jekyll server.

	bundle exec jekyll serve --host=0.0.0.0 --config _config.yml,_developer.yml

##### Step 7: Fire up your web browser and visit [http://localhost:4000](http://localhost:4000/).

In a perfect world, the above steps would be sufficient.  Unfortunately, I ran into several problems along the way.
Those were resolved by:

- Updating Xcode to the latest version
- Running `xcode-select --install` from a Terminal window

Ordinarily, the Jekyll server could be started with a simple `bundle exec jekyll serve`, but including the
[_developer.yml](_developer.yml) configuration file turns off certain production-only features, such as:

- Google Analytics
- Minified ES5-compatible JavaScript

Operation
---------

Mandelbots are instantiated in a Jekyll Markdown document, like the [home page](INDEX.md), using the
[viewport](_includes/viewport.html) include file:

	{% include viewport.html id="mandelbot1" viewWidth="200" viewHeight="200" %}
	
For documents containing multiple Mandelbots, it may be better to define each viewport's configuration parameters at the
top of the Markdown document:

	---
	...
	viewports:
	  - id: mandelbot1
	    viewWidth: 200
	    viewHeight: 200
	    ...
	---

And then each Mandelbot can be instantiated with just an *id* parameter:

	{% include viewport.html id="mandelbot1" %}

Viewports support the following properties:

- *id*: a unique identifier for the viewport; it is also used as the *id* for the `<canvas>` element.
- *viewWidth*: the width of the viewport canvas, in pixels (default: 200)
- *viewHeight*: the height of the viewport canvas, in pixels (default: 200)
- *gridWidth*: the width of the grid canvas on which numbers will plotted, in pixels (default: viewWidth)
- *gridHeight*: the height of the grid canvas on which numbers will plotted, in pixels (default: viewHeight)
- *styleWidth*: the width used to display the viewport canvas (default: auto)
- *styleHeight*: the height used to display the viewport canvas (default: auto)

*gridWidth* and *gridHeight* determine the resolution of the image to be calculated, while *viewWidth* and *viewHeight*
determine the resolution used to display that image on the page.  They must be specified as numbers, and the units are pixels.

The grid is essentially an internal canvas representing the Cartesian coordinate grid onto which all the complex numbers
are plotted, after they have passed through the Mandelbrot set calculations.  The grid canvas is then drawn onto the viewport
canvas.  By default, the canvas sizes are the same, but different values can be used to create different aspect ratios, scaling
effects, etc.  And the use of two canvases makes the code more flexible, because it provides automatic double-buffering,
which is an important feature in animation.

*styleWidth* and *styleHeight* control how your browser displays the viewport; they are simply passed through to the browser
as standard CSS *width* and *height* properties on the `canvas` element using the *style* attribute.  *auto* is the default for
both properties.  You can also specify numbers of pixels, but since these are CSS properties, you must also specify the units
(eg, *px*).  For example, a *styleWidth* of *200px* enforces a display width of 200 pixels.

Generally, the only reason to alter the style settings is to make the viewport responsive (ie, to fill the page as the width
of the page changes).  This is commonly done by setting *styleWidth* to *100%*.

Modification
------------

Google's [Closure Compiler](https://developers.google.com/closure/compiler/) is used to create minified, ES5-compatible
JavaScript files via a [WebStorm](https://www.jetbrains.com/webstorm/) File Watcher:

	node_modules/google-closure-compiler/compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS \
	--create_source_map $FileName$.map --output_wrapper "(function(){%output%})() //# sourceMappingURL=/src/$FileName$.map" \
	--js $FileName$ --js_output_file  $FileNameWithoutExtension$.min.js

Both the original and minified JavaScript [source files](/src/) are checked into the project, so this may be of little interest
unless you plan to modify the JavaScript files, in which case you can install the Closure Compiler and other assorted development
tools listed in [package.json](package.json) using the Node Package Manager:

	npm install

Inspiration
-----------

[Scientific American, August 1985: Exploring the Mandelbrot Set](http://mandelbot.net/pubs/Dewdney_Mandelbrot.pdf)

> "[Computer Recreations: A computer microscope zooms in for a look at the most complex object in mathematics](https://www.scientificamerican.com/article/mandelbrot-set)"
by A. K. Dewdney, pp. 16-24.

Perspiration
------------

Copyright © Jeff Parsons 2017.  This is an open source project with no formal license.  It may be freely reused in any
derivative work, provided you include some attribution along with the above copyright.
