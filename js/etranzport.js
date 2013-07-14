
window.et = _.extend(window.et || {}, {
	apikey: 'BC9A493B41014CAABB98F0471D759707', // '9990e43c062744c58347d5c013ff8739'; // cloudmade

	tick: 1000,
	timeDelta: 0,	// seconds elapsed per update (calulated in init function)
	timeFactor: 1,	// factor time is sped up with

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
			iconSize: [32, 32],
			iconAnchor: [16, 16],
			popupAnchor: [0, -16]
		}
	}),

	data: {}
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
			"city_name": "",
			"connected": null
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

				if (vehicle.get("vclass") == et.vehicleClass.TRAILER) {
					vehicle.set("connected", null);
				}
			}, this);

			Backbone.EventBroker.on("vehicle:begintrip", function(data) {
				var vehicle = this.get(data.vehicle),
					trip = data.trip;

				vehicle.set("city", trip.get("destination"));
				vehicle.set("city_name", trip.get("destination_name"));
				vehicle.set("state", et.truckStates.DRIVING);

				if (vehicle.get("vclass") == et.vehicleClass.TRAILER) {
					vehicle.set("connected", trip.vehicle);
				}
			}, this);

			this.fetch();
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
			"vehicle_name": "",
			"attr": "{}"
		},

		initialize: function() {
	    	this.set('map', new VehicleMap());
		},

	    save: function(attrs, options) {
	        options || (options = {});

	        // filter out data not needed in backend
	        var data = this.toJSON();
	        delete data.route;
	        delete data.map;

	        options.data = JSON.stringify(data);

	        Backbone.Model.prototype.save.call(this, attrs, options);
	    },

	    setTripAttributes: function(key, value) {
			var current = this.getTripAttributes();
			current[key] = value;
			this.set("attr", JSON.stringify(current));
	    },

	    getTripAttributes: function() {
			return JSON.parse(this.get("attr"));
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

				// update trailers
				var attr = trip.getTripAttributes();
				if (attr.trailers) {
					for (var i = 0; i < attr.trailers.length; i++) {
						Backbone.EventBroker.trigger("vehicle:tripcompleted", attr.trailers[i]);
					}					
				}

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

			this.fetch({
				success: function(collection, response, options) {
			    	collection.forEach(function(trip) {
			    		if (trip.get('state') == et.tripStates.ENROUTE) {
			    	  		Backbone.EventBroker.trigger("trip:addtomap", trip);
			    		}
			    	});
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

			that.trailerTypeSelection = [],
			that.cargoSelection = [];

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
					url: "api/routes/" + that.model.get("city") + "/short",
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

			$("#haul-trailer").select2({
				placeholder: "Select Trailers",
				minimumResultsForSearch: 9999,
				multiple: true,
				query: function(query) {
					var trailers = et.vehicleList.filter(
						function(vehicle) {
							return vehicle.get("vclass") == et.vehicleClass.TRAILER
								&& vehicle.get("city") == that.model.get("city")
								&& vehicle.get("state") == et.truckStates.OFFDUTY;
						}
					);

					var results = {
						results:
							trailers.map(function(trailer) {
								return {
									id: trailer.get("id"),
									text: trailer.get("type")
								}
							}),
						more: false
					};

					query.callback(results);
				}
			}).on("change", function(e) {
				var type, 
					trailer;

				// update disabled state of cargo based on number of trailers
				$("#haul-cargo").select2("enable", e.val.length > 0);

				// get trailer types
				that.trailerTypeSelection = [];
				for (var i = 0; i < e.val.length; i++) {
					trailer = et.vehicleList.get(e.val[i]);
					if (!trailer) {
						console.log("Error - can't lookup selected trailer");
						return;
					}

					// add type if not already there
					type = trailer.get("type");
					if (that.trailerTypeSelection.indexOf("type") == -1) {
						that.trailerTypeSelection.push(type);
					}
	    		}
			});

			function cargoSelectFormat(item, element) {
				// if cargo not allowed by current trailer type, format as disabled
				if (!gameUtils.isValidCargoForTrailers(item.id, that.trailerTypeSelection)) {
					element.css('color', '#ccc');
				}

				return item.text;
			}

			$("#haul-cargo").select2({
				placeholder: "Select Cargo",
				minimumResultsForSearch: 9999,
				multiple: true,
				query: function(query) {
					var keys = Object.keys(et.data.cargo),
						cargo = keys.map(function(code) {
							return {
								id: code,
								text: et.data.cargo[code].name
							}
						});

					// sort alphabetically
					cargo.sort(function(a, b) {
						return (a.text < b.text) ? -1 : (a.text > b.text) ? 1 : 0;
					});

					query.callback({
						results: cargo,
						more: false
					});
				},
				formatResult: cargoSelectFormat,
				formatSelection: cargoSelectFormat
			}).on("change", function(e) {
				that.cargoSelection = e.val;
			}).on("select2-selecting", function(e) {
				// don't allow invalid cargo types for current trailers to be selected
				if (!gameUtils.isValidCargoForTrailers(e.object.id, that.trailerTypeSelection)) {
					e.preventDefault();
				}
			}).select2("enable", false);

			modal.on("ok", function() {
				var speed = this.convertMph(this.$el.find('#setVehicleSpeed').val());
				var vehicle = that.model.get("id");

				var route = new Route({
					origin: that.model.get("city"),
					destination: $("#haul-destination-city").select2("val")
				});

				if (!route.get("origin") || !route.get("destination")) {
					alert("Please set a destination!");
					modal.preventClose();
					return;
				}
				
				var trailers = $("#haul-trailer").select2("val"),
					cargo = $("#haul-cargo").select2("val");

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

						trip.setTripAttributes("trailers", trailers);
						trip.setTripAttributes("cargo", cargo);

						trip.save({}, {
							success: function(model, response) {
								// update truck
								Backbone.EventBroker.trigger("vehicle:begintrip", {
									vehicle: vehicle,
									trip: trip
								});								

								// update trailers
								for (var i = 0; i < trailers.length; i++) {
									Backbone.EventBroker.trigger("vehicle:begintrip", {
										vehicle: trailers[i],
										trip: trip
									});								
								}

								Backbone.EventBroker.trigger("trip:add", trip);
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

	window.TripListItemView = Backbone.Marionette.ItemView.extend({
	    tagName: "tr",
	 
	    template: "#tpl-trip-list-item",

	    events: {
	    	"click .removeTrip": "remove"
	    },

	    initialize: function() {
	    	this.listenTo(this.model, "change", this.render);
	    },

	    remove: function() {
	    	this.$el.remove();
	    	this.model.destroy();
	    },

	    serializeData: function() {
	    	var cargoStr = "",
	    		trailerList = [],
	    		cargoList = [],
	    		attr = this.model.getTripAttributes(),
	    		data = this.model.toJSON();

	    	// calculate estimation of real distance since polyline is optimized
	    	var traveled = "";
	    	if (this.model.get("map") && this.model.get("map").get("distance")) {
	    		traveled = this.getDistanceString((this.model.get("map").get("traveled") / this.model.get("map").get("distance")) * data.distance)
	    	};

	    	if (attr.trailers) {
	    		for (var i = 0; i < attr.trailers.length; i++) {
	    			var trailer = et.vehicleList.get(attr.trailers[i]);
	    			trailerList.push(trailer ? trailer.get("type") : attr.trailers[i]);
	    		}
	    		if (trailerList.length == 0) {
	    			cargoStr += "<i>Deadheading</i>";
	    		} else {
		    		cargoStr += trailerList.join(", ") + ": ";
	    		}
	    	}

	    	if (attr.cargo) {
	    		for (var i = 0; i < attr.cargo.length; i++) {
	    			cargoList.push(attr.cargo[i]);
	    		}
	    		if (cargoList.length == 0) {
	    			cargoStr += "<i>No cargo</i>";
	    		} else {
		    		cargoStr += cargoList.join(", ");
	    		}
	    	}

	    	data = _.extend(data, {
	    		state: this.getStateString(data.state),
	    		stateCss: this.getStateCss(data.state),
				distance: this.getDistanceString(data.distance),
				duration: this.getDurationString(data.duration),
				timefactor: et.timeFactor,
				startts: this.getDateTimeString(data.startts),
				speed: this.getSpeedString(data.speed),
				traveled: traveled,
				cargo: cargoStr
	    	});

	    	return data;
	    },
	 
	    onRender: function(eventName) {
	        this.$el.attr('id', 'trip-data-' + this.model.get('id'));
	    }
	});

	window.TripListView = Backbone.Marionette.CollectionView.extend({
		itemView: window.TripListItemView,
	    tagName: 'tbody',
	    id: "tripList"
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

	window.TruckAdd = Backbone.Marionette.ItemView.extend({
		template: "#tpl-truck-add",

		onRender: function(eventName) {
			var vehicleTypeFormat = function(vehicle) {
				return vehicle.text + ' (' + vehicle.id + ')'
			};

			// vehicle type select2 box
			this.$el.find("#vehicle-type").select2({
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

			// start city select2 box
			this.$el.find("#vehicle-city").select2({
				placeholder: "Select Start City",
				minimumResultsForSearch: 9999,
				query: function(query) {
					query.callback({
						results: et.data.cities.map(function(city) {
							return {
								id: city.id,
								text: city.name
							};
						}),
						more: false
					});
				}	
			});
		}
	});


	window.TrailerAdd = Backbone.Marionette.ItemView.extend({
		template: "#tpl-trailer-add",

		onRender: function(eventName) {
			var trailerFormat = function(trailer) {
				var fmt = trailer.text;

				if (trailer.sizeft) {
					fmt += ", " + trailer.sizeft + "ft";
				}

				fmt += ' (' + trailer.id + ')';

				return fmt;
			}

			// trailers select2 box
			this.$el.find("#vehicle-trailers").select2({
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
			this.$el.find("#vehicle-city").select2({
				placeholder: "Select Start City",
				minimumResultsForSearch: 9999,
				query: function(query) {
					query.callback({
						results: et.data.cities.map(function(city) {
							return {
								id: city.id,
								text: city.name
							};
						}),
						more: false
					});
				}	
			});
		}
	});

	window.VehicleAddView = Backbone.Marionette.ItemView.extend({
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

			var typeString, addVehicle;

			if (vehicleClass == et.vehicleClass.TRUCK) {
				addVehicle = new TruckAdd({
					model: new Backbone.Model({})
				});
				typeString = "Truck";
			} else {
				addVehicle = new TrailerAdd({
					model: new Backbone.Model({})
				});
				typeString = "Trailer";
			}

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

	window.DoHaulView = Backbone.Marionette.ItemView.extend({
		el: $('#alert'),
		template: "#tpl-dohaul",
	});

	window.MapView = Backbone.View.extend({

	 	initialize: function(options) {
	 		// init map
	 		var that = this;
			var map = new L.Map('map');
			et.map = map;
/*
			// cloudmade tiles
			var cloudmade = new L.TileLayer('http://{s}.tile.cloudmade.com/' + et.apikey + '/997/256/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, <a href="http://cloudmade.com">CloudMade</a>',
				maxZoom: 18
			});
*/
			// Open MapQuest tiles
			var mapquestUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png',
				subDomains = ['otile1','otile2','otile3','otile4'],
				mapquestAttrib = 'Data, imagery and map information provided by <a href="http://open.mapquest.co.uk" target="_blank">MapQuest</a>, <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> and contributors.';
			var mapquest = new L.TileLayer(mapquestUrl, {maxZoom: 18, attribution: mapquestAttrib, subdomains: subDomains});

			map.addLayer(mapquest);
			// default map position (USA)
			map.setView([34.705, -97.73], 5);

			// init
			this.drawCities();

			// listen to added trips
			Backbone.EventBroker.on("trip:add", this.vehicleAdd, that);
			Backbone.EventBroker.on("trip:addtomap", function(trip) {
				// load route data if not exists
				that.getRouteFromTrip(trip, that.vehicleAdd, that);
			}, that);

			this.vehicles = options.vehicles;

			this.timer = null;
	 	},

	 	drawCities: function() {
	 		if (!et.data.cities) {
	 			$.error("Cities data empty during MapView init.");
	 		}

	 		var map = et.map,
	 			cities = et.data.cities,
	 			len = et.data.cities.length;

	 		// TODO: draw city location on map
	 		for (var i = 0; i < len; i++) {
	 			var points = decodeLine(cities[i].location),
	 				latlng = [points[0][0], points[0][1]];

				var marker = new L.Marker(latlng);
				marker.addTo(map)
					.bindPopup(cities[i].name);
	 		}
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
					if (v.marker != null) {
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
						console.log("Active trip, but no route data!", vehicle);
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
	 
	    initCargoData: function() {
	    	var dfd = new $.Deferred();

	    	// populate code lookup for cargo
	    	$.getJSON("/api/data/cargo", function(data) {
	    		et.data.cargo = {};
	    		for (var i = 0; i < data.length; i++) {
	    			et.data.cargo[data[i].code] = data[i];
	    		}
	    		console.log("Initialized cargo: " + data.length + " types.");

	    		dfd.resolve();
	    	});

	    	return dfd.promise();
	    },

	    initCityData: function() {
	    	var dfd = new $.Deferred();

	    	// retrieve and populate array of cities
	    	$.getJSON("/api/cities", function(data) {
	    		et.data.cities = data;
	    		console.log("Initialized cities: " + data.length + " cities.");

	    		dfd.resolve();
	    	});

	    	return dfd.promise();
	    },

	    init: function() {
	    	var dfd = new $.Deferred();

	    	$.when(
		    	this.initCargoData(),
		    	this.initCityData()
	    	).done(function() {
	    		console.log("Init done.");
	    		dfd.resolve();
	    	});

	    	return dfd.promise();
	    },

	    main: function() {
	    	var that = this;

	    	// vehicles
	    	this.vehicleList = new VehicleCollection();
	    	this.vehicleListView = new VehicleListView({model: this.vehicleList});
			$("#vehicles").append(this.vehicleListView.render().el);
	    	et.vehicleList = this.vehicleList;

	    	this.init().done(function() {
	    		// trips
		        that.tripList = new TripCollection();
		        that.tripListView = new TripListView({
		        	collection: that.tripList
		        });
		        $("#trips").append(that.tripListView.render().el);

		        // map
		        that.map = new MapView({el: $('#map'), vehicles: that.tripList});
	    	});

	        this.vehicleAdd = new VehicleAddView({ el: $("#vehicle-form") });

	       	et.timeDelta = 1000 / et.tick;
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

	window.gameUtils = {
		// true if cargo (code) may be loaded on trailers (list of trailer types)
		isValidCargoForTrailers: function(cargo, trailers) {
			if (!et.data.cargo[cargo]) {
				console.log("Invalid cargo, not found in lookup: " + cargo);
				return false;
			}

			for (var i = 0; i < trailers.length; i++) {
				if (et.data.cargo[cargo].trailer.indexOf(trailers[i]) != -1) {
					return true;
				}
			}

			return false;
		}
	};

	window.app = new AppRouter();
	Backbone.history.start();

})(jQuery);
