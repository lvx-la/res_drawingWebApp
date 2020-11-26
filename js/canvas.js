
/* WebSocket */
var url = "ws://" + window.location.host + "/ws";
var ws = new WebSocket(url);
var myid = -1;

/* Canvas */
var can;
var ct;
var myxy  = [0, 0, 0, 0];
var each_user = [];
var mf=false;

function mam_draw_init(){
    //初期設定
    can=document.getElementById("can");
    can.addEventListener("touchstart",onDown,false);
    can.addEventListener("touchmove",onMove,false);
    can.addEventListener("touchend",onUp,false);
    can.addEventListener("mousedown",onMouseDown,false);
    can.addEventListener("mousemove",onMouseMove,false);
    can.addEventListener("mouseup",onMouseUp,false);
    ct=can.getContext("2d");
    ct.lineWidth=20;
    ct.lineJoin="round";
    ct.lineCap="round";

    //videocap();

    docUTime = document.getElementById("uTime");
    pointValueMe = document.getElementById("pointValueMe");
    pointValueEn = document.getElementById("pointValueEn");
}


ws.onmessage = function (msg) {
    var cmds = {"iam": iam, "set": set, "dis": dis, "clear": clearCan, "countDown": countDown};
    if (msg.data) {
        var parts = msg.data.split(" ")
        var cmd = cmds[parts[0]];
        
        if (cmd) {
            cmd.apply(null, parts.slice(1));
        } else {
            //p2pconect = parts.slice(1, -1);
            message_parse(msg);
        }  
    }
};

function message_parse(rcv_msg) {
    try {
        message = JSON.parse(rcv_msg.data);
    } catch (error) {
        console.log("1st Json ERROR")
        console.log(error);
    }


    if (message.type === 'offer') {
        let offer = new RTCSessionDescription(message);
        setOffer(offer);
    } else if (message.type === 'answer') {
        let answer = new RTCSessionDescription(message);
        setAnswer(answer);
    }
}

function whichvideo() {
    remoteVideo = document.getElementById("remote_video");
    localVideo = document.getElementById("local_video");

    switch (myid) {
        case "1":
            remoteVideo.src = "https://192.168.0.90/axis-cgi/mjpg/video.cgi"
            localVideo.src = "https://192.168.0.90/axis-cgi/mjpg/video.cgi"
            break;
        case "2":
            remoteVideo.src = "https://192.168.0.90/axis-cgi/mjpg/video.cgi"
            localVideo.src = "https://192.168.0.90/axis-cgi/mjpg/video.cgi"
            break;
        default:
            remoteVideo.src = "./images/Default_image.png"
            break;

    }
}

function iam(id) {
    myid = id;
    whichvideo();
}

//ロードされた時に初期化される グロ変
scoreA = 0
scoreB = 0

function pointAdd(id) {
    if (id == myid) {
        scoreA++;
        pointValueMe.innerHTML = scoreA;
    } else {
        scoreB++;
        pointValueEn.innerHTML = scoreB;
    }

    if (scoreA > scoreB) {
        pointValueMe.style.fontSize = "100px"
        pointValueMe.style.borderWidth = "10px"
        pointValueEn.style.fontSize = "80px"
        pointValueEn.style.borderWidth = "0px"
    } else {
        pointValueEn.style.fontSize = "100px"
        pointValueEn.style.borderWidth = "10px"
        pointValueMe.style.fontSize = "80px"
        pointValueMe.style.borderWidth = "0px"
    }
}

//(id ox oy x y)5変数
function set(id, ox, oy, x, y) {
    //描画
    if (id == myid) {
        ct.strokeStyle="#7fff00";
    } else {
        ct.strokeStyle="#ff1493";
    }

    pointAdd(id);
    
    ct.beginPath();
    ct.moveTo(ox,oy);
    ct.lineTo(x,y);
    ct.stroke();
}

function dis(id) {
    //とりあえず
    alert(id + "が退出しました")
}

function onDown(event){
    mf=true;
    myxy[0]=event.touches[0].pageX-event.target.getBoundingClientRect().left;
    myxy[1]=event.touches[0].pageY-event.target.getBoundingClientRect().top;
    event.stopPropagation();
}

