var socket = io();
var username = '';
var connected = false;

var $chatPage = $('.chat');
var $loginPage = $('.login');
var $messages = $('#messages');
    
$('#loginForm').submit(function(){
  username = $('#username').val().trim();
  if(username){
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    socket.emit('add user', {
      "username": username
    });
  }
  return false;
});

$('#msgForm').submit(function(){
  var msg = $('#m').val();
  if(msg != ''){
    $messages.append($('<li>').text('Me: ' + msg));
    socket.emit('chat message', 
      {
        "message": msg
      });
  }
  
  $('#m').val('');
  return false;
});

socket.on('login', function(msg){
  connected = true;
  $messages.append($('<li>').text("Oh hey, welcome to Just chattin'"));
});

socket.on('chat message', function(msg){
  $messages.append($('<li>').text(msg.username + ': ' + msg.message));
});