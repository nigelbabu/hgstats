(function() {
    // Model to hold graph data
    GraphModel = Backbone.Model.extend({});

    // Define objects
    var cpu_usage = new GraphModel({
      name: 'cpu-usage',
      title: 'CPU Usage',
      url_template: _.template("https://graphite.mozilla.org/render?from=-<%= hours %>hours&until=now&width=586&height=308&_salt=1408036085.026&target=hosts.hgweb*_dmz_scl3_mozilla_com.cpu.*.cpu.user.value&title=CPU%20Usage%20%28user%25%29&_uniq=0.3305984930202769")
    });
    var apache_requests = new GraphModel({
      name: 'apache-requests',
      title: 'Apache Requests',
      url_template: _.template("https://graphite.mozilla.org/render?from=-<%= hours %>hours&until=now&width=586&height=308&_salt=1408009636.045&target=hosts.hgweb*_dmz_scl3_mozilla_com.apache.apache80.apache_scoreboard.sending.count&title=In-flight%20Apache%20Requests&hideLegend=true&_uniq=0.6127992861238261")
    });
    var load_average = new GraphModel({
      name: 'load-average',
      title: 'Load Average',
      url_template: _.template("https://graphite.mozilla.org/render?from=-<%= hours %>hours&until=now&width=586&height=308&_salt=1363655220.184&target=hosts.hgweb*_dmz_scl3_mozilla_com.load.load.shortterm&title=Loadavg&hideLegend=true&_uniq=0.6604602754241492")
    });
    var network_traffic = new GraphModel({
      name: 'network-traffic',
      title: 'Network Traffic',
      url_template: _.template("https://graphite.mozilla.org/render?from=-<%= hours %>hours&until=now&width=586&height=308&_salt=1408010393.594&yMax=&yMin=&target=sumSeries%28hosts.hgweb*_dmz_scl3_mozilla_com.interface.if_octets.bond0.tx%29&title=Outbound%20Network%20Traffic&hideLegend=true&_uniq=0.8170505894781112")
    });
    var swap_usage = new GraphModel({
      name: 'swap-usage',
      title: 'Swap Usage',
      url_template: _.template("https://graphite.mozilla.org/render?from=-<%= hours %>hours&until=now&width=586&height=308&_salt=1408010128.676&yMax=&yMin=&target=hosts.hgweb*_dmz_scl3_mozilla_com.swap.swap.used.value&title=Swap%20Usage&hideLegend=true&_uniq=0.8308034549876273")
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
        var health_report_view = new HealthReportView({ el: $("section"), hours: hours});
        graphs = graphs.map(function(value, key, list) {
          value.set('url', value.get('url_template')({hours: hours}));
          return value;
        });
        graphs.forEach(function(element, index, list) {
          new GraphView({ el: $("section"), model: element});
        });
    });
    app.on('route:defaultRoute', function (actions) {
        app.navigate("hours/2", {trigger: true, replace: true});
    });
    Backbone.history.start();
})();
