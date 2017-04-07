April 6, 2017
-------------

Created the project folder, along with a few files:

    [~/Sites] mkdir mandelbot
    [~/Sites] cd mandelbot
    [~/Sites/mandelbot] ls
    [~/Sites/mandelbot] npm init
    This utility will walk you through creating a package.json file.
    It only covers the most common items, and tries to guess sensible defaults.
    
    See `npm help json` for definitive documentation on these fields
    and exactly what they do.
    
    Use `npm install <pkg> --save` afterwards to install a package and
    save it as a dependency in the package.json file.
    
    Press ^C at any time to quit.
    name: (mandelbot) 
    version: (1.0.0) 
    description: Generate Mandelbrot images in JavaScript using BigNumber.js
    entry point: (index.js) 
    test command: 
    git repository: 
    keywords: 
    author: Jeff <Jeff@pcjs.org>
    license: (ISC) GPL-3.0
    About to write to /Users/Jeff/Sites/mandelbot/package.json:
    
    {
      "name": "mandelbot",
      "version": "1.0.0",
      "description": "Generate Mandelbrot images in JavaScript using BigNumber.js",
      "main": "index.js",
      "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1"
      },
      "author": "Jeff <Jeff@pcjs.org>",
      "license": "GPL-3.0"
    }
    
    
    Is this ok? (yes) 
    [~/Sites/mandelbot] npm install bignumber.js --save
    mandelbot@1.0.0 /Users/Jeff/Sites/mandelbot
    └── bignumber.js@4.0.1 
    
    npm WARN mandelbot@1.0.0 No repository field.
    [~/Sites/mandelbot] git init
    Initialized empty Git repository in /Users/Jeff/Sites/mandelbot/.git/
    [~/Sites/mandelbot] ls
    node_modules package.json
    [~/Sites/mandelbot] echo node_modules > .gitignore
    [~/Sites/mandelbot] git add .
    [~/Sites/mandelbot] git status
    On branch master
    
    Initial commit
    
    Changes to be committed:
      (use "git rm --cached <file>..." to unstage)
    
        new file:   .gitignore
        new file:   .idea/mandelbot.iml
        new file:   .idea/modules.xml
        new file:   .idea/workspace.xml
        new file:   package.json
    
    [~/Sites/mandelbot] echo .idea > .gitignore
    [~/Sites/mandelbot] echo node_modules >> .gitignore
    [~/Sites/mandelbot] git rm --cached .idea/*
    rm '.idea/mandelbot.iml'
    rm '.idea/modules.xml'
    rm '.idea/workspace.xml'
    [~/Sites/mandelbot] git status
    On branch master
    
    Initial commit
    
    Changes to be committed:
      (use "git rm --cached <file>..." to unstage)
    
        new file:   .gitignore
        new file:   package.json
    
    Changes not staged for commit:
      (use "git add <file>..." to update what will be committed)
      (use "git checkout -- <file>..." to discard changes in working directory)
    
        modified:   .gitignore
    
    [~/Sites/mandelbot] git commit -m "First commit"
    [master (root-commit) acc1c0d] First commit
     2 files changed, 19 insertions(+)
     create mode 100644 .gitignore
     create mode 100644 package.json
    [~/Sites/mandelbot] git status
    On branch master
    Changes not staged for commit:
      (use "git add <file>..." to update what will be committed)
      (use "git checkout -- <file>..." to discard changes in working directory)
    
        modified:   .gitignore
    
    no changes added to commit (use "git add" and/or "git commit -a")
    [~/Sites/mandelbot] git add .gitignore 
    [~/Sites/mandelbot] git commit -m "First commit"
    [~/Sites/mandelbot] git status
    On branch master
    Changes to be committed:
      (use "git reset HEAD <file>..." to unstage)
    
        modified:   .gitignore
    
    [~/Sites/mandelbot] git commit -m "Second commit"
    [master 9f51811] Second commit
     1 file changed, 1 insertion(+)
    [~/Sites/mandelbot] ls
    node_modules package.json
    [~/Sites/mandelbot] git remote add origin https://github.com/jeffpar/mandelbot.git
    [~/Sites/mandelbot] git remote -v
    origin	https://github.com/jeffpar/mandelbot.git (fetch)
    origin	https://github.com/jeffpar/mandelbot.git (push)
    [~/Sites/mandelbot] git push -u origin master
    Counting objects: 7, done.
    Delta compression using up to 8 threads.
    Compressing objects: 100% (5/5), done.
    Writing objects: 100% (7/7), 810 bytes | 0 bytes/s, done.
    Total 7 (delta 0), reused 0 (delta 0)
    To https://github.com/jeffpar/mandelbot.git
     * [new branch]      master -> master
    Branch master set up to track remote branch master from origin.
