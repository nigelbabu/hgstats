(function() {
    // Model to hold graph data
    GraphModel = Backbone.Model.extend({});

    var hosts = [
      "hgweb1_dmz_scl3_mozilla_com",
      "hgweb2_dmz_scl3_mozilla_com",
      "hgweb3_dmz_scl3_mozilla_com",
      "hgweb4_dmz_scl3_mozilla_com",
      "hgweb5_dmz_scl3_mozilla_com",
      "hgweb6_dmz_scl3_mozilla_com",
      "hgweb7_dmz_scl3_mozilla_com",
      "hgweb8_dmz_scl3_mozilla_com",
      "hgweb9_dmz_scl3_mozilla_com",
      "hgweb10_dmz_scl3_mozilla_com",
    ];

    function urlTemplate(target, title, hideLegend, extra) {
      var extra = extra ? extra : {};

      var url = "https://graphite.mozilla.org/render?from=-<%= hours %>hours&until=now&width=586&height=308";
      url += "&_salt=" + Date.now() / 10;
      url += "&_uniq=" + Math.random();

      if (Array.isArray(target)) {
        for (var t of target) {
          url += "&target=" + t;
        }
      } else {
        url += "&target=" + target;
      }
      url += "&title=" + title;
      if (hideLegend) {
        url += "&hideLegend=true";
      }

      for (var key in extra) {
        url += "&" + key + "=" + extra[key];
      }

      return _.template(url);
    }

    /**
     * Obtain an array of target strings for each host in the cluster.
     *
     * The string "%HOST%" in the target string will be replaced with the host.
     */
    function perHostTargets(target) {
      var targets = [];
      for (var host of hosts) {
        var t = target.replace("%HOST%", host);
        targets.push(t);
      }

      return targets;
    }

    // Define individual graphs
    var graphModels = [
      new GraphModel({
        name: 'cpu-usage',
        title: 'CPU Usage',
        url_template: urlTemplate(perHostTargets("absolute(offset(averageSeries(hosts.%HOST%.cpu.*.cpu.idle.value),-100))"),
                                  "CPU%20Usage",
                                  true,
                                  {yMin: 0, yMax: 100}),
      }),
      new GraphModel({
        name: 'apache-requests',
        title: 'Apache Requests',
        url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.apache.apache80.apache_scoreboard.sending.count",
                                  "In-flight%20Apache%20Requests",
                                  true),
      }),
      new GraphModel({
        name: 'load-average',
        title: 'Load Average',
        url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.load.load.shortterm",
                                  "Loadavg",
                                  true),
      }),
      new GraphModel({
        name: 'network-traffic',
        title: 'Network Traffic',
        url_template: urlTemplate("scale(sumSeries%28hosts.hgweb*_dmz_scl3_mozilla_com.interface.if_octets.bond0.tx%29,8)",
                                  "Outbound%20Network%20Traffic%20bps",
                                  true),
      }),
      new GraphModel({
        name: 'network-out-individual',
        title: 'Individual Host Network Traffic',
        url_template: urlTemplate(perHostTargets("scale(hosts.%HOST%.interface.if_octets.bond0.tx,8)"),
                                  "Outbound%20Network%20Traffic%20bps",
                                  true),
      }),
      new GraphModel({
        name: 'swap-usage',
        title: 'Swap Usage',
        url_template: urlTemplate(perHostTargets("sumSeries(hosts.%HOST%.swap.swap_io.in.value,hosts.%HOST%.swap.swap_io.out.value)"),
                                  "Total%20Swap%20Input%20Output",
                                  true),
      }),
      new GraphModel({
        name: 'page-cache',
        title: 'Page Cache',
        url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.memory.memory.cached.value",
                                  "Bytes%20In%20Page%20Cache",
                                  true),
      }),
      new GraphModel({
        name: 'disk-read-bytes',
        title: 'Disk Read Bytes',
        url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.disk.sda.disk_octets.read",
                                  "Bytes%20Read",
                                  true),
      }),
      new GraphModel({
        name: 'disk-write-bytes',
        title: 'Disk Write Bytes',
        url_template: urlTemplate("hosts.hgweb*_dmz_scl3_mozilla_com.disk.sda.disk_octets.write",
                                  "Bytes%20Written",
                                  true),
      }),
    ];

    // Collection
    var graphs = new Backbone.Collection(graphModels, {model: GraphModel});

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
