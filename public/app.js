// mdc -> index.html CDN 사용
mdc.ripple.MDCRipple.attachTo(document.querySelector(".mdc-button")); // 모든 .mdc-button 에 잉크 잔물결 효과를 추가함

// DEfault configuration - Change these if you have a different STUN or TURN server.
const configuration = {
  iceServers: [
    // ice agent 가 사용할 수 있는 하나의 서버를 각각 설명하는 객체의 배열. 지정되지 않으면 서버가 없는 상태에서 연결을 시도하여 로컬 피어로의 연결을 제한
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10, // 프리패치된 ice 후보 풀의 크기를 지정하는 16비트 정수값.
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;

function init() {
  // 바인딩
  document.querySelector("#cameraBtn").addEventListener("click", openUserMedia);
  document.querySelector("#hangupBtn").addEventListener("click", hangUp);
  document.querySelector("#createBtn").addEventListener("click", createRoom);
  document.querySelector("#joinBtn").addEventListener("click", joinRoom);
  roomDialog = new mdc.dialog.MDCDialog(document.querySelector("#room-dialog")); // #room-dialog 에 대화상자 효과를 추가함
}

async function createRoom() {
  // 채팅방 생성에 바인딩되는 함수
  document.querySelector("#createBtn").disabled = true; // 버튼 disabled 해제
  document.querySelector("#joinBtn").disabled = true;
  const db = firebase.firestore(); // 데이터베이스 연결

  console.log("Create PeerConnection with configuration: ", configuration);
  peerConnection = new RTCPeerConnection(configuration); // 로컬 장치와 원격 피어간의 연결을 나타내는 새로운 RTCPeerConnection 을 반환

  registerPeerConnectionListeners(); // connection state 관련 이벤트 핸들러 바인딩

  // Add code for creating a room here
  const offer = await peerConnection.createOffer(); // 발신자의 제안 생성하는 peerConnection 내부 메서드
  await peerConnection.setLocalDescription(offer); // peerConnection 의 local description 으로 설정하는 내부 메서드.

  const roomWithOffer = {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
  };
  const roomRef = await db.collection("rooms").add(roomWithOffer); // firebase DB 에 새로운 채팅방 정보 저장.
  const roomId = roomRef.id;
  document.querySelector(
    "#currentRoom"
  ).innerText = `Current room is ${roomId} - You are the caller!`;

  roomRef.onSnapshot(async (snapshot) => {
    const data = snapshot.data();
    console.log("Got updated room: ", data); // firebase DB 에서 실시간으로 데이터 불러오기
    if (!peerConnection.currentRemoteDescription && data.answer) {
      // DB에 응답은 있지만 peerConnection의 remote description 으로 지정되지 않은 경우
      console.log("Set remote description: ", data.answer);
      const answer = new RTCSessionDescription(data.answer); // 수신자의 응답을 session description 으로 생성
      await peerConnection.setRemoteDescription(answer); // 수신자의 응답을 remote description 으로 지정
    }
  });
  // ~0808

  // Code for creating room above

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Code for creating a room below

  // Code for creating a room above

  // Code for collecting ICE candidates below

  // Code for collecting ICE candidates above

  peerConnection.addEventListener("track", (event) => {
    console.log("Got remote track:", event.streams[0]);
    event.streams[0].getTracks().forEach((track) => {
      console.log("Add a track to the remoteStream:", track);
      remoteStream.addTrack(track);
    });
  });

  // Listening for remote session description below

  // Listening for remote session description above

  // Listen for remote ICE candidates below

  // Listen for remote ICE candidates above
}

function joinRoom() {
  document.querySelector("#createBtn").disabled = true;
  document.querySelector("#joinBtn").disabled = true;

  document.querySelector("#confirmJoinBtn").addEventListener(
    "click",
    async () => {
      roomId = document.querySelector("#room-id").value;
      console.log("Join room: ", roomId);
      document.querySelector(
        "#currentRoom"
      ).innerText = `Current room is ${roomId} - You are the callee!`;
      await joinRoomById(roomId);
    },
    { once: true }
  );
  roomDialog.open();
}

async function joinRoomById(roomId) {
  const db = firebase.firestore();
  const roomRef = db.collection("rooms").doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log("Got room:", roomSnapshot.exists);

  if (roomSnapshot.exists) {
    console.log("Create PeerConnection with configuration: ", configuration);
    peerConnection = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    // Code for collecting ICE candidates below

    // Code for collecting ICE candidates above

    peerConnection.addEventListener("track", (event) => {
      console.log("Got remote track:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        console.log("Add a track to the remoteStream:", track);
        remoteStream.addTrack(track);
      });
    });

    // Code for creating SDP answer below

    // Code for creating SDP answer above

    // Listening for remote ICE candidates below

    // Listening for remote ICE candidates above
  }
}

async function openUserMedia(e) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  document.querySelector("#localVideo").srcObject = stream;
  localStream = stream;
  remoteStream = new MediaStream();
  document.querySelector("#remoteVideo").srcObject = remoteStream;

  console.log("Stream:", document.querySelector("#localVideo").srcObject);
  document.querySelector("#cameraBtn").disabled = true;
  document.querySelector("#joinBtn").disabled = false;
  document.querySelector("#createBtn").disabled = false;
  document.querySelector("#hangupBtn").disabled = false;
}

async function hangUp(e) {
  const tracks = document.querySelector("#localVideo").srcObject.getTracks();
  tracks.forEach((track) => {
    track.stop();
  });

  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  document.querySelector("#localVideo").srcObject = null;
  document.querySelector("#remoteVideo").srcObject = null;
  document.querySelector("#cameraBtn").disabled = false;
  document.querySelector("#joinBtn").disabled = true;
  document.querySelector("#createBtn").disabled = true;
  document.querySelector("#hangupBtn").disabled = true;
  document.querySelector("#currentRoom").innerText = "";

  // Delete room on hangup
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection("rooms").doc(roomId);
    const calleeCandidates = await roomRef.collection("calleeCandidates").get();
    calleeCandidates.forEach(async (candidate) => {
      await candidate.delete();
    });
    const callerCandidates = await roomRef.collection("callerCandidates").get();
    callerCandidates.forEach(async (candidate) => {
      await candidate.delete();
    });
    await roomRef.delete();
  }

  document.location.reload(true);
}

function registerPeerConnectionListeners() {
  peerConnection.addEventListener("icegatheringstatechange", () => {
    // ice candidate gathering process의 상태가 변할 때 이벤트 핸들러로 전송. 연결 속성 값이 변경되었음을 의미.
    console.log(
      `ICE gathering state changed: ${peerConnection.iceGatheringState}`
    );
  });

  peerConnection.addEventListener("connectionstatechange", () => {
    // connection의 일부인 RTCRtpReceiver 에 새로운 트랙이 추가된 후 이벤트 핸들러로 전송. 새로운 connection 상태는 connectionState 에서 찾을 수 있음. (new | connecting | connected | disconnected | failed | closed)
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener("signalingstatechange", () => {
    // RTCPeerConnection 으로 signaling 상태가 변할 때 이벤트 핸들러로 전송.
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener("iceconnectionstatechange ", () => {
    // negotiation process 도중 ice connection 상태가 변할 때마다 RTCPeerConnection 객체로 전송. iceConnectionState 프로퍼티에서 새로은 ice connection 상태를 확인할 수 있음.
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
  });
}

init();
