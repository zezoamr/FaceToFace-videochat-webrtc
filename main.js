let localStream
let remoteStream
let peerConnection

let APP_ID = "d415e26a582c45a6b4f97620a719d031" //get from agora rtm web signaling, get js file from sdk
let token = null
let uid = String(Math.floor(Math.random() * 10000))
let client
let channel

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomid = urlParams.get('room')

if(!roomid) {
    window.location = 'lobby.html'
}


const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}


let handleUserLeft = (MemberId) => { 
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallFrame')
}

let handleMessageFromPeer = async (message, MemberId) => {

    message = JSON.parse(message.text)

    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }


}

let handleUserJoined = async (memberId) =>{
    console.log( memberId + " joined channel")
    createOffer(memberId)
}

let createPeerConnection = async(memberId) => {
    peerConnection = new RTCPeerConnection(servers)
    remoteStream = new MediaStream()
    let videoElement = document.getElementById('user-2')
    videoElement.srcObject = remoteStream
    
    document.getElementById('user-2').style.display = 'block' 
    document.getElementById('user-1').classList.add('smallFrame') 

    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        document.getElementById('user-1').srcObject = localStream
    }

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text: JSON.stringify({'type': 'candidate', 'candidate': event.candidate})}, memberId)
        }
    }
}

let createOffer = async (memberId) => {
    await createPeerConnection(memberId)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    client.sendMessageToPeer({text: JSON.stringify({'type': 'offer', 'offer': offer})}, memberId)
}

let createAnswer = async (memberId, offer) => {
    await createPeerConnection(memberId)
    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text: JSON.stringify({'type': 'answer', 'answer': answer})}, memberId)
}


let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}


let constraints = {
    video: {
        width:{min:640, ideal: 1920, max:1920},
        height:{min:480, ideal: 1080, max:1080}
    },
    audio: true
}

let init = async () => {
    try{
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid,token})
    
    //index.html/?roomid
    channel = client.createChannel (roomid) //('main')
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft) 
    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    let videoElement = document.getElementById('user-1')
    videoElement.srcObject = localStream
    
    }
    catch(e){
        console.log(e)
    }
    
}

let toggleCamera = async () => {
    let videoTrack = localStream.getTracks().find(t => t.kind === 'video')
    if(videoTrack.enabled){
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255,80,80)'
    }else{
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179,102,249,.9)'
    }
}

let toggleAudio = async () => {
    let audioTrack = localStream.getTracks().find(t => t.kind === 'audio')
    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255,80,80)'
    }else{
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179,102,249,.9)'
    }
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleAudio)

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

window.addEventListener('beforeunload', leaveChannel)
init()