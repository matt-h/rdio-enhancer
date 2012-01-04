function codeToString(f) {
	args = [];
	for (var i = 1; i < arguments.length; ++i) {
		args.push(JSON.stringify(arguments[i]));
	}
	return "(" + f.toString() + ")(" + args.join(",") + ");";
}

function injectedJs() {
	jQuery.fn.origAutoSuspenders = jQuery.fn.autoSuspenders;
	jQuery.fn.autoSuspenders = function(data, item) {
		jQuery.fn.currentData = data;
		var result = jQuery.fn.origAutoSuspenders.call(this, data, item);
		delete jQuery.fn.currentData;
		return result;
	};
	jQuery.fn.origSuspenders = jQuery.fn.suspenders;
	jQuery.fn.suspenders = function (item) {
		if (item.menu_items) {
			if(jQuery.fn.currentData && jQuery.fn.currentData.key) {
				var data = jQuery.fn.currentData,
				datakey = data.key[0];
				// if this is an Album
				if(datakey === 'a') {
					item.menu_items.splice(3, 0,
					{
						title: "Add Album to Playlist",
						visible: function() {
							return true;
						},
						action: function() {
							var copy = jQuery.extend(true, {}, data);
							copy.key = data.trackKeys;
							R.Playlists.showAddToPlaylistDialog(copy);
							return false;
						}
					});
				}
				// if this is a Playlist
				else if(datakey === 'p') {
					if(data.tracks) {
						item.menu_items.splice(0, 0,
						{
							title: "Fork Playlist",
							visible: function() {
								return true;
							},
							action: function() {
								var copy = jQuery.extend(true, {}, data);
								copy.key = getKeysFromTracks( data.tracks );
								R.Playlists.showAddToPlaylistDialog(copy);
								return false;
							}
						},
						{
							type: "separator"
						},
						{
							title: "Sort Playlist by Artist",
							visible: function() {
								return true;
							},
							action: function() {
								sortPlaylist(data.key, getKeysFromTracks( data.tracks.sort(sortByArtist) ));
								return false;
							}
						},
						{
							title: "Sort Playlist by Album",
							visible: function() {
								return true;
							},
							action: function() {
								sortPlaylist(data.key, getKeysFromTracks( data.tracks.sort(sortByAlbum) ));
								return false;
							}
						},
						{
							title: "Sort Playlist by Track Name",
							visible: function() {
								return true;
							},
							action: function() {
								sortPlaylist(data.key, getKeysFromTracks( data.tracks.sort(sortByTrackName) ));
								return false;
							}
						},
						{
							type: "separator"
						});
					}
				}
				// This is something new
				else {
					//console.log("Data Dump");
					//console.log(this);
					//console.log(item);
					//console.log(data);
				}
			}
		}
		return jQuery.fn.origSuspenders.call(this, item);
	};
	jQuery.fn.suspenders.defaults = jQuery.fn.origSuspenders.defaults;
	R.Api.origRequest = R.Api.request;
	R.Api.request = function() {
		var args = arguments[0];
		//console.log("Request");
		//console.log(arguments);
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
		var artist_a = a.albumArtist.toLowerCase(),
		artist_b = b.albumArtist.toLowerCase();
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
	
	//
	sortPlaylist = function(key, tracks) {
		R.Api.request({
			method:"setPlaylistOrder",
			content: {
				playlist:key,
				tracks:tracks
			},
			success: function(status) {
				if (status.result) {
					R.Notifications.show('The playlist has been sorted successfully. Please reload it to view the changes.');
				}
				else {
					R.Notifications.show('You do not have permission to sort this playlist.');
				}
			}
		});
	},
	
	getKeysFromTracks = function(tracks) {
		var keys = [];
		for(key in tracks) {
			keys.push(tracks[key].key);
		}
		return keys;
	};
}

var script = document.createElement("script");
script.type = "text/javascript";
script.text = codeToString(injectedJs);
document.body.appendChild(script);
