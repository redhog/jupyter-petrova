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
            value_repr: {}
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

        var graph_div = $("<div style='position: relative;'></div>");
        $(this.el).append(graph_div);

        var graph = new joint.dia.Graph;
        window.gr = graph;

        var paper = new joint.dia.Paper({
            el: graph_div[0],
            model: graph,
            width: 600,
            height: 100,
            gridSize: 1
        });

        var rect = new joint.shapes.standard.Rectangle();
        rect.position(100, 30);
        rect.resize(100, 40);
        rect.attr({
            body: {
                fill: 'blue'
            },
            label: {
                text: 'Graph',
                fill: 'white'
            }
        });
        rect.addTo(graph);

        var rect2 = rect.clone();
        rect2.translate(300, 0);
        rect2.attr('label/text', 'World!');
        rect2.addTo(graph);

        var link = new joint.shapes.standard.Link();
        link.source(rect);
        link.target(rect2);
        link.addTo(graph);

        this.tasks_changed();
        this.model.on('change:tasks', this.tasks_changed, this);
    },

    tasks_changed: function() {
        console.log("AAAAAAAAAA", this.model.get('tasks'));
    },
});


module.exports = {
    TaskModel: TaskModel,
    TaskView: TaskView,
    GraphModel: GraphModel,
    GraphView: GraphView
};
