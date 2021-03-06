var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var expressSession = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(expressSession({
  secret: 'cookie_secret',
  resave: true,
  saveUninitialized: true,
//  isLoggedIn: false
}));
//
// {
//   '3AFvzN9Tji6bqdiAt5qHo1HXhnIjnv2C06.ZSe8ZeW8FsU27xAdY3%2Fp%2B3%2Bh5YMvq0OI1MX6oof0m9Y': {isLoggedIn: true}
//   '3AFvzN9T12312451bqdiAt5qHo1HXhnIjnv2C06.ZSe8ZeW8FsU27xAdY3%2Fp%2B3%2Bh5YMvq0OI1MX6oof0m9Y': {isLoggedIn: true}
// }

var restrict = function(req, res, next) {
  // console.log('req.session in restrict function:', req.session);
  if (req.session.isLoggedIn) {
    next();
  } else {
    //req.session.error = 'Access denied';
    res.redirect('/login');
  }
};

app.post('/logout', restrict, function(req, res) {
  // (console.log('running in post:logout'));
  req.session.isLoggedIn = false;
  req.session.username = false;
  res.redirect('/login');
});

app.get('/', restrict, function(req, res) {
  res.render('index');
});

app.get('/create', restrict, function(req, res) {
  res.render('index');
});

app.get('/links', restrict,
  //add restrict functions
  function(req, res) {
    Links.reset().fetch().then(function(links) {
      console.log('**************************************', links.models[0].attributes.username);
      var userLinksObject = links.models;
      var onlyThisUser = [];
      userLinksObject.forEach(function(val, index) {
        if (val.attributes.username === req.session.username) {
          onlyThisUser.push(val);
        }
      });
      res.status(200).send(onlyThisUser);
    });
  });

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin,
          username: req.session.username
        })
          .then(function(newLink) {
            res.status(200).send(newLink);
          });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var PasswordAttempt = req.body.password;

  db.knex('users').where( {'username': req.body.username} ).select('*')
    .then(function (result) {
      // console.log(result, 'result if user not in users');
      if (result.length > 0 ) {
        newHash = bcrypt.hashSync(PasswordAttempt, result[0].salt);
        var actualPasswordHash = result[0].password;
        // console.log('plain text pw', PasswordAttempt, 'hash', actualPasswordHash, 'the new hash: ~~~~~~~~~~~~~~~~~~~~~~~~~: ', newHash);

        bcrypt.compare(PasswordAttempt, actualPasswordHash, function(err, match) {
          if (match) {
            // console.log('they match');
            req.session.isLoggedIn = true;
            req.session.cookie.doesThisWork = 'blue';
            req.session.username = req.body.username;
            res.redirect('/');

          } else {
            res.redirect('/login');
          }
        });
      } else {
        res.redirect('/login');
      }
    });
});
//
app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  //check if user exists
  db.knex('users').where( {'username': req.body.username} ).select('*')
    .then(function (result) {
      if (result.length === 0) {
        var newUser = new User({username: req.body.username, password: req.body.password });
        req.session.isLoggedIn = true;
        req.session.username = req.body.username;
        // console.log('redirecting to /');
        res.redirect('/');

      } else {
        res.redirect('login');
      }
    });
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
