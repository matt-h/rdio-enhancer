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
					item.menu_items.splice(0, 0,
								{
									title: "Fork Playlist",
									visible: function() {
										return true;
									},
									action: function() {
										var copy = jQuery.extend(true, {}, data);
										copy.key = [];
										for(key in data.tracks) {
											copy.key.push(data.tracks[key].key);
										}
										R.Playlists.showAddToPlaylistDialog(copy);
										return false;
									}
								},
								{
									type: "separator"
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
		if (args.method == 'addToPlaylist' || args.method == 'createPlaylist') {
			var tracks = args.content.tracks;
			if (tracks.length == 1 && tracks[0] instanceof Array) {
				args.content.tracks = args.content.tracks[0];
				R.Api.request(args);
				return;
			}
		}
		return R.Api.origRequest.apply(this, arguments);
	};
}

var script = document.createElement("script");
script.type = "text/javascript";
script.text = codeToString(injectedJs);
document.body.appendChild(script);
