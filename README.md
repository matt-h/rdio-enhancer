rdio enhancer
=================

[Chrome Webstore](https://chrome.google.com/webstore/detail/hmaalfaappddkggilhahaebfhdmmmngf)


Current Features
================

* Collection
	* Add Tags to Albums (tags are stored in local storage)
	* Filter Collection by tags
* Playlist Additions
	* Sort Playlist
		* Sort by Artist, Album, Song Name, or Randomize
	* Remove Duplicates
	* Fork Playlist
	* Add playlists to other playlists


Changelog
================
v 2.5.2

* New

	* Options menu in the top right of Rdio
	* Settings for notifications


v 2.5.1

* Fixes

	* Fixed Remove Duplicates feature that broke recently
	* Fixed an issue with Rdio Enhancer not loading all of the time

v 2.5

* New Features

	* Ability to add tags to albums and filter by those tags. Tags are stored in local storage
		* This feature was created by Nicolas. Thanks!
			* https://github.com/cotenoni
			* https://twitter.com/cotenoni

v 2.4.5

* Fixes

	* Fix a loading issue from a race condition with rdio core

v 2.4.4

* Fixes

	* Fix Regression of the stock create playlists


v 2.4.3

* Fixes

	* Fix Fork Playlist


v 2.4.2

* Fixes

	* Fix adding to playlist errors from rdio updates


v 2.4.1

* Fixes

	* Fix all rdio enhancer features that broke due to the rdio data model changes


v 2.4

* Fixes

	* Improve rendering of menu options
* New Features

	* Re-implement adding playlists to playlists (Add to Playlist option under add to playlist when viewing playlists)


v 2.3.1

* Fixes

	* Fix Fork Playlist


v 2.3

* New Features

	* Can now Randomize a playlist. Thanks to [TwoSlick](https://github.com/TwoSlick)


v 2.2

* New Features

	* New notification system since Rdio's built in notification system doesn't exist anymore


v 2.1.1

* Fixes

	* Fixed minor bug in in Sort by Artist not sorting some playlists


v 2.1

* New Features

	* Re-implemented remove duplicates from playlists
	* Re-implemented fork playlists


v 2.0

* New Features

	* This is a complete rewrite since Rdio changed their complete interface
	* All old features lost
	* New fewture with this release is Sort Playlists


v 1.6.2

* Fixes

	* Fix sorting by Artist if the Album Artist is not the same as the track Artist


v 1.6.1

* Fixes

	* Change all user visable instances of Track to Song


v 1.6

* New features

	* Export Playlists to CSV


v 1.5

* New features

	* Add Play Next option to everything


v 1.4

* New features

	* Save current queue or station as a playlist


v 1.3

* New features

	* Remove duplicates from Playlists
	* Move song to top of the playlist


Thanks
================

Nicolas [@cotenoni](https://twitter.com/cotenoni) [GitHub](https://github.com/cotenoni)

  * Add Tags to Albums feature

[TwoSlick](https://github.com/TwoSlick)

  * Randomize Playlist

[rdio extension](http://github.com/fberger/rdio-extension)

  * rdio Code Injection
  * "Add Album to Playlist"
  * release script

[Crystal Project Icons](http://www.everaldo.com/crystal/)

  * Icon files to create icon

[rdio](http://www.rdio.com/)

  * Great music listening service.
  * Please subscribe to rdio if you use this!
