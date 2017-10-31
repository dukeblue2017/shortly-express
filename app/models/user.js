var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',

  initialize: function (username, password) {
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(password, salt);
    console.log('username', username, 'salt', salt, 'passwordHash', hash);
    db.knex('users').insert( {'username': username, 'passwordHash': hash, 'salt': salt} )
      .then(function(result) {
      });
  }
//
});

module.exports = User;
