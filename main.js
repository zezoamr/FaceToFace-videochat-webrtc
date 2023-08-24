let socket
let localStream
let remoteStream
let peerConnection

const servers = {
    iceServers: [
        {
            urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
        },
    ],
}

let constraints = {
    video: {
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 480, ideal: 1080, max: 1080 }
    },
    audio: true
}

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomid = urlParams.get('room')

if(!roomid) {
    window.location = 'lobby.html'
}

let handleUserLeft = (socketid) => {
    document.getElementById("user-2").style.display = "none"
    document.getElementById("user-1").classList.remove("smallFrame")
}

let createOffer = async (roomarg) => {
    await createPeerConnection(roomid)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    socket.emit("offer", { offer, roomid })
}

let createAnswer = async (roomarg, offer) => {
    await createPeerConnection(roomid)
    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    socket.emit("answer", { answer, roomid })
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
    
}

let handleUserJoined = async (room) => {
    roomid = room
    createOffer(roomid)
}

let createPeerConnection = async (roomarg) => {
    peerConnection = new RTCPeerConnection(servers)
    remoteStream = new MediaStream()
    let videoElement = document.getElementById("user-2")
    videoElement.srcObject = remoteStream
    

    document.getElementById("user-2").style.display = "block"
    document.getElementById("user-1").classList.add("smallFrame")

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia(constraints)
        document.getElementById("user-1").srcObject = localStream
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            socket.emit("candidate", { candidate: event.candidate, roomid })
        }
    }
}

let handleMessageFromPeer = async (message, roomarg) => {
    if (message.type === "offer") {
        createAnswer(roomid, message.offer)
    }

    if (message.type === "answer") {
        addAnswer(message.answer)
    }

    if (message.type === "candidate") {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

async function init() {
    socket = io('http://localhost:3000')
    socket.on("userJoined", handleUserJoined)
    socket.on("userLeft", handleUserLeft)
    socket.on("messageFromPeer", handleMessageFromPeer)

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia(constraints)
        document.getElementById("user-1").srcObject = localStream
    }

    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    let videoElement = document.getElementById('user-1')
    videoElement.srcObject = localStream

    // Join room
    socket.emit("joinRoom", { room: roomid })
}

let toggleCamera = async () => {
    let videoTrack = localStream.getTracks().find(t => t.kind === 'video')
    if (videoTrack.enabled) {
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255,80,80)'
    } else {
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179,102,249,.9)'
    }
}

let toggleAudio = async () => {
    let audioTrack = localStream.getTracks().find(t => t.kind === 'audio')
    if (audioTrack.enabled) {
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255,80,80)'
    } else {
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179,102,249,.9)'
    }
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleAudio)

let leaveChannel = (socket, roomid) => {
    if (roomid) socket.emit('leaving', {room: roomid})
    socket.close()
}

window.addEventListener('beforeunload', () => leaveChannel(socket, roomid));
document.getElementById("leave-btn").addEventListener("click", () => leaveChannel(socket, roomid));

init()