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
	R.enhancer = {};

	R.Component.orig_create = R.Component.create;
	R.Component.create = function(a,b,c) {
		//console.log("Rdio Enhancer:")
		//console.log(a);

		if(a == "Dialog.EditPlaylistDialog") {
			// Overwrite the existing function since this supports playlists
			b.createPlaylist = function() {
				var a = this,
				b = this.$("input.title").val(),
				track_list = [];
				if (!b) {
					var d = t("You must give your new playlist a title.");
					a.$(".error_message").html(d).show();
					return;
				}
				if(this.model) {
					if(this.model.get("type") == "a" || this.model.get("type") == "al") {
						track_list = this.model.get("trackKeys");
					}
					else if(this.model.get("type") == "t") {
						track_list = [this.model.get("key")];
					}
					else if(this.model.get("type") == "p") {
						track_list = this.model.get("tracks").pluck("key");
					}
				}
				if(track_list.length == 0) {
					track_list = "";
				}
				var e = new R.Models.Playlist({
					name: b,
					description: this.$("textarea.description").val(),
					tracks: track_list
				});
				this.$("button").attr("disabled", !0),
				this.$("input.title").attr("disabled", !0),
				this.$("textarea.description").attr("disabled", !0);
				var f = this.$("input:radio[name=playlist_privacy]:checked").val() === "published",
				g = this.$("input:radio[name=playlist_collaboration]:checked").val();
				e.save(null, {
					success: function() {
						e.setCollaborationMode(g, function() {
							e.setPublished(f, function() {
								a.close();
							});
						});
					}
				});
			};
		}
		if(a == "TrackList") {

		}
		if(a == "ActionMenu") {
			b.orig_events = b.events;
			b.events = function() {
				var local_events = b.orig_events.call(this);
				local_events["click .sortpl"] = "onToggleSortMenu";
				local_events["click .enhancerextras"] = "onToggleExtrasMenu";
				return local_events;
			};
			b.onToggleSortMenu = function(a) {
				this.ToggleSortMenu(), R.Utils.stopEvent(a);
			};
			b.ToggleSortMenu = function() {
				if(this.sort_menu_showing) {
					this.HideSortMenu();
				}
				else {
					var off = this.$el.offset();
					var menu = R.enhancer.get_sort_menu();
					menu.css({top: off.top, left: (off.left + 430) + "px"}).show();
					jQuery(".enhancer_menu_click_shield").show();
					this.sort_menu_showing = true;
				}
			};
			b.HideSortMenu = function() {
				var menu = R.enhancer.get_sort_menu();
				menu.hide();
				this.sort_menu_showing = false;
				jQuery(".enhancer_menu_click_shield").hide();
			};
			b.onToggleExtrasMenu = function(a) {
				this.ToggleExtrasMenu(), R.Utils.stopEvent(a);
			};
			b.ToggleExtrasMenu = function() {
				if(this.extras_menu_showing) {
					this.HideExtrasMenu();
				}
				else {
					var off = this.$el.offset();
					var menu = R.enhancer.get_extras_menu();
					menu.css({top: off.top, left: (off.left + 530) + "px"}).show();
					jQuery(".enhancer_menu_click_shield").show();
					this.extras_menu_showing = true;
				}
			};
			b.HideExtrasMenu = function() {
				var menu = R.enhancer.get_extras_menu();
				menu.hide();
				this.extras_menu_showing = false;
				jQuery(".enhancer_menu_click_shield").hide();
			};
			b.sort_menu_showing = false;
			b.orig_onRendered = b.onRendered;
			b.onRendered = function() {
				b.orig_onRendered.call(this);
				R.enhancer.current_actionmenu = this;
			}
		}
		if(a == "PlaylistPage") {
			//console.log(b);
			b.orig_onRendered = b.onRendered;
			b.onRendered = function() {
				b.orig_onRendered.call(this);
				R.enhancer.current_playlist = this;
				this.$(".tracklist_toolbar .ActionMenu").append('<span class="sortpl button"><span class="text">Sort Playlist</span><span class="dropdown_arrow"></span></span>');
				this.$(".tracklist_toolbar .ActionMenu").append('<span class="enhancerextras button"><span class="text">Extras</span><span class="dropdown_arrow"></span></span>');
			}

		}

		return R.Component.orig_create.call(this, a,b,c);
	};

	R.enhancer.get_sort_menu = function() {
		var menu = jQuery(".enhancer_sort_menu");
		if(menu.length < 1) {
			menu = jQuery('<ul class="enhancer_sort_menu enhancer_menu"><li class="option" title="Sort by Artist">Sort by Artist</li><li class="divider"></li><li class="option" title="Sort by Album">Sort by Album</li><li class="divider"></li><li class="option" title="Sort by Song Name">Sort by Song Name</li></ul>').appendTo("body");
			menu.find(".option").click(function() {
				var action = $(this).attr("title");
				var tracks = R.enhancer.current_playlist.model.get("tracks").models;
				if(action == "Sort by Artist") {
					R.enhancer.current_playlist.model.set({"model": tracks.sort(sortByArtist)});
				}
				else if(action == "Sort by Album") {
					R.enhancer.current_playlist.model.set({"model": tracks.sort(sortByAlbum)});
				}
				else if(action == "Sort by Song Name") {
					R.enhancer.current_playlist.model.set({"model": tracks.sort(sortByTrackName)});
				}
				R.enhancer.current_playlist.model.setPlaylistOrder();
				R.enhancer.current_playlist.render();
				R.enhancer.current_actionmenu.HideSortMenu();
			});
		}
		R.enhancer.get_sheild();
		return menu;
	};

	R.enhancer.get_extras_menu = function() {
		var menu = jQuery(".enhancer_extras_menu");
		if(menu.length < 1) {
			menu = jQuery('<ul class="enhancer_extras_menu enhancer_menu"><li class="option" title="Remove Duplicates">Remove Duplicates</li><li class="divider"></li><li class="option" title="Fork Playlist">Fork Playlist</li></ul>').appendTo("body");
			menu.find(".option").click(function() {
				var action = $(this).attr("title");
				if(action == "Remove Duplicates") {
					var tracks = R.enhancer.current_playlist.model.get("tracks").models;
					var playlist_key = R.enhancer.current_playlist.model.get("key");
					// This is a bit hackish, but the API doesn't work well.
					// The removeFromPlaylist function is based more on the index and count than the tracklist
					// So order matters!!
					// First we sort the playlist to unique tracks first and then duplicate tracks last.
					// Then just chop off all the duplicate tracks.
					// This way we only need one call to removeFromPlaylist to remove all the duplicates.
					var unique_tracks = [];
					var duplicate_tracks = [];
					jQuery.each(tracks, function(index, value) {
						var track_key = value.get("key");
						if(jQuery.inArray(track_key, unique_tracks) === -1) {
							unique_tracks.push(track_key);
						}
						else {
							duplicate_tracks.push(track_key);
						}
					});
					if(duplicate_tracks.length > 0) {
						sortPlaylist(playlist_key, unique_tracks.concat(duplicate_tracks), function(status) {
							if (status.result) {
								R.Api.request({
									method: "removeFromPlaylist",
									content: {
										playlist: playlist_key,
										index: unique_tracks.length,
										count: duplicate_tracks.length,
										tracks: duplicate_tracks,
										extras: "-*, duration, Playlist.PUBLISHED"
									},
									success: function(success_data) {
										R.enhancer.current_playlist.render();
									}
								});
							}
						});
					}
				}
				else if(action == "Export to CSV") {
					// This almost works.. leaving disabled for now.
					var tracks = R.enhancer.current_playlist.model.get("tracks").models;
					var i = tracks.length;
					var csv = [["Name", "Artist", "Album", "Track Number"].join(",")];
					while(i--) {
						csv.push([
							'"' + tracks[i].get("name") + '"',
							'"' + tracks[i].get("artist") + '"',
							'"' + tracks[i].get("album") + '"',
							tracks[i].get("trackNum")
						].join(","));
					}
					var blob = new Blob([csv.join("\n")], { "type" : "text\/csv" });
					location.href = window.webkitURL.createObjectURL(blob);
					//window.open('data:text/csv;charset=utf8,' + encodeURIComponent(csv.join("\n")), "playlist_export.csv", "width=600, height=200");
				}
				else if(action == "Fork Playlist") {
					R.Loader.load(["Dialog.EditPlaylistDialog"], function() {
						var editor = new R.Components.Dialog.EditPlaylistDialog({
							model: R.enhancer.current_playlist.model,
							newPlaylist: true
						});
						editor.open()
					});
				}
				R.enhancer.current_actionmenu.HideExtrasMenu();
			});
		}
		R.enhancer.get_sheild();
		return menu;
	};
	R.enhancer.get_sheild = function() {
		var shield = jQuery(".enhancer_menu_click_shield");
		if(shield.length < 1) {
			shield = jQuery('<div class="enhancer_menu_click_shield"></div>').appendTo("body").click(function() {
				R.enhancer.current_actionmenu.HideSortMenu();
				R.enhancer.current_actionmenu.HideExtrasMenu();
			});
		}
		return shield;
	};

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
			artist_a = a.attributes.artist;
		}
		else {
			artist_a = a.attributes.albumArtist;
		}
		if(b.artist) {
			artist_b = b.attributes.artist;
		}
		else {
			artist_b = b.attributes.albumArtist;
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
		var album_a = a.attributes.album.toLowerCase(),
		album_b = b.attributes.album.toLowerCase();
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
		var trackname_a = a.attributes.name.toLowerCase(),
		trackname_b = b.attributes.name.toLowerCase();
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
		if (a.attributes.trackNum < b.attributes.trackNum) {
			return -1;
		}
		else if (a.attributes.trackNum > b.attributes.trackNum) {
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
					return true;
				}
				else {
					return false;
				}
			};
		}
		R.Api.request({
			method:"setPlaylistOrder",
			content: {
				playlist:key,
				tracks:tracks,
				extras: "-*, Playlist.PUBLISHED"
			},
			success: callback
		});
	},

	getKeysFromTracks = function(tracks) {
		var keys = [];
		for(var key in tracks) {
			keys.push(tracks[key].attributes.key);
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


var script = document.createElement("script");
script.type = "text/javascript";
script.text = codeToString(injectedJs);
document.body.appendChild(script);
