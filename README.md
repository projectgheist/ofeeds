# [OFeeds](https://github.com/projectgheist/ofeeds)

Warning: This is work in progress and not usable/stable yet!

OFeeds is a minimal RSS reader in Node.js with a front end interface with as little external dependencies as possible.
The internal storage of feeds is based of the Google Reader API, with some changes to make it clearer to understand.

Uses [AngularJS](http://angularjs.org/), [Twitter Bootstrap](http://getbootstrap.com) and [Bootstrap Material Design Theme](https://github.com/FezVrasta/bootstrap-material-design) for the front-end interface, but this is optional.

## Examples

For some working version of this repo, visit [not yet available](#).

## Requirements:
* [Node.JS](http://nodejs.org/)
* [MongoDB](http://www.mongodb.org/)

## Quick start

Two quick start options are available:
* [Download the latest release](https://github.com/projectgheist/ofeeds/archive/master.zip)
* Clone the repo: `git clone https://github.com/projectgheist/ofeeds.git`

### Installation
* Install dependencies with 'npm install'
* Start your MongoDB server with `mongod`
* Start the server with `npm start`
* Browse to `localhost:3000`

Note: You can change the port, ip, database connection settings, ... inside the config file.

## Todo

* ~~Fix cron jobs not running at periodic intervals~~
* ~~OAuth login and user accounts~~
* Tag support
* Layout redesign
* Feed management
* OPML importing/exporting
* Mobile support

When Openshift updates their `Node` module to 0.11.9
* Convert [Express](http://expressjs.com/) to [Koa](http://koajs.com/)

## Library dependencies:

### Front-end

* [Angular.JS](http://angularjs.org/)
* [Bootstrap](http://getbootstrap.com)
* [Bootstrap Material Design Theme](https://github.com/FezVrasta/bootstrap-material-design)
* [JQuery](http://jquery.com/)
* [TypeAhead](https://github.com/twitter/typeahead.js/)
* [ngInfiniteScroll](http://binarymuse.github.io/ngInfiniteScroll/)
* [Mousetrap](http://craig.is/killing/mice)

### Back-end

* [Agenda](https://github.com/rschmukler/agenda)
* [Express](http://expressjs.com/)
* [Feedparser](https://github.com/danmactough/node-feedparser)
* [Jade](https://github.com/visionmedia/jade)
* [Mongoose](http://mongoosejs.com/)
* [Passportjs](http://passportjs.org/)
* [Request](https://github.com/mikeal/request)
* [RSVP](https://github.com/tildeio/rsvp.js)
* [ShortID](https://github.com/dylang/shortid)
* [Validator](https://github.com/chriso/validator.js)
* [Momentjs](http://momentjs.com/)

## Copyright and license
I haven't decided on a license yet.