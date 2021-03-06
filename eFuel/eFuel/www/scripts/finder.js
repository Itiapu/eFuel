(function(window) {
    function getJSON(url) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('get', url, true);
            xhr.responseType = 'json';
            xhr.onload = function() {
                var status = xhr.status;
                if (status == 200) {
                    resolve(xhr.response);
                } else {
                    reject(status);
                }
            };
            xhr.send();
        });
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1); // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180)
    }

    var gasTypesShort = {
        "Super": "e5",
        "Diesel": "dsl",
        "E10": "e10"
    }

    var Finder = window.Finder = {
        getAllStationsInRadius: function(lat, lng, radius, plugType, callback) {
            if(plugType === "") {
                var allStations = [];
                var remainingCallbacks = 2;
                var innerCb = function(err, stations) {
                    if(err) return callback(err);

                    allStations = allStations.concat(stations);
                    remainingCallbacks--;
                    if(remainingCallbacks === 0) {
                        allStations = allStations.sort(function(entry1, entry2) {
                            return entry1.distance - entry2.distance;
                        })

                        return callback(null, allStations);
                    }
                }

                Finder.getAllGasStationsInRadius(lat, lng, radius, "", innerCb);
                Finder.getAllElectroStationsInRadius(lat, lng, radius, "", innerCb);
            } else if (["Super", "Diesel", "E10"].indexOf(plugType) > -1) {
                Finder.getAllGasStationsInRadius(lat, lng, radius, plugType, callback);
            } else {
                if (plugType === "Elektro") plugType = "";
                Finder.getAllElectroStationsInRadius(lat, lng, radius, plugType, callback);
            }
        },

        getAllGasStationsInRadius: function(lat, lng, radius, gasType, callback) {
            var url = "http://karte.mittelbayerische.de/api/6/datasets/114/";
            var gasTypeShort = gasTypesShort[gasType];

            var result;
            if(DEMO_MODUS) {
                result = Fixtures.getRawGasStations();
            } else {
                result = getJSON(url);
            }

            result.then(function(data) {
                var stations = data.entries.filter(function(entry) {
                        return entry.location != null && (gasType == "" || entry[gasTypeShort])
                    }).map(function(entry) {
                        entry.distance = getDistanceFromLatLonInKm(lat, lng, entry.location.lat, entry.location.lng);
                        return entry
                    }).filter(function(entry) {
                        return entry.distance < radius;
                    }).sort(function(entry1, entry2) {
                        return entry1.distance - entry2.distance;
                    }).map(function(entry) {
                        return {
                            lat: entry.location.lat,
                            lng: entry.location.lng,
                            distance: entry.distance,
                            name: entry.name,
                            isElectro: false,
                        }
                    });

                callback(null, stations);
            });
        },

        getAllElectroStationsInRadius: function(lat, lng, radius, plugType, callback) {
            var API_Key = '2a83e75cf3ceb116f8f70a553586d9d0'
            var url = 'https://api.goingelectric.de/chargepoints/?key=' + API_Key +
                '&lng=' + lng +
                '&lat=' + lat +
                '&radius=' + radius +
                '&plugs=' + plugType +
                '&orderby=distance'

            var result;
            if(DEMO_MODUS) {
                result = Fixtures.getRawStations();
            } else {
                result = getJSON(url);
            }

            result.then(function(data) {
                var stations = data.chargelocations.filter(function(entry) {
                        return plugType === "" || entry.chargepoints.some(function(point) {
                            return point.type === plugType
                        })
                    }).map(function(entry) {
                        entry.distance = getDistanceFromLatLonInKm(lat, lng, entry.coordinates.lat, entry.coordinates.lng);
                        return entry
                    }).filter(function(entry) {
                        return entry.distance < radius;
                    }).sort(function(entry1, entry2) {
                        return entry1.distance - entry2.distance;
                    }).map(function(entry) {
                        return {
                            lat: entry.coordinates.lat,
                            lng: entry.coordinates.lng,
                            distance: entry.distance,
                            name: entry.name,
                            isElectro: true,
                        }
                    });

                callback(null, stations);
            }, function(status) { //error detection....
                alert('Something went wrong.');
            });
        }
    }
})(window);
