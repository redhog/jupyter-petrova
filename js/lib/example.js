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
            inputs: {},
            value_repr: {},
            x: 0,
            y: 0
        })
    },
    {
        serializers: _.extend({
            inputs: { deserialize: widgets.unpack_models }
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
            self.output_div = $("<div style='position: absolute;'></div>");
            self.output_wrapper = $("<div style='position: relative; display: inline-block; height: 700px; width: 33%; border-left: 1px solid grey;'></div>");
            self.output_wrapper.html(self.output_div);
            $(self.el).append(self.graph_div);
            $(self.el).append(self.output_wrapper);

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

            self.paper.on('element:pointerclick', function(elementView) {
                var currentElement = elementView.model;
                var value = self.existing[currentElement.attr("task_id")].task.get("value_repr")[0];

                if (value["text/html"]) {
                    self.output_div.html(value["text/html"]);
                } else if (value["text/plain"]) {
                    var wrapper = $("<pre></pre>");
                    wrapper.html(value["text/plain"]);
                    self.output_div.html(wrapper);
                }
            });
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
        var inputs = task.get("inputs");
        
        Object.keys(existing_links).map(function (key) {
            if (!inputs[key] || (existing_links[key].task.task_id != inputs[key].task_id)) {
                existing_links[key].cell.remove();
                delete existing_links[key];
            }
        });
 
        Object.keys(inputs).map(function (key) {
            if (!existing_links[key]) {
                var link = new joint.shapes.standard.Link();
                link.source(self.existing[inputs[key].task_id].cell, {
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
                    "task": inputs[key],
                    "cell": link
                };
            }
        });
    },

    tasks_changed: function() {
        console.log("AAAAAAAAAA", this.model.get('tasks'));
        this.render();
    },
});


module.exports = {
    TaskModel: TaskModel,
    TaskView: TaskView,
    GraphModel: GraphModel,
    GraphView: GraphView
};
