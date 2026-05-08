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
    let div = document.createElement("div");

    div.classList.add("max-w-[70%]", "px-3", "py-2", "rounded-xl", "text-sm");

    if (data.user === username) {
        div.classList.add("bg-indigo-600", "text-white", "self-end");
    } else {
        div.classList.add("bg-gray-200", "self-start");
    }

    div.innerHTML = `
        <div class="text-xs font-bold">${data.user}</div>
        
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

    chatBox.appendChild(div);
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

msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});

socket.on("system message", (data) => {
    let div = document.createElement("div");

    div.style.textAlign = "center";
    div.style.color = "gray";
    div.style.fontSize = "12px";
    div.style.margin = "5px";

    div.innerText = data.text;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("load messages", (messages) => {
    chatBox.innerHTML = "";

    messages.forEach((data) => {
        let div = document.createElement("div");

        div.classList.add("max-w-[70%]", "px-3", "py-2", "rounded-xl", "text-sm");

        if (data.user === username) {
            div.classList.add("bg-indigo-600", "text-white", "self-end");
        } else {
            div.classList.add("bg-gray-200", "self-start");
        }

        div.innerHTML = `
            <div class="text-xs font-bold">${data.user}</div>
            
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

        chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
});

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