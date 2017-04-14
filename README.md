Mandelbot
---------

A Mandelbot is a Mandelbrot image generator written in JavaScript.  The goals include:

- Make Mandelbots easy to use and configure (see [Configuration](#configuration))
- Support multiple Mandelbots per page (see [Demo](http://mandelbot.net))
- Build it using simple, easy-to-understand code (see [mandelbot.js](src/mandelbot.js))
- Experiment with new technologies (eg, the [BigNumber](https://github.com/jeffpar/bignumber.js) JavaScript library)
	
However, this is a work-in-progress, so there isn't a lot to see here yet.  I started the project as a diversion
and an excuse to learn some new things, so bear with me.

For history buffs, I've [archived](src/old/) an assortment of old related Pascal, C, and 8088 assembly-language code that
I wrote over 30 years ago.  And the original [Scientific American](http://mandelbot.net/pubs/Dewdney_Mandelbrot.pdf) article
that helped spur a lot of early interest in the Mandelbrot Set (including my own) has been archived here as well.

Installation
------------

This project has already been installed at the [Mandelbot website](http://mandelbot.net/) using
[GitHub Pages](https://pages.github.com/) and the [gh-pages](https://github.com/jeffpar/mandelbot/tree/gh-pages)
branch of this project.  The website is constructed using [Jekyll](https://jekyllrb.com/) and a collection of
[Markdown](https://daringfireball.net/projects/markdown/) documents.

If you want to install and serve your own local copies of all the files, here are the steps for macOS and the
corresponding Terminal commands.

##### Step 1: Clone the project.

	git clone https://github.com/jeffpar/mandelbot.git
	cd mandelbot
	git submodule update --init --recursive

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
[_developer.yml](_developer.yml) configuration file turns off certain production-only features; specifically, it:

- Disables Google Analytics
- Disables minified JavaScript

#### Notes for other operating systems (eg, Ubuntu)

On a clean Ubuntu-based system (elementary OS), I needed to:

	sudo apt install git
	sudo apt install ruby
	sudo apt-get install ruby2.3-dev
	sudo apt-get install zlib1g-dev
	sudo gem install bundler
	echo gem "'therubyracer'" >> Gemfile
	bundle install
	bundle exec jekyll serve --config _config.yml,_developer.yml

Without *therubyracer* added to the Gemfile, Jekyll would fail with the error "Could not find a JavaScript runtime."

Configuration
-------------

Mandelbots are added to [Jekyll](https://jekyllrb.com/) documents on the [Mandelbot website](http://mandelbot.net)
using the [Viewport](_includes/viewport.html) include file:

	{% include viewport.html id="mandelbot1" viewWidth="200" viewHeight="200" %}
	
For documents containing multiple Mandelbots, it may be more convenient to define each viewport's configuration parameters
at the top of the document, inside the document's [Front Matter](https://jekyllrb.com/docs/frontmatter/):

	---
	...
	viewports:
	  - id: mandelbot1
	    viewWidth: 200
	    viewHeight: 200
	    ...
	---

Then each Mandelbot can be added with just an *id* parameter:

	{% include viewport.html id="mandelbot1" %}

Examples of both inline and predefined Mandelbot viewports can be found in the project's [home page](INDEX.md).

Viewports support the following properties:

- *id*: the unique *id* to use for the generated `<canvas>` element
- *viewWidth*: the width of the viewport canvas, in pixels (default: 200)
- *viewHeight*: the height of the viewport canvas, in pixels (default: 200)
- *gridWidth*: the width of the grid canvas on which numbers will plotted, in pixels (default: viewWidth)
- *gridHeight*: the height of the grid canvas on which numbers will plotted, in pixels (default: viewHeight)
- *styleWidth*: the width used to display the viewport canvas (default: auto)
- *styleHeight*: the height used to display the viewport canvas (default: auto)
- *xCenter*: the x coordinate of the center of the initial image (default: -0.5)
- *yCenter*: the y coordinate of the center of the initial image (default: 0)
- *xDistance*: the distance from xCenter to the right and left sides of the initial image (default: 1.5)
- *yDistance*: the distance from yCenter to the top and bottom of the initial image (default: xDistance)
- *bigNumbers*: true to use BigNumbers for all floating-point calculations (default: false)
- *colorScheme*: one of the Viewport.COLORSCHEME values (default: GRAY)
- *idStatus*: a unique identifier for a text-based status control; if omitted, no control is generated

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
	--externs externs.js --js $FileName$ --js_output_file $FileNameWithoutExtension$.min.js

Both the original and minified JavaScript [source files](/src/) are checked into the project, so this may be of little interest
unless you plan to modify the JavaScript files, in which case you can install the Closure Compiler and other assorted development
tools listed in [package.json](package.json) using the Node Package Manager (which, of course, requires that you have
[Node](https://nodejs.org) installed):

	npm install

Inspiration
-----------

[Scientific American, August 1985: Exploring the Mandelbrot Set](http://mandelbot.net/pubs/Dewdney_Mandelbrot.pdf)

> "[Computer Recreations: A computer microscope zooms in for a look at the most complex object in mathematics](https://www.scientificamerican.com/article/mandelbrot-set)"
by A. K. Dewdney, pp. 16-24.

Perspiration
------------

Copyright © [Jeff Parsons](https://twitter.com/jeffpar) 2017.  This is an open source project with no formal license.
All portions not licensed from other sources may be freely reused.  Any derivative work just needs to provide attribution
along with the above copyright.
 
Portions copyright 2012 by Christian Stigen Larsen and licensed under [Apache License](http://www.apache.org/licenses/LICENSE-2.0),
Version 2.0.  Those portions are clearly identified in [mandelbot.js](src/mandelbot.js) and must be accompanied by the same Apache
License if they are redistributed.
