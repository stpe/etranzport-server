
window.et = _.extend(window.et || {}, {
	apikey: 'BC9A493B41014CAABB98F0471D759707', // '9990e43c062744c58347d5c013ff8739';

	tick: 1000,
	timeDelta: 0,	// seconds elapsed per update (calulated in init function)
	timeFactor: 500,	// factor time is sped up with

	map: null,

	vehicleClass: {
		TRUCK: 0,
		TRAILER: 1
	},
	truckStates: {
		OFFDUTY: 0,
		DRIVING: 1,
		ONDUTY: 2,
		SLEEPER: 3
	},
	truckState: ['Off-Duty', 'Driving', 'On-Duty', 'Sleeper Berth'],
	truckStateCss: ['label-offduty', 'label-driving', 'label-onduty', 'label-sleeper'],
	tripStates: {
		IDLE: 0,
		ENROUTE: 1,
		ARRIVED: 2,
		COMPLETED: 3
	},
	tripState: ['Idle', 'En route', 'Arrived', 'Completed'],
	tripStateCss: ['label-offduty', 'label-driving', 'label-onduty', 'label-sleeper'],

	truckIcon: L.Icon.extend({
		options: {
			iconUrl: 'gfx/lorry-icon-32x32.png',
			shadowUrl: null,
			iconSize: new L.Point(32, 32),
			iconAnchor: new L.Point(16, 16),
			popupAnchor: new L.Point(0, -16)
		}
	})
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
			"name": "",
			"state": 0,
			"type": "",
			"vclass": 0,
			"city": 0,
			"city_name": ""
		}
	});

	window.VehicleCollection = Backbone.Collection.extend({
		mode: Vehicle,

	    initialize: function() {
			Backbone.EventBroker.on("vehicle:add", function(vehicle) {
				this.add(vehicle);
			}, this);

			Backbone.EventBroker.on("vehicle:tripcompleted", function(id) {
				var vehicle = this.get(id);
				vehicle.set("state", et.truckStates.OFFDUTY);
			}, this);
	    },

		url: "api/vehicles"
	});

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
			"timefactor": 0,
			"speed": 0,
			"startts": 0,
			"map": null,
			"route": null,
			"vehicle": null,
			"vehicle_name": ""
		},

		initialize: function() {
	    	this.set('map', new VehicleMap());
		}
	});

	window.TripCollection = Backbone.Collection.extend({
	    model: Trip,

	    initialize: function() {
			Backbone.EventBroker.on("trip:add", function(trip) {
				this.add(trip);
			}, this);

			Backbone.EventBroker.on("trip:arrived", function(trip) {
				// remove from collection
				this.remove(trip);

				// update state to completed
				trip.set("state", et.tripStates.COMPLETED);

				Backbone.EventBroker.trigger("vehicle:tripcompleted", trip.get("vehicle"));

				// clear out uneccessary stuff to send to server // todo: override sync (best?) to save only updated state
				trip.unset("map", { silent: true });
				trip.unset("route", { silent: true });

				// save
				trip.save(null, {
					patch: true,
					success: function(model, response) {
						console.log("Saved completed trip.", trip.toJSON());
					},
					error: function(model, response) {
						alert('Failed to save completed trip!');
					}
				});
			}, this);	    	

			this.on("reset", this.afterFetch, this);
	    },

	    afterFetch: function() {
	    	this.forEach(function(trip) {
	    		if (trip.get('state') == et.tripStates.ENROUTE) {
	    	  		Backbone.EventBroker.trigger("trip:addtomap", trip);
	    		}
	    	});
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
	window.VehicleListView = Backbone.View.extend({
	    tagName: 'tbody',
	    id: "vehicleList",

	    initialize: function() {
			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);
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
	    	this.model.on("change", this.render, this);
	    },

	    events: {
	    	"click .removeVehicle": "remove",
	    	"click .doHaul": "doHaul"
	    },

	    remove: function() {
	    	this.$el.remove();
	    	this.model.destroy();
	    },

	    doHaul: function() {
	    	var that = this;

			var haulView = new DoHaulView({model: new Backbone.Model({
				origin: this.model.get("city_name"),
				name: this.model.get("name")
			})});

			var modal = new Backbone.BootstrapModal({
				title: "Do Haul",
				content: haulView,
				okText: "Haul it!"
			}).open();

			// start city select2 box
			$("#haul-destination-city").select2({
				placeholder: "Select Destination City",
				minimumResultsForSearch: 9999,
				ajax: {
					url: "api/routes/" + this.model.get("city") + "/short",
					dataType: "json",
					data: function(term, page) {
						return {};
					},
					results: function(data, page) {
						var results =  {
							results: data.map(function(city) {
								return {
									id: city.destination,
									text: city.destination_name + " (" + that.getDistanceString(city.distance) + ")"
								};
							}),
							more: false
						};
						return results;
					}
				}
			});

			modal.on("ok", function() {
				var speed = this.convertMph(this.$el.find('#setVehicleSpeed').val());
				var vehicle = that.model.get("id");

				var route = new Route({
					origin: that.model.get("city"),
					destination: $("#haul-destination-city").select2("val")
				});

				route.fetch({
					success: function(model, response, options) {
						var trip = new Trip();
						trip.set({
							origin: route.get("origin"),
							origin_name: route.get("origin_name"),
							destination: route.get("destination"),
							destination_name: route.get("destination_name"),
							distance: route.get("distance"),
							duration: route.get("distance") / speed,
							timefactor: et.timeFactor,
							speed: speed,
							state: et.truckStates.DRIVING,
							route: route,
							vehicle: vehicle
						});

						trip.save(null, {
							success: function(model, response) {
								that.model.set("city", route.get("destination"));
								that.model.set("city_name", route.get("destination_name"));
								that.model.set("state", et.truckStates.DRIVING);

								Backbone.EventBroker.trigger("trip:add", model);
							},
							error: function(model, response) {
								alert('Failed to save!');
							}
						});

						modal.remove();
					},
					error: function(model, xhr, options) {
						alert("Could not find route!");
					}
				});
			});
			modal.on("cancel", function() {
				modal.remove();
			});
	    },
	 
	    render: function(eventName) {
	    	var data = this.model.toJSON();

	    	data = _.extend(data, {
	    		stateTitle: this.getVehicleStateString(data.state),
	    		stateCss: this.getVehicleStateCss(data.state),
	    	});

	        $(this.el).
	        	html(this.template(data));
	        return this;
	    }
	});

	window.TripListView = Backbone.View.extend({
	    tagName: 'tbody',
	    id: "tripList",
	 
	    initialize: function() {
			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);
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
	    	this.model.on("change", this.render, this);
	    },

	    events: {
	    	"click .removeTrip": "remove"
	    },

	    remove: function() {
	    	this.$el.remove();
	    	this.model.destroy();
	    },
	 
	    render: function(eventName) {
	    	var data = this.model.toJSON();

	    	// calculate estimation of real distance since polyline is optimized
	    	var traveled = (this.model.get("map") && this.model.get("map").get("distance")) ? this.getDistanceString((this.model.get("map").get("traveled") / this.model.get("map").get("distance")) * data.distance) : '';

	    	data = _.extend(data, {
	    		state: this.getStateString(data.state),
	    		stateCss: this.getStateCss(data.state),
				distance: this.getDistanceString(data.distance),
				duration: this.getDurationString(data.duration),
				timefactor: et.timeFactor,
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

	window.TruckAdd = Backbone.View.extend({
		template: _.template($('#tpl-truck-add').html()),

		render: function(eventName) {
			var el = $(this.el);

			el.html(this.template());

			var vehicleTypeFormat = function(vehicle) {
				return vehicle.text + ' (' + vehicle.id + ')'
			};

			// vehicle type select2 box
			el.find("#vehicle-type").select2({
				placeholder: "Select Truck Type",
				minimumResultsForSearch: 9999,
				ajax: {
					url: "api/data/vehicle_types",
					dataType: "json",
					data: function(term, page) {
						return {};
					},
					results: function(data, page) {
						var results =  {
							results: data.map(function(type) {
								return {
									id: type.code,
									text: type.name
								};
							}),
							more: false
						};
						return results;
					}
				},
				formatResult: vehicleTypeFormat,
				formatSelection: vehicleTypeFormat
			});

			var trailerFormat = function(trailer) {
				var fmt = trailer.text;

				if (trailer.sizeft) {
					fmt += ", " + trailer.sizeft + "ft";
				}

				fmt += ' (' + trailer.id + ')';

				return fmt;
			}

			// vehicle trailer types select2 box
			el.find("#vehicle-trailers").select2({
				placeholder: "Add Trailer",
				//multiple: true,
				minimumResultsForSearch: 9999,
				ajax: {
					url: "api/data/trailers",
					dataType: "json",
					data: function(term, page) {
						return {};
					},
					results: function(data, page) {
						var results =  {
							results: data.map(function(trailer) {
								return {
									id: trailer.code,
									text: trailer.name,
									sizeft: trailer.sizeft
								};
							}),
							more: false
						};
						return results;
					}
				},
				formatResult: trailerFormat,
				formatSelection: trailerFormat				
			});

			// start city select2 box
			el.find("#vehicle-city").select2({
				placeholder: "Select Start City",
				minimumResultsForSearch: 9999,
				ajax: {
					url: "api/cities",
					dataType: "json",
					data: function(term, page) {
						return {};
					},
					results: function(data, page) {
						var results =  {
							results: data.map(function(city) {
								return {
									id: city.id,
									text: city.name
								};
							}),
							more: false
						};
						return results;
					}
				}
			});

			return this;
		}
	});


	window.TrailerAdd = Backbone.View.extend({
		template: _.template($('#tpl-trailer-add').html()),

		render: function(eventName) {
			var el = $(this.el);

			el.html(this.template());

			var trailerFormat = function(trailer) {
				var fmt = trailer.text;

				if (trailer.sizeft) {
					fmt += ", " + trailer.sizeft + "ft";
				}

				fmt += ' (' + trailer.id + ')';

				return fmt;
			}

			// trailers select2 box
			el.find("#vehicle-trailers").select2({
				placeholder: "Add Trailer",
				minimumResultsForSearch: 9999,
				ajax: {
					url: "api/data/trailers",
					dataType: "json",
					data: function(term, page) {
						return {};
					},
					results: function(data, page) {
						var results =  {
							results: data.map(function(trailer) {
								return {
									id: trailer.code,
									text: trailer.name,
									sizeft: trailer.sizeft
								};
							}),
							more: false
						};
						return results;
					}
				},
				formatResult: trailerFormat,
				formatSelection: trailerFormat				
			});

			// start city select2 box
			el.find("#vehicle-city").select2({
				placeholder: "Select Start City",
				minimumResultsForSearch: 9999,
				ajax: {
					url: "api/cities",
					dataType: "json",
					data: function(term, page) {
						return {};
					},
					results: function(data, page) {
						var results =  {
							results: data.map(function(city) {
								return {
									id: city.id,
									text: city.name
								};
							}),
							more: false
						};
						return results;
					}
				}
			});

			return this;
		}
	});

	window.VehicleAddView = Backbone.View.extend({
		events: {
			"click #addTruck": function(e) {
				this.addVehicle(e, et.vehicleClass.TRUCK);
			},
			"click #addTrailer": function(e) {
				this.addVehicle(e, et.vehicleClass.TRAILER);				
			}
		},

		addVehicle: function(e, vehicleClass) {
			e.preventDefault();

			var addVehicle = (vehicleClass == et.vehicleClass.TRUCK) ? new TruckAdd({model: new Backbone.Model({})}) : new TrailerAdd({model: new Backbone.Model({})});;
			var typeString = vehicleClass == et.vehicleClass.TRUCK ? "Truck" : "Trailer";

			var modal = new Backbone.BootstrapModal({
				title: "Add " + typeString + " to Fleet",
				content: addVehicle,
				okText: "Add " + typeString
			}).open();

			modal.on("ok", function() {
				var name = "", type, city;

				if (vehicleClass == et.vehicleClass.TRUCK) {
					name = this.$el.find("#vehicle-name").val(),
					type = this.$el.find("#vehicle-type").select2("val");
				} else if (vehicleClass == et.vehicleClass.TRAILER) {
					type = this.$el.find("#vehicle-trailers").select2("val");
				}
				city = this.$el.find("#vehicle-city").select2("val");

				var vehicle = new Vehicle();
				vehicle.set({
					name: name,
					type: type,
					vclass: vehicleClass,
					city: city
				});

				vehicle.save(null, {
					success: function(model, response) {
						Backbone.EventBroker.trigger("vehicle:add", model);
					},
					error: function(model, response) {
						alert('Failed to save vehicle!');
					}
				});

				addVehicle.remove();
			});
			modal.on("cancel", function() {
				addVehicle.remove();
			})
		}
	});

	window.DoHaulView = Backbone.View.extend({
		el: $('#alert'),

		template: _.template($('#tpl-dohaul').html()),

		initialize: function() {
			this.render();
		},

		render: function(eventName) {
			$(this.el).html(this.template(this.model.toJSON()));

			return this;
		}
	});

	window.MapView = Backbone.View.extend({
	 	
	 	initialize: function(options) {
	 		// init map
	 		var that = this;
			var map = new L.Map('map');
			et.map = map;

			var cloudmade = new L.TileLayer('http://{s}.tile.cloudmade.com/' + et.apikey + '/997/256/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, <a href="http://cloudmade.com">CloudMade</a>',
				maxZoom: 18
			});

			map.addLayer(cloudmade);
			map.setView(new L.LatLng(34.705, -97.73), 5);

			// listen to added trips
			Backbone.EventBroker.on("trip:add", this.vehicleAdd, this);
			Backbone.EventBroker.on("trip:addtomap", function(trip) {
				// load route data if not exists
				that.getRouteFromTrip(trip, that.vehicleAdd, that);
			}, that);

			this.vehicles = options.vehicles;

			this.timer = null;
	 	},

	 	vehicleAdd: function(trip) {
	 		var route = trip.get("route");
			var map = et.map;
			var res = this.convertPointsToLatLng(route.get("points"));
			var route = res.latLngs;
			var distance = res.distance;

			// create a red polyline from an arrays of LatLng points
			var polyline = new L.Polyline(route, {color: 'red'});

			// zoom the map to the polyline
			map.fitBounds(new L.LatLngBounds(route));

			// add the polyline to the map
			map.addLayer(polyline);

			// figure out how far in the polyline the vehicle has travelled
			var current = 0,
				distanceLeftOver = 0,
				distanceCompleted = 0;

			if (trip.get("distance_completed") > 0 ) {
				var pos = route[0],
					len = route.length,
					i = 0,
					currentDistance = 0,
					distanceCompleted = trip.get("distance_completed");

				while (i < len && currentDistance < distanceCompleted) {
					i++;
					currentDistance += pos.distanceTo(route[i]);
					pos = route[i];
				}

				// set current node in polyline
				current = i;

				// set left over distance (distance completed in addition to the distance to the current node)
				distanceLeftOver = currentDistance - distanceCompleted;
			}

			// add vehicle marker
			var marker = new L.Marker(route[current], {icon: new et.truckIcon()});
			marker.addTo(map)
				.bindPopup("Vehicle ID: " + trip.get("vehicle"));

			trip.get("map").set({
				marker: marker,
				route: route,
				distance: distance,
				current: current,
				updated: (new Date).getTime(),
				traveled: distanceCompleted,
				distanceLeftOver: distanceLeftOver
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
			var activeVehiclesCount = 0;

			vehicles.each(function(vehicle) {
				v = vehicle.get("map").toJSON();

				if (vehicle.get("state") == et.tripStates.ENROUTE) {
					activeVehiclesCount++;

					timeSinceLastUpdate = (now - v.updated) / 1000; // in ms
					distanceSinceLastUpdate = timeSinceLastUpdate * vehicle.get("speed") * et.timeFactor + v.distanceLeftOver;

					distanceToNextPoint = v.marker.getLatLng().distanceTo(v.route[v.current]);

					prevCurrent = v.current;

					len = v.route.length;

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
							vehicle.set("state", et.tripStates.ARRIVED);
							break;
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

					// trigger arrived event if vehicle has arrived
					if (vehicle.get("state") == et.tripStates.ARRIVED) {
			    		Backbone.EventBroker.trigger("trip:arrived", vehicle);
					}
				} else {
					// non active route; ignore
				}
			});

			// stop update timer of no more active vehicles
			if (activeVehiclesCount == 0) {
				this.stop();
			}
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
	    	this.vehicleList = new VehicleCollection();
	    	this.vehicleListView = new VehicleListView({model: this.vehicleList});
	    	this.vehicleList.fetch();
	    	$("#vehicles").append(this.vehicleListView.render().el);
	    	et.vehicleList = this.vehicleList;

	        this.tripList = new TripCollection();
	        this.tripListView = new TripListView({model: this.tripList});
	        this.tripList.fetch();
	        $("#trips").append(this.tripListView.render().el);

	        this.map = new MapView({el: $('#map'), vehicles: this.tripList});
	        et.mapView = this.map;

	        this.vehicleAdd = new VehicleAddView({ el: $("#vehicle-form") });

	       	et.timeDelta = 1000 / et.tick;
			$('#timeFactor').val(et.timeFactor);
	    }
	});

	// set dropdown label to selected
	$(document.body).on("click", ".change-on-select a", function(e) {
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
			return et.tripState[s];
		},

		getStateCss: function(s) {
			return et.tripStateCss[s];
		},

		getVehicleStateString: function(s) {
			return et.truckState[s];
		},

		getVehicleStateCss: function(s) {
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
		},

		// populate trip model with route data if missing
		getRouteFromTrip: function(trip, callback, context) {
			var route = trip.get("route");
			if (route !== null) {
				callback.call(context, trip);
			}

			var route = new Route({
				origin: trip.get("origin"),
				destination: trip.get("destination")
			});

			route.fetch({
				success: function(model, response, options) {
					trip.set("route", model);
					callback.call(context, trip);
				},
				error: function(model, xhr, options) {
					console.log("Could not find route!", trip.toJSON());
				}
			});
		}
	});

	var app = new AppRouter();
	Backbone.history.start();

})(jQuery);
