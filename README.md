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


# Usage

In a notebook cell, enter:

    from jupyter_petrova import *
    g = Graph()
    g

Use the "Add" field to select python functions to add. A good starting
point might be `skimage.io.imread` and anything under
`skimage.filters`. Click and drag to move boxes on the board. Click on
a function box to set its input parameters and view its output. To set
a parameter to the output of another box, select the input field for
that parameter, then shift-click the other box.

To pre-populate the graph,

    test = Task("skimage.io.imread", fname="test.jpeg")
    filtered = Task("skimage.filters.edges.sobel", image=test)
    g = Graph(tasks = {"test": test, "filtered": filtered})
    g

Individual tasks can be accessed using the dictionary `g.tasks`. Each
task has a property `value` that contains the output value of that
task. The function name is available in the task property `name`, and
the parameters in `params`.

