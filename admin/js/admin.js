window.et = _.extend(window.et || {}, {
	apikey: 'BC9A493B41014CAABB98F0471D759707', // '9990e43c062744c58347d5c013ff8739';
});

(function($) {
	"use strict";

	window.City = Backbone.Model.extend({
		defaults: {
			"id": null,
			"name": "",
			"location": "",
			"country": ""
		}
	});

	window.CityCollection = Backbone.Collection.extend({
		model: City,
		url: "../api/cities"
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
			return "../api/routes/" + this.get("origin") + "/" + this.get("destination");
		}
	});

	window.RouteCollection = Backbone.Collection.extend({
		model: Route,

		initialize: function(models, options) {
			this.cityId = options.cityId;
			this.nonExisting = !!options.nonExisting;
		},

		url: function() {
			if (this.nonExisting) {
				// get routes that does NOT exist from city
				return "../api/routes/nonexisting/" + this.cityId;
			}

			// get existing routes
			return "../api/routes/" + this.cityId;
		}
	});

	// Views
	window.CitiesListView = Backbone.View.extend({
	    id: "citiesList",

	    template: _.template($('#tpl-cities-listview').html()),

	    initialize: function() {
			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);

			Backbone.EventBroker.on("city:add", this.cityAdded, this);
	    },

	    events: {
	    	"click .newcity": "newcity"
	    },

	 	newcity: function() {
	 		var city = new City();
	 		var editView = new CityEditView({
	 			model: city
	 		});

			var modal = new Backbone.BootstrapModal({
				title: "New City",
				content: editView,
				okText: "Save"
			}).open();
	 	},

		cityAdded: function(city) {
			this.model.create(city);
		},

	    render: function(eventName) {
	    	$(this.el).html(this.template());

	    	var tbody = $(this.el).find('tbody');

	    	_.each(this.model.models, function(city) {
	            tbody.append(new CitiesListItemView({model: city}).render().el);
	        }, this);

	        return this;
	    }
	});

	window.CitiesListItemView = Backbone.View.extend({
	    tagName: "tr",

	    template: _.template($('#tpl-city-list-item').html()),

	    initialize: function() {
	    	this.model.on("change", this.render, this);
	    },

	    events: {
	    	"click .remove": "remove",
	    	"click .edit": "edit",
	    	"click .routes": "routes"
	    },

	    edit: function(e) {
	    	var editView = new CityEditView({
	    		model: this.model
	    	});

			var modal = new Backbone.BootstrapModal({
				title: "Edit city",
				content: editView,
				okText: "Save changes"
			}).open();
	    },

	    routes: function(e) {
	    	var routesList = new RouteCollection({}, {
	    		cityId: this.model.get('id')
	    	});

	    	var nonExistingRoutesList = new RouteCollection({}, {
	    		nonExisting: true,
	    		cityId: this.model.get('id')
	    	});

	    	var routes = new Backbone.Model();
	    	routes.set({
	    		routes: routesList,
	    		nonExistingRoutes: nonExistingRoutesList
	    	});

	    	var routesView = new RouteEditView(
	    		{
	    			model: routes,
	    		},
	    		{
	    			name: this.model.get('name'),
	    			cityId: this.model.get('id')
	    		}
	    	);
			var modal = new Backbone.BootstrapModal({
				title: "Edit Routes: " + this.model.get('name'),
				content: routesView,
				okText: "Close"
			}).open();
	    },

	    remove: function() {
	    	this.$el.remove();
	    	this.model.destroy();
	    },

	    render: function(eventName) {
	    	var data = this.model.toJSON();

	    	data = _.extend(data, {
	    		routescount: 0
	    	});

	        $(this.el).
	        	attr('id', 'city-data-' + this.model.get('id')).
	        	html(this.template(data));

	        return this;
	    }
	});

	window.CityEditView = Backbone.Marionette.ItemView.extend({
		template: "#tpl-city-edit",

		initialize: function() {
			this.listenTo(this, "ok", this.save);
		},

	    onRender: function() {

	    	// Use Google Places API to autocomplete city name
	    	//   https://developers.google.com/maps/documentation/javascript/places#places_autocomplete
			var autocomplete = new google.maps.places.Autocomplete(
				this.$el.find("#city-name").get(0),
				{
					types: ['(cities)']
				}
			);

			// default map position
			var pos = new google.maps.LatLng(-34.397, 150.644);

			// get latlng of current location and if so, use it
	        if (this.model.get("location")) {
	        	pos = google.maps.geometry.encoding.decodePath(this.model.get("location"))[0];
	        }

			// init map
	        var mapOptions = {
				center: pos,
				zoom: 8,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				zoomControlOptions: {
					style: google.maps.ZoomControlStyle.SMALL
				}
	        };
	        this.map = new google.maps.Map(this.$el.find("#citymap").get(0), mapOptions);

	        // add marker to current city position
	        this.marker = null;
	        if (this.model.get("location")) {
					this.marker = new google.maps.Marker({
						position: pos,
						map: this.map,
						title: "City location"
					});
	        }

	        var that = this;

			// listen to user selecting a city
			google.maps.event.addListener(autocomplete, "place_changed", function() {
				var place = autocomplete.getPlace();

				if (!place.geometry) {
					console.log("No result found.");
					return;
				}

				// get country
				var country = "";
				place.address_components.forEach(function(addr) {
					if (addr.types[0] == "country") {
						country = addr.short_name;
					}
				});
				$("#country").val(country);

				if (that.marker === null) {
					// if no marker, create it
					that.marker = new google.maps.Marker({
						position: place.geometry.location,
						map: that.map,
						title: "City location"
					});
				} else {
					// if marker exists, update position of marker
					that.marker.setPosition(place.geometry.location);
				}

				that.map.setCenter(place.geometry.location);

				// get encoded position (polyline with only one coordinate)
				var path = new google.maps.Polyline().getPath();
				path.push(place.geometry.location);

				var encodedPos = google.maps.geometry.encoding.encodePath(path);
				$("#location").val(encodedPos);
			});
	    },

		save: function() {
			var that = this;

			// loop input elements and set values to model
			var inputs = this.$el.find('input');
			inputs.each(function() {
				that.model.set($(this).attr('name'), $(this).val());
			});

			if (that.model.get('id') == null) {
				Backbone.EventBroker.trigger("city:add", that.model);
			} else {
				// save model
				that.model.save({}, {
					success: function(model, response) {
						that.$el.modal("hide");
					},
					error: function(model, xhr, options) {
						alert('Failed to save! Ohnoez!');
					}
				});
			}
		}
	});

