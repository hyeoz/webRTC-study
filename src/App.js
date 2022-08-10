import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef } from "react";
import { firestore } from "./firebase";
import "./global.css";

function App() {
  /*
  // google free ice server
  const servers = {
    iceServers: [
      // ice agent 가 사용할 수 있는 하나의 서버를 각각 설명하는 객체의 배열. 지정되지 않으면 서버가 없는 상태에서 연결을 시도하여 로컬 피어로의 연결을 제한
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
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

  const webcamHandler = async () => {
    // 로컬 스트림 환경 세팅
    localStream = await navigator.mediaDevices.getUserMedia({
      // 내장 메서드 navigator : 사용자 에이전트의 상태와 신원정보를 나타내며 스크립트는 쿼리를 수행하고 일부 활동을 수행하기 위해 스스로 등록할 수 있음
      video: true,
      audio: false,
    });
    // 리모트 스트림 초기화
    remoteStream = new MediaStream(); // media stream : 비디오 또는 오디오 트랙과 같은 여러 트랙으로 구성되는 스트림을 나타내는 인터페이스
    // 로컬 스트림에서 peerConnection 로 로컬 스트림의 트랙을 추가
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream); // track: 다른 유저에게 전송될 미디어 묶음
    });

    peerConnection.addEventListener("track", (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    });

    // 미디어 출력
    webcamVideo.srcObject = localStream; // HTMLMediaElement.srcObject: 연결된 미디어의 소스 역할을 하는 개체를 설정하거나 불러옴
    remoteVideo.srcObject = remoteStream;

    // 버튼 활성화
    callButton.disabled = false;
    answerButton.disabled = false;
    webcamButton.disabled = false;
  };

  const callHandler = async () => {
    // firebase realtime db collection 생성
    // const callDoc = firestore.collection("calls").doc(); // web 8
    const callDoc = doc(collection(firestore, "calls")); // web 9. collection 생성, 하위 doc id 자동생성

    const offerCandidates = collection(callDoc, "offerCandidates"); // 하위 doc 생성
    const answerCandidates = collection(callDoc, "answerCandidates");

    callInput.value = callDoc.id; // 자동 생성되는 id 로 input value 넣음

    peerConnection.addEventListener("icecandidate", async (event) => {
      // peerConnection 에 있는 ICE candidates 을 firestore 에 저장함
      // ICECandidate: webRTC API 의 한 종류로, peer connection 을 구축 할 때 사용되기도 하는 ICE 의 후보군을 의미. 원격 장치와 통신을 하기 위해 요구되는 프로토콜과 아루팅에 대해 알려줌.
      event.candidate &&
        (await addDoc(offerCandidates, event.candidate.toJSON()));
    });
    // offer 생성
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);

    // offer config
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    // firestore 저장
    await setDoc(callDoc, { offer });

    // firestore 는 realtime DB 이므로 통화(call) 중에 변화에 대해 계속적으로 기록함.
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      console.log(data, "===> local description data");
      if (!peerConnection.currentRemoteDescription && data.answer) {
        // 응답이 있지만 remote description 에 저장되지 않은 경우
        console.log("이건 무슨 경우?");
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.setRemoteDescription(answerDescription);
      }
      onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.addIceCandidate(candidate);
          }
        });
      });
    });

    hangupButton.disabled = false;
  };

  const answerHandler = async () => {
    const callId = callInput.value;

    // 특정 id 의 call 만 가져옴
    const callDoc = doc(collection(firestore, "calls"), callId);
    const callData = (await getDoc(callDoc)).data();

    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");
    console.log(
      callDoc,
      "CALL DOC \n",
      callData,
      "CALL DATA \n",
      offerCandidates,
      "OFFER CANDIDATES \n",
      answerCandidates,
      "ANSWER CANDIDATES \n"
    );

    peerConnection.addEventListener("icecandidate", async (event) => {
      event.candidate &&
        (await addDoc(answerCandidates, event.candidate.toJSON()));
    });

    // remote media 을 local description 으로 설정
    const offerDescription = callData.offer;
    await peerConnection.setLocalDescription(
      new RTCSessionDescription(offerDescription)
    );

    // answer 생성 및 remote description 으로 설정
    const answerDescription = await peerConnection.createAnswer();
    // console.log("-------set remote description");
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(answerDescription)
    );

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await addDoc(callDoc, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  // adding event listener
  useEffect(() => {
    webcamButton?.addEventListener("click", webcamHandler);
    callButton?.addEventListener("click", callHandler);
    answerButton?.addEventListener("click", answerHandler);

    // return (() => {
    //   webcamButton?.removeEventListener("click", webcamHandler);
    //   callButton?.removeEventListener("click", callHandler);
    //   answerButton?.removeEventListener("click", answerHandler);
    // })();
  });

  return (
    <>
      
    </>
  );  */

  // https://www.youtube.com/watch?v=5M3Jzs2NFSA 강의
  const localRef = useRef();
  const remoteRef = useRef();
  const pc = useRef(new RTCPeerConnection(null));
  const textRef = useRef();

  const getUserMedia = async () => {
    const constraints = {
      audio: false,
      video: true,
    };
    const userMedia = await navigator.mediaDevices.getUserMedia(constraints);
    const _pc = new RTCPeerConnection(null);
    // const _pc = new RTCPeerConnection(null);

    localRef.current.srcObject = userMedia;

    userMedia.getTracks().forEach((track) => {
      console.log("add track");
      _pc.addTrack(track, userMedia);
    });

    _pc.onicecandidate = (e) => {
      // setLocalDescription 이 작동하면 트리거됨
      if (e.candidate) console.log(e.candidate, "e onicecandidate");
      // console.log(JSON.stringify(e.candidate), "e.candidate");
    };
    _pc.oniceconnectionstatechange = (e) => {
      console.log(e, "ice connection state changes"); // connected, disconnected, failed, closed
    };
    _pc.ontrack = (e) => {
      console.log(e, "on track");
      //we got remote stream...
      remoteRef.current.srcObject = e.streams[0];
    };

    // _pc.addEventListener("icecandidate", (e) => {
    //   // if (e.candidate)
    //   console.log(e, "e onicecandidate");
    //   console.log(JSON.stringify(e.candidate), "e.candidate");
    // });
    // _pc.addEventListener("iceconnectionstatechange", (e) => {
    //   console.log(e, "ice connection state changes"); // connected, disconnected, failed, closed
    // });
    // _pc.addEventListener("track", (e) => {
    //   //we got remote stream...
    //   remoteRef.current.srcObject = e.streams[0];
    // });

    pc.current = _pc;
  };

  const createOffer = async () => {
    try {
      const sdp = await pc.current.createOffer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      });
      console.log(sdp, "===> sdp of offer description");
      pc.current.setLocalDescription(sdp);
    } catch (error) {
      console.error(error);
    }
  };
  const createAnswer = async () => {
    try {
      const sdp = await pc.current.createAnswer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      });
      console.log(sdp, "===> sdp of answer description");
      pc.current.setLocalDescription(sdp); // TODO: 영상과 달라진 부분!!
    } catch (error) {
      console.error(error);
    }
  };

  const setRemoteDescription = () => {
    const sdp = JSON.parse(textRef.current.value);
    console.log(sdp, "---> remote description");

    pc.current.setRemoteDescription(sdp);
  };
  const addCandidate = async () => {
    const candidate = JSON.parse(textRef.current.value);

    // pc.current.addIceCandidate(candidate);
    await pc.current.addIceCandidate(candidate); // TODO: 영상과 다른 점...candidate 첫번째꺼 쓰기...
    console.log("Adding Candidate ...", candidate);
  };
  useEffect(() => {
    getUserMedia();
  }, []);

  return (
    <div>
      {/* <button onClick={getUserMedia}>Get Access to Media</button> */}
      <br />
      <video ref={localRef} autoPlay />
      <video ref={remoteRef} autoPlay />
      <br />
      <textarea ref={textRef} />
      <br />
      <button onClick={createOffer}>Create Offer</button>
      <button onClick={createAnswer}>Create Answer</button>
      <button onClick={setRemoteDescription}>Set Remote Description</button>
      <button onClick={addCandidate}>Add Candidates</button>
    </div>
  );
}

export default App;
