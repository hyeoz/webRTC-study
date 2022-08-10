import "./global.css";

// Firebase config
import { initializeApp } from "firebase/app";
import firebase from "firebase";
import "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBB2p_4qlKJkAFJmxdUkbpAuqETr9krIcc",
  authDomain: "fir-rtc-44604.firebaseapp.com",
  projectId: "fir-rtc-44604",
  storageBucket: "fir-rtc-44604.appspot.com",
  messagingSenderId: "515077938596",
  appId: "1:515077938596:web:a9b6abc75eb0c30f6cf531",
};

// Initialize Firebase
initializeApp(firebaseConfig);

const firestore = firebase.firestore();

// google free ice server
const servers = {
  iceServers: [
    // ice agent 가 사용할 수 있는 하나의 서버를 각각 설명하는 객체의 배열. 지정되지 않으면 서버가 없는 상태에서 연결을 시도하여 로컬 피어로의 연결을 제한
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10, // 프리패치된 ice 후보 풀의 크기를 지정하는 16비트 정수값.
};

// global state
const peerConnection = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML access
const webcamButton = document.querySelector("#webcamButton");
const webcamVideo = document.querySelector("#webcamVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const callButton = document.querySelector("#callButton");
const callInput = document.querySelector("#callInput");
const answerButton = document.querySelector("#answerButton");
const hangupButton = document.querySelector("#hangupButton");

// adding event listener

webcamButton.addEventListener("click", async () => {
  // 로컬 스트림 환경 세팅
  localStream = await navigator.mediaDevices.getUserMedia({
    // 내장 메서드 navigator : 사용자 에이전트의 상태와 신원정보를 나타내며 스크립트는 쿼리를 수행하고 일부 활동을 수행하기 위해 스스로 등록할 수 있음
    video: true,
    audio: true,
  });
  // 리모트 스트림 초기화
  remoteStream = new MediaStream(); // mediastream : 비디오 또는 오디오 트랙과 같은 여러 트랙으로 구성되는 스트림을 나타내는 인터페이스
  // 로컬 스트림에서 peerConnection 로 로컬 스트림의 트랙을 추가
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream); // track: 다른 유저에게 전송될 미디어 묶음
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks((track) => {
      remoteStream.addTrack(track);
    });
  };

  // 미디어 출력
  webcamVideo.srcObject = localStream; // HTMLMediaElement.srcObject: 연결된 미디어의 소스 역할을 하는 개체를 설정하거나 불러옴
  remoteVideo.srcObject = remoteStream;

  // 버튼 활성화
  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = false;
});

callButton.addEventListener("click", async () => {
  // firebase realtime db ref 연결
  const callDoc = firestore.collection("calls").doc();
  const offerCandidates = callDoc.collection("offerCandidates"); // 하위 컬렉션 생성
  const answerCandidates = callDoc.collection("answerCandidates");

  callInput.value = callDoc.id; // 자동 생성되는 id 로 input value 넣음

  peerConnection.onicecandidate = (event) => {
    // peerConnection 에 있는 ICE candidates 을 firestore 에 저장함
    /* ICECandidate: webRTC API 의 한 종류로, peer connection 을 구축 할 때 사용되기도 하는 ICE 의 후보군을 의미. 원격 장치와 통신을 하기 위해 요구되는 프로토콜과 아루팅에 대해 알려줌. */
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // offer 생성
  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  // offer config
  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  // firestore 저장
  await callDoc.set({ offer });

  // firestore 는 realtime DB 이므로 통화(call) 중에 변화에 대해 계속적으로 기록함.
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();

    if (!peerConnection.currentRemoteDescription && data.answer) {
      // 응답이 있지만 remote description 에 저장되지 않은 경우
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }

    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChange().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.addIceCandidate(candidate);
        }
      });
    });
  });

  hangupButton.disabled = false;
});

answerButton.addEventListener("click", async () => {
  const callId = callInput.value;

  // 특정 id 의 call 만 가져옴
  const callDoc = firestore.collection("calls").doc(callId);

  const answerCandidates = callDoc.collection("answerCandidates");
  const offerCandidates = callDoc.collection("offerCandidates");

  peerConnection.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  // remote media 을 remote description 으로 설정
  const offerDescription = callData.offer;
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(offerDescription)
  );

  // answer 생성 및 local description 으로 설정
  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(
    new RTCSessionDescription(answerDescription)
  );

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChange().forEach((change) => {
      if (change.type === "added") {
        let data = change.doc.data();
        peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
});
