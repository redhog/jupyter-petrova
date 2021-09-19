import ipywidgets as widgets
from traitlets import *
from ipywidgets.widgets import widget_serialization
import importlib
import hashlib
import json
import weakref
import IPython.core.interactiveshell
import traceback

def import_fn(name):
    mod, fn = name.rsplit(".", 1)
    return getattr(importlib.import_module(mod), fn)

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
    inputs = Dict(key_trait=Unicode(),
                  value_trait=Instance(klass=widgets.Widget)).tag(sync=True, **widget_serialization)
    params = Dict(key_trait=Unicode()).tag(sync=True)
    value_repr = List(default=[]).tag(sync=True)
    exception = Unicode(allow_none=True).tag(sync=True)
    traceback = Unicode(allow_none=True).tag(sync=True)

    x = Int(default=0).tag(sync=True)
    y = Int(default=0).tag(sync=True)
    
    def __init__(self, *arg, **kw):
        self.value_id = None
        self.value = None
        self.exception = None
        self.traceback = None
        self.input_ids = {}
        self.outputs = weakref.WeakValueDictionary()
        widgets.Widget.__init__(self, *arg, **kw)
        
    @observe('inputs')
    def inputs_changed(self, change):
        for inp in self.inputs.values():
            inp.outputs[id(self)] = self
        self.update()

    @observe('version')
    def version_changed(self, change):
        self.update()

    @observe('name')
    def name_changed(self, change):
        self.update()

    @observe('params')
    def params_changed(self, change):
        self.update()        
            
    def calculate_value_id(self):
        return hashlib.sha256(
            json.dumps(
                dict(
                    name=self.name,
                    version=self.version,
                    **self.params,
                    **{key:task.value_id for key, task in self.inputs.items()}),
                sort_keys=True).encode("utf-8")
        ).hexdigest()
        
    def update(self, recurse=True):
        value_id = self.calculate_value_id()

        if  self.value_id == value_id:
            return        

        try:
            for key, task in self.inputs.items():
                if task is not None and task.value_id is None:
                    raise ValueError("Input task for %s have errors" % (key,))

            self.value = import_fn(self.name)(
                **self.params,
                **{key:task.value for key, task in self.inputs.items()
                   if task is not None})
        except Exception as e:
            self.exception = repr(e)
            self.traceback = traceback.format_exc()
            self.value_repr = IPython.core.interactiveshell.InteractiveShell.instance().display_formatter.format(self.exception)
            self.value_id = None
        else:
            self.exception = None
            self.traceback = None
            self.value_repr = IPython.core.interactiveshell.InteractiveShell.instance().display_formatter.format(self.value)
            self.value_id = value_id
        
        if recurse:
            for task in self.outputs.values():
                task.update()

    _ipython_display_ = None
    def _repr_mimebundle_(self, *arg, **kw):
        return self.value_repr[0]

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

