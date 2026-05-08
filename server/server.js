require("dotenv").config({ path: "../.env" });

let users = [];
const mongoose = require("mongoose");
const path = require("path"); // ✅ ONLY ONCE

// connect to MongoDB
// connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
console.log("URI CHECK:", "mongodb+srv://pragatibavalekar_db_user:pragati%40123@cluster0.lp3jbtl.mongodb.net/chat-app?retryWrites=true&w=majority");

const messageSchema = new mongoose.Schema({
    user: String,
    text: String,
    room: String,
    time: String,
    type: String  // 👈 add this
});


const Message = mongoose.model("Message", messageSchema);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ Enable CORS (fix your error)
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// ✅ Serve frontend files




// ✅ Serve static files from project root
app.use(express.static(path.join(__dirname, "..")));

// ✅ Explicit route for index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ✅ Socket connection
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // 🔵 JOIN ROOM
    socket.on("join room", async ({ username, room }) => {
    socket.join(room);

    socket.username = username;
    socket.room = room;

    // ✅ Add user
    users.push({
        id: socket.id,
        username,
        room,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=6C63FF&color=fff`
    });

    console.log(username + " joined " + room);

    // ✅ Send user list to room
    io.to(room).emit("user list", users.filter(u => u.room === room));

    // ✅ Load old messages
    const oldMessages = await Message.find({ room });
    socket.emit("load messages", oldMessages);

    // ✅ Notify others
    socket.to(room).emit("system message", {
        text: username + " joined the room"
    });
});

    // // 🟢 SAVE + SEND MESSAGE
    // socket.on("chat message", async (data) => {
    //     data.time = new Date().toLocaleTimeString();

    //     console.log("Message:", data);

    //     // 🔥 Save to DB
    //     let msg = new Message(data);
    //     await msg.save();

    //     // 🔥 Send to room
    //     io.to(data.room).emit("chat message", data);
    // });

    socket.on("chat message", async (data) => {
        data.time = new Date().toLocaleTimeString();

        let msg = new Message({
            user: data.user,
            text: data.text,
            room: data.room,
            time: data.time,
            type: data.type || "text"
        });

        await msg.save();

        io.to(data.room).emit("chat message", msg);
    });

    socket.on("disconnect", () => {

        const user = users.find(u => u.id === socket.id);

        if (user) {
            // remove user
            users = users.filter(u => u.id !== socket.id);

            // update user list
            io.to(user.room).emit("user list", users.filter(u => u.room === user.room));

            // notify
            socket.to(user.room).emit("system message", {
                text: user.username + " left the room"
            });
        }

        console.log("User disconnected");
    });

    // 🔵 typing event
    socket.on("typing", (data) => {
        socket.to(data.room).emit("typing", data);
    });

    // 🔴 stop typing
    socket.on("stop typing", (data) => {
        socket.to(data.room).emit("stop typing");
    });

    // ===============================
    // 🎥 VIDEO / AUDIO CALL EVENTS
    // ===============================

    // CALL USER
    socket.on("call-user", (data) => {

        socket.to(data.room).emit("call-made", {
            offer: data.offer,
            room: data.room
        });

    });


    // RECEIVE ANSWER
    socket.on("make-answer", (data) => {

        socket.to(data.room).emit("answer-made", {
            answer: data.answer
        });

    });


    // ICE CANDIDATES
    socket.on("ice-candidate", (data) => {

        socket.to(data.room).emit("ice-candidate", {
            candidate: data.candidate
        });

    });


    // END CALL
    socket.on("end-call", (data) => {

        socket.to(data.room).emit("end-call");

    });

});

// ✅ Start server
server.listen(process.env.PORT, () => {
    console.log("Server running on port 3000");
});


const multer = require("multer");


// storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// serve uploaded files
app.use("/uploads", express.static("uploads"));

// upload route
app.post("/upload", upload.single("file"), (req, res) => {
    res.json({
        fileUrl: `/uploads/${req.file.filename}`
    });
});