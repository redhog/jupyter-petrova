import ipywidgets as widgets
from traitlets import *
from ipywidgets.widgets import widget_serialization
import importlib
import hashlib
import json
import weakref
import IPython.core.interactiveshell
import traceback
import docstring_parser
import inspect
import sys
import matplotlib.pyplot as plt

def import_fn(name):
    mod, fn = name.rsplit(".", 1)
    return getattr(importlib.import_module(mod), fn)

def inspect_fn(fn):
    res = {}
    for m in docstring_parser.parse(fn.__doc__).meta:
        t = type(m).__name__[len("Docstring"):].lower()
        if t not in res:
            res[t] = []
        res[t].append(dict(m.__dict__))
    if res:
        res["param"] = {p["arg_name"]: p for p in res["param"]}
        if len(res["returns"]) == 1:
            res["returns"] = res["returns"]
    else:
        signature = inspect.signature(fn)
        res["param"] = {
            p.name: {
                "description": p.name,
                "arg_name": p.name,
                "type_name": ("%s.%s" % (p.annotation.__module__, p.annotation.__name__)) if p.annotation is not inspect._empty else None,
                "is_optional": p.default is not inspect._empty,
                "default": p.default if p.default is not inspect._empty else None}
            for name, p in signature.parameters.items()}
    return res

def get_obj(mod, objname):
    try:
        return getattr(mod, objname)
    except:
        return None

def list_functions():
    return sorted([
        "%s.%s" % (modname, objname)
        for modname, mod in dict(sys.modules).items() for objname in dir(mod)
        if callable(get_obj(mod, objname))
    ])


viewers = {}

def viewer(title):
    def viewer(fn):
        viewers[title] = fn
        return fn
    return viewer

# See js/lib/example.js for the frontend counterpart to this file.

@widgets.register
class Task(widgets.Widget):
    _view_name = Unicode('TaskView').tag(sync=True)
    _model_name = Unicode('TaskModel').tag(sync=True)
    _view_module = Unicode('jupyter-petrova').tag(sync=True)
    _model_module = Unicode('jupyter-petrova').tag(sync=True)
    _view_module_version = Unicode('^0.0.1').tag(sync=True)
    _model_module_version = Unicode('^0.0.1').tag(sync=True)

    version = Int(0).tag(sync=True)
    name = Unicode().tag(sync=True)
    description = Dict(key_trait=Unicode()).tag(sync=True)
    params = Dict(key_trait=Unicode()).tag(sync=True, **widget_serialization)
    value_repr = Dict(default={}).tag(sync=True)
    exception = Unicode(allow_none=True).tag(sync=True)
    traceback = Unicode(allow_none=True).tag(sync=True)

    x = Int(default=0).tag(sync=True)
    y = Int(default=0).tag(sync=True)
    
    def __init__(self, name, **kw):
        self._init()
        widgets.Widget.__init__(self, name=name, params=kw)

    def _init(self):
        self.fn = None
        self.value_id = None
        self.value = None
        self.exception = None
        self.traceback = None
        self.input_ids = {}
        self.outputs = weakref.WeakValueDictionary()
        
    @classmethod
    def create_full_args(cls, **kw):
        self = widgets.Widget.__new__(cls)
        self._init()
        widgets.Widget.__init__(self, **kw)
        return self
    
    @observe('params')
    def params_changed(self, change):
        for inp in self.params.values():
            if isinstance(inp, Task):
                inp.outputs[id(self)] = self
        self.update()

    @observe('version')
    def version_changed(self, change):
        self.update()

    @observe('name')
    def name_changed(self, change):
        self.fn = import_fn(self.name)
        self.description = inspect_fn(self.fn)
        self.update()
            
    def calculate_value_id(self):
        return hashlib.sha256(
            json.dumps(
                dict(
                    name=self.name,
                    version=self.version,
                    **{key:(value.value_id if isinstance(value, Task) else value)
                       for key, value in self.params.items()}),
                sort_keys=True).encode("utf-8")
        ).hexdigest()
        
    def update(self, recurse=True):
        value_id = self.calculate_value_id()

        if  self.value_id == value_id:
            return        

        try:
            for key, task in self.params.items():
                if task is not None and isinstance(task, Task) and task.value_id is None:
                    raise ValueError("Input task for %s have errors" % (key,))

            self.value = self.fn(
                **{key:(value.value if isinstance(value, Task) else value)
                   for key, value in self.params.items()
                   if value is not None})
        except Exception as e:
            self.exception = repr(e)
            self.traceback = traceback.format_exc()
            self.value_id = None
            value_repr = {"Error": IPython.core.interactiveshell.InteractiveShell.instance().display_formatter.format(self.exception)}
        else:
            self.exception = None
            self.traceback = None
            self.value_id = value_id
            value_repr = {"Default": IPython.core.interactiveshell.InteractiveShell.instance().display_formatter.format(self.value)}
            for key, viewer in viewers.items():
                print("Trying to generate view", key)
                try:
                    value_repr[key] = IPython.core.interactiveshell.InteractiveShell.instance().display_formatter.format(viewer(self.value))
                except ValueError as e:
                    pass

        self.value_repr = value_repr
            
        if recurse:
            for task in self.outputs.values():
                task.update()

    _ipython_display_ = None
    def _repr_mimebundle_(self, *arg, **kw):
        return self.value_repr["Default"][0]

@widgets.register
class Graph(widgets.DOMWidget):
    _view_name = Unicode('GraphView').tag(sync=True)
    _model_name = Unicode('GraphModel').tag(sync=True)
    _view_module = Unicode('jupyter-petrova').tag(sync=True)
    _model_module = Unicode('jupyter-petrova').tag(sync=True)
    _view_module_version = Unicode('^0.0.1').tag(sync=True)
    _model_module_version = Unicode('^0.0.1').tag(sync=True)
    
    tasks = Dict(key_trait=Unicode(),
                 value_trait=Instance(klass=Task)).tag(sync=True, **widget_serialization)
    new_tasks = Dict(key_trait=Unicode()).tag(sync=True)
    functions = List(Unicode()).tag(sync=True)
    
    def __init__(self, *arg, **kw):
        widgets.DOMWidget.__init__(self, *arg, **kw)
        self.functions = list_functions()

    @observe('new_tasks')
    def new_tasks_changed(self, change):
        tasks = dict(self.tasks)
        for task_id, task in self.new_tasks.items():
            tasks[task_id] = Task.create_full_args(**task)
        self.new_tasks = {}
        self.tasks = tasks


@viewer("Image")
def view_image(arr):
    if not hasattr(arr, "shape") or (len(arr.shape) < 2) or (len(arr.shape) > 3):
        raise ValueError
    if hasattr(arr, "values"): arr = arr.values
    fig = plt.figure()
    ax = fig.subplots(1, 1)
    if len(arr.shape) == 2:
        # This is not RGB data, so normalize values to ]0, 1[
        print("Normalize")
        arr = arr - arr.min()
        arr = arr / arr.max()
    ax.imshow(arr)
    return fig

@viewer("Histogram")
def view_hist(arr):
    if not hasattr(arr, "shape"):
        raise ValueError
    if hasattr(arr, "values"): arr = arr.values
    fig = plt.figure()
    ax = fig.subplots(1, 1)
    ax.hist(arr.flatten())
    return fig
