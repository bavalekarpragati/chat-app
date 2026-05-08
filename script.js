document.addEventListener("DOMContentLoaded", () => {
const socket = io();

// UI elements
let joinScreen = document.getElementById("joinScreen");
let chatScreen = document.getElementById("chatScreen");

let usernameInput = document.getElementById("usernameInput");
let roomInput = document.getElementById("roomInput");
let joinBtn = document.getElementById("joinBtn");

let msgInput = document.getElementById("msgInput");
let sendBtn = document.getElementById("sendBtn");
let chatBox = document.getElementById("chatBox");
let roomTitle = document.getElementById("roomTitle");

let username = "";
let room = "";
let typingTimeout;

// ===============================
// 🎥 VIDEO / AUDIO CALL VARIABLES
// ===============================

let localStream;
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: ["stun:stun.l.google.com:19302"]
        }
    ]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const videoCallBtn = document.getElementById("videoCallBtn");
const audioCallBtn = document.getElementById("audioCallBtn");
const endCallBtn = document.getElementById("endCallBtn");

const callContainer = document.getElementById("callContainer");

// 🔵 JOIN ROOM
joinBtn.addEventListener("click", () => {
    username = usernameInput.value;
    room = roomInput.value;

    console.log("Joining:", username, room); // DEBUG

    if (!username || !room) {
        alert("Enter username and room");
        return;
    }

    socket.emit("join room", { username, room });

    // // switch UI
    // joinScreen.style.display = "none";
    // // chatScreen.classList.remove("hidden");
    // <div class="flex flex-1 overflow-hidden min-h-0"></div>
    // roomTitle.innerText = "Room: " + room;
    joinScreen.style.display = "none";
    chatScreen.classList.remove("hidden");

    roomTitle.innerText = "Room: " + room;
});

// 🟢 SEND MESSAGE
sendBtn.addEventListener("click", () => {
    let msg = msgInput.value;

    if (!msg) return;

    socket.emit("chat message", {
        user: username,
        text: msg,
        room: room,
        time: new Date().toLocaleTimeString()
    });

    msgInput.value = "";
});

// 🔴 RECEIVE MESSAGE
socket.on("chat message", (data) => {
    let wrapper = document.createElement("div");
    wrapper.classList.add("w-full", "flex", "mb-2");

    let div = document.createElement("div");

    div.classList.add(
        "max-w-[70%]",
        "px-4",
        "py-2",
        "rounded-2xl",
        "text-sm",
        "shadow"
    );

    if (data.user === username) {

        wrapper.classList.add("justify-end");

        div.classList.add(
            "bg-indigo-600",
            "text-white",
            "rounded-br-none"
        );

    } else {

        wrapper.classList.add("justify-start");

        div.classList.add(
            "bg-gray-200",
            "text-black",
            "rounded-bl-none"
        );
    }

    div.innerHTML = `
        <div class="text-xs font-semibold mb-1 opacity-80">
            ${data.user}
        </div>
        
        <div>
            ${
                data.type === "image"
                    ? `<img src="${data.text}" class="max-w-[220px] rounded-lg mt-1" />`

                : data.type === "video"
                    ? `
                        <video controls class="max-w-[250px] rounded-lg mt-1">
                            <source src="${data.text}">
                        </video>
                    `

                : data.type === "file"
                    ? `
                        <a href="${data.text}" target="_blank"
                            class="underline text-blue-500 break-all">
                            📄 Open File
                        </a>
                    `

                : data.text
            }
        </div>
        <div class="text-[10px] opacity-70">${data.time}</div>
    `;

    wrapper.appendChild(div);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    typingDiv.innerText = "";
});

msgInput.addEventListener("input", () => {
    socket.emit("typing", { user: username, room: room });

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        socket.emit("stop typing", { room: room });
    }, 1000);
});

// 🔵 IMAGE UPLOAD
// 🔵 FILE UPLOAD
let fileInput = document.getElementById("fileInput");

fileInput.addEventListener("change", async () => {

    const file = fileInput.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {

        const res = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        let fileType = "file";

        if (file.type.startsWith("image/")) {
            fileType = "image";
        }
        else if (file.type.startsWith("video/")) {
            fileType = "video";
        }

        socket.emit("chat message", {
            user: username,
            text: data.fileUrl,
            room: room,
            type: fileType
        });

    } catch (err) {
        console.log(err);
    }

});


let typingDiv = document.getElementById("typingStatus");

socket.on("typing", (data) => {
    if (data.user !== username) {
        typingDiv.innerText = data.user + " is typing...";
    }
});

socket.on("stop typing", () => {
    typingDiv.innerText = "";
});

// ===============================
// 🎥 START VIDEO CALL
// ===============================

videoCallBtn.addEventListener("click", async () => {

    try {

        callContainer.classList.remove("hidden");
        endCallBtn.classList.remove("hidden");

        // GET CAMERA + MIC
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.srcObject = localStream;

        createPeerConnection();

        // CREATE OFFER
        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("call-user", {
            room,
            offer
        });

    } catch (err) {

        console.log(err);
        alert("Camera/Microphone permission denied");

    }
});