function onMove(event){
    if(mf){
        myxy[2]=event.touches[0].pageX-event.target.getBoundingClientRect().left;
        myxy[3]=event.touches[0].pageY-event.target.getBoundingClientRect().top;
        set(myid, myxy[0], myxy[1], myxy[2], myxy[3]);
        ws.send(["Draw", myxy[0], myxy[1], myxy[2], myxy[3]].join(" "));
        myxy[0] = myxy[2];
        myxy[1] = myxy[3];
        event.preventDefault();
        event.stopPropagation();
    }
}

function onUp(event){
    mf=false;
    event.stopPropagation();
}

function onMouseDown(event) {
    if (myid > -1) {
        myxy[0] = event.clientX-event.target.getBoundingClientRect().left;
        myxy[1] = event.clientY-event.target.getBoundingClientRect().top;
        mf=true;
    }
}

function onMouseMove(event) {
    if (myid > -1) {
        if(mf){
            //手元の関数呼びつつウェブソケで送信&Goでブロキャス
            //joinはたぶん配列の間に勝手にスペース入れてくれるメソッド
            myxy[2] = event.clientX-event.target.getBoundingClientRect().left;
            myxy[3] = event.clientY-event.target.getBoundingClientRect().top ;
            set(myid, myxy[0], myxy[1], myxy[2], myxy[3]);
            ws.send(["Draw", myxy[0], myxy[1], myxy[2], myxy[3]].join(" "));
            myxy[0] = myxy[2];
            myxy[1] = myxy[3];
        }
    }
}
function onMouseUp(event) {
    mf = false;
}

function countDown(uTime) {
    docUTime.innerHTML = uTime;
}

function clearCan(){
    scoreA = 0;
    scoreB = 0;
    pointValueMe.innerHTML = scoreA;
    pointValueEn.innerHTML = scoreB;

    ct.clearRect(0, 0, ct.canvas.clientWidth, ct.canvas.clientHeight);
}

/*

// ---------------------------------- Video Script ----------------------------------------- 

let localStream = null;
let peerConnection = null;

// --- prefix -----
navigator.getUserMedia  = navigator.getUserMedia    || navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia || navigator.msGetUserMedia;
RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;

// ---------------------- media handling ----------------------- 
function successCallback(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

function errorCallback(err) {
    alert(err);
}

// start local video
function startVideo() {
    const medias = {
        audio : false,
        video : true
    };
    const promise = navigator.mediaDevices.getUserMedia(medias)

    promise.then(successCallback, errorCallback);

}


// stop local video
function stopVideo() {
  pauseVideo(localVideo);
  stopLocalStream(localStream);
}

function stopLocalStream(stream) {
  let tracks = stream.getTracks();
  if (! tracks) {
    console.warn('NO tracks');
    return;
  }
  
  for (let track of tracks) {
    track.stop();
  }
}

function getDeviceStream(option) {
  if (navigator.mediaDevices.getUserMadia) {
    console.log('navigator.mediaDevices.getUserMadia');
    return navigator.mediaDevices.getUserMedia(option);
  }
  else {
    console.log('wrap navigator.getUserMadia with Promise');
    return new Promise(function(resolve, reject){    
      navigator.getUserMedia(option,
        resolve,
        reject
      );
    });      
  }
}

function playVideo(element, stream) {
  if ('srcObject' in element) {
    element.srcObject = stream;
  }
  else {
    element.src = window.URL.createObjectURL(stream);
  }
  element.play();
  element.volume = 0;
}

function pauseVideo(element) {
  element.pause();
  if ('srcObject' in element) {
    element.srcObject = null;
  }
  else {
    if (element.src && (element.src !== '') ) {
      window.URL.revokeObjectURL(element.src);
    }
    element.src = '';
  }
}


//Hamada WebSocketで送る文字が sessionDescription.sdp



function sendSdp(sessionDescription) {
  console.log('---sending sdp ---');

  //Hamada この二行を置き換える sessionDescription を丸ごと送る
  let message = JSON.stringify(sessionDescription);

  try {
    setTimeout(function(){ws.send(message)}, 1000);
  } catch (error) {
    console.log("websocket send error");
    console.log(error);
  }
}

// ---------------------- connection handling -----------------------
function prepareNewConnection() {
    let pc_config = {"iceServers":[
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun1.l.google.com:19302"},
        {"urls": "stun:stun2.l.google.com:19302"}
    ]};
    let peer = new RTCPeerConnection(pc_config);

    // --- on get remote stream ---
    if ('ontrack' in peer) {
        peer.ontrack = function(event) {
            console.log('-- peer.ontrack()');
            let stream = event.streams[0];
            playVideo(remoteVideo, stream);
        };
    }
    else {
        peer.onaddstream = function(event) {
            console.log('-- peer.onaddstream()');
            let stream = event.stream;
            playVideo(remoteVideo, stream);
        };
    }

    // --- on get local ICE candidate
    peer.onicecandidate = function (evt) {
        if (evt.candidate) {
            console.log(evt.candidate);

            // Trickle ICE の場合は、ICE candidateを相手に送る
            // Vanilla ICE の場合には、何もしない
        } else {
            console.log('empty ice event');

            // Trickle ICE の場合は、何もしない
            // Vanilla ICE の場合には、ICE candidateを含んだSDPを相手に送る
            sendSdp(peer.localDescription);
        }
    };

    
    // -- add local stream --
    if (localStream) {
        console.log('Adding local stream...');
        let videoSender = peer.addTrack(localStream.getVideoTracks()[0], localStream);
    }
    else {
        console.warn('no local stream, but continue.');
    }

    return peer;
}

function makeOffer() {
    peerConnection = prepareNewConnection();
    peerConnection.createOffer()
    .then(function (sessionDescription) {
        console.log('createOffer() succsess in promise');
        return peerConnection.setLocalDescription(sessionDescription);
    }).then(function() {
        console.log('setLocalDescription() succsess in promise');

        // -- Trickle ICE の場合は、初期SDPを相手に送る -- 
        // -- Vanilla ICE の場合には、まだSDPは送らない --
        //sendSdp(peerConnection.localDescription);
    }).catch(function(err) {
        console.error(err);
    });
}

function setOffer(sessionDescription) {
    if (peerConnection) {
        console.error('peerConnection alreay exist!');
    }
    peerConnection = prepareNewConnection();
    peerConnection.setRemoteDescription(sessionDescription)
    .then(function() {
        console.log('setRemoteDescription(offer) succsess in promise');
        makeAnswer();
    }).catch(function(err) {
        console.error('setRemoteDescription(offer) ERROR: ', err);
    });
}

function makeAnswer() {
    console.log('sending Answer. Creating remote session description...' );
    if (! peerConnection) {
        console.error('peerConnection NOT exist!');
        return;
    }
    
    peerConnection.createAnswer()
    .then(function (sessionDescription) {
        console.log('createAnswer() succsess in promise');
        return peerConnection.setLocalDescription(sessionDescription);
    }).then(function() {
        console.log('setLocalDescription() succsess in promise');

        // -- Trickle ICE の場合は、初期SDPを相手に送る -- 
        // -- Vanilla ICE の場合には、まだSDPは送らない --
        //sendSdp(peerConnection.localDescription);
    }).catch(function(err) {
        console.error(err);
    });
  }

  function setAnswer(sessionDescription) {
    if (! peerConnection) {
        console.error('peerConnection NOT exist!');
        return;
    }

    peerConnection.setRemoteDescription(sessionDescription)
    .then(function() {
        console.log('setRemoteDescription(answer) succsess in promise');
    }).catch(function(err) {
        console.error('setRemoteDescription(answer) ERROR: ', err);
    });
}

// start PeerConnection
function connect() {
    if (! peerConnection) {
        console.log('make Offer');
        makeOffer();
    }
    else {
        console.warn('peer already exist.');
    }
}

// close PeerConnection
function hangUp() {
    if (peerConnection) {
        console.log('Hang up.');
        peerConnection.close();
        peerConnection = null;
        pauseVideo(remoteVideo);
    }
    else {
        console.warn('peer NOT exist.');
    }
}


function videocap(){
    let video = document.getElementById("video");
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia;
    //インカメなら
    navigator.getUserMedia({video: true, audio: false},
    (stream) => {
        this.localStream = stream;//localStreamはMediaStream.addTrack()を実装するためのトリガー
        video.srcObject = stream;
    },
    (err) => {
        console.log(err);
    }
    );
}

*/
