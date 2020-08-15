/*


*/

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
    ct.strokeStyle="#000000";
    ct.lineWidth=5;
    ct.lineJoin="round";
    ct.lineCap="round";
    //clearCan();
    videocap()
    }


ws.onmessage = function (msg) {
    var cmds = {"iam": iam, "set": set, "dis": dis};
    if (msg.data) {
    var parts = msg.data.split(" ")
    var cmd = cmds[parts[0]];
    if (cmd) {
        cmd.apply(null, parts.slice(1));
    }
    }
};

function iam(id) {
    myid = id;
}

//(id ox oy x y)5変数
function set(id, ox, oy, x, y) {
    //ウェブソケのidを元に色変えたいけどとりあえず第一変数はシカト
    //描画
    ct.beginPath();
    ct.moveTo(ox,oy);
    ct.lineTo(x,y);
    ct.stroke();
}

function dis(id) {
    //とりあえず適当
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
        ws.send([myxy[0], myxy[1], myxy[2], myxy[3]].join(" "));
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
            ws.send([myxy[0], myxy[1], myxy[2], myxy[3]].join(" "));
            myxy[0] = myxy[2];
            myxy[1] = myxy[3];
        }
    }
}
function onMouseUp(event) {
    mf = false;
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

        
