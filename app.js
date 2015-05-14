/// <reference path="typings/node/node.d.ts"/>

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var usernames = {};
var userCount = 0;

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	var addedUser = false;
	// Handle an 'add user' event
	socket.on('add user', function(msg){
		socket.username = msg.username;
		usernames[msg.username] = socket.id;
		userCount++;
		// Tell the user they have successfully logged in
		socket.emit('login', {
			"userCount" : userCount,
			"usernames": usernames
		});
		// Broadcast that a user has joined
		socket.broadcast.emit('user joined', {
			"username": msg.username,
			"userCount": userCount,
			"usernames": usernames
		});
		addedUser = true;
		console.log('User "' + msg.username + '" connected. Current user count: ' + 
			userCount);
	});
	// Handle a 'typing' event
	socket.on('user typing', function(msg){
		console.log(msg.username + ' is typing something...');
		socket.broadcast.emit('user typing', {
			"username": msg.username
		});
	});
	socket.on('user stopped typing', function(msg){
		console.log(msg.username + ' stopped typing.');
		socket.broadcast.emit('user stopped typing', {
			"username": msg.username
		});
	});
	// Handle a 'chat message' event
	socket.on('chat message', function(msg){
		 
		socket.broadcast.emit('chat message', {
			"username": socket.username,
			"message": msg.message
		});		
	});
	// Handle a 'private message' event
	socket.on('private message', function(msg){
		if(usernames[msg.to]){
			io.to(usernames[msg.to]).emit('private message', {
				"username": socket.username,
				"message": msg.message
			});
		}
	});
	// Handle a 'disconnect' event
	socket.on('disconnect', function(){
		if(addedUser){	
			var username = socket.username;		
			delete usernames[socket.username];
			userCount--;
			// Broadcast that a user disconnected
			socket.broadcast.emit('user disconnect', {
				"user": username,
				"userCount": userCount,
				"usernames": usernames
			});
			
		}
	});
});

http.listen(server_port, server_ip_address, function(){
	console.log("Server listening on *:" + server_port);
});