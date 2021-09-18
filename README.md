jupyter-petrova
===============================

Explore dataframes, arrays, scipy and matplotlib interactively w/o coding

Installation
------------

To install use pip:

    $ pip install jupyter_petrova

For a development installation (requires [Node.js](https://nodejs.org) and [Yarn version 1](https://classic.yarnpkg.com/)),

    $ git clone https://github.com/redhog/jupyter-petrova.git
    $ cd jupyter-petrova
    $ pip install -e .
    $ jupyter nbextension install --py --symlink --overwrite --sys-prefix jupyter_petrova
    $ jupyter nbextension enable --py --sys-prefix jupyter_petrova

When actively developing your extension for JupyterLab, run the command:

    $ jupyter labextension develop --overwrite jupyter_petrova

Then you need to rebuild the JS when you make a code change:

    $ cd js
    $ yarn run build

You then need to refresh the JupyterLab page when your javascript changes.
