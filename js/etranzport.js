
window.et = _.extend(window.et || {}, {
	apikey: 'BC9A493B41014CAABB98F0471D759707', // '9990e43c062744c58347d5c013ff8739';

	tick: 1000,
	timeDelta: 0,	// seconds elapsed per update (calulated in init function)
	timeFactor: 1000,	// factor time is sped up with

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
		iconUrl: 'gfx/lorry-icon-32x32.png',
		shadowUrl: null,
		iconSize: new L.Point(32, 32),
		iconAnchor: new L.Point(16, 16),
		popupAnchor: new L.Point(0, -16)
	}),

	latestRoute: null
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
	window.Vehicle = Backbone.Model.extend({
		urlRoot: "api/vehicles",
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

	window.VehicleCollection = Backbone.Collection.extend({
	    model: Vehicle,
	    url: "api/vehicles"
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
	window.VehicleListView = Backbone.View.extend({
	    tagName: 'tbody',
	    id: "vehicleList",
	 
	    initialize: function() {
			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);
	    },

	    events: {
	    	"click .removeVehicle": "removeVehicle"
	    },

	    removeVehicle: function(e) {
	    	var id = $(e.target).attr('data-id');
	   		var vehicle = this.model.get(id);
	   		this.model.remove(vehicle);
	   		vehicle.destroy();
	    },
	 
	    render: function(eventName) {
	    	$(this.el).empty();
	    	_.each(this.model.models, function(vehicle) {
	            $(this.el).append(new VehicleListItemView({model: vehicle}).render().el);
	        }, this);
	        return this;
	    }
	});

	window.VehicleListItemView = Backbone.View.extend({
	    tagName: "tr",
	 
	    template: _.template($('#tpl-vehicle-list-item').html()),

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
	        	attr('id', 'truck-data-' + this.model.get('id')).
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

		events: {
			"click #addRouteButton": "addRoute"
		},

		addRoute: function(e) {
			var that = this;
			var speed = this.convertMph($('#setVehicleSpeed').val());
			var route = et.latestRoute;

			var vehicle = new Vehicle();
			vehicle.set({
				origin: route.get("origin"),
				destination: route.get("destination"),
				distance: route.get("distance"),
				duration: route.get("distance") / speed,
				speed: speed,
				state: et.truckStates.DRIVING
			});

			vehicle.save(null, {
				success: function(model, response) {
					et.vehicleList.add(model);
					that.remove();
				},
				error: function(model, response) {
					alert('Failed to save!');
				}
			});
		},

		render: function(eventName) {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		}
	});

	window.RouteSearchError = Backbone.View.extend({
		el: $('#alert'),
		
		template: _.template($('#tpl-route-search-error').html()),

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
				var alertFound = new RouteSearchFound({model: new Backbone.Model({
					origin: this.get("origin_name"),
					destination: this.get("destination_name"),
					distance: that.getDistanceString(this.get("distance"))
				})});
				alertFound.render();

				et.latestRoute = this;
			}, route);

			route.fetch({
				error: function(model, response) {
					var alertError = new RouteSearchError({model: new Backbone.Model({
						error: "Fetching route failed. Probably doesn't exist in database."
					})});
					alertError.render();
					return;
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
				attribution: 'Data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, <a href="http://cloudmade.com">CloudMade</a>',
				maxZoom: 18
			});

			map.addLayer(cloudmade);
			map.setView(new L.LatLng(34.705, -97.73), 5);

			options.vehicles.on("add", this.vehicleAdd, this);
			options.vehicles.on("reset", function(vehicles) {
				vehicles.each(function(vehicle) {
					// that.vehicleAdd(vehicle);
				});
			}, this);

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
/*
			var truck = {
				id: et.routeId++,
				marker: marker,
				route: latlngs,
				current: 0,
				distancePoints: distancePoints,
				traveledPoints: 0,
				follow: false,
				speed: speed ? speed : 25, // 25 m/s = 90 km/h
				updated: (new Date).getTime(),
				distanceLeftOver: 0
			}
*/

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

	        this.vehicleList = new VehicleCollection();
	        this.vehicleListView = new VehicleListView({model: this.vehicleList});
	        this.vehicleList.fetch();
	        $('#routes').append(this.vehicleListView.render().el);

	        et.vehicleList = this.vehicleList;

	        this.map = new MapView({el: $('#map'), vehicles: this.vehicleList});
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




/*

var et = {

	tick: 1000,
	timeDelta: 0,	// seconds elapsed per update (calulated in init function)
	timeFactor: 40,	// factor time is sped up with

	map: null,
	apikey: 'BC9A493B41014CAABB98F0471D759707', // '9990e43c062744c58347d5c013ff8739';
	routes: [],
	latestRoute: null,
	timer: null,
	routeId: 0,

	truckIcon: L.Icon.extend({
		iconUrl: 'gfx/lorry-icon-32x32.png',
		shadowUrl: null,
		iconSize: new L.Point(32, 32),
		iconAnchor: new L.Point(16, 16),
		popupAnchor: new L.Point(0, -16)
	}),

	initMap: function() {
		var map = new L.Map('map');
		et.map = map;

		var cloudmade = new L.TileLayer('http://{s}.tile.cloudmade.com/' + et.apikey + '/997/256/{z}/{x}/{y}.png', {
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
			maxZoom: 18
		});

		map.addLayer(cloudmade);
		map.setView(new L.LatLng(34.705, -97.73), 5);

		et.timeDelta = 1000 / et.tick;
		$('#timeFactor').val(et.timeFactor);
	},

	addRoute: function(data, speed) {
		var map = et.map,
		    points = data.points;

		// convert points into leaflet polyline format and calculate
		// distance between points (which is shorter than IRL distance)
		var latlngs = [],
			latlng,
		    distancePoints = 0;
		for (var i = 0; i < points.length; i++) {
			latlng = new L.LatLng(points[i][0], points[i][1]);

			if (i > 0) {
				distancePoints += latlngs[i-1].distanceTo(latlng);
			}

			latlngs.push(latlng);
		}

		// create a red polyline from an arrays of LatLng points
		var polyline = new L.Polyline(latlngs, {color: 'red'});

		// zoom the map to the polyline
		map.fitBounds(new L.LatLngBounds(latlngs));

		// add the polyline to the map
		map.addLayer(polyline);

		var marker = new L.Marker(latlngs[0], {icon: new et.truckIcon()});
		map.addLayer(marker);

		var truck = {
			id: et.routeId++,
			marker: marker,
			origin: data.origin,
			destination: data.destination,
			distance: data.distance,
			googleDuration: data.duration,
			route: latlngs,
			current: 0,
			distancePoints: distancePoints,
			traveledPoints: 0,
			follow: false,
			speed: speed ? speed : 25, // 25 m/s = 90 km/h
			updated: (new Date).getTime(),
			distanceLeftOver: 0
		}

		truck.duration = truck.distance / truck.speed;

		et.routes.push(truck);

		et.addRouteToTable(et.routes[et.routes.length-1]);

		et.start();
	},

	addRouteToTable: function(route) {
		$('#routes > tbody').append(
			'<tr id="truck-data-' + route.id + '">' +
			'<td class="cell-id">' + route.id + '</td>' +
			'<td class="cell-origin">' + route.origin + '</td>' +
			'<td class="cell-dest">' + route.destination + '</td>' +
			'<td class="cell-distance">' + et.getDistanceString(route.distance) + '</td>' +
			'<td class="cell-duration" title="Google estimated duration: ' + route.googleDuration + '">' + et.getDurationString(route.duration) + '</td>' +
			'<td class="cell-traveled"></td>' +
			'<td class="cell-speed">' + et.getSpeedString(route.speed) + '</td>' +
			'</tr>'
		);

		// if first added route, show table
		if (route.id == 0) {
			$('#routes').show();
		}
	},

	updateRouteInfo: function(route) {
		var row = $('#truck-data-' + route.id);

		// calculate estimate of IRL traveled distance
		var traveled = (route.traveledPoints / route.distancePoints) * route.distance;

		row.find('.cell-traveled').text(et.getDistanceString(traveled));
	},

	start: function() {
		if (!et.timer) {
			et.timer = setInterval(et.step, et.tick);
		}
	},

	step: function() {
		var truck, i, now, timeSinceLastUpdate, distanceSinceLastUpdate, distanceToNextPoint;

		now = (new Date).getTime();

		for (i = 0; i < et.routes.length; i++) {
			truck = et.routes[i];

			if (truck.current < truck.route.length) {

				timeSinceLastUpdate = (now - truck.updated) / 1000; // in ms
				distanceSinceLastUpdate = timeSinceLastUpdate * truck.speed * et.timeFactor + truck.distanceLeftOver;

				distanceToNextPoint = truck.marker.getLatLng().distanceTo(truck.route[truck.current]);

				// move through as many points as possible
				while (distanceSinceLastUpdate >= distanceToNextPoint) {
					// add to traveled distance
					truck.traveledPoints += distanceToNextPoint;

					distanceSinceLastUpdate -= distanceToNextPoint;
					truck.distanceLeftOver = distanceSinceLastUpdate;

					// update position
					truck.marker.setLatLng(truck.route[truck.current]);

					// update table info
					et.updateRouteInfo(truck);

					// pan map to make car visible
					if (truck.follow && !et.map.getBounds().contains(truck.marker.getLatLng())) {
						et.map.panTo(truck.marker.getLatLng());
					}

					truck.updated = now;
					truck.current++;

					distanceToNextPoint = truck.marker.getLatLng().distanceTo(truck.route[truck.current]);
				}
			}
		}
	},

	stop: function() {
		if (et.timer) {
			clearInterval(et.timer);
			et.timer = null;
		}
	}
};

$(document).ready(function() {

	$('#timeFactorDec').on('click', function(e) {
		e.preventDefault();

		et.timeFactor = et.timeFactor - 1 >= 0 ? et.timeFactor - 1 : 0;
		$('#timeFactor').val(et.timeFactor);
	});

	$('#timeFactorInc').on('click', function(e) {
		e.preventDefault();

		et.timeFactor = et.timeFactor + 1;
		$('#timeFactor').val(et.timeFactor);
	});

	// hide alerts on close (bootstrap default is to remove from dom)
	$('.close').on('click', function(e) {
		e.preventDefault();
		$(this).parent().hide();
	});
});

*/