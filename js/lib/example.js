var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');
var $ = require('jquery');
    
backbone = require("../node_modules/backbone/backbone.js");
joint = require('../node_modules/jointjs/dist/joint.js');
jointcss = require('../node_modules/jointjs/dist/joint.css');

// See example.py for the kernel counterpart to this file.


// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including
//
//  - `_view_name`
//  - `_view_module`
//  - `_view_module_version`
//
//  - `_model_name`
//  - `_model_module`
//  - `_model_module_version`
//
//  when different from the base class.

// When serialiazing the entire widget state for embedding, only values that
// differ from the defaults will be specified.
var HelloModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'HelloModel',
        _view_name : 'HelloView',
        _model_module : 'jupyter-petrova',
        _view_module : 'jupyter-petrova',
        _model_module_version : '0.0.1',
        _view_module_version : '0.0.1',
        value : 'Hello World!'
    })
});


// Custom View. Renders the widget model.
var HelloView = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {

        var graph_div = $("<div style='position: relative;'></div>");
        $(this.el).append(graph_div);

        var graph = new joint.dia.Graph;

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
                text: 'Hello',
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
        

/*

        this.value_changed();

        // Observe changes in the value traitlet in Python, and define
        // a custom callback.
        this.model.on('change:value', this.value_changed, this);
*/
    },

    value_changed: function() {
        console.log("AAAAAAAAAA");
        this.el.textContent = this.model.get('value');
    }
});


module.exports = {
    HelloModel: HelloModel,
    HelloView: HelloView
};