// ===============================
// 📞 START AUDIO CALL
// ===============================

audioCallBtn.addEventListener("click", async () => {

    try {

        callContainer.classList.remove("hidden");
        endCallBtn.classList.remove("hidden");

        // MIC ONLY
        localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
        });

        localVideo.srcObject = localStream;

        createPeerConnection();

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("call-user", {
            room,
            offer
        });

    } catch (err) {

        console.log(err);
        alert("Microphone permission denied");

    }
});

// ===============================
// 📥 RECEIVE CALL
// ===============================

socket.on("call-made", async (data) => {

    try {

        callContainer.classList.remove("hidden");
        endCallBtn.classList.remove("hidden");

        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.srcObject = localStream;

        createPeerConnection();

        // SET REMOTE OFFER
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );

        // CREATE ANSWER
        const answer = await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        socket.emit("make-answer", {
            room,
            answer
        });

    } catch (err) {

        console.log(err);

    }
});

// ===============================
// ✅ RECEIVE ANSWER
// ===============================

socket.on("answer-made", async (data) => {

    try {

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );

    } catch (err) {

        console.log(err);

    }
});

// ===============================
// ❄️ ICE CANDIDATES
// ===============================

socket.on("ice-candidate", async (data) => {

    try {

        if (peerConnection) {

            await peerConnection.addIceCandidate(data.candidate);

        }

    } catch (err) {

        console.log(err);

    }
});

// ===============================
// ❌ END CALL
// ===============================

endCallBtn.addEventListener("click", endCall);

socket.on("end-call", endCall);

function endCall() {

    callContainer.classList.add("hidden");
    endCallBtn.classList.add("hidden");

    // CLOSE PEER
    if (peerConnection) {

        peerConnection.close();
        peerConnection = null;

    }

    // STOP CAMERA/MIC
    if (localStream) {

        localStream.getTracks().forEach(track => track.stop());

    }

    // CLEAR VIDEOS
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    socket.emit("end-call", { room });
}


msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});

socket.on("system message", (data) => {
    let wrapper = document.createElement("div");
    wrapper.classList.add("w-full", "flex", "mb-2");

    let div = document.createElement("div");

    div.style.textAlign = "center";
    div.style.color = "gray";
    div.style.fontSize = "12px";
    div.style.margin = "5px";

    div.innerText = data.text;

    wrapper.appendChild(div);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("load messages", (messages) => {
    chatBox.innerHTML = "";

    messages.forEach((data) => {
        let div = document.createElement("div");

        div.classList.add(
            "max-w-[70%]",
            "px-4",
            "py-2",
            "rounded-2xl",
            "text-sm",
            "shadow"
        );

        if (data.user === username) {

            wrapper.classList.add("justify-end");

            div.classList.add(
                "bg-indigo-600",
                "text-white",
                "rounded-br-none"
            );

        } else {

            wrapper.classList.add("justify-start");

            div.classList.add(
                "bg-gray-200",
                "text-black",
                "rounded-bl-none"
            );
        }

        div.innerHTML = `
            <div class="text-xs font-semibold mb-1 opacity-80">
                ${data.user}
            </div>
            
            <div>
                ${
                    data.type === "image"
                        ? `<img src="${data.text}" class="max-w-[220px] rounded-lg mt-1" />`

                    : data.type === "video"
                        ? `
                            <video controls class="max-w-[250px] rounded-lg mt-1">
                                <source src="${data.text}">
                            </video>
                        `

                    : data.type === "file"
                        ? `
                            <a href="${data.text}" target="_blank"
                                class="underline text-blue-500 break-all">
                                📄 Open File
                            </a>
                        `

                    : data.text
                }
            </div>
            <div class="text-[10px] opacity-70">${data.time}</div>
        `;

        wrapper.appendChild(div);
        chatBox.appendChild(wrapper);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
});

// ===============================
// 🎥 CREATE PEER CONNECTION
// ===============================

function createPeerConnection() {

    peerConnection = new RTCPeerConnection(servers);

    // SEND ICE CANDIDATES
    peerConnection.onicecandidate = (event) => {

        if (event.candidate) {

            socket.emit("ice-candidate", {
                room,
                candidate: event.candidate
            });
        }
    };

    // RECEIVE REMOTE STREAM
    peerConnection.ontrack = (event) => {

        remoteVideo.srcObject = event.streams[0];
    };

    // ADD LOCAL TRACKS
    localStream.getTracks().forEach((track) => {

        peerConnection.addTrack(track, localStream);

    });
}


let userList = document.getElementById("userList");

// 🔵 UPDATE USER LIST
socket.on("user list", (users) => {
    userList.innerHTML = "";

    users.forEach((user) => {
        let li = document.createElement("li");

        li.innerHTML = `
            <div class="flex items-center gap-2">

                <div class="relative">
                    <img src="${user.avatar}"
                        class="w-8 h-8 rounded-full" />

                    <div class="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0 border border-white"></div>
                </div>

                <span class="${user.username === username ? 'font-bold text-indigo-600' : ''}">
                    ${user.username}
                </span>
            </div>
        `;

        userList.appendChild(li);
    });
});
});