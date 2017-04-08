MandelBot
---------

What is this project?  Like the [package.json](package.json) says:

	Generate Mandelbrot images in JavaScript using BigNumber.js
	
However, this is a work-in-progress, so you're not going to see any Mandelbrot images just yet.  I started
this project as a diversion and an excuse to learn some new things, including how to use (and possibly modify)
the [BigNumber](https://github.com/MikeMcl/bignumber.js) JavaScript library.

Installation
------------

This project has already been installed at [http://mandelbot.net](http://mandelbot.net/) using
[GitHub Pages](https://pages.github.com/).

However, if want to install and serve your own local copy of the files, here are the steps for macOS and the
corresponding Terminal commands.

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

	bundle exec jekyll serve

##### Step 7: Fire up your web browser and visit [http://localhost:4000](http://localhost:4000/).

In a perfect world, the above steps would be sufficient.  Unfortunately, I ran into several problems along the way.  Those
were resolved by:

- Updating Xcode to the latest version
- Running `xcode-select --install` from a Terminal window

Inspiration
-----------

[The Mandelwat Set](https://medium.com/dailyjs/the-mandelwat-set-c3037204bf83) by [Jeff Fowler](http://blog.jfo.click/).

Perspiration
------------

Copyright © Jeff Parsons 2017.  This is an open source project with no formal license.  It may be freely reused in any
derivative work, provided you include some attribution along with the above copyright.
