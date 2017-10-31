var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',

  initialize: function (user) {
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(user.password, salt);
    //console.log('username', user.username, 'salt', salt, 'password', hash);
    db.knex('users').insert( {'username': user.username, 'password': hash, 'salt': salt} )
      .then(function(result) {
      });
  }
//
});

module.exports = User;