//--

	window.RoutesListView = Backbone.View.extend({
	    id: "routes",

	    template: _.template($('#tpl-routes-listview').html()),

	    initialize: function(model, options) {
	    	this.cityId = options.cityId;

			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);

			Backbone.EventBroker.on("route:add", this.routeAdded, this);
	    },

		routeAdded: function(route) {
			this.model.add(route);
		},

	    render: function(eventName) {
	    	$(this.el).html(this.template());

	    	var tbody = $(this.el).find('tbody');

	    	_.each(this.model.models, function(route) {
	            tbody.append(new RoutesListItemView({model: route}, {cityId: this.cityId}).render().el);
	        }, this);

	        return this;
	    }
	});

	window.RoutesListItemView = Backbone.View.extend({
	    tagName: "tr",

	    template: _.template($('#tpl-route-list-item').html()),

	    initialize: function(model, options) {
	    	this.cityId = options.cityId;

	    	this.model.on("change", this.render, this);
	    },

	    events: {
	    	"click .remove": "remove",
	    	"click .create": "create",
	    	"click .map": "map"
	    },

	    create: function(e) {
	    	alert("Create route: Not yet implemented.");
	    },

	    map: function(e) {
	    	var map = new MapView({
	    		model: this.model
	    	});
	    },

	    remove: function() {
	    	var route = {
	    		id: this.model.get('destination'),
	    		name: this.model.get('destination_name')
	    	};
	    	Backbone.EventBroker.trigger("route:remove", route);

	    	this.$el.remove();
	    	this.model.destroy();
	    },

	    render: function(eventName) {
	    	var data = this.model.toJSON();

	    	data = _.extend(data, {
				distance: this.getDistanceString(data.distance)
	    	});

	        $(this.el).
	        	attr('id', 'route-data-' + this.model.get('id')).
	        	html(this.template(data));

	        return this;
	    }
	});


	window.NonExistingRoutesListView = Backbone.View.extend({
	    id: "routes",

	    template: _.template($('#tpl-routes-listview').html()),

	    initialize: function(model, options) {
	    	this.cityId = options.cityId;

			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);
			this.model.on("destroy", this.render, this);

			Backbone.EventBroker.on("route:remove", this.routeRemoved, this);
	    },

	    events: {
	    	"click .remove": "remove",
	    },

	    remove: function(e) {
	    	var id = $(e.target).attr('data-id');
	   		var route = this.model.get(id);
	   		this.model.remove(route);
	    },

	    // route removed, hence should be added to non-exsting list
	    routeRemoved: function(route) {
	    	this.model.add(route);
	    	this.render();
	    },

	    render: function(eventName) {
	    	$(this.el).html(this.template());

	    	var tbody = $(this.el).find('tbody');

	    	_.each(this.model.models, function(route) {
	            tbody.append(new NonExistingRoutesListItemView({model: route}, {cityId: this.cityId}).render().el);
	        }, this);

	        return this;
	    }
	});

	window.NonExistingRoutesListItemView = Backbone.View.extend({
	    tagName: "tr",

	    template: _.template($('#tpl-non-existing-route-list-item').html()),

	    initialize: function(model, options) {
	    	this.cityId = options.cityId;
	    	this.model.on("change", this.render, this);
	    },

	    events: {
	    	"click .add": "add"
	    },

	    add: function() {
	 		var route = new Route({
	 			origin: this.cityId,
	 			destination: this.model.get("id")
	 		});

	 		var that = this;

	 		route.save({}, {
	 			success: function(route) {
			 		Backbone.EventBroker.trigger("route:add", route);
	 				that.remove();
	 			},
	 			error: function(route) {
	 				alert("Unable to generate route between city " + route.get("origin") + " and " + route.get("destination") + ".");
	 			}
	 		});
		},

	    render: function(eventName) {
	    	var data = this.model.toJSON();

	        $(this.el).
	        	attr('id', 'route-data-' + this.model.get('id')).
	        	html(this.template(data));

	        return this;
	    }
	});

	window.RouteEditView = Backbone.Marionette.ItemView.extend({

		template: "#tpl-route-edit",

		initialize: function(model, options) {
	    	this.cityId = options.cityId;
	    	this.cityName = options.name;
		},

	    onRender: function() {
	    	// list of cities with routes to
	    	var routeModels = this.model.get("routes");
	        this.routesListView = new RoutesListView({model: routeModels}, {cityId: this.cityId});
	        routeModels.fetch();

	        // list of cities with no routes to
	        var nonExistingRoutesModel = this.model.get("nonExistingRoutes");
	        this.nonExistingRoutesListView = new NonExistingRoutesListView({model: nonExistingRoutesModel}, {cityId: this.cityId});
	        nonExistingRoutesModel.fetch();

	        this.$el.find('#routeslist').append(this.routesListView.render().el);
	        this.$el.find('#nonexistingrouteslist').append(this.nonExistingRoutesListView.render().el);
	    },
	});


	window.MapView = Backbone.View.extend({

		template: _.template($('#tpl-map-view').html()),

	 	initialize: function() {
	 		this.render();

	        var mapOptions = {
	          center: new google.maps.LatLng(-34.397, 150.644),
	          zoom: 8,
	          mapTypeId: google.maps.MapTypeId.ROADMAP,
	          zoomControlOptions: {
	          	style: google.maps.ZoomControlStyle.SMALL
	          }
	        };
	        var map = new google.maps.Map(document.getElementById("map"), mapOptions);

	        // decode and create path out of encoded polyline
			var decodedPath = google.maps.geometry.encoding.decodePath(this.model.get("polyline"));
			var routePath = new google.maps.Polyline({
			    path: decodedPath,
			    strokeColor: "#FF0000",
			    strokeOpacity: 1.0,
			    strokeWeight: 2
			});
			routePath.setMap(map);

			// calculate bounds of polyline
			var bounds = new google.maps.LatLngBounds();
			decodedPath.forEach(function(e) {
				bounds.extend(e);
			});

			// move and zoom map to contain route
			map.fitBounds(bounds);
	 	},

		events: {
			"hidden": "hidden"
		},

		hidden: function(e) {
			this.remove();
		},

		render: function(eventName) {
			$(this.el).html(this.template()).modal();

			return this;
		}
	});

//--

	// Router
	var AppRouter = Backbone.Router.extend({
	    routes:{
	        "":			"main",
	        "cities": 	"cities"
	    },

	    main: function () {
	    	$('#main').empty();
	    },

	    cities: function() {
	    	this.citiesList = new CityCollection();
	        this.citiesListView = new CitiesListView({model: this.citiesList});
	        this.citiesList.fetch();
	        $('#main').append(this.citiesListView.render().el);
	    }
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
