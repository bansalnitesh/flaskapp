import os

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from _collections import deque

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Dict with channel names and lists to archive messages
messagesArchive = {
    "General": deque([], maxlen=100)
}


@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("connect")
def test_connect():
    print(request.sid)


@socketio.on("disconnect")
def test_connect():
    print("DISCONNECTED!")


# For returning current channels
@socketio.on("get_channels")
def availableChannel():
    # Get keys from messagesArchive dict as a list
    channelList = list(messagesArchive)
    emit("show_channels", channelList)


# For adding a new channel to List
@socketio.on("submit channel")
def channel(data):
    channel = data.get('channelName')
    # Checks if submitted channel exists as a key in dict
    if channel in messagesArchive.keys():
        # Channel exists
        emit('alert message', {'message': "Channel already exists"}, room=request.sid)
        return False
    if channel == '':
        emit('alert message', {'message': "Channel name is empty"}, room=request.sid)
        return False
    # Creates a new key and initializes with a deque with max length 100, if key already exists, do nothing
    # Saw on https://docs.quantifiedcode.com/python-anti-patterns/correctness/not_using_setdefault_to_initialize_a_dictionary.html
    messagesArchive.setdefault(channel, deque([], maxlen=100))
    # Get keys from dict as a list
    channelList = list(messagesArchive)
    emit("show_channels", channelList, broadcast=True)
    # emit("return message", channel)


# For joining a channel
@socketio.on("join channel")
def joinChannel(data):
    currentChannel = data.get('currentChannel')
    selectedChannel = data.get('selectedChannel')
    if selectedChannel == 'empty':
        # joining a channel for the first time
        join_room(currentChannel)
        try:
            if messagesArchive[currentChannel]:
                messages = list(messagesArchive[currentChannel])
                emit('receive previous messages', messages)
        except KeyError:
            emit('alert message', {'message': "Saved channel does not exist"}, room=request.sid)

        emit('return message',
             {'messageField': 'has joined the channel ' + currentChannel, 'currentChannel': currentChannel,
              'currentTime': data.get('currentTime'), 'user': data.get('user')}, room=currentChannel)
    else:
        # switching channels
        leave_room(currentChannel)
        emit('return message',
             {'messageField': 'has left the channel ' + currentChannel, 'currentChannel': selectedChannel,
              'currentTime': data.get('currentTime'), 'user': data.get('user')}, room=currentChannel)
        join_room(selectedChannel)
        # checks if selected deque is not empty
        if messagesArchive[selectedChannel]:
            messages = list(messagesArchive[selectedChannel])
            emit('receive previous messages', messages)
        emit('return message',
             {'messageField': 'has joined the channel ' + selectedChannel, 'currentChannel': selectedChannel,
              'currentTime': data.get('currentTime'), 'user': data.get('user')}, room=selectedChannel)


# For receiving messages from clients
@socketio.on("receive message")
def message(data):
    room = data.get('currentChannel')
    message = data.get('messageField')
    time = data.get('currentTime')
    user = data.get('user')
    messagesArchive[room].append([message, room, time, user]);
    emit("return message", {'messageField': message, 'currentChannel': room, 'currentTime': time, 'user': user},
         room=room)


@socketio.on("previous messages")
def previousMessages(data):
    channel = data.get('currentChannel')
    if message in messagesArchive[channel]:
        emit("receive previous messages", messagesArchive)


if __name__ == '__main__':
    socketio.run(app)
