function codeToString(f) {
	var args = [];
	for (var i = 1; i < arguments.length; ++i) {
		args.push(JSON.stringify(arguments[i]));
	}
	return "(" + f.toString() + ")(" + args.join(",") + ");";
}

function injectedJs() {
	// Used to store play next items
	var play_next_queue = [];

	//var playlist_regex = new RegExp("people/[a-zA-Z0-9_-]{3,30}/playlists/\\d+/.*/");

	/*
	Backbone.Router.prototype.orig_navigate = Backbone.Router.prototype.navigate;
	Backbone.Router.prototype.navigate = function(a, b) {
		if(a.match(playlist_regex)) {
			console.log("Have Playlist");
		}
		return Backbone.Router.prototype.orig_navigate.call(this, a, b);
	}*/

	R.Component.orig_create = R.Component.create;
	R.Component.create = function(a,b,c) {
		//console.log("Rdio Enhancer:")
		//console.log(a);

		if(a == "TrackList") {
			//console.log(b);
			b.orig_onRendered = b.onRendered;
			b.onRendered = function() {
				b.orig_onRendered.call(this);

				console.log("adding the track magic");
				console.log(jQuery(".tracklist_toolbar .ActionMenu").length);
				jQuery(".tracklist_toolbar .ActionMenu").append('<span class="sortpl button"><span class="text">Sort Playlist</span><span class="dropdown_arrow"></span></span>');
			}
		}
		if(a == "PlaylistPage") {
			//console.log(b);
			b.orig_onRendered = b.onRendered;
			b.onRendered = function() {
				b.orig_onRendered.call(this);

				console.log("adding the pl magic");
				console.log(jQuery(".tracklist_toolbar .ActionMenu").length);
				jQuery(".tracklist_toolbar .ActionMenu").append('<span class="sortpl button"><span class="text">Sort Playlist</span><span class="dropdown_arrow"></span></span>');
			}

		}

		return R.Component.orig_create.call(this, a,b,c);
	}

	R.Api.origRequest = R.Api.request;
	R.Api.request = function() {
		var args = arguments[0];
		//console.log("Request");
		//console.log(arguments);

		// The Create/Add to playlist normally only takes one track and puts it in an array.
		// If we pass an array as the key this catches the array properly and formats it for the request.
		if (args.method == 'addToPlaylist' || args.method == 'createPlaylist') {
			var tracks = args.content.tracks;
			if (tracks.length == 1 && tracks[0] instanceof Array) {
				args.content.tracks = args.content.tracks[0];
				return R.Api.request(args);
			}
		}
		return R.Api.origRequest.apply(this, arguments);
	};

	// Sort functions
	var sortByArtist = function(a, b) {
		var artist_a,
		artist_b;
		if(a.artist) {
			artist_a = a.artist;
		}
		else {
			artist_a = a.albumArtist;
		}
		if(b.artist) {
			artist_b = b.artist;
		}
		else {
			artist_b = b.albumArtist;
		}
		artist_a = artist_a.toLowerCase(),
		artist_b = artist_b.toLowerCase();
		if (artist_a < artist_b) {
			return -1;
		}
		else if (artist_a > artist_b) {
			return 1;
		}
		else {
			return sortByAlbum(a, b);
		}
	},
	sortByAlbum = function(a, b) {
		var album_a = a.album.toLowerCase(),
		album_b = b.album.toLowerCase();
		if (album_a < album_b) {
			return -1;
		}
		else if (album_a > album_b) {
			return 1;
		}
		else {
			return sortByTrackNum(a, b);
		}
	},
	sortByTrackName = function(a, b) {
		var trackname_a = a.name.toLowerCase(),
		trackname_b = b.name.toLowerCase();
		if (trackname_a < trackname_b) {
			return -1;
		}
		else if (trackname_a > trackname_b) {
			return 1;
		}
		else {
			return sortByTrackNum(a, b);
		}
	},
	sortByTrackNum = function(a, b) {
		if (a.trackNum < b.trackNum) {
			return -1;
		}
		else if (a.trackNum > b.trackNum) {
			return 1;
		}
		else {
			return 0;
		}
	},

	// Sort playlist
	sortPlaylist = function(key, tracks, callback) {
		if(typeof(callback) === "undefined") {
			callback = function(status) {
				if (status.result) {
					R.Notifications.show('The playlist has been sorted successfully. Please reload it to view the changes.');
				}
				else {
					R.Notifications.show('You do not have permission to sort this playlist.');
				}
			};
		}
		R.Api.request({
			method:"setPlaylistOrder",
			content: {
				playlist:key,
				tracks:tracks
			},
			success: callback
		});
	},

	getKeysFromTracks = function(tracks) {
		var keys = [];
		for(var key in tracks) {
			keys.push(tracks[key].key);
		}
		return keys;
	},
	isInQueue = function(data, queue_type) {
		if (!player_model || !player_model.queue) {
			return false;
		}
		var m = player_model.queue.length;
		var key;
		if (data.key) {
			key = data.key;
		}
		else {
			key = "" + data.type + data.id;
		}
		while (m--) {
			if (player_model.queue[m].key == key) {
				if (!queue_type) {
					return true;
				}
				else {
					if (player_model.queue[m].type == queue_type && player_model.queue[m].secondary_id == data.secondary_id) {
						return true;
					}
				}
			}
		}
	};
}


console.log("Load Rdio Enhancer");
var script = document.createElement("script");
script.type = "text/javascript";
script.text = codeToString(injectedJs);
document.body.appendChild(script);
console.log("Done Load Rdio Enhancer");
