var plugin = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: 'jupyter-petrova:plugin',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
      widgets.registerWidget({
          name: 'jupyter-petrova',
          version: plugin.version,
          exports: plugin
      });
  },
  autoStart: true
};

