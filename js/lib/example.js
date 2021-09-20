// See example.py for the kernel counterpart to this file.

var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');
var $ = require('jquery');
    
backbone = require("../node_modules/backbone/backbone.js");
joint = require('../node_modules/jointjs/dist/joint.js');
jointcss = require('../node_modules/jointjs/dist/joint.css');


var TaskModel = widgets.DOMWidgetModel.extend(
    {
        defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
            _model_name: 'TaskModel',
            _view_name: 'TaskView',
            _model_module: 'jupyter-petrova',
            _view_module: 'jupyter-petrova',
            _model_module_version: '0.0.1',
            _view_module_version: '0.0.1',
            name: 'Unknown',
            params: {},
            value_repr: {},
            x: 0,
            y: 0
        })
    },
    {
        serializers: _.extend({
            params: { deserialize: widgets.unpack_models }
        }, widgets.DOMWidgetModel.serializers)
    }
);

var TaskView = widgets.DOMWidgetView.extend({
});

var GraphModel = widgets.DOMWidgetModel.extend(
    {
        defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
            _model_name: 'GraphModel',
            _view_name: 'GraphView',
            _model_module: 'jupyter-petrova',
            _view_module: 'jupyter-petrova',
            _model_module_version: '0.0.1',
            _view_module_version: '0.0.1',
            tasks: {}
        })
    },
    {
        serializers: _.extend({
            tasks: { deserialize: widgets.unpack_models }
        }, widgets.DOMWidgetModel.serializers)
    }
);


var GraphView = widgets.DOMWidgetView.extend({
    render: function() {
        var self = this;
        
        if (!self.graph) {
            self.graph_div = $("<div style='position: relative; display: inline-block;'></div>");
            $(self.el).append(self.graph_div);
            self.sidebar = $("<div style='position: relative; display: inline-block; height: 700px; width: 33%; border-left: 1px solid grey;'></div>");
            $(self.el).append(self.sidebar);
            self.output_wrapper = $("<div style='position: absolute; top: 0; height: 50%; width: 100%; overflow: auto; border-bottom: 1px solid grey;'></div>");
            self.sidebar.append(self.output_wrapper);
            self.output_div = $("<div style='position: absolute;'></div>");
            self.output_wrapper.html(self.output_div);
            self.input_div = $("<div style='position: absolute; top: 50%; height: 50%; width: 100%; overflow: auto;'></div>");
            self.sidebar.append(self.input_div);
            
            self.graph = new joint.dia.Graph;
            self.paper = new joint.dia.Paper({
                el: self.graph_div[0],
                model: self.graph,
                width: "66%",
                height: 700,
                gridSize: 1
            });
            self.graph_div.find("svg").css({"height": "inherit"});
            self.existing = {};

            window.gr = self.graph;

            self.model.on('change:tasks', self.tasks_changed, self);

            self.paper.on('element:pointerclick', self.select_task, self);
        }
        
        var tasks = self.model.get("tasks");
        Object.keys(tasks).map(function (key) { tasks[key].task_id = key; });

        Object.keys(self.existing).map(function (task_id) {
            if (!tasks[task_id]) {                    
                self.remove_task(task_id);
            }
        });
 
        Object.keys(tasks).map(function (key) {
            if (!self.existing[key]) {
                self.add_task(tasks[key]);
            }
        });

        Object.keys(tasks).map(function (key) {
            self.update_task(tasks[key]);
        });
    },

    remove_task: function (task_id) {
        this.existing[task_id].cell.remove();
        delete this.existing[task_id];
    },

    add_task: function (task) {
        var rect = new joint.shapes.standard.Rectangle();
        rect.position(task.get("x"), task.get("y"));
        rect.resize(100, 40);
        rect.attr({
            body: {
                fill: 'blue'
            },
            label: {
                text: task.get("name"),
                fill: 'white'
            },
            task_id: task.task_id
        });
        rect.addTo(this.graph);
        
        task.on('change:x', function () {
            rect.position(task.get("x"), task.get("y"));
        }, this);
        task.on('change:y', function () {
            rect.position(task.get("x"), task.get("y"));
        }, this);
        
        this.existing[task.task_id] = {"task": task, "cell": rect, "links": {}};
    },

    update_task: function (task) {
        var self = this;
        var existing_links = self.existing[task.task_id].links;
        var params = task.get("params");
        
        Object.keys(existing_links).map(function (key) {
            if (!params[key] || (existing_links[key].task.task_id != params[key].task_id)) {
                existing_links[key].cell.remove();
                delete existing_links[key];
            }
        });
 
        Object.keys(params).map(function (key) {
            if (params[key].task_id && !existing_links[key]) {
                var link = new joint.shapes.standard.Link();
                link.source(self.existing[params[key].task_id].cell, {
                    anchor: {
                        name: 'center',
                        args: {
                            rotate: true,
                            padding: 10
                        }
                    }
                });
                link.target(self.existing[task.task_id].cell, {
                    anchor: {
                        name: 'center',
                        args: {
                            rotate: true,
                            padding: 10
                        }
                    }
                });
                link.router('orthogonal');
                link.connector('rounded');
                link.addTo(self.graph);
                existing_links[key] = {
                    "task": params[key],
                    "cell": link
                };
            }
        });
    },

    tasks_changed: function() {
        console.log("AAAAAAAAAA", this.model.get('tasks'));
        this.render();
    },

    select_task: function(elementView) {
        var self = this;
        var currentElement = elementView.model;
        var task = self.existing[currentElement.attr("task_id")].task;

        var value = task.get("value_repr")[0];
        if (value["text/html"]) {
            self.output_div.html(value["text/html"]);
        } else if (value["image/png"]) {
            var image = $("<img></img>");
            image.attr({"src": "data:image/png;base64," + btoa(String.fromCharCode.apply(null, new Uint8Array(value["image/png"].buffer)))});
            self.output_div.html(image);
        } else if (value["text/plain"]) {
            var wrapper = $("<pre></pre>");
            wrapper.html(value["text/plain"]);
            self.output_div.html(wrapper);
        }

        var form = $("<form></form>");
        var available_params = task.get("description").param;
        var existing_params = task.get("params");
        Object.keys(available_params).map(function (key) {
            if (!existing_params[key] || !existing_params[key].task_id) {
                var input = $("<div><label></label><input type='text'></input><div class='description'></div></div>");
                input.find("label").html(key + ":");
                input.find(".description").html(
                    available_params[key].type_name + ": " + available_params[key].description);
                input.find("input").attr({"value": JSON.stringify(existing_params[key])})
                form.append(input);
            }
        });
        self.input_div.html(form);
    }
});


module.exports = {
    TaskModel: TaskModel,
    TaskView: TaskView,
    GraphModel: GraphModel,
    GraphView: GraphView
};
