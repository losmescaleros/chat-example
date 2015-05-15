/// <reference path="typings/node/node.d.ts"/>

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongo = require('mongodb').MongoClient;

var usernames = {};
var userCount = 0;

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var mongo_url = process.envCUSTOMCONNSTR_MONGOLAB_URI || "mongodb://localhost:27017/exampleDb";

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	
	var addedUser = false;
	// Handle an 'add user' event
	socket.on('add user', function(msg){
		var usernameErr = isValidUsername(msg.username);

		if(usernames[msg.username]){
			emitError(socket, 'login error', 'A user with this name already exists');
		} 
		else if(usernameErr.length > 0){
			emitError(socket, 'login error', 'Invalid username: ' + usernameErr);	
		}
		else {
			socket.username = msg.username;
			usernames[msg.username] = socket.id;
			userCount++;
			// Tell the user they have successfully logged in
			socket.emit('login', {
				"userCount" : userCount,
				"usernames": usernames
			});
			addedUser = true;
			console.log('User "' + msg.username + '" connected. Current user count: ' + 
				userCount);
			// Broadcast that a user has joined
			socket.broadcast.emit('user joined', {
				"username": msg.username,
				"userCount": userCount,
				"usernames": usernames
			});
			mongo.connect(mongo_url, function(err, db){
				var collection = db.collection('chat_messages');
				var stream = collection.find().sort({
					_id: -1
				}).limit(10).stream();
				
				stream.on('data', function(chat){ 
					socket.emit('chat history', chat);
				});
			});			
		}		
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
		mongo.connect(mongo_url, function (err, db) {
            var collection = db.collection('chat_messages');
			var content = {
				"username": socket.username,
				"message": msg.message
			};
            collection.insert(content, function (err, o) {
                if (err) { 
					console.warn(err.message); 
				}
                else { 
					console.log("chat message inserted into db: " + msg); 
				}
            });
        });
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

var broadcastError = function(socket, errMsg){
	socket.broadcast.emit('error', {
		"message": errMsg
	});
};

var emitError = function(socket, errType, errMsg){
	socket.emit(errType, {
		"message": errMsg
	});
};

var isValidUsername = function(username){
	var error = "";
	var illegalChars = /\W/;
	
	if(illegalChars.test(username)){
		error = "Username must contain only aplhanumeric characters";
	}
	else if(username.length < 4 || username.length > 32){
		error = "Username must be between 4 and 32 characters in length";
	}
	
	return error;
};