function codeToString(f) {
	var args = [];
	for (var i = 1; i < arguments.length; ++i) {
		args.push(JSON.stringify(arguments[i]));
	}
	return "(" + f.toString() + ")(" + args.join(",") + ");";
}

function injectedJs() {
	// Add a Fisher-Yates shuffle function to Array
	Array.prototype.shuffle = function () {
		var i = this.length, j, temp;
		if (i == 0) return;
		while (--i) {
			j = Math.floor(Math.random() * (i + 1));

			// Swap values
			temp = this[i];
			this[i] = this[j];
			this[j] = temp;
		}
	};

	// Used to store play next items
	var play_next_queue = [];
	R.enhancer = {};

	R.enhancer.dump = function(arr, level) {
		var dumped_text = "";
		if(!level) {
			level = 0;
		}
		if(level > 2) {
			return "too deep";
		}

		//The padding given at the beginning of the line.
		var level_padding = "";
		for(var j=0;j<level+1;j++) {
			level_padding += "    ";
		}

		if(typeof(arr) == 'object') { //Array/Hashes/Objects
			for(var item in arr) {
				var value = arr[item];

				if(typeof(value) == 'object') { //If it is an array,
					dumped_text += level_padding + "'" + item + "' ...\n";
					dumped_text += R.enhancer.dump(value,level+1);
				}
				else {
					dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
				}
			}
		}
		else { //Stings/Chars/Numbers etc.
			dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
		}
		return dumped_text;
	};
	R.enhancer.log = function(item) {
		console.log(R.enhancer.dump(item));
	};

	// Overwrite the playlist add function to support adding playlists to playlists
	// From core.rdio.js line 7098
	R.Models.Playlist.prototype.add = function(model) {
		var model_type = model.get("type");
		var playlist_this = this;
		if (model_type == "a" || model_type == "al" || model_type == "t" || model_type == "p") {
			var track_list = [];
			if(model_type == "a" || model_type == "al") {
				track_list = model.get("trackKeys");
			}
			else if(model_type == "t") {
				track_list = [model.get("key")];
			}
			else if(model_type == "p") {
				var models = model.get("tracks").models;
				for(var x = 0; x < models.length; x++) {
					track_list.push(models[x].attributes.source.attributes.key);
				}
			}

			if(playlist_this.has("tracks")) {
				playlist_this.get("tracks").addSource(model);
			}
			var d = {
				method: "addToPlaylist",
				content: {
					playlist: playlist_this.get("key"),
					tracks: track_list,
					extras: ["-*, duration, Playlist.PUBLISHED"]
				},
				success: function(a) {
					R.enhancer.show_message('Added "' + model.get("name") + '" to Playlist "' + playlist_this.get("name") + '"');
					a.result && playlist_this.set(a.result);
					a[0] && a[0].result && playlist_this.set(a[0].result);
				}
			};
			playlist_this._requestQueue.push(d);
		}
	};

	R.Component.orig_create = R.Component.create;
	R.Component.create = function(a,b,c) {
		//R.enhancer.log("Rdio Enhancer:")
		//R.enhancer.log(a);

		if(a == "Dialog.EditPlaylistDialog.Rdio") {
			b._getAttributes = function() {
				var parent_get_attributes = R.Components.Dialog.EditPlaylistDialog.Rdio.callSuper(this, "_getAttributes");
				if (this.model.isNew()) {
					var track_list = [],
						source_model = this.options.sourceModel;
					if (source_model) {
						var model_type = source_model.get("type");
						if(model_type == "a" || model_type == "al") {
							track_list = source_model.get("trackKeys");
						}
						else if(model_type == "t") {
							track_list = [source_model.get("key")];
						}
						else if(model_type == "p") {
							var models = source_model.get("tracks").models;
							for(var x = 0; x < models.length; x++) {
								track_list.push(models[x].attributes.source.attributes.key);
							}
						}
					}
					parent_get_attributes.tracks = track_list;
				}
				return parent_get_attributes;
			}
		}
		if(a == "Dialog.EditPlaylistDialog") {
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

			// Re-enable add to playlist for playlists
			// I think the only reason this wasn't enabled for playlists was because
			// it wasn't implemented for Dialog.EditPlaylistDialog
			// My modification to Dialog.EditPlaylistDialog allows it.
			b.addToPlaylistItemVisible = function() {
				return true;
			};

			// Inject Sort menu functions
			b.onToggleSortMenu = function(a) {
				this.ToggleSortMenu(), R.Utils.stopEvent(a);
			};
			b.ToggleSortMenu = function(a) {
				this.enhancer_sort_menu || (this.checkIsInQueue(), this.enhancer_sort_menu = this.addChild(new
				R.Components.Menu({
					positionOverEl: this.$el.find(".sortpl"),
					defaultContext: this,
					alignFirstItem: true,
					model: new Backbone.Collection(this.getSortMenuOptions())
				})), this.listen(this.enhancer_sort_menu, "open", this.onSortMenuOpened));
				this.enhancer_sort_menu.toggle(a);
			};
			b.getSortMenuOptions = function() {
				return [{
						label: "Sort by Artist",
						value: "sortbyartist",
						callback: this.sortPlaylistbyArtist,
						visible: true
					}, {
						label: "Sort by Album",
						value: "sortbyalbum",
						callback: this.sortPlaylistbyAlbum,
						visible: true
					}, {
						label: "Sort by Song Name",
						value: "sortbysong",
						callback: this.sortPlaylistbySong,
						visible: true
					}, {
						label: "Randomize",
						value: "randomize",
						callback: this.sortPlaylistRandom,
						visible: true
					}];
			};
			b.sortPlaylistbyArtist = function() {
				R.enhancer.show_message("Sorted Playlist by Artist");
				var tracks = R.enhancer.current_playlist.model.get("tracks").models;
				R.enhancer.current_playlist.model.set({"model": tracks.sort(R.enhancer.sortByArtist)});
				R.enhancer.current_playlist.model.setPlaylistOrder();
				R.enhancer.current_playlist.render();
			};
			b.sortPlaylistbyAlbum = function() {
				R.enhancer.show_message("Sorted Playlist by Album");
				var tracks = R.enhancer.current_playlist.model.get("tracks").models;
				R.enhancer.current_playlist.model.set({"model": tracks.sort(R.enhancer.sortByAlbum)});
				R.enhancer.current_playlist.model.setPlaylistOrder();
				R.enhancer.current_playlist.render();
			};
			b.sortPlaylistbySong = function() {
				R.enhancer.show_message("Sorted Playlist by Song Name");
				var tracks = R.enhancer.current_playlist.model.get("tracks").models;
				R.enhancer.current_playlist.model.set({"model": tracks.sort(R.enhancer.sortByTrackName)});
				R.enhancer.current_playlist.model.setPlaylistOrder();
				R.enhancer.current_playlist.render();
			};
			b.sortPlaylistRandom = function() {
				R.enhancer.show_message("Randomized Playlist")
				var tracks = R.enhancer.current_playlist.model.get("tracks").models;
				R.enhancer.current_playlist.model.set({"model": tracks.shuffle()});
				R.enhancer.current_playlist.model.setPlaylistOrder();
				R.enhancer.current_playlist.render();
			};
			// End Sort menu functions

			// Inject Extras menu functions
			b.onToggleExtrasMenu = function(a) {
				this.ToggleExtrasMenu(), R.Utils.stopEvent(a);
			};
			b.ToggleExtrasMenu = function() {
				this.enhancer_extras_menu || (this.checkIsInQueue(), this.enhancer_extras_menu = this.addChild(new
				R.Components.Menu({
					positionOverEl: this.$el.find(".enhancerextras"),
					defaultContext: this,
					alignFirstItem: true,
					model: new Backbone.Collection(this.getExtraMenuOptions())
				})), this.listen(this.enhancer_extras_menu, "open", this.onExtrasMenuOpened));
				this.enhancer_extras_menu.toggle(a);
			};
			b.getExtraMenuOptions = function() {
				return [{
						label: "Remove Duplicates",
						value: "removeduplicates",
						callback: this.removeDuplicates,
						visible: true
					}, {
						label: "Export to CSV",
						value: "exporttocsv",
						callback: this.exportToCSV,
						visible: false // not visible until this feature works properly
					}, {
						label: "Fork Playlist",
						value: "forkplaylist",
						callback: this.forkPlaylist,
						visible: true
					}, {
						label: "About Rdio Enhancer",
						value: "aboutrdioenhancer",
						callback: this.aboutRdioEnhancer,
						visible: true
					}];
			};
			b.removeDuplicates = function() {
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
					var track_key = value.attributes.source.attributes.key;
					if(jQuery.inArray(track_key, unique_tracks) === -1) {
						unique_tracks.push(track_key);
					}
					else {
						duplicate_tracks.push(track_key);
					}
				});
				if(duplicate_tracks.length > 0) {
					R.enhancer.show_message('Removing Duplicates from "' + R.enhancer.current_playlist.model.get("name") + '"');
					R.enhancer.sortPlaylist(playlist_key, unique_tracks.concat(duplicate_tracks), function(status) {
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
				else {
					R.enhancer.show_message('There are no duplicates to remove "' + R.enhancer.current_playlist.model.get("name") + '"');
				}
			};
			b.exportToCSV = function() {
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
			};
			b.forkPlaylist = function() {
				R.loader.load(["Dialog.EditPlaylistDialog.Rdio"], function() {
					var editor =new R.Components.Dialog.EditPlaylistDialog.Rdio({
						sourceModel: R.enhancer.current_playlist.model,
						isNew: true
					});
					editor.open()
				});
			};
			b.aboutRdioEnhancer = function() {
				R.loader.load(["Dialog"], function() {
					var about_enhancer = new R.Components.Dialog({
						title: "About Rdio Enhancer"
					});
					about_enhancer.onOpen = function() {
						this.$(".body").html('<p>Enhancement features brought to you by <a href="https://chrome.google.com/webstore/detail/hmaalfaappddkggilhahaebfhdmmmngf" target="_blank">Rdio Enhancer</a></p><p>Get the code or browse the code at <a href="https://github.com/matt-h/rdio-enhancer" target="_blank">https://github.com/matt-h/rdio-enhancer</a></p><p>If you like this extension, <a href="https://chrome.google.com/webstore/detail/hmaalfaappddkggilhahaebfhdmmmngf" target="_blank">please rate it here</a></p>');
					};
					about_enhancer.open()
				});
			};
			// End Extras menu functions

			b.orig_onRendered = b.onRendered;
			b.onRendered = function() {
				b.orig_onRendered.call(this);
			};
		}
		if(a == "PlaylistPage") {
			//console.log(b);
			b.orig_onRendered = b.onRendered;
			b.onRendered = function() {
				b.orig_onRendered.call(this);
				// R.enhancer.log(this.model);
				R.enhancer.current_playlist = this;
				this.$(".tracklist_toolbar .ActionMenu").append('<span class="sortpl button"><span class="text">Sort Playlist</span><span class="dropdown_arrow"></span></span>');
				this.$(".tracklist_toolbar .ActionMenu").append('<span class="enhancerextras button"><span class="text">Extras</span><span class="dropdown_arrow"></span></span>');
			}

		}

		return R.Component.orig_create.call(this, a,b,c);
	};

	R.enhancer.get_messages = function() {
		var messages = jQuery(".enhancer_messages");
		if(messages.length < 1) {
			messages = jQuery('<div class="enhancer_messages"></div>').appendTo("body");
			messages.on("click", ".enhancer_message_box", function(event) {
				$(this).fadeOut("slow", function() {
					$(this).remove();
				});
			});
		}
		return messages;
	};
	R.enhancer.show_message = function(msg_txt) {
		var messages = R.enhancer.get_messages();
		jQuery('<div class="enhancer_message_box">' + msg_txt + '</div>').appendTo(messages).fadeIn("slow").delay(10000).fadeOut("slow", function() {
			$(this).remove();
		});;
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
			// R.enhancer.log(args.content);
			if (tracks.length == 1 && tracks[0] instanceof Array) {
				args.content.tracks = args.content.tracks[0];
				return R.Api.request(args);
			}
		}
		return R.Api.origRequest.apply(this, arguments);
	};

	// Sort functions
	R.enhancer.sortByArtist = function(a, b) {
		var artist_a,
		artist_b;
		if(a.attributes.source.attributes.artist) {
			artist_a = a.attributes.source.attributes.artist;
		}
		else {
			artist_a = a.attributes.source.attributes.albumArtist;
		}
		if(b.attributes.source.attributes.artist) {
			artist_b = b.attributes.source.attributes.artist;
		}
		else {
			artist_b = b.attributes.source.attributes.albumArtist;
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
			return R.enhancer.sortByAlbum(a, b);
		}
	};
	R.enhancer.sortByAlbum = function(a, b) {
		var album_a = a.attributes.source.attributes.album.toLowerCase(),
		album_b = b.attributes.source.attributes.album.toLowerCase();
		if (album_a < album_b) {
			return -1;
		}
		else if (album_a > album_b) {
			return 1;
		}
		else {
			return R.enhancer.sortByTrackNum(a, b);
		}
	};
	R.enhancer.sortByTrackName = function(a, b) {
		var trackname_a = a.attributes.source.attributes.name.toLowerCase(),
		trackname_b = b.attributes.source.attributes.name.toLowerCase();
		if (trackname_a < trackname_b) {
			return -1;
		}
		else if (trackname_a > trackname_b) {
			return 1;
		}
		else {
			return R.enhancer.sortByTrackNum(a, b);
		}
	};
	R.enhancer.sortByTrackNum = function(a, b) {
		if (a.attributes.source.attributes.trackNum < b.attributes.source.attributes.trackNum) {
			return -1;
		}
		else if (a.attributes.source.attributes.trackNum > b.attributes.source.attributes.trackNum) {
			return 1;
		}
		else {
			return 0;
		}
	};

	// Sort playlist
	R.enhancer.sortPlaylist = function(key, tracks, callback) {
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
	};

	R.enhancer.getKeysFromTracks = function(tracks) {
		var keys = [];
		for(var key in tracks) {
			keys.push(tracks[key].attributes.key);
		}
		return keys;
	};
	R.enhancer.isInQueue = function(data, queue_type) {
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
