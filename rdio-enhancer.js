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

	// Build the Rdio Enhancer Class
	R.enhancer = {
		log: function(item) {
			console.debug("==============================================");
			console.debug(item);
		},

		copyText: function copyText(text) {
				var textField = document.createElement('textarea');
				textField.innerText = text;
				document.body.appendChild(textField);
				textField.select();
				document.execCommand('copy');
				textField.remove();
		},

		overwrite_playlist: function() {
			if(!R.Models || !R.Models.Playlist) {
				window.setTimeout(R.enhancer.overwrite_playlist, 100);
				return;
			}
			// Overwrite the playlist add function to support adding playlists to playlists
			// From core.rdio.js line 8056
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
						R.enhancer.getModels(
							function(tracks) {
								for(var x = 0; x < tracks.length; x++) {
									track_list.push(tracks[x].attributes.source.attributes.key);
								}

								// This is redundant, but it works
								if(playlist_this.has("tracks")) {
									playlist_this.get("tracks").addSource(model);
								}
								var d = {
									method: "addToPlaylist",
									content: {
										playlist: playlist_this.get("key"),
										tracks: track_list,
										extras: ["-*", "duration", "Playlist.PUBLISHED"]
									},
									success: function(a) {
										R.enhancer.show_message('Added "' + model.get("name") + '" to Playlist "' + playlist_this.get("name") + '"');
										a.result && playlist_this.set(a.result);
										a[0] && a[0].result && playlist_this.set(a[0].result);
									}
								};
								playlist_this._requestQueue.push(d);
							},
							model.get("tracks"),
							'Fetching Playlist data... Please wait. If your Playlist is large this can take awhile.',
							'There was an error getting the Playlist data, if you have a large Playlist try scrolling down to load more first and then try the action again.'
						);
						// The function continues in the callback, so return here
						return;
					}

					if(playlist_this.has("tracks")) {
						playlist_this.get("tracks").addSource(model);
					}
					var d = {
						method: "addToPlaylist",
						content: {
							playlist: playlist_this.get("key"),
							tracks: track_list,
							extras: ["-*", "duration", "Playlist.PUBLISHED"]
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
		},

		overwrite_create: function() {
			if(R.Component && R.Component.orig_create) {
				// Safety check so this can't be called twice.
				return;
			}

			if (R.Mixins && R.Mixins.artistShareMenu) {
				R.Mixins.artistShareMenu.getShareSubOptions = function() {
					return [
						{
							label: t('Copy link'),
							context: this,
							callback: function() { R.enhancer.copyText(this.model.get('shortUrl')); },
							extraClassNames: 'share copy_link',
							value: 'copy_link'
						},
						{
							label: t('Share options'),
							context: this,
							callback: function() { this._shareButtonMenu.destroy(); this._doShare(); },
							extraClassNames: 'share',
							value: null
						}
					];
				}
			}

			if(!R.Component || !R.Component.create) {
				window.setTimeout(R.enhancer.overwrite_create, 100);
				return;
			}

			R.Component.orig_create = R.Component.create;
			R.Component.create = function(a,b,c) {
				//R.enhancer.log("Rdio Enhancer:")
				//R.enhancer.log(a);

				if(a == "App.Header") {
					// Add new event
					b.orig_events = b.events;
					b.events = function() {
						var local_events = b.orig_events.call(this);
						local_events["click .enhancer_master_menu"] = "onEnhancerMenuButtonClicked";
						return local_events;
					};

					// Inject Enhancer menu functions
					b.onEnhancerMenuButtonClicked = function(event) {
						this.enhancerMenu.open();
						R.Utils.stopEvent(event);
					};

					b.onEnhancerMenuOptionSelected = function(linkvalue, something) {
						linkvalue && (something ? window.open(linkvalue, "_blank") : R.router.navigate(linkvalue, true));
					};

					b.getEnhancerMenuOptions = new Backbone.Collection([
						{
							label: "Rdio Enhancer Settings",
							value: "",
							callback: R.enhancer.settings_dialog,
							visible: true
						},
						{
							label: "About Rdio Enhancer",
							value: "",
							callback: R.enhancer.about_dialog,
							visible: true
						}
					]);


					b.orig_onRendered = b.onRendered;
					b.onRendered = function() {
						b.orig_onRendered.call(this);
						this.$(".right_container .user_nav").append('<span class="user_nav_button enhancer_master_menu"></span>');
						var enhancer_menu_ele = this.$(".enhancer_master_menu");
						this.enhancerMenu = this.addChild(new R.Components.Menu({
							positionOverEl: enhancer_menu_ele,
							positionUnder: true,
							model: this.getEnhancerMenuOptions
						}));
						this.listen(this.enhancerMenu, "optionSelected", this.onEnhancerMenuOptionSelected);
					};
				}

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
									if(models.length > 0) {
										track_list = [];
									}
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
					b.orig_getMenuOptions = b.getMenuOptions;
					b.getMenuOptions = function() {
						var menuOptions = b.orig_getMenuOptions.call(this);

						menuOptions.push({
							label: "Sort Playlist",
							value: new Backbone.Collection(this.getSortMenuOptions()),
							visible: this.playlistFeaturesVisible
						});
						menuOptions.push({
							label: "Extras",
							value: new Backbone.Collection(this.getExtraMenuOptions()),
							visible: this.playlistFeaturesVisible
						});

						var tags = [];
						_.each(R.enhancer.getTagsForAlbum(this.model.get("albumKey")), _.bind(function(tag) {
							tags.push({
								label: tag,
								value: tag,
								maxWidth: 150,
								context: a,
								useTitle: true,
								hasDelete: true,
								deleteTooltip: "Remove from tags",
								callback: _.bind(this.onRemoveFromTags, this, tag)
							});
						}, this));

						tags = new Backbone.Collection(tags);

						menuOptions.push({
							label: "Tags",
							visible: this.manageTagsVisible,
							value: new Backbone.Collection([{
													embed: true,
													value: tags,
													visible: tags.length > 0
												}, {
													visible: tags.length > 0
												}, {
													label: t("Add Tags..."),
													value: "manageTags",
													callback: _.bind(this.onManageTags, this)
												}])

						});

						return menuOptions;
					};

					b.onRemoveFromTags = function(tagToRemove) {
						R.enhancer.removeTag(tagToRemove, this.model.get("albumKey"));
						this.menuDirty = true;
					};

					b.onManageTags = function(model) {
						var that = this;

						R.loader.load(["Dialog.FormDialog"], function() {
							var dialog = new R.Components.Dialog.FormDialog({
								title: "Add Tags"
							});

							dialog.onOpen = function() {
								// Form with only a textarea allowing the user to enter tags (each separated by a comma)
								this.$(".body").html('<ul class="form_list"><li class="form_row no_line"><div class="label">Tags :<br/>(comma separated)</div><div class="field"><textarea style="height:72px;" class="tags" name="tags"></textarea></div></li></ul>');
								this.$(".body .tags").val(R.enhancer.getTagsForAlbum(that.model.get("albumKey")));
								this.$(".footer .blue").removeAttr("disabled");

								// Save the tags when the user click on confirm
								this.$(".footer .blue").on("click", _.bind(function() {
									var tags = _.map(this.$(".body .tags").val().trim().split(","), function(tag) { return tag.trim(); });

									// Compare with previously set tags - might need to remove some
									var previousTags = R.enhancer.getTagsForAlbum(that.model.get("albumKey"));

									_.each(_.difference(previousTags, tags), function(removedTag) {
										R.enhancer.removeTag(removedTag, that.model.get("albumKey"));
									});

									R.enhancer.setTags(tags, that.model.get("albumKey"));
									that.menuDirty = true;
									this.close();
								}, this));
							};
							dialog.open()
						});
					};

					b.addToPlaylistItemVisible_orig = b.addToPlaylistItemVisible;
					b.addToPlaylistItemVisible = function() {
						return b.addToPlaylistItemVisible_orig.call(this) || this.playlistFeaturesVisible();
					};

					b.playlistFeaturesVisible = function() {
						return this.model instanceof R.Models.Playlist;
					};

					b.manageTagsVisible = function() {
						return this.model.get("type") === "al";
					};


					// Inject Sort menu functions
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
								label: "Sort by Release Date",
								value: "sortbyreleasedateasc",
								callback: this.sortPlaylistbyReleaseDate,
								visible: true
							}, {
								label: "Sort by Play Count",
								value: "sortbyplaycount",
								callback: this.sortPlaylistbyPlayCount,
								visible: true
							}, {
								label: "Reverse",
								value: "reverse",
								callback: this.sortPlaylistReverse,
								visible: true
							}, {
								label: "Randomize",
								value: "randomize",
								callback: this.sortPlaylistRandom,
								visible: true
							}];
					};
					b.sortPlaylistbyArtist = function() {
						R.enhancer.getTracks(function(tracks) {
							R.enhancer.show_message("Sorted Playlist by Artist");
							R.enhancer.current_playlist.model.setPlaylistOrder(R.enhancer.getKeys(tracks.sort(R.enhancer.sortByArtist)));
							R.enhancer.current_playlist.render();
						});
					};
					b.sortPlaylistbyAlbum = function() {
						R.enhancer.getTracks(function(tracks) {
							R.enhancer.show_message("Sorted Playlist by Album");
							R.enhancer.current_playlist.model.setPlaylistOrder(R.enhancer.getKeys(tracks.sort(R.enhancer.sortByAlbum)));
							R.enhancer.current_playlist.render();
						});
					};
					b.sortPlaylistbySong = function() {
						R.enhancer.getTracks(function(tracks) {
							R.enhancer.show_message("Sorted Playlist by Song Name");
							R.enhancer.current_playlist.model.setPlaylistOrder(R.enhancer.getKeys(tracks.sort(R.enhancer.sortByTrackName)));
							R.enhancer.current_playlist.render();
						});
					};

					b.sortPlaylistbyReleaseDate = function() {
						R.enhancer.getTracks(function(tracks) {
							var album_keys = [];
							var results = {};
							jQuery.each(tracks, function(index, value) {
								var album_key = value.attributes.source.attributes.albumKey;
								if(album_keys.indexOf(album_key) === -1) {
									album_keys.push(album_key);
								}
							});
							R.Api.request({
								method: "get",
								content: {
									keys: album_keys,
									extras: ["-*", "releaseDate"]
								},
								success: function(success_data) {
									results = success_data;
									jQuery.each(tracks, function(index, track) {
										if (success_data.result[track.attributes.source.attributes.albumKey].releaseDate) {
											track.attributes.source.attributes.releaseDate = results.result[track.attributes.source.attributes.albumKey].releaseDate;
										}
									});
									R.enhancer.show_message("Sorted Playlist by Release Date" );
									R.enhancer.current_playlist.model.setPlaylistOrder(R.enhancer.getKeys(tracks.sort(R.enhancer.sortByReleaseDate)));
									R.enhancer.current_playlist.render();
								}
							});
						});
					};

					b.sortPlaylistbyPlayCount = function() {
						R.enhancer.getTracks(function(tracks) {
							var results = {};
							R.Api.request({
								method: "get",
								content: {
									keys: R.enhancer.getKeys(tracks),
									extras: ["-*", "playCount"]
								},
								success: function(success_data) {
									results = success_data;
									jQuery.each(tracks, function(index, track) {
										if (success_data.result[track.attributes.source.attributes.key].playCount) {
											track.attributes.source.attributes.playCount = results.result[track.attributes.source.attributes.key].playCount;
										}
									});
									R.enhancer.show_message("Sorted Playlist by Play Count" );
									R.enhancer.current_playlist.model.setPlaylistOrder(R.enhancer.getKeys(tracks.sort(R.enhancer.sortByPlayCount)));
									R.enhancer.current_playlist.render();
								}
							});
						});
					};

					b.sortPlaylistReverse = function() {
						R.enhancer.getTracks(function(tracks) {
							R.enhancer.show_message("Reversed Playlist")
							R.enhancer.current_playlist.model.setPlaylistOrder(R.enhancer.getKeys(tracks.reverse()));
							R.enhancer.current_playlist.render();
						});
					}

					b.sortPlaylistRandom = function() {
						R.enhancer.getTracks(function(tracks) {
							R.enhancer.show_message("Randomized Playlist")
							R.enhancer.current_playlist.model.setPlaylistOrder(R.enhancer.getKeys(R.enhancer.shuffle(tracks)));
							R.enhancer.current_playlist.render();
						});
					};
					// End Sort menu functions

					// Inject Extras menu functions
					b.getExtraMenuOptions = function() {
						var submenu = [{
								label: "Export to CSV",
								value: "exporttocsv",
								callback: this.exportToCSV,
								visible: true
							}, {
								label: "Fork Playlist",
								value: "forkplaylist",
								callback: this.forkPlaylist,
								visible: true
							}, {
								label: "About Rdio Enhancer",
								value: "aboutrdioenhancer",
								callback: R.enhancer.about_dialog,
								visible: true
							}
						];

						if (this.model.canEdit !== undefined && this.model.canEdit()) {
							submenu.unshift ({
								label: "Remove Duplicates",
								value: "removeduplicates",
								callback: this.removeDuplicates,
								visible: true
							});
						}
						return submenu;
					};
					b.removeDuplicates = function() {
						R.enhancer.getTracks(function(tracks) {
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
												extras: ["-*", "duration", "Playlist.PUBLISHED"]
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
						});
					};

					b.exportToCSV = function() {
						R.enhancer.getTracks(function(tracks) {
							var csv = [["Name", "Artist", "Album", "Track Number"].join(",")];
							var keys = ["name", "artist", "album", "trackNum"];
							jQuery.each(tracks, function(index, track) {
								var values = [];
								jQuery.each(keys, function(index, key) {
									values.push(track.attributes.source.attributes[key]);
								});

								csv.push('"' + values.join('","') + '"');
							});

							var pom = document.createElement('a');
							pom.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv.join("\n")));
							pom.setAttribute('download', R.enhancer.current_playlist.model.get("name") + '.csv');
							pom.click();
						});
					};
					b.forkPlaylist = function() {
						R.enhancer.getTracks(function(tracks) {
							R.loader.load(["Dialog.EditPlaylistDialog.Rdio"], function() {
								var editor = new R.Components.Dialog.EditPlaylistDialog.Rdio({
									sourceModel: R.enhancer.current_playlist.model,
									isNew: true
								});
								editor.open()
							});
						});
					};
				}

				if(a == "Catalog2014.Playlist") {
					//R.enhancer.log(b);
					b.orig_onRendered = b.onRendered;
					b.onRendered = function() {
						b.orig_onRendered.call(this);
						//R.enhancer.log(this.model);
						R.enhancer.current_playlist = this;
					}

				}

				if(a == "Profile.Favorites") {
					b.orig_onRendered = b.onRendered;
					b.onRendered = function() {
						b.orig_onRendered.call(this);

						this.$(".section_header").append('<button type="button" class="button exportToCSV with_text">Export to CSV</button>');
						this.$(".header").append('<span class="filter_container"><div class="TextInput filter"><input class="tags_filter unstyled" placeholder="Filter By Tag" name="" type="text" value=""></div></span>');
						this.$(".exportToCSV").on("click", function(e) {
							R.enhancer.getFavoriteTracks(function(tracks) {
								var csv = [["Name", "Artist", "Album", "Track Number"].join(",")];
								var keys = ["name", "artist", "album", "trackNum"];
								jQuery.each(tracks, function(index, track) {
									var values = [];
									jQuery.each(keys, function(index, key) {
										values.push(track[key]);
									});

									csv.push('"' + values.join('","') + '"');
								});

								var pom = document.createElement('a');
								pom.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv.join("\n")));
								pom.setAttribute('download', 'collection.csv');
								pom.click();
							});
						});
						this.$(".tags_filter").on("keyup", _.bind(function() {
							var value = this.$(".tags_filter").val().trim();
							var albums = R.enhancer.getAlbumsForTag(value);

							if (albums.length > 0) {
								R.enhancer.collection.collectionModel.reset();
								R.enhancer.collection.collectionModel.on("loaded", function() {
									R.enhancer.collection.collectionModel.off("loaded");
									R.enhancer.collection.collectionModel.manualFiltered = true;
									R.enhancer.collection.collectionModel.reset(R.enhancer.collection.collectionModel.filter(function(model) { return _.contains(albums, model.get("albumKey")); }));
								});
								R.enhancer.collection.collectionModel.get({start:R.enhancer.collection.collectionModel.models.length, count:R.enhancer.collection.collectionModel._limit});
							} else if (R.enhancer.collection.collectionModel.manualFiltered) {
								R.enhancer.collection.collectionModel.manualFiltered = false;
								R.enhancer.collection.collectionModel.reset();
							}
						}, this));
					}
				}

				if(a == "Menu") {
					b.orig_onRendered = b.onRendered;
					b.onRendered = function() {
						b.orig_onRendered.call(this);
						var menu = this;

						if(menu.$('li:first-child').text().trim() == 'Name') {

							// private scope for this menu component
							(function() {

								var item = $('<li class="option truncated_line">Unavailable Albums</li>'),
									spinner = new R.Components.Spinner();
									template = _.template(''
										+ '<div class="album">'
										+ '<div class="album_name"><a href="<%= albumUrl %>"><%= name %></a></div>'
										+ '<div class="album_artist"><a href="<%= artistUrl %>"><%= artist %></a></div>'
										+ '<div class="badge colored">Unavailable</div>'
										+ '</div>'
									);

								menu.$('ul').append(item);
								item.on('click', function(event) {

									R.loader.load(["Dialog"], function() {

										var dialog = new R.Components.Dialog({
											title: 'Unavailable Albums',
											width: 550,
											extraClassName: 'unavailable_dialog',
											closeButton: 'Close'
										});

										dialog.onOpen = function() {

											if(R.enhancer.cache['unavailable_albums']) {
												dialog.onLoaded(R.enhancer.cache['unavailable_albums']);
											} else {
												this.$('.body .container').append(spinner.el);
												spinner.spin();
												R.enhancer.getUnavilableAlbums(function(results) {
													// caching results of this call as it's unlikely that:
													// 1) someone will add an unavailable album to their favorites
													// 2) a previously saved album will change to unavailable during their session
													R.enhancer.cache['unavailable_albums'] = results;
													dialog.onLoaded(results);
												});
											}
										};

										dialog.onLoaded = function(data) {
											var albums = [];
											for(var i = 0, length = data.length, album; i < length; i++) {
												// console.debug(data[i]);
												albums.push(template(data[i]));
											}
											spinner.stop();
											this.$('.body .container').html('<ul>' + albums.join('') + '</ul>');
											this.onResize();
										};

										menu.close();
										dialog.open();
									});
								});

							})();
						}
					}
				}

				if(a == "InfiniteScroll") {
					b.orig_ensureItemsLoaded = b.ensureItemsLoaded;
					b.ensureItemsLoaded = function() {
						// When manually filtered (by tagging system)
						// stop the component from reloading all albums
						if (this.model.manualFiltered) {
							return;
						}
						b.orig_ensureItemsLoaded.call(this);
					}
				}

				return R.Component.orig_create.call(this, a,b,c);
			};
		},

		get_setting: function(setting_name) {
			if(window.localStorage["/enhancer/settings/" + setting_name]) {
				return window.localStorage["/enhancer/settings/" + setting_name];
			}
			return false;
		},
		set_setting: function(setting_name, value) {
			window.localStorage["/enhancer/settings/" + setting_name] = value;
		},

		settings_dialog: function() {
			R.loader.load(["Dialog"], function() {
				var enhancer_settings_dialog = new R.Components.Dialog({
					title: "Rdio Enhancer Settings",
					buttons: new Backbone.Model({
						label: "Save",
						className: "blue",
						context: this,
						callback: function() {
							switch(enhancer_settings_dialog.$("input[name=enhancer_notifications]:checked").val()) {
								case "chrome":
									R.enhancer.set_setting("notifications", "chrome");
								break;
								case "none":
									R.enhancer.set_setting("notifications", "none");
								break;
								case "html":
								default:
									R.enhancer.set_setting("notifications", "html");
								break;
							}
							enhancer_settings_dialog.close();
						}
					}),
					closeButton: "Cancel"
				});
				enhancer_settings_dialog.onOpen = function() {
					this.$(".body").addClass("Dialog_FormDialog");
					this.$(".body .container").append($("#enhancer_settings_form").clone());
					// Notification settings
					var notification_setting = R.enhancer.get_setting("notifications");
					if(notification_setting === false) {
						notification_setting = "html";
					}
					this.$(".body #enhancer_notifications_" + notification_setting).prop('checked',true);
				};
				enhancer_settings_dialog.open()
			});
		},

		about_dialog: function() {
			R.loader.load(["Dialog"], function() {
				var about_enhancer = new R.Components.Dialog({
					title: "About Rdio Enhancer"
				});
				about_enhancer.onOpen = function() {
					this.$(".body").html('<p>Enhancement features brought to you by <a href="https://chrome.google.com/webstore/detail/hmaalfaappddkggilhahaebfhdmmmngf" target="_blank">Rdio Enhancer</a></p><p>Get the code or browse the code at <a href="https://github.com/matt-h/rdio-enhancer" target="_blank">https://github.com/matt-h/rdio-enhancer</a></p><p>If you like this extension, <a href="https://chrome.google.com/webstore/detail/hmaalfaappddkggilhahaebfhdmmmngf" target="_blank">please rate it here</a></p>');
				};
				about_enhancer.open()
			});
		},

		get_messages: function() {
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
		},

		show_message: function(msg_txt, force_message) {
			switch(R.enhancer.get_setting("notifications")) {
				case "none":
					// Force message option shows the message if the user settings are none
					if(force_message !== true) {
						break;
					}
				case false:
				case "html":
					var messages = R.enhancer.get_messages();
					jQuery('<div class="enhancer_message_box">' + msg_txt + '</div>').appendTo(messages).fadeIn("slow").delay(10000).fadeOut("slow", function() {
						jQuery(this).remove();
					});
				break;
				case "chrome":
					if ("Notification" in window) {
						if (Notification.permission === "granted") {
							// If it's okay let's create a notification
							var notification = new Notification("Rdio Notification", {body: msg_txt});
						}
						else if (Notification.permission !== 'denied') {
							Notification.requestPermission(function (permission) {

								// Whatever the user answers, we make sure we store the information
								if(!('permission' in Notification)) {
									Notification.permission = permission;
								}

								// If the user is okay, let's create a notification
								if (permission === "granted") {
									var notification = new Notification("Rdio Notification", {body: msg_txt});
								}
							});
						}
					}
					else if("webkitNotifications" in window) {
						var notification = webkitNotifications.createNotification(
							"",  // icon url - can be relative
							"Rdio Notification",  // notification title
							msg_txt  // notification body text
						);
						notification.show();
					}
				break;
			}
		},

		overwrite_request: function() {
			if(R.Api && R.Api.origRequest) {
				// Safety check so this can't be called twice.
				return;
			}
			if(!R.Api || !R.Api.request) {
				window.setTimeout(R.enhancer.overwrite_request, 100);
				return;
			}


			R.Api.origRequest = R.Api.request;
			R.Api.request = function() {
				var args = arguments[0];
				//R.enhancer.log(arguments);

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
		},

		getUnavilableAlbums: function(callback) {
			R.Api.request({
				method: "getAlbumsInCollection",
				content: {},
				success: function(response) {
					if(response.status != 'ok') {
						R.enhancer.show_message('There was an error getting unavailable albums.', true);
						return;
					}
					var unavailables = [];
					$.each(response.result.items, function(index, album) {
						if(!album.canStream) unavailables.push(album);
					});
					callback(unavailables);
				},
				error: function() {
					R.enhancer.show_message('There was an error getting unavailable albums.', true);
				}
			});
		},

		getTracks: function(callback) {
			R.enhancer.getModels(
				callback,
				R.enhancer.current_playlist.model.get("tracks"),
				'Fetching playlist data... Please wait. If your playlist is long this can take awhile.',
				'There was an error getting the playlist data, if you have a long playlist try scrolling down to load more first and then try the action again.'
			);
		},

		getFavoriteTracks: function(callback) {
			R.enhancer.show_message('Fetching Favorites data... Please wait. If your Favorites is large this can take awhile.', true);
			R.enhancer._getFavoriteTracks(callback, [], 0, 0);
		},

		_getFavoriteTracks: function(callback, tracks, offset, start) {
			R.Api.request({
				method: "getTracksInCollection",
				content: {
					start: start + offset,
					count: 1000
				},
				success: function(success_data) {
					tracks = tracks.concat(success_data.result.items);
					if(success_data.result.total > tracks.length) {
						if ( tracks.length >= 15000 ) {
							callback(tracks);
							var newstart = start + tracks.length;
							tracks = []; // Clear out tracks to preserve memory
							R.enhancer.show_message('You have a large amount of tracks, multiple CSV files will be downloaded.', true);
							R.enhancer._getFavoriteTracks(callback, [], 0, newstart);
						}
						else {
							R.enhancer._getFavoriteTracks(callback, tracks, tracks.length, start);
						}
					}
					else {
						callback(tracks);
					}
				},
				error: function() {
					R.enhancer.show_message('There was an error getting the Favorites data, if you have a large amount of favorites try scrolling down to load more first and then try the action again.', true);
				}
			});
		},

		getModels: function(callback, model, fetch_message, error_message) {
			if(model.length() == model.limit()) {
				// Currently have all models
				callback(model.models);
			}
			else {
				R.enhancer.show_message(fetch_message, true);
				model.fetch({
					"success": function(self,resp,newModels) {
						callback(model.models);
					},
					"error": function() {
						R.enhancer.show_message(error_message, true);
					}
				});
			}
		},

		getKeys: function(tracks) {
			var keys = [];
			jQuery.each(tracks, function(index, track) {
				var track_key = track.attributes.source.attributes.key;
				keys.push(track_key);
			});
			return keys;
		},

		// Sort functions
		sortByArtist: function(a, b) {
			var artist_a,
			artist_b;
			if (b.attributes.source.attributes) {
				if(a.attributes.source.attributes.artist) {
					artist_a = a.attributes.source.attributes.artist;
				}
				else {
					artist_a = a.attributes.source.attributes.albumArtist;
				}
			}
			else {
				console.debug("artist sort: no attributes on b. a:", a.attributes.source, " b:", b.attributes.source);
 			}
			if (b.attributes.source.attributes) {
				if(b.attributes.source.attributes.artist) {
					artist_b = b.attributes.source.attributes.artist;
				}
				else {
					artist_b = b.attributes.source.attributes.albumArtist;
				}
			}
			else {
				console.debug("artist sort: no attributes on b. a:", a.attributes.source, " b:", b.attributes.source);
 			}
			artist_a = artist_a.toLowerCase(),
			artist_b = artist_b.toLowerCase();

			var artist_a_split = artist_a.split(" ");

			if(artist_a_split[0]) {
				var artist_a_firstword = artist_a_split.shift();

				if (artist_a_firstword == "the" || artist_a_firstword == "a") {
					artist_a = artist_a_split.join(" ") + " " + artist_a_firstword;
				}
			}

			var artist_b_split = artist_b.split(" ");
			if(artist_b_split[0]) {
				var artist_b_firstword = artist_b_split.shift();

				if (artist_b_firstword == "the" || artist_b_firstword == "a") {
					artist_b = artist_b_split.join(" ") + " " + artist_b_firstword;
				}
			}

			if (artist_a < artist_b) {
				return -1;
			}
			else if (artist_a > artist_b) {
				return 1;
			}
			else {
				return R.enhancer.sortByAlbum(a, b);
			}
		},

		sortByAlbum: function(a, b) {
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
		},

		sortByReleaseDate: function(a, b) {
			var date_a = a.attributes.source.attributes.releaseDate,
			date_b = b.attributes.source.attributes.releaseDate;

			if (date_a < date_b) {
				return -1;
			}
			else if (date_a > date_b) {
				return 1;
			}
			else {
				return R.enhancer.sortByAlbum(a, b);
			}
		},

		sortByPlayCount: function(a, b) {
			var count_a = a.attributes.source.attributes.playCount,
			count_b = b.attributes.source.attributes.playCount;

			if (count_a < count_b) {
				return 1;
			}
			else if (count_a > count_b) {
				return -1;
			}
			else {
				return R.enhancer.sortByArtist(a, b);
			}
		},

		sortByTrackName: function(a, b) {
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
		},

		sortByTrackNum: function(a, b) {
			if (a.attributes.source.attributes.trackNum < b.attributes.source.attributes.trackNum) {
				return -1;
			}
			else if (a.attributes.source.attributes.trackNum > b.attributes.source.attributes.trackNum) {
				return 1;
			}
			else {
				return 0;
			}
		},

		// Shuffle function to shuffle tracks (or any array)
		shuffle: function(tracks) {
			// Sort tracks with a Fisher-Yates shuffle
			var i = tracks.length, j, temp;
			if (i > 0) {
				while (--i) {
					j = Math.floor(Math.random() * (i + 1));

					// Swap values
					temp = tracks[i];
					tracks[i] = tracks[j];
					tracks[j] = temp;
				}
			}
			return tracks;
		},

		// Sort playlist
		sortPlaylist: function(key, tracks, callback) {
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
					extras: ["-*", "Playlist.PUBLISHED"]
				},
				success: callback
			});
		},

		isInQueue: function(data, queue_type) {
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
		},

		// Tagging (uses localstorage to store tag set by the user)
		//
		getAlbumsForTag: function(tag) {
			if (window.localStorage) {
				var value = window.localStorage["/enhancer/tags/tag/" + tag];
				if (value) {
					return JSON.parse(value);
				}
				else {
					// This else is temporary to not lose data from the old tag saving. This will be removed eventually once enough time has passed to ensure all tags are upgraded.
					value = window.localStorage[tag];
					if (value) {
						window.localStorage["/enhancer/tags/tag/" + tag] = value;
						window.localStorage.removeItem(tag)
						return JSON.parse(value);
					}
				}
			}

			return [];
		},
		getTagsForAlbum: function(albumKey) {
			if (window.localStorage) {
				var value = window.localStorage["/enhancer/tags/ablum/" + albumKey];
				if (value) {
					return JSON.parse(value);
				}
				else {
					// This else is temporary to not lose data from the old tag saving. This will be removed eventually once enough time has passed to ensure all tags are upgraded.
					value = window.localStorage[albumKey];
					if (value) {
						window.localStorage["/enhancer/tags/ablum/" + albumKey] = value;
						window.localStorage.removeItem(albumKey)
						return JSON.parse(value);
					}
				}
			}

			return [];
		},
		setTags: function(tags, albumKey) {
			if (window.localStorage) {
				// Set the tags for the current albums
				window.localStorage[albumKey] = JSON.stringify(tags);

				// For every tags, add the album key to it's list of albums
				// This will facilitate ease & speed of search by tag
				_.each(tags, _.bind(function(tag) {
					var albumsForTag = window.localStorage[tag];
					albumsForTag ? albumsForTag = JSON.parse(albumsForTag) : albumsForTag = [];

					if (!_.contains(albumsForTag, albumKey)) {
						albumsForTag.push(albumKey);
						window.localStorage["/enhancer/tags/tag/" + tag] = JSON.stringify(albumsForTag);
					}
				},this));
			}
		},
		removeTag: function(tagToRemove, albumKey) {
			var tagsForAlbum = R.enhancer.getTagsForAlbum(albumKey),
			albumsForTag = R.enhancer.getAlbumsForTag(tagToRemove);

			// Remove tag from album's tags list
			tagsForAlbum = _.filter(tagsForAlbum, function(tag) { return tag !== tagToRemove; });
			window.localStorage["/enhancer/tags/ablum/" + albumKey] = JSON.stringify(tagsForAlbum);

			// Remove album from tag albums list
			albumsForTag = _.filter(albumsForTag, function(album) { return album !== albumKey; });
			window.localStorage["/enhancer/tags/tag/" + tagToRemove] = JSON.stringify(albumsForTag);
		}
	};

	// cache for storing results of API calls as needed
	R.enhancer.cache = {};

	// Call all of the overwrite functions to hook into Rdio
	R.enhancer.overwrite_playlist();
	R.enhancer.overwrite_create();
	R.enhancer.overwrite_request();
}

var enhancer_html = document.createElement("div");
enhancer_html.id = "enhancer_html";
document.body.appendChild(enhancer_html);
var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
	if (xhr.readyState == 4) {
		document.getElementById("enhancer_html").innerHTML = xhr.responseText;
	}
};
xhr.open("GET", chrome.extension.getURL("options.html"), true);
xhr.send();

var script = document.createElement("script");
script.type = "text/javascript";
script.text = codeToString(injectedJs);
document.body.appendChild(script);
