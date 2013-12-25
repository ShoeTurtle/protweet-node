/*
 *Node-Express Server to push tweets to remote clients
 */

var EXPRESS_PORT = 3000;
var localhost = 'localhost';
var port = 8000;
var connections = {};
var client_session = '';

var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var cookie_reader = require('cookie');

//Getting the cookie
io.configure(function() {
	io.set('authorization', function(data, accept) {
		if(data.headers.cookie){
			data.cookie = cookie_reader.parse(data.headers.cookie);
			client_session = data.cookie.sessionid;

			return accept(null, true);
		}
		return accept('error', false);
	});
	io.set('log level', 1);
});


//Global connection event
io.sockets.on('connection', function(socket) {
	console.log('Connection -> ' + socket.id);
	get_user(client_session, socket);

	//Connection terminated
	socket.on('disconnect', function() {
		console.log('Disconnecting -> ' + socket.id);
		//ToDo: Figure out a way to clean the connections object
	});
	
});


//Get the post tweet from django and forward it to the client
app.post('/tweet-feed', function (req, res) {
	console.log('Request from django');
	target = connections[req.query.username]
	// console.log(req.params.feed);
	
	if (target) {
		// var socket = io.sockets.sockets['1981672396123987'] 
		connections[req.query.username].emit('tweet_feed', JSON.stringify(req.query));
		res.send(200);
	}
	else
		res.send(404);

});


server.listen(EXPRESS_PORT);
console.log('Express is running on port ' + EXPRESS_PORT);


//Get the user details associated with the session
function get_user(client_session, socket) {
	//Get the user from this session_id
	var options = {
		host: localhost,
		port: port,
		path: '/validate-user?session_id=' + client_session
	};

	http.get(options, function(res) {
		var data = '';

		//receiving the data from the request
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			var obj = JSON.parse(data);

			if (obj.user != 'AnonymousUser') {
				connections[obj.user] = socket;
			}
		})
		
	}).on("error", function(e){
		console.log("Got error: " + e.message);
	});
}

