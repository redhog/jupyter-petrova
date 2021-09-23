// See example.py for the kernel counterpart to this file.

var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');
var $ = window.jQuery;
    
backbone = require("../node_modules/backbone/backbone.js");
joint = require('../node_modules/jointjs/dist/joint.js');
jointcss = require('../node_modules/jointjs/dist/joint.css');
petrovacss = require('./petrova.css');

function random_id(len) {
    return Array.from(window.crypto.getRandomValues(new Uint8Array(len))).map(
        function (i) { return String.fromCharCode(97 + i % 26)}).join("");
}

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
            description: {},
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
            tasks: {},
            new_tasks: {},
            functions: []
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

            var add = $("<li>Add: <input type='text'></input></li>");
            add.find("input").keyup(function (e) {
                if(e.keyCode == 13) {
                    self.create_task(add.find("input").val());
                }
            });
            var functions = self.model.get("functions");
            add.find("input").autocomplete({
                source: function (query, cb) {
                    cb(_.uniq(functions.filter(function (item) {
                        return (item.substr(0, query.term.length) == query.term);
                    }).map(function (item) {
                        var rest = item.substr(query.term.length, item.length);
                        var dot = rest.indexOf(".");
                        if (dot >= 0) {
                            return item.substr(0, query.term.length + dot + 1);
                        } else {
                            return item;
                        }
                    })));
                }
            });
            self.toolbar_div.find(".nav").append(add);

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

    create_task: function (name) {
        var self = this;
        var new_tasks = _.clone(self.model.get("new_tasks"));
        var task_id = random_id(8);
        new_tasks[task_id] = {"name": name};
        self.model.set("new_tasks", new_tasks);
        self.model.save_changes();
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
            if (params[key] && params[key].task_id && !existing_links[key]) {
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
        this.render();
    },

    update_task_value_repr: function (task) {
        var self = this;
        
        if (task == self.current_task) {
            var value = task.get("value_repr")[0];
            if (value) {
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
                } else {
                    self.output_div.html("");
                }
            } else {
                self.output_div.html("");
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

    delete_task: function (task) {
        var self = this;
        var tasks = _.clone(self.model.get("tasks"));
        delete tasks[task.task_id];
        self.model.set("tasks", tasks);
        self.model.save_changes();
    },
    
    select_task: function (task) {
        var self = this;

        self.current_task = task;

        self.update_task_value_repr(task);
        
        var form = $("<form></form>");
        var form_content = $("<div></div>");
        form.append(form_content);

        var remover = $("<div><input type='button' value='Delete'></input></div>");
        remover.find("input").click(function () { self.delete_task(task); });
        form_content.append(remover);

        form_content.append("<div class='expander active'>Parameters</div>");
        var parameters_div = $("<div class='expandable active'></div>");
        form_content.append(parameters_div);
        form_content.append("<div class='expander'>Optional parameters</div>");
        var optional_parameters_div = $("<div class='expandable' style='display: none;'></div>");
        form_content.append(optional_parameters_div);

        form_content.append("<div class='expander'>Connections</div>");
        var connections_div = $("<div class='expandable' style='display: none;'></div>");
        form_content.append(connections_div);

        form_content.find(".expander").click(function () {
            $(this).next(".expandable").slideToggle("fast").siblings(".expandable:visible").slideUp("fast");
            $(this).toggleClass("active");
            $(this).siblings(".expander").removeClass("active");
            return false;
        });
        
        var available_params = task.get("description").param || {};
        var existing_params = task.get("params") || {};
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
            } else if (existing_params[key].task_id) {
                var input = $("<div><label></label><input type='button' value='X'></input><span class='petrova-connection-info'></span><div class='petrova-description'></div></div>");
                input.find(".petrova-connection-info").html(existing_params[key].task_id);
                input.find("label").html(key + ":");
                input.find(".petrova-description").html(
                    available_params[key].type_name + ": " + available_params[key].description);
                input.find("input").click(function () {
                    existing_params = _.clone(existing_params);
                    delete existing_params[key]
                    task.set("params", existing_params);
                    task.save_changes();
                    self.select_task(task);
                    self.tasks_changed();                    
                });
                connections_div.append(input);
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
