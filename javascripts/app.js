(function() {
    // Model to hold graph data
    GraphModel = Backbone.Model.extend({});

    function urlTemplate(target, title, hideLegend) {
      var url = "https://graphite.mozilla.org/render?from=-<%= hours %>hours&until=now&width=586&height=308";
      url += "&_salt=" + Date.now() / 10;
      url += "&_uniq=" + Math.random();

      url += "&target=" + target;
      url += "&title=" + title;
      if (hideLegend) {
        url += "&hideLegend=true";
      }

      return _.template(url);
    }

    // Define individual graphs
    var cpu_usage = new GraphModel({
      name: 'cpu-usage',
      title: 'CPU Usage',
      url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.cpu.*.cpu.user.value",
                                "CPU%20Usage%20%28user%25%29"),
    });
    var apache_requests = new GraphModel({
      name: 'apache-requests',
      title: 'Apache Requests',
      url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.apache.apache80.apache_scoreboard.sending.count",
                                "In-flight%20Apache%20Requests",
                                true),
    });
    var load_average = new GraphModel({
      name: 'load-average',
      title: 'Load Average',
      url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.load.load.shortterm",
                                "Loadavg",
                                true),
    });
    var network_traffic = new GraphModel({
      name: 'network-traffic',
      title: 'Network Traffic',
      url_template: urlTemplate("sumSeries%28hosts.hgweb*_dmz_scl3_mozilla_com.interface.if_octets.bond0.tx%29",
                                "Outbound%20Network%20Traffic",
                                true),
    });
    var swap_usage = new GraphModel({
      name: 'swap-usage',
      title: 'Swap Usage',
      url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.swap.swap.used.value",
                                "Swap%20Usage",
                                true),
    });

    // Collection
    var graphs = new Backbone.Collection([cpu_usage, apache_requests, load_average, network_traffic, swap_usage], {model: GraphModel});

    GraphView = Backbone.View.extend({
      initialize: function(){
          this.render();
      },
      render: function() {
          var variables = {name: this.model.get('name'), title: this.model.get('title'), url: this.model.get('url')};
          var template = _.template($("#graph_template").html(), variables);
          this.$el.append( template );
          return this;
      }
    });
    // Dispatcher
    var dispatcher = _.clone(Backbone.Events);

    dispatcher.on("render", function(hours) {
        console.log(hours);
        var health_report_view = new HealthReportView({ el: $("section"), hours: hours});
        graphs = graphs.map(function(value, key, list) {
          value.set('url', value.get('url_template')({hours: hours}));
          return value;
        });
        graphs.forEach(function(element, index, list) {
          new GraphView({ el: $("section"), model: element});
        });
    });

    // Health Report gets it's own view for now
    HealthReportView = Backbone.View.extend({
    initialize: function(options) {
      this.options = options;
      this.render();
    },
    render: function() {
        var template = _.template($("#health_report").html(), {hours: this.options.hours});
        this.$el.empty().append ( template );
        return this;
      }
    });

    // Initialize the router
    var AppRouter = Backbone.Router.extend({
        routes: {
            "hours/:id": "getGraphs",
            "*actions": "defaultRoute" // Backbone will try match the route above first
        }
    });
    var app = new AppRouter;
    app.on('route:getGraphs', function (id) {
        var hours = parseInt(id, 10);
        if (isNaN(hours)) {
          hours = 2;
        }
        dispatcher.trigger('render', hours);
        setInterval(_.partial(dispatcher.trigger.bind(dispatcher), 'render', hours), 1000 * 60 * 5);
    });
    app.on('route:defaultRoute', function (actions) {
        app.navigate("hours/2", {trigger: true, replace: true});
    });
    Backbone.history.start();
})();
