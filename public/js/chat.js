const socket = io();

const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");
const $sendImageFile = document.querySelector("#file");

//Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationMessageTemplate = document.querySelector(
  "#location-message-template"
).innerHTML;
const imageMessageTemplate =
  document.querySelector("#image-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  //New message element
  const $newMessage = $messages.lastElementChild;

  //Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  //Visible height
  const visibleHeight = $messages.offsetHeight;

  //Height of messages container
  const containerHeigh = $messages.scrollHeight;

  //How far hav I scrolled?
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeigh - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (message) => {
  const currentUser = username.trim().toLowerCase();
  let colorClass;
  if (message.username == currentUser) {
    colorClass = "msg-self";
  } else if (message.username == "Admin") {
    colorClass = "msg-org";
  } else {
    colorClass = "msg";
  }

  const html = Mustache.render(messageTemplate, {
    colorClass: colorClass,
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("HH:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", (message) => {
  const currentUser = username.trim().toLowerCase();
  const colorClass = message.username == currentUser ? "msg-self" : "msg";
  const html = Mustache.render(locationMessageTemplate, {
    colorClass: colorClass,
    username: message.username,
    url: message.url,
    createdAt: moment(message.createdAt).format("HH:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});
socket.on("image", (message) => {
  if (message.url) {
    const currentUser = username.trim().toLowerCase();
    const colorClass =
      message.username == currentUser ? "msg-self img" : "msg img";
    const html = Mustache.render(imageMessageTemplate, {
      colorClass: colorClass,
      username: message.username,
      url: message.url,
      createdAt: moment(message.createdAt).format("HH:mm a"),
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoscroll();
  }
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room: room,
    users,
    count: users.length,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  $messageFormButton.setAttribute("disabled", "disabled");

  const message = e.target.elements.message.value;
  socket.emit("sendMessage", message, (error) => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log("Message delivered!");
  });
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by you browser");
  }
  $sendLocationButton.setAttribute("disabled", "disabled");
  navigator.geolocation.getCurrentPosition((position) => {
    console.log();
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute("disabled");
        console.log("Location shared!");
      }
    );
  });
});

// File
$sendImageFile.addEventListener("change", () => {
  var files = $sendImageFile.files;
  if (files.length) {
    var reader = new FileReader();
    reader.readAsDataURL(files[0]);
    reader.onload = function (event) {
      socket.emit("image", { buffer:event.target.result });
    };
    reader.onerror = function (event) {
      console.log("Error reading file: ", event);
    };
  }
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    console.log(error);
    alert(error);
    location.href = "/";
  }
});
