const email_input = document.getElementById("email");
const password_input = document.getElementById("password");
const form = document.getElementById("login");
const token_form = document.getElementById("token_form")
const loginPage = document.getElementById("loginPage");
const token_input = document.getElementById("token_input");
const clientPage = document.getElementById("clientPage");
const websocket = new WebSocket("wss://ws.revolt.chat?version=1&format=json");
const server_select = document.getElementById("serverlist");
const channel_select = document.getElementById("channellist");
const message_section = document.getElementById("messages");
const message_box = document.getElementById("messagebox");
const servers = [];
const channels = [];
let messages = [];
let message_content = "";
let current_server = ""
current_channel = ""

websocket.onopen = () => {
    console.log("[websocket] Connection Established to server")
}

websocket.onclose = () => {
    console.log("[websocket] Connection dropped");
    alert("Connection to server has been lost")
}

websocket.addEventListener('message', (e) => {
    const event = JSON.parse(e.data);

    if (event.type === "Authenticated") {
        console.log("[websocket] Authenticated")
    } else if (event.type === "Ready") {
        console.log("[websocket] I am ready!")
        console.log("[websocket] Got these servers", event.servers);
        event.servers.forEach((server) => {
            servers.push(server._id);
            server_select.innerHTML += `<option value="${server._id}">${server.name}</option>`
        })
    } else if (event.type === "Message" && event.channel === current_channel) {
        message_section.innerHTML += `<section id="message">
<h2>${event.author === session.user_id ? "You" : event.author}</h2>
<p>${event.content}</p>
<section/>`
    }
})

let session = {};

form.addEventListener('submit', (e) => {
    e.preventDefault();
})


token.addEventListener('submit', (e) => {
    e.preventDefault();
})

server_select.addEventListener("change", (e) => {
    current_server = e.target.value
    fetchServer(current_server).then(s => {
        console.log(s);
        channel_select.innerHTML = ""
        s.channels.forEach(async (c) => {
            channels.push(c);
            let channel = await fetchChannel(c)
            channel_select.innerHTML += `<option value="${channel._id}">${channel.name}</option>`
        })
    })
})

channel_select.addEventListener("change", async (e) => {
    current_channel = e.target.value
    messages = await fetchMessages().then((m) => m.reverse());
    message_section.innerHTML = ""
    if (messages) {
        messages.forEach((m) => {
            message_section.innerHTML += `<section id="message">
<h2>${m.author === session.user_id ? "You" : m.author}</h2>
<p>${m.content}</p>
<section/>`
        })
    }
})

message_box.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessageInChannel(message_box.value);
    }
})

message_box.addEventListener("change", async (e) => {
    message_content = e.target.value;
    console.log(message_content);
})
function makeRequest(method, url, headers, body) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        headers.forEach((h) => {
            xhr.setRequestHeader(h.name, h.value)
        })
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send(JSON.stringify(body));
    });
}


function login() {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            const res = JSON.parse(xhr.responseText);
            session = res;
            loginPage.className = "hide"
            clientPage.className = "show"
            websocket.send(JSON.stringify({
                type: "Authenticate",
                token: res.token
            }))
        }
    }

    xhr.open("POST", "https://api.revolt.chat/auth/session/login", true);
    xhr.setRequestHeader("Content-type", "application/json");

    xhr.send(JSON.stringify({
        email: email_input.value,
        password: password_input.value,
        friendly_name: "JVit"
    }));
}

function loginToken() {
    if (token_input.value) {
            session.token = token_input.value;
            loginPage.className = "hide"
            clientPage.className = "show"
            websocket.send(JSON.stringify({
                type: "Authenticate",
                token: session.token
            }))
    }
}
function logout() {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            session = {}
            loginPage.className = "show"
            clientPage.classList = "hide"
            websocket.close(1000, "Client logout");
        }
    }

    xhr.open("POST", "https://api.revolt.chat/auth/session/logout", true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("x-session-token", session.token);

    xhr.send();
}

async function fetchServer(id) {
    let response = await makeRequest("GET", `https://api.revolt.chat/servers/${id}`, [
        {
            name: "Content-type",
            value: "application/json"
        },
        {
            name: "x-session-token",
            value: session.token
        }
    ]);

    return JSON.parse(response);
}

async function fetchChannel(id) {
    let response = await makeRequest("GET", `https://api.revolt.chat/channels/${id}`, [
        {
            name: "Content-type",
            value: "application/json"
        },
        {
            name: "x-session-token",
            value: session.token
        }
    ])

    return JSON.parse(response);
}

async function fetchMessages() {
    let response = await makeRequest("GET", `https://api.revolt.chat/channels/${current_channel}/messages`, [
        {
            name: "Content-type",
            value: "application/json"
        },
        {
            name: "x-session-token",
            value: session.token
        }
    ], {
        limit: 100,
        sort: "Latest",
        include_users: true
    })

    return JSON.parse(response)
}
async function sendMessageInChannel(content) {
    if (content) {
        await makeRequest("POST", `https://api.revolt.chat/channels/${current_channel}/messages`, [
            {
                name: "Content-type",
                value: "application/json"
            },
            {
                name: "x-session-token",
                value: session.token
            }
        ], {
            "content": message_box.value || ""
        })
    }
}