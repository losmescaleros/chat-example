/* global jQuery */
/* global io */
var chat = chat || {};
var x;
jQuery.fn.reverse = [].reverse;

(function($, window, chat, undefined){
  var socket = io();
  var username = '';
  var connected = false;
  var isTyping = false;
  var typingTimer;
  var typingInterval = 4000;
  var usersTyping = {};
  
  var config = {
    chatPage: ".page-chat",
    loginPage: ".page-login",
    loginError: ".login-error",
    messages: ".messages",
    userCount: ".page-chat .userCount",
    userTyping: ".page-chat .userTyping",
    loginForm: ".form-login",
    msgForm: ".form-msg",
    msgContainer: ".container-msg",
    connectedUsers: ".connectedUsers"
  };
  
  var $chatPage, $loginPage, $messages, $userCount, $loginForm, $msgForm, $userTyping,
  $msgContainer, $connectedUsers, $loginError;
      
  chat.init = function(cfg){
    $.extend(config, cfg);
    // Cache some of the elements
    $chatPage = $(config.chatPage);
    $loginPage = $(config.loginPage);
    $messages = $(config.messages);
    $userCount = $(config.userCount);
    $loginForm = $(config.loginForm);
    $msgForm = $(config.msgForm);
    $userTyping = $(config.userTyping);
    $msgContainer = $(config.msgContainer);
    $connectedUsers = $(config.connectedUsers);
    $loginError = $(config.loginError);
    setUpForms();
  };   
  
  var setUpForms = function(){
    $loginForm.submit(function(){
      username = $(this).find('input.username').first().val().trim();
      $loginError.text('');
      if(username){       
        socket.emit('add user', {
          "username": username
        });
      }
      return false;
    });
  
    $msgForm.submit(function(){
      var $msgInput = $(this).find('input.msg').first();
      var msg = $msgInput.val();
      var tokens = msg.split(' ');
      switch(tokens[0]){
        case "/w":
          if(tokens[1] && tokens[2]){
            var message = msg.substring(tokens[0].length + tokens[1].length + 2);
            showPrivateMessage("Me to " + tokens[1], message);
            socket.emit('private message', {
              "username": username,
              "to": tokens[1],
              "message": message
            });
          }
          break;
        default:
          if(msg != ''){
            showMyMessage(msg);
            if(isTyping){
              isTyping = false;
              socket.emit('user stopped typing', {
                username: username
              });
            }
            socket.emit('chat message', 
            {
              "message": msg
            });
          }
          break;
      }
           
      $msgInput.val('');
      return false;
    });
    
    $msgForm.find('input.msg').on('input', function(){     
      // We'll need a new timeout, so clear the old one
      clearTimeout(typingTimer);
      // If we haven't already sent a typing event, send one
      if(!isTyping){       
        isTyping = true;
        socket.emit('user typing', {
          username: username
        });
      }
      // Set up the new handler for the timeout event
      typingTimer = setTimeout(function(){
        isTyping = false;
        socket.emit('user stopped typing', {
          username: username
        });
      }, typingInterval);                  
    });
  };
  
  var showSystemMessage = function(message){
    $messages.append($('<li>')
      .addClass('text-muted')
      .text(message));   
  };
  
  var updateUserCount = function(userCount){
    $userCount.text(userCount);
  };
    
  var showMyMessage = function(message){
    $messages.append($('<li>')
      .addClass('text-primary')
      .text("Me: " + message));
    $msgContainer.scrollTop($msgContainer.height());
  }; 
    
  var showMessage = function(username, message){
    $messages.append($('<li>')
      .addClass('')
      .text(username + ": " + message));
    $msgContainer.scrollTop($msgContainer.height());
  }; 
  
  var prependMessage = function(username, message){
    $messages.prepend($('<li>')
      .addClass('')
      .text(username + ": " + message));
    $msgContainer.scrollTop($msgContainer.height());
  };
  
  var showPrivateMessage = function(username, message){
    $messages.append($('<li>')
      .addClass('text-warning')
      .text(username + ": " + message));
    $msgContainer.scrollTop($msgContainer.height());
  };
  
  var showLoginError = function(message){
    $loginError.text(message);
  };
  
  var updateUserTyping = function(){
    $('.typing').hide();
     
    $.each(usersTyping, function(key, value){
      $('#' + key).find('.typing').show();              
    });    
  };
  
  var updateConnectedUsers = function(usernames){
    $connectedUsers.empty();
    $.each(usernames, function(key, value){
      var typing = $('<span>').addClass('glyphicon glyphicon-pencil typing').hide();
      var user = $('<li>').prop('id', key).append(key).append(typing);
      $connectedUsers.append(user);
    });
  };
  
  socket.on('login', function(data){
    connected = true;
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    showSystemMessage("Oh hey, welcome to Just Chattin'");
    updateUserCount(data.userCount);
    updateConnectedUsers(data.usernames);
  });
  
  socket.on('chat message', function(data){
    showMessage(data.username, data.message);
  });
  
  socket.on('private message', function(data){
    showPrivateMessage(data.username, data.message);
  });
  
  socket.on('user joined', function(data){    
    showSystemMessage(data.username + ' has joined the chat');
    updateUserCount(data.userCount);
    updateConnectedUsers(data.usernames);
  });
  
  socket.on('user disconnect', function(data){
    showSystemMessage(data.username + ' has left the chat');
    updateUserCount(data.userCount);
    updateConnectedUsers(data.usernames);
  });
  
  socket.on('user typing', function(data){
    usersTyping[data.username] = data.username;
    updateUserTyping();
  });
  
  socket.on('user stopped typing', function(data){
    delete usersTyping[data.username];
    updateUserTyping();
  });
  
  socket.on('login error', function(data){
    showLoginError(data.message);
  });
  
  socket.on('chat history', function(data){
    console.log(data);
    prependMessage(data.username, data.message);
  });
  
})(jQuery, window, chat);

