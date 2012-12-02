
window.et = _.extend(window.et || {}, {
	apikey: 'BC9A493B41014CAABB98F0471D759707', // '9990e43c062744c58347d5c013ff8739';

	tick: 1000,
	timeDelta: 0,	// seconds elapsed per update (calulated in init function)
	timeFactor: 500,	// factor time is sped up with

	map: null,

	truckStates: {
		OFFDUTY: 0,
		DRIVING: 1,
		ONDUTY: 2,
		SLEEPER: 3
	},
	truckState: ['Off-Duty', 'Driving', 'On-Duty', 'Sleeper Berth'],
	truckStateCss: ['label-offduty', 'label-driving', 'label-onduty', 'label-sleeper'],

	truckIcon: L.Icon.extend({
		options: {
			iconUrl: 'gfx/lorry-icon-32x32.png',
			shadowUrl: null,
			iconSize: new L.Point(32, 32),
			iconAnchor: new L.Point(16, 16),
			popupAnchor: new L.Point(0, -16)
		}
	}),

	latestRoute: null,
});


(function($) {
	"use strict";

	window.VehicleMap = Backbone.Model.extend({
		defaults: {
			marker: null,
			route: [],
			distance: 0,
			current: 0,
			updated: null,
			traveled: 0,
			distanceLeftOver: 0			
		}
	});

	// Models
	window.Trip = Backbone.Model.extend({
		urlRoot: "api/trips",
		defaults: {
			"id": null,
			"state": 0,
			"origin": 0,
			"origin_name": "",
			"destination": 0,
			"destination_name": "",
			"distance": 0,
			"duration": 0,
			"traveled": 0,
			"speed": 0,
			"startts": 0,
			"map": null
		},

		initialize: function() {
	    	this.set('map', new VehicleMap());
		}
	});

	window.TripCollection = Backbone.Collection.extend({
	    model: Trip,

	    initialize: function() {
	    	var that = this;

			Backbone.EventBroker.on("trip:add", function(trip) {
				that.add(trip);
			}, this);
	    },

	    url: "api/trips"
	});

	window.City = Backbone.Model.extend({
		defaults: {
			"id": null,
			"name": "",
			"location": ""
		}
	});

	window.CityCollection = Backbone.Collection.extend({
		model: City,
		url: "api/cities"
	});

	window.Route = Backbone.Model.extend({
		defaults: {
			"id": null,
			"origin": null,
			"destination": null,
			"distance": 0,
			"polyline": "",
			"origin_name": "",
			"destination_name": ""
		},
		url: function() {
			return "api/routes/" + this.get("origin") + "/" + this.get("destination");
		}
	});

	// Views
	window.TripListView = Backbone.View.extend({
	    tagName: 'tbody',
	    id: "tripList",
	 
	    initialize: function() {
			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);
	    },

	    events: {
	    	"click .removeTrip": "removeTrip"
	    },

	    removeTrip: function(e) {
	    	var id = $(e.target).attr('data-id');
	   		var trip = this.model.get(id);
	   		this.model.remove(trip);
	   		trip.destroy();
	    },
	 
	    render: function(eventName) {
	    	$(this.el).empty();
	    	_.each(this.model.models, function(trip) {
	            $(this.el).append(new TripListItemView({model: trip}).render().el);
	        }, this);
	        return this;
	    }
	});

	window.TripListItemView = Backbone.View.extend({
	    tagName: "tr",
	 
	    template: _.template($('#tpl-trip-list-item').html()),

	    initialize: function() {
	    	this.model.on("remove", this.remove, this);
	    	this.model.on("change", this.render, this);
	    },

	    remove: function() {
	    	this.$el.remove();
	    },
	 
	    render: function(eventName) {
	    	var data = this.model.toJSON();

	    	// calculate estimation of real distance since polyline is optimized
	    	var traveled = this.model.get("map").get("distance") ? this.getDistanceString((this.model.get("map").get("traveled") / this.model.get("map").get("distance")) * data.distance) : '';

	    	data = _.extend(data, {
	    		state: this.getStateString(data.state),
	    		stateCss: this.getStateCss(data.state),
				distance: this.getDistanceString(data.distance),
				duration: this.getDurationString(data.duration),
				startts: this.getDateTimeString(data.startts),
				speed: this.getSpeedString(data.speed),
				traveled: traveled
	    	});

	        $(this.el).
	        	attr('id', 'trip-data-' + this.model.get('id')).
	        	html(this.template(data));
	        return this;
	    }
	});

    var CityView = Backbone.View.extend({
        tagName: "li",

        initialize: function(){
            this.model.on("reset", this.render, this);
        },

        render: function(){
            $(this.el).attr('data-id', this.model.get('id')).html('<a href="#">' + this.model.get('name') + '</a>');
            return this;
        }
    });

    window.CitiesView = Backbone.View.extend({
        initialize: function() {
            this.collection.on("reset", this.render, this);
        },

        render: function() {
        	var list = $(this.el);
            this.collection.each(function(city) {
				list.append(new CityView({ model: city }).render().el);
            });
        }
    });

	window.RouteSearchFound = Backbone.View.extend({
		el: $('#alert'),

		template: _.template($('#tpl-route-search-found').html()),

		render: function(eventName) {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		}
	});

	window.RouteSearchView = Backbone.View.extend({
		events: {
			"click #findRouteButton": "findRoute"
		},

		findRoute: function(e) {
			e.preventDefault();

			var that = this;

			var route = new Route({
				origin: $("#origin-city-label").attr("data-id"),
				destination: $("#destination-city-label").attr("data-id")
			});

			route.on("change", function() {
				et.latestRoute = this;

				var alertFound = new RouteSearchFound({model: new Backbone.Model({
					origin: this.get("origin_name"),
					destination: this.get("destination_name"),
					distance: that.getDistanceString(this.get("distance"))
				})});

				var modal = new Backbone.BootstrapModal({
					title: "Route found!",
					content: alertFound,
					okText: "Add Route"
				}).open();

				modal.on("ok", function() {
					var speed = this.convertMph(this.$el.find('#setVehicleSpeed').val());
					var route = et.latestRoute;

					var trip = new Trip();
					trip.set({
						origin: route.get("origin"),
						origin_name: route.get("origin_name"),
						destination: route.get("destination"),
						destination_name: route.get("destination_name"),
						distance: route.get("distance"),
						duration: route.get("distance") / speed,
						speed: speed,
						state: et.truckStates.DRIVING
					});


					trip.save(null, {
						success: function(model, response) {
							Backbone.EventBroker.trigger("trip:add", model);
						},
						error: function(model, response) {
							alert('Failed to save!');
						}
					});

					alertFound.remove();
				});
				modal.on("cancel", function() {
					alertFound.remove();
				})

			}, route);

			route.fetch({
				error: function(model, response) {
					var modal = new Backbone.BootstrapModal({
						title: "Could not find route",
						content: "Fetching route failed. Probably doesn't exist in database.",
						allowCancel: false
					}).open();
				}
			});
		}
	});

	window.MapView = Backbone.View.extend({
	 	
	 	initialize: function(options) {
	 		var that = this;
			var map = new L.Map('map');
			et.map = map;

			var cloudmade = new L.TileLayer('http://{s}.tile.cloudmade.com/' + et.apikey + '/997/256/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, <a href="http://cloudmade.com">CloudMade</a>',
				maxZoom: 18
			});

			map.addLayer(cloudmade);
			map.setView(new L.LatLng(34.705, -97.73), 5);

			options.vehicles.on("add", this.vehicleAdd, this);

			this.vehicles = options.vehicles;

			this.timer = null;
	 	},

	 	vehicleAdd: function(vehicle) {
			var map = et.map;
			var res = this.convertPointsToLatLng(et.latestRoute.get("points"));
			var latlngs = res.latLngs;
			var distance = res.distance;

			// create a red polyline from an arrays of LatLng points
			var polyline = new L.Polyline(latlngs, {color: 'red'});

			// zoom the map to the polyline
			map.fitBounds(new L.LatLngBounds(latlngs));

			// add the polyline to the map
			map.addLayer(polyline);

			// add vehicle marker
			var marker = new L.Marker(latlngs[0], {icon: new et.truckIcon()});
			map.addLayer(marker);

			vehicle.get("map").set({
				marker: marker,
				route: latlngs,
				distance: distance,
				current: 0,
				updated: (new Date).getTime(),
				traveled: 0,
				distanceLeftOver: 0
			});

			this.start();
	 	},

	 	start: function() {
			var that = this;
			if (!this.timer) {
				this.timer = setInterval(function() {
					that.update.call(that);
				}, et.tick);
			}
	 	},

	 	update: function() {
	 		var vehicles = this.vehicles;
			var v, len, prevCurrent, timeSinceLastUpdate, distanceSinceLastUpdate, distanceToNextPoint;
			var now = (new Date).getTime();

			vehicles.each(function(vehicle) {
				v = vehicle.get("map").toJSON();
				len = v.route.length;

				if (v.current < len) {
					timeSinceLastUpdate = (now - v.updated) / 1000; // in ms
					distanceSinceLastUpdate = timeSinceLastUpdate * vehicle.get("speed") * et.timeFactor + v.distanceLeftOver;

					distanceToNextPoint = v.marker.getLatLng().distanceTo(v.route[v.current]);

					prevCurrent = v.current;

					// move through as many points as possible
					while (distanceSinceLastUpdate >= distanceToNextPoint && v.current < len) {
						// add to traveled distance
						v.traveled += distanceToNextPoint;

						distanceSinceLastUpdate -= distanceToNextPoint;
						v.distanceLeftOver = distanceSinceLastUpdate;

						// update position
						v.marker.setLatLng(v.route[v.current]);

						// pan map to make car visible
						if (v.follow && !et.map.getBounds().contains(v.marker.getLatLng())) {
							et.map.panTo(v.marker.getLatLng());
						}

						v.current++;
						if (v.current >= len) {
							// reached destination
							continue;
						}

						distanceToNextPoint = v.marker.getLatLng().distanceTo(v.route[v.current]);
					}

					if (v.current > prevCurrent) {
						// vehicle moved
						vehicle.get("map").set({
							current: v.current,
							traveled: v.traveled,
							distanceLeftOver: v.distanceLeftOver,
							updated: now
						});

						vehicle.trigger("change");
					}
				} else {
					// route finished
					vehicle.set("state", et.truckStates.OFFDUTY);
				}
			});
	 	},

	 	stop: function() {
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
	 	}
	});

	// Router
	var AppRouter = Backbone.Router.extend({
	    routes:{
	        "": "main"
	    },
	 
	    main: function () {
	    	this.cityList = new CityCollection();
	    	this.originCityListView = new CitiesView({el: $("#origin-city"), collection: this.cityList});
	    	this.destinationCityListView = new CitiesView({el: $("#destination-city"), collection: this.cityList});
	    	this.cityList.fetch();

	        this.tripList = new TripCollection();
	        this.tripListView = new TripListView({model: this.tripList});
	        this.tripList.fetch();
	        $('#routes').append(this.tripListView.render().el);

	        this.map = new MapView({el: $('#map'), vehicles: this.tripList});
	        et.mapView = this.map;

	        this.routeSearch = new RouteSearchView({ el: $("#route-search") });

	       	et.timeDelta = 1000 / et.tick;
			$('#timeFactor').val(et.timeFactor);
	    }
	});

	// set dropdown label to selected
	$("#route-search").on("click", ".dropdown-menu a", function(e) {
		var selected = $(this);

		selected
			.parents(".btn-group")
			.find(".dropdown-label")
			.text(selected.text())
			.attr("data-id", selected.parent().attr("data-id"));

		e.preventDefault();
	});

	// extend with utility functions
	_.extend(Backbone.View.prototype, {

		getDistanceString: function(m) {
			var miles = m * 0.00062137119;
			return miles.toFixed(0) + ' mi';
		},

		getSpeedString: function(s) {
			var mph = s * 2.236936292054;
			return mph.toFixed(0) + ' mph';
		},

		getDurationString: function(d) {
			d = Number(d);
			var h = Math.floor(d / 3600),
			    m = Math.floor(d % 3600 / 60);
			return ((h > 0 ? h + " hours " : " ") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + " mins" : "0 mins"));
		},

		getDateTimeString: function(ts) {
			var d = new Date(ts * 1000);
			return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
		},

		getStateString: function(s) {
			return et.truckState[s];
		},

		getStateCss: function(s) {
			return et.truckStateCss[s];
		},

		// mph -> m/s
		convertMph: function(mph) {
			var ms = mph / 2.236936292054;
			return ms.toFixed(0);
		},

		convertPolylineToLatLng: function(polyline) {
			// decode polyline into points
			return et.convertPointsToLatLng(decodeLine(polyline));
		},

		convertPointsToLatLng: function(points) {
			var latlngs = [],
				latlng,
				distance = 0,
				len = points.length,
				i;

			// convert points into leaflet polyline format and calculate
			// distance between points (which is shorter than IRL distance)
			for (i = 0; i < len; i++) {
				latlng = new L.LatLng(points[i][0], points[i][1]);

				if (i > 0) {
					distance += latlngs[i-1].distanceTo(latlng);
				}

				latlngs.push(latlng);
			}

			return {
				latLngs: latlngs,
				distance: distance
			}
		}
	});

	var app = new AppRouter();
	Backbone.history.start();

})(jQuery);
