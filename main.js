let localStream
let remoteStream
let peerConnection

let APP_ID = "d415e26a582c45a6b4f97620a719d031"
let token = null
let uid = String(Math.floor(Math.random() * 10000))
let client
let channel

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
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


let init = async () => {
    try{
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid,token})
    
    //index.html/?roomid
    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
    let videoElement = document.getElementById('user-1')
    videoElement.srcObject = localStream
    
    }
    catch(e){
        console.log(e)
    }
    
}

init()