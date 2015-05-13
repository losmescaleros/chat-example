/* global jQuery */
/* global io */
var chat = chat || {};

(function($, window, chat, undefined){
  var socket = io();
  var username = '';
  var connected = false;
  var isTyping = false;
  var typingTimer;
  var typingInterval = 4000;
  var usersTyping = {};
  var lastTypingTime;
  
  var config = {
    chatPage: ".page-chat",
    loginPage: ".page-login",
    messages: ".messages",
    userCount: ".page-chat .userCount",
    userTyping: ".page-chat .userTyping",
    loginForm: ".form-login",
    msgForm: ".form-msg",
    msgContainer: ".container-msg",
    connectedUsers: ".connectedUsers"
  };
  
  var $chatPage, $loginPage, $messages, $userCount, $loginForm, $msgForm, $userTyping,
  $msgContainer, $connectedUsers;
      
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
    setUpForms();
  };   
  
  var setUpForms = function(){
    $loginForm.submit(function(){
      username = $(this).find('input.username').first().val().trim();
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
  
    $msgForm.submit(function(){
      var $msgInput = $(this).find('input.msg').first();
      var msg = $msgInput.val();
      if(msg != ''){
        showMyMessage(msg);
        socket.emit('chat message', 
          {
            "message": msg
          });
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
    showSystemMessage("Oh hey, welcome to Just Chattin'");
    updateUserCount(data.userCount);
    updateConnectedUsers(data.usernames);
  });
  
  socket.on('chat message', function(data){
    showMessage(data.username, data.message);
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
  
})(jQuery, window, chat);

