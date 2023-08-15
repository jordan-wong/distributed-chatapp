
// Initialization, called once upon page load:

var loc = window.location, new_uri;
if (loc.protocol === "https:") {
    new_uri = "wss:";
} else {
    new_uri = "ws:";
}
new_uri += "//" + loc.host;
new_uri += loc.pathname + "ws";
websocket = new WebSocket(new_uri);


const submit = document.querySelector("#message-form")
submit.addEventListener("submit", (event) => {
    console.log("in here")
    sendMessage()
    event.preventDefault();
  })

websocket.addEventListener("open", () => {
  console.log("Connected to chat server");
});

websocket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    console.log("New Chat Message:", message);

    // Create a new message element
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");

    // Add the sender's name to the message element
    const nameElement = document.createElement("div");
    nameElement.classList.add("message-name");
    nameElement.innerText = message.name;
    messageElement.appendChild(nameElement);

    // Add the sender's email to the message element
    const emailElement = document.createElement("div");
    emailElement.classList.add("message-email");
    emailElement.innerText = message.email;
    messageElement.appendChild(emailElement);

    // Add the topic to the message element
    const topicElement = document.createElement("div");
    topicElement.classList.add("message-topic");
    topicElement.innerText = message.topic;
    messageElement.appendChild(topicElement);

    // Add the message content to the message element
    const contentElement = document.createElement("div");
    contentElement.classList.add("message-content");
    contentElement.innerText = message.content;
    messageElement.appendChild(contentElement);

    // Add the timestamp to the message element
    const timestampElement = document.createElement("div");
    timestampElement.classList.add("message-timestamp");
    const timestamp = new Date(message.timestamp).toLocaleString();
    timestampElement.innerText = timestamp;
    messageElement.appendChild(timestampElement);

    newMessage = document.createElement("div")
    newMessage.className = "d-flex justify-content-between"

    nameTopic = document.createElement("p")
    nameTopic.className = "small mb-1"
    nameTopic.title = message.email;
    nameTopic.innerHTML = "<strong>" + message.name + "</strong>" + " (" + message.topic + ")"
    if (message.isEphem) {
        nameTopic.innerHTML += " &nbsp<em class='text-muted'> ~ ephemeral ~ </em>"
    }
    newMessage.appendChild(nameTopic)

    timestampElem = document.createElement("p")
    timestampElem.className = "small mb-1 text-muted"
    timestampElem.innerText = new Date(message.timestamp).toLocaleString()
    newMessage.appendChild(timestampElem)

    messageContent = document.createElement("p")
    messageContent.className = "small p-2 ms-3 mb-3 rounded"
    if (message.isEphem) {
        messageContent.style.backgroundColor = "#dfe7f2"
    }
    else {
        messageContent.style.backgroundColor = "#8fa4c3"
    }
   
    messageContent.innerText = message.content

    entireMessage = document.createElement("div")
    entireMessage.appendChild(newMessage)
    entireMessage.appendChild(messageContent)
    
    newMessageHeaderElem = document.createElement("b")
    newMessageHeaderElem.title = message.email;
    newMessageHeaderElem.innerText = message.name + " (" + message.topic + ") " + message.timestamp
    newMessageContent = document.createElement("blockquote")
    newMessageContent.innerText = message.content
    // Add the message element to the message container
    const messageContainer = document.getElementById("message-container");

    // messageContainer.appendChild(newMessage)
    // messageContainer.appendChild(messageContent)
    messageContainer.appendChild(entireMessage)
});

websocket.addEventListener("close", () => {
  console.log("Disconnected from chat server");
});

function sendMessage() {
    
    const nameInput = document.getElementById("name-input");
    const emailInput = document.getElementById("email-input");
    const topicInput = document.getElementById("topic-input");
    const contentInput = document.getElementById("content-input");
    const switchInput = document.getElementById("ephem-switch")

    const message = {
      name: nameInput.value,
      email: emailInput.value,
      topic: topicInput.value,
      content: contentInput.value,
      isEphem: switchInput.checked
    };
    console.log("Sending message...", message);
    // Send the message to the server
    websocket.send(JSON.stringify(message));
  
    // Clear the input fields
    // nameInput.value = "";
    // emailInput.value = "";
    // topicInput.value = "";
    contentInput.value = "";
  }

