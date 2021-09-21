// See example.py for the kernel counterpart to this file.

var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');
var $ = window.jQuery;
    
backbone = require("../node_modules/backbone/backbone.js");
joint = require('../node_modules/jointjs/dist/joint.js');
jointcss = require('../node_modules/jointjs/dist/joint.css');
petrovacss = require('./petrova.css');

function param_parse(val) {
    try {
        return JSON.parse(val);
    } catch (e) {
        return val;
    }
}

function param_stringify(val) {
    if (typeof val == "string") {
        return val;
    } else {
        return JSON.stringify(val);
    }
}

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
            self.wrapper_div = $("<div class='petrova-wrapper'></div>");
            $(self.el).append(self.wrapper_div);
            self.toolbar_div = $("<div class='petrova-toolbar navbar navbar-default'><ul class='nav navbar-nav'></ul></div>");
            self.wrapper_div.append(self.toolbar_div);
            var maximize = $("<li><a href='javascript:void(0);'>Maximize</a></li>");
            maximize.find("a").click(self.maximize.bind(self));
            self.toolbar_div.find(".nav").append(maximize);
            self.graph_wrapper = $("<div class='petrova-graph-wrapper'></div>");
            self.wrapper_div.append(self.graph_wrapper);
            self.graph_div = $("<div class='petrova-graph'></div>");
            self.graph_wrapper.append(self.graph_div);
            self.sidebar = $("<div class='petrova-sidebar'></div>");
            self.wrapper_div.append(self.sidebar);
            self.output_wrapper = $("<div class='petrova-output-wrapper'></div>");
            self.sidebar.append(self.output_wrapper);
            self.output_div = $("<div class='petrova-output'></div>");
            self.output_wrapper.html(self.output_div);
            self.input_div = $("<div class='petrova-input'></div>");
            self.sidebar.append(self.input_div);
            
            self.graph = new joint.dia.Graph;
            self.paper = new joint.dia.Paper({
                el: self.graph_div[0],
                model: self.graph,
                width: "100%",
                height: "100%",
                gridSize: 1
            });
            self.graph_div.find("svg").css({"height": "inherit"});
            self.existing = {};

            window.gr = self.graph;

            self.model.on('change:tasks', self.tasks_changed, self);

            self.paper.on('element:pointerclick', self.select_task_from_view, self);
            self.graph.on('change:position', self.task_moved, self);
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
    
    maximize: function () {
        $("body").toggleClass("petrova-maximized");
    },
    
    remove_task: function (task_id) {
        this.existing[task_id].cell.remove();
        delete this.existing[task_id];
    },

    add_task: function (task) {
        var self = this;
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
        rect.addTo(self.graph);
        
        task.on('change:x', function () {
            rect.position(task.get("x"), task.get("y"));
        }, self);
        task.on('change:y', function () {
            rect.position(task.get("x"), task.get("y"));
        }, self);
        task.on('change:value_repr', function () {
            self.update_task_value_repr(task);
        }, self);
        
        self.existing[task.task_id] = {"task": task, "cell": rect, "links": {}};
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

    update_task_value_repr: function (task) {
        var self = this;
        
        if (task == self.current_task) {
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
        }
    },

    task_moved: function(currentElement) {
        var pos = currentElement.position();
        var task = this.existing[currentElement.attr("task_id")].task;
        task.set("x", pos.x);
        task.set("y", pos.y);
        task.save_changes();
    },
    
    select_task_from_view: function(elementView, eventObject, eventX, eventY) {
        var self = this;
        var currentElement = elementView.model;
        var task = self.existing[currentElement.attr("task_id")].task;
        if (eventObject.shiftKey) {
            self.connect_task(task);
        } else {
            self.select_task(task);
        }
    },

    select_task: function (task) {
        var self = this;

        self.current_task = task;

        self.update_task_value_repr(task);
        
        var form = $("<form></form>");
        var form_content = $("<div></div>");
        form.append(form_content);

        form_content.append("<div class='expander active'>Parameters</div>");
        var parameters_div = $("<div class='expandable active'></div>");
        form_content.append(parameters_div);
        form_content.append("<div class='expander'>Optional parameters</div>");
        var optional_parameters_div = $("<div class='expandable' style='display: none;'></div>");
        form_content.append(optional_parameters_div);

        form_content.find(".expander").click(function () {
            $(this).next(".expandable").slideToggle("fast").siblings(".expandable:visible").slideUp("fast");
            $(this).toggleClass("active");
            $(this).siblings(".expander").removeClass("active");
            return false;
        });
        
        var available_params = task.get("description").param;
        var existing_params = task.get("params");
        Object.keys(available_params).map(function (key) {
            if (!existing_params[key] || !existing_params[key].task_id) {
                var input = $("<div><label></label><input type='text'></input><div class='petrova-description'></div></div>");
                input.find("label").html(key + ":");
                input.find(".petrova-description").html(
                    available_params[key].type_name + ": " + available_params[key].description);
                input.find("input").attr({"value": param_stringify(existing_params[key])})
                input.find("input").change(function () {
                    existing_params = _.clone(existing_params);
                    existing_params[key] = param_parse(input.find("input").val());
                    task.set("params", existing_params);
                    task.save_changes();
                });
                input.find("input").focus(function() {
                    self.current_input = key;
                });
                if (available_params[key].is_optional) {
                    optional_parameters_div.append(input);
                } else {
                    parameters_div.append(input);
                }
            }
        });
        
        self.input_div.html(form);
    },

    connect_task: function (other_task) {
        var self = this;
        var task = self.current_task;
        var key = self.current_input
        if (task && key) {
            var existing_params = _.clone(task.get("params"));
            existing_params[key] = other_task;
            task.set("params", existing_params);
            task.save_changes();

            self.select_task(task);
            self.tasks_changed();
        }
    }
    
});


module.exports = {
    TaskModel: TaskModel,
    TaskView: TaskView,
    GraphModel: GraphModel,
    GraphView: GraphView
};
