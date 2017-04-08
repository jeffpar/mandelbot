Mandelbot
---------

What is this project?  Like the [package.json](package.json) says:

	Generate Mandelbrot images in JavaScript using BigNumber.js
	
However, this is a work-in-progress, so you're not going to see any Mandelbrot images just yet.  I started
this project as a diversion and an excuse to learn some new things, including how to use (and possibly modify)
the [BigNumber](https://github.com/jeffpar/bignumber.js) JavaScript library.

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

	{% include viewport.html id="mandelbot1" width="200" height="200" %}
	
For documents containing multiple Mandelbots, it may be better to define each viewport's configuration parameters at the
top of the Markdown document:

	---
	...
	viewports:
	  - id: mandelbot1
	    width: 200
	    height: 200
	    ...
	---

And then each Mandelbot can be instantiated with just an *id* parameter:

	{% include viewport.html id="mandelbot1" %}

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

[The Mandelwat Set](https://medium.com/dailyjs/the-mandelwat-set-c3037204bf83) by [Jeff Fowler](http://blog.jfo.click/).

Perspiration
------------

Copyright © Jeff Parsons 2017.  This is an open source project with no formal license.  It may be freely reused in any
derivative work, provided you include some attribution along with the above copyright.
