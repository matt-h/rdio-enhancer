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
	
	jQuery.fn.origAutoSuspenders = jQuery.fn.autoSuspenders;
	jQuery.fn.autoSuspenders = function(data, item) {
		//console.log("Auto Suspenders");
		//console.log(data);
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
				datatype = data.type;
				// if this is an Album
				if(datatype === 'a') {
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
					item.menu_items.splice(6, 0,
					{
						title: function() {
							return (isInQueue(data) ? '<span class="coming_up">In Queue</span>Play Next' : "Play Next");
						},
						visible: function() {
							return true;
						},
						action: function() {
							var player = getPlayer();
							var track = {
								type: data.type,
								key: data.key
							};
							player._queueSource(track);
							play_next_queue.push(track);
							R.Notifications.show(data.name + ' will play next');
							return false;
						}
					});
				}
				// if this is a Playlist
				else if(datatype === 'p') {
					if(data.tracks) {
						item.menu_items.splice(0, 0,
						{
							title: "Add to Collection",
							visible: function() {
								return true;
							},
							action: function() {
								R.Library.add(getKeysFromTracks( data.tracks ));
								R.Notifications.show('The playlist was added to your collection');
								return false;
							}
						},
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
						},
						{
							title: "Remove Duplicates",
							visible: function() {
								return true;
							},
							action: function() {
								// This is a bit hackish, but the API doesn't work well.
								// The removeFromPlaylist function is based more on the index and count than the tracklist
								// So order matters!!
								// First we sort the playlist to unique tracks first and then duplicate tracks last.
								// Then just chop off all the duplicate tracks.
								// This way we only need one call to removeFromPlaylist to remove all the duplicates.
								var tracks = getKeysFromTracks( data.tracks );
								var unique_tracks = [];
								var duplicate_tracks = [];
								jQuery.each(tracks, function(index, value) {
									if(jQuery.inArray(value, unique_tracks) === -1) {
										unique_tracks.push(value);
									}
									else {
										duplicate_tracks.push(value);
									}
								});

								if(duplicate_tracks.length > 0) {
									sortPlaylist(data.key, unique_tracks.concat(duplicate_tracks), function(status) {
										if (status.result) {
											R.Api.request({
												method: "removeFromPlaylist",
												content: {
													playlist: data.key,
													index: unique_tracks.length,
													count: duplicate_tracks.length,
													tracks: duplicate_tracks
												},
												success: function(success_data) {
													if (success_data.result) {
														R.Notifications.show('Duplicates have been removed from this playlist. Please reload it to view the changes.');
													}
													else {
														R.Notifications.show('You do not have permission to remove duplicates from this playlist.');
													}
												}
											});
										}
										else {
											R.Notifications.show('You do not have permission to remove duplicates from this playlist.');
										}
									});
								}
								else {
									R.Notifications.show('There are no duplicates to remove.');
								}
								return false;
							}
						},
						{
							type: "separator"
						});
					}
				}
				// if this is a Track
				else if(datatype === 't') {
					var this_track = this;
					item.menu_items.splice(0, 0,
					{
						title: "Move Track to Top",
						visible: function() {
							// Check if we're on a playlist
							return $(this_track).parents(".playlist_song_list").length > 0;
						},
						action: function() {
							var track = $(this).closest(".track_container");
							track.slideUp(function() {
								track.prependTo(R.Playlists.songList).slideDown();
								if (R.Playlists.updateOrder()) {
									R.Playlists.renumberTracks();
									R.Api.request({
										method: "setPlaylistOrder",
										content: {
											playlist: R.Playlists.playlist.key,
											tracks: R.Playlists.playlistOrder
										}
									});
								}
							});
							return false;
						}
					});
					item.menu_items.splice(6, 0,
					{
						title: function() {
							return (isInQueue(data) ? '<span class="coming_up">In Queue</span>Play Next' : "Play Next");
						},
						visible: function() {
							return true;
						},
						action: function() {
							var player = getPlayer();
							var track = {
								type: data.type,
								key: data.key
							};
							player._queueSource(track);
							play_next_queue.push(track);
							R.Notifications.show(data.name + ' will play next');
							return false;
						}
					});
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

	Bujagali.helpers.render_now_playing_header_orig = Bujagali.helpers.render_now_playing_header;
	Bujagali.helpers.render_now_playing_header = function() {
		var data = Bujagali.helpers.render_now_playing_header_orig.call(this, arguments);
		data = data.replace('"now_playing_header">', '"now_playing_header"><a class="add_queue_to_playlist" href="#">Add To Playlist</a>');
		return data;
	};

	Bujagali.helpers.render_station_header_orig = Bujagali.helpers.render_station_header;
	Bujagali.helpers.render_station_header = function() {
		var data = Bujagali.helpers.render_station_header_orig.call(this, arguments);
		data = data.replace('station_header">', 'station_header"><a class="add_station_to_playlist" href="#">Add To Playlist</a>');
		return data;
	};

	jQuery("body").delegate(".add_station_to_playlist", "click", function() {
		var tracks = [];
		jQuery(".source_station .track, .now_playing .track").each(function() {
			tracks.push($(this).attr("track_key"));
		});
		if(tracks.length > 0) {
			var data = {
				name: "Station",
				key: tracks,
				trackKeys: tracks,
				length: tracks.length
			};
			R.Playlists.showAddToPlaylistDialog(data);
		}
	});
	jQuery("body").delegate(".add_queue_to_playlist", "click", function() {
		var tracks = [];
		jQuery(".now_playing .tracks, .queue .tracks").each(function() {
			var source = $(this).attr("skey");
			if(source[0] === "t") {
				tracks.push(source);
			}
		});
		jQuery(".queue .track").each(function() {
			tracks.push($(this).attr("track_key"));
		});
		if(tracks.length > 0) {
			var data = {
				name: "Queue",
				key: tracks,
				trackKeys: tracks,
				length: tracks.length
			};
			R.Playlists.showAddToPlaylistDialog(data);
		}
	});


	var queueChanged_orig = queueChanged;
	queueChanged = function(queue) {
		if(play_next_queue.length > 0) {
			while(play_next_queue.length) {
				var track = play_next_queue.pop();
				var i = queue.length;
				while(i--) {
					if(queue[i].key === track.key) {
						getPlayer()._moveQueuedSource(i, 0);
						break;
					}
				}
			}
		}
		return queueChanged_orig(queue);
	};

}

var script = document.createElement("script");
script.type = "text/javascript";
script.text = codeToString(injectedJs);
document.body.appendChild(script);
