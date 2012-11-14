window.et = _.extend(window.et || {}, {
	citiesList: null,
	routeCityId: null
});

(function($) {
	"use strict";

	window.City = Backbone.Model.extend({
		defaults: {
			"id": null,
			"name": "",
			"location": ""
		}
	});

	window.CityCollection = Backbone.Collection.extend({
		model: City,
		url: "../api/cities"
	});

	window.Route = Backbone.Model.extend({
		defaults: {
			"id": null,
			"city": null,
			"name": null,
			"location": 0,
			"distance": 0,
			"polyline": ""
		}
	});

	window.RouteCollection = Backbone.Collection.extend({
		model: Route,

		initialize: function() {
			this.cityId = et.routeCityId;
		},

		url: function() {
			console.log('route col url');
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
	    },

	    events: {
	    	"click .remove": "remove",
	    	"click .newcity": "newcity"
	    },

	    remove: function(e) {
	    	var id = $(e.target).attr('data-id');
	   		var city = this.model.get(id);
	   		this.model.remove(city);
//	   		city.destroy();
	    },

	 	newcity: function() {
	 		console.log("new");

	 		var city = new City();
	 		var editView = new CityEditView({
	 			model: city
	 		});
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
	    },

	    routes: function(e) {
	    	console.log("routes");
	    	// would be better to pass this as an init
	    	// value to RouteCollection...
	    	window.et.routeCityId = this.model.get('id');

	    	var routesList = new RouteCollection();
	    	var routesView = new RouteEditView({
	    		model: routesList
	    	});
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

	window.CityEditView = Backbone.View.extend({

		template: _.template($('#tpl-city-edit').html()),

	    initialize: function() {
	    	this.render();
	    },

		events: {
			"click .save": "save",
			"hidden": "hidden"
		},

		save: function(e) {
			e.preventDefault();
			console.log('save');

			var that = this;

			// loop input elements and set values to model
			var inputs = this.$el.find('input');
			inputs.each(function() {
				that.model.set($(this).attr('name'), $(this).val());
			});

			if (that.model.get('id') == null) {
				console.log('trying to create new');
				if (!window.et.citiesList.create(that.model)) {
					alert('fail');
				}
			} else {
				// save model
				that.model.save({
					success: function(model, response) {
						that.$el.modal("hide");
					},
					error: function(model, response) {
						alert('Failed to save!');
					}
				});
			}
		},

		hidden: function(e) {
			this.remove();
		},

		render: function(eventName) {
			$(this.el).html(this.template(this.model.toJSON())).modal();

			return this;
		}
	});

//--

	window.RoutesListView = Backbone.View.extend({
	    id: "routes",
	 
	    template: _.template($('#tpl-routes-listview').html()),

	    initialize: function() {
			this.model.on("reset", this.render, this);
			this.model.on("add", this.render, this);
	    },

	    events: {
	    	"click .remove": "remove",
	    },

	    remove: function(e) {
	    	var id = $(e.target).attr('data-id');
	   		var route = this.model.get(id);
	   		this.model.remove(route);
	    },

	    render: function(eventName) {
	    	$(this.el).html(this.template());

	    	var tbody = $(this.el).find('tbody');

	    	_.each(this.model.models, function(route) {
	            tbody.append(new RoutesListItemView({model: route}).render().el);
	        }, this);

	        return this;
	    }
	});

	window.RoutesListItemView = Backbone.View.extend({
	    tagName: "tr",
	 
	    template: _.template($('#tpl-route-list-item').html()),

	    initialize: function() {
	    	this.model.on("change", this.render, this);
	    },

	    events: {
	    	"click .remove": "remove",
	    	"click .create": "create",
	    	"click .map": "map"
	    },

	    create: function(e) {
	    	console.log('create route');
	    },

	    map: function(e) {
	    	console.log("map route");
	    },

	    remove: function() {
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


	window.RouteEditView = Backbone.View.extend({

		template: _.template($('#tpl-route-edit').html()),

	    initialize: function() {
	    	this.render();

	        this.routesListView = new RoutesListView({model: this.model});
	        this.model.fetch();
	        $('#routeslist').append(this.routesListView.render().el);

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
	    	window.et.citiesList = this.citiesList;
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
