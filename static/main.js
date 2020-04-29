document.addEventListener ( 'DOMContentLoaded' , () => {

    // Connect to websocket
    let socket = io.connect ( location.protocol + '//' + document.domain + ':' + location.port );

    //let person log in or sign in based on local storage
    socket.on ( 'connect' , () => {
        const userExist = localStorage.getItem ( 'user' );
        //condition for if the user exist or no
        if ( userExist ) {
            document.getElementById ( "welcome" ).textContent = "" + userExist;
        } else {
            //log in user
            login ();
        }
        //check if any chanel exist, if does not make a new channel named My General
        if ( !localStorage.getItem ( 'channel' ) )
            localStorage.setItem ( 'channel' , 'My General' );

        // List channels
        socket.emit
        ( 'get_channels' );

        const currentChannel = localStorage.getItem ( 'channel' );
        const currentTime = new Date ().toLocaleString ();
        const user = localStorage.getItem ( 'user' );
        socket.emit ( 'join channel' , {
            'currentChannel' : currentChannel ,
            'currentTime' : currentTime ,
            'selectedChannel' : 'empty' ,
            'user' : user
        } );
    } );

    // Listens for clicks and submits message to server
    document.getElementById ( 'sendButton' ).onclick = () => {
        const channel = localStorage.getItem ( 'channel' );
        const message = document.getElementById ( 'chatInput' ).value;
        sendMessage ( message , channel );
    }

    // Sends message through Enter key if not empty
    document.getElementById ( 'chatInput' ).addEventListener ( 'keyup' , e => {
        if ( e.keyCode === 13 ) {
            const channel = localStorage.getItem ( 'channel' );
            const message = document.getElementById ( 'chatInput' );
            if ( message.value.length > 0 ) {
                sendMessage ( message.value , channel )
                message.value = '';
            }
        }
    } )

    // Display sent messages in page
    socket.on ( 'return message' , data => {
        const user = data['user'];
        const message = data['messageField'];
        const time = data['currentTime'];
        createMessage ( user , message , time );
    } )

    // Display previous messages in the room from messagesArchive
    socket.on ( 'receive previous messages' , data => {
        document.querySelector ( '#messagesList' ).innerHTML = "";
        data.forEach ( message => {
            // receiving previous messages from server
            createMessage ( message[3] , message[0] , message[2] );
        } )
    } )

    function createMessage(user , message , time) {
        const div = document.createElement ( 'div' );
        div.classList.add ( 'message' );
        const span = document.createElement ( 'span' );
        span.classList.add ( 'time' );
        span.append ( time );
        const userDetail = document.createElement ( 'div' );
        userDetail.innerHTML = '<i class="fa fa-fw fa-user"></i> <span>' + user + '</span>';
        userDetail.classList.add('display');
        const userMsg = document.createElement('div')
        userMsg.innerHTML =  ' ' + message;
        userMsg.classList.add('padd');
        div.append ( userDetail );
        div.appendChild(userMsg)
        div.append ( span );
        document.getElementById ( 'messagesList' ).append ( div );
        const messagesWindow = document.querySelector ( '#mainContent' );
        //messagesWindow.scrollTop = messagesWindow.scrollHeight;
        window.scrollTo ( 0 , document.body.scrollHeight );
    }

    function sendMessage(message , channel) {
        let time = new Date ().toLocaleString ();
        let user = localStorage.getItem ( 'user' );
        socket.emit ( 'receive message' , {
            'messageField' : message ,
            'currentChannel' : channel ,
            'currentTime' : time ,
            'user' : user
        } );
        message.value = '';
    }


    //when a person logs out
    document.querySelector ( '#logout' ).onclick = () => {
        localStorage.removeItem ( 'user' );
        login ();
    };

    function login() {
        $ ( '#myModal' ).modal ( 'show' );
        document.querySelector ( '#submitName' ).onclick = () => {
            const user = document.querySelector ( '#displayName' ).value;
            localStorage.setItem ( 'user' , user );
            document.getElementById ( "welcome" ).textContent = "" + user;
            $ ( '#myModal' ).hide ();
            $ ( '.modal-backdrop' ).hide ();
        }
    };
    // Listens for channel name submissions on click
    document.getElementById ( 'submitChannel' ).onclick = () => {
        const channelName = document.getElementById ( 'channelName' );
        socket.emit ( 'submit channel' , { 'channelName' : channelName.value } );
        channelName.value = '';
    };

    // Receiving channel as list and displaying on page
    socket.on ( 'show_channels' , data => {
        document.querySelector ( '#channelList' ).innerHTML = '';
        // Gets array of channels and create html for each one
        data.forEach ( chanel_name => {
            const channel = document.createElement ( 'a' );
            channel.classList.add ( 'channel' , 'list-group-item' , 'list-group-item-action' );
            channel.setAttribute ( 'data-channel' , chanel_name );
            channel.innerHTML = chanel_name;
            document.querySelector ( '#channelList' ).append ( channel );
        } )

        //
        socket.on ( 'alert message' , data => {
            document.getElementById ( 'alertMessage' ).textContent = data.message;
            $ ( '#alertBox' ).fadeTo ( 1 , 1 ).show ();
            setTimeout ( function () {
                $ ( "#alertBox" ).fadeTo ( 500 , 0 ).slideUp ( 500 , function () {
                    $ ( this ).hide ();
                } );
            } , 2000 )
        } );
        // Listens for clicks in each channel in channel list and sends a join signal to server if clicked
        document.querySelectorAll ( '.channel' ).forEach ( (channel) => {
            if ( channel.querySelector ( 'active' ) == null ) {
                // Active channel does not exist
                const storedChannel = localStorage.getItem ( 'channel' );
                const currentChannel = document.querySelector ( `[data-channel=${CSS.escape ( storedChannel )}]` );
                currentChannel.classList.add ( 'active' );
            }

            channel.onclick = () => {
                // Removes previous channel with active class
                const remove = document.querySelectorAll ( '.channel' );
                remove.forEach ( item => {
                    item.classList.remove ( 'active' );
                } )
                // Gets data attribute and selects corresponding element, adding class active to it
                const selectedChannel = channel.getAttribute ( 'data-channel' );
                const activeChannel = document.querySelector ( `[data-channel=${CSS.escape ( selectedChannel )}]` );
                activeChannel.classList.add ( 'active' );
                // Sends time and channel data to server to join room
                let currentTime = new Date ().toLocaleString ();
                const currentChannel = localStorage.getItem ( 'channel' );
                const user = localStorage.getItem ( 'user' );
                document.querySelector ( '#messagesList' ).innerHTML = '';
                socket.emit ( 'join channel' , {
                    'selectedChannel' : selectedChannel ,
                    'currentTime' : currentTime ,
                    'currentChannel' : currentChannel ,
                    'user' : user
                } );
                localStorage.setItem ( 'channel' , selectedChannel );
            }
        } )
    } )

} );