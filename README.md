rdio enhancer
=================

[![Join the chat at https://gitter.im/matt-h/rdio-enhancer](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/matt-h/rdio-enhancer?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[Chrome Webstore](https://chrome.google.com/webstore/detail/hmaalfaappddkggilhahaebfhdmmmngf)

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=SRNWTE8XDR53Q&lc=US&item_name=Matt&item_number=Rdio%20Enhancer&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted)

Bitcoin: 1FFjtKvsn4miNmHpt9H9opM2ymNtDLtpL

Current Features
================

* Favorites
	* Export to CSV
	* View Unavailable Albums
* Playlist Additions
	* Sort Playlist
		* Sort by Artist, Album, Song Name, Release Date, Play Count, Reverse, or Randomize
	* Remove Duplicates
	* Export to CSV
	* Fork Playlist
	* Add playlists to other playlists

Contributing
================

Please edit the `rdio-enhancer.ts` file which is a [TypeScript](http://www.typescriptlang.org/) file.

Create a pull request with any changes for review.

Development
================

  - Clone or fork the repository
  - Compile the [TypeScript](http://www.typescriptlang.org/) file
    - *Editors*:
      - [Atom](https://atom.io/)'s [atom-typescript](https://atom.io/packages/atom-typescript) package is an easy, cross-platform, way to get started
      - [Visual Studio Code](https://code.visualstudio.com/) is cross-platform with native TypeScript support
    - *Commandline*: Use the `tsc` command
  - Load the extension in [Developer Mode](https://developer.chrome.com/extensions/getstarted#unpacked)


Changelog
================

v 2.10.3

* Fixes

	* Fix issue with escaping quotes in csv export

v 2.10.2

* Fixes

	* Fix string issue in escaping quotes

v 2.10.1

* Fixes

	* Escape quotes in csv export [#65](https://github.com/matt-h/rdio-enhancer/issues/65)
	* Fix export of larger than 30000 songs [#66](https://github.com/matt-h/rdio-enhancer/issues/66)

v 2.10

* New

	* Show Has Listened in Albums/Stations [Ryan Nauman](https://github.com/ryan-nauman) [#61](https://github.com/matt-h/rdio-enhancer/pull/61)
	* Add artist top tracks to playlist feature [Ryan Nauman](https://github.com/ryan-nauman) [#62](https://github.com/matt-h/rdio-enhancer/pull/62)
	* Scroll to hightlighted track on shared link [Ryan Nauman](https://github.com/ryan-nauman) [#63](https://github.com/matt-h/rdio-enhancer/pull/63)

v 2.9

* New

	* Unavailable Albums on Favorites - [nikrowell](https://github.com/nikrowell) [#53](https://github.com/matt-h/rdio-enhancer/pull/53)

v 2.8.5

* Fixes

	* update getTracksInCollection API call to handle large collections over 15000+ tracks

v 2.8.4

* Fixes

	* Handle edge case in which source has no attributes. Thanks @seans23
	* update getTracksInCollection API call to only get 1000 tracks at a time to prevent server errors with large libraries

v 2.8.3

* Fixes

	* Fix Export Favorites to CSV

v 2.8.2

* Fixes

	* Fix add playlist to other playlists so it works again

v 2.8.1

* Fixes

	* Fix more menu on albums

v 2.8

* Fixes

	* Fix the menu items not showing up after Rdio update

* New

	* Sort Playlist by Play Count

v 2.7.5

* Fixes

	* Sorting by Artist ignores the "The" and "A" at the beginning of the name - [Marc Shilling](https://github.com/marcshilling)
	* Fix forking and adding a playlist to a playlist to make sure all tracks are loaded first

v 2.7.4

* Fixes

	* Re-Add playlist controls to new playlist menus

v 2.7.3

* Fixes

	* Fixed chrome notification if you were using them

v 2.7.2

* Fixes

	* Fixed randomize playlist

v 2.7.1

* New

	* Export to CSV for Collection - [JaderDias](https://github.com/JaderDias)

v 2.7

* Fixes

	* Fix playlist sorting to handle Rdio lazy load of playlists (this made sorting unloaded playlists slow)
* New

	* Export to CSV - [JaderDias](https://github.com/JaderDias)

v 2.6.1

* Fixes

	* Allow extension to work on https - [Sean Smith](https://github.com/seans23)

v 2.6

* New

	* Add Sort by Release Date - [Sean Smith](https://github.com/seans23)
	* Add reverse sorting - [Sean Smith](https://github.com/seans23)
	* Only show sort options on Playlists you have permission to edit - [Sean Smith](https://github.com/seans23)

v 2.5.3

* Fixes

	* Fix options menu due to Rdio update

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

[Sean Smith](https://github.com/seans23)

  * Sort by Release Date
  * Reverse sorting
  * Only show sort options on Playlists you have permission to edit

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
