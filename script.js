const userName = "Sumedh";
const mistralApiKey = "8djhb4FUrn5c4mh7NYY27be9WpAoKrIU"; // Replace with your real API key

function getCurrentDateTime() {
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  return {
    date: now.toLocaleDateString('en-US', dateOptions),
    time: now.toLocaleTimeString('en-US', timeOptions)
  };
}

function speak(text) {
  if (speechSynthesis.speaking) speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira")) || voices[0];
  utterance.rate = 1;
  utterance.pitch = 1.1;
  speechSynthesis.speak(utterance);
}

function humanLikeResponse(text) {
  const thinkingPhrases = ["Let me think...", "Alright, give me a second...", "Hmm, checking that for you..."];
  const delay = 1000 + Math.random() * 1000;

  const preText = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)];

  addMessage(preText, "ai");
  speak(preText);

  setTimeout(() => {
    addMessage(text, "ai");
  }, delay);
}

function greetUser() {
  const { date, time } = getCurrentDateTime();
  const greeting = `Hey ${userName}, it's ${date}, around ${time}. I'm all ears — what do you want to know today?`;
  addMessage(greeting, "ai");
  speak(greeting);
  document.getElementById("speakBtn").style.display = "inline-block";
}

async function askMistral(question) {
  const url = "https://api.mistral.ai/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mistralApiKey}`
    },
    body: JSON.stringify({
      model: "mistral-small",
      messages: [
        { role: "system", content: "You are Jarvis, a friendly and helpful assistant that sounds like a human friend." },
        { role: "user", content: question }
      ]
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function addMessage(text, type) {
  const msg = document.createElement('div');
  msg.className = `message ${type}`;
  msg.innerText = text;
  document.getElementById('output').appendChild(msg);
  msg.scrollIntoView({ behavior: "smooth" });

  if (type === "ai") speak(text);
}

function processCommand(command) {
  const trimmed = command.trim().toLowerCase();
  if (!trimmed || trimmed.length < 3) return;

  addMessage(trimmed, "user");

  const { date, time } = getCurrentDateTime();

  if (trimmed.includes("your name")) {
    humanLikeResponse("I'm Jarvis — your virtual buddy, always here to help.");
  } else if (trimmed.includes("my name")) {
    humanLikeResponse(`You're ${userName}, right? I’ve got a good memory!`);
  } else if (trimmed.includes("time") || trimmed.includes("date")) {
    humanLikeResponse(`It's currently ${time} on ${date}. Pretty nice day, huh?`);
  } else if (trimmed.startsWith("open google")) {
    humanLikeResponse("Sure thing! Opening Google for you now.");
    window.open("https://www.google.com", "_blank");
  } else if (trimmed.startsWith("search in google")) {
    const query = trimmed.replace("search in google", "").trim();
    if (query.length > 2) {
      humanLikeResponse(`Let's check Google for: "${query}"`);
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
    }
  } else if (trimmed.startsWith("open youtube")) {
    humanLikeResponse("You got it! Heading to YouTube.");
    window.open("https://www.youtube.com", "_blank");
  } else if (trimmed.startsWith("search in youtube")) {
    const query = trimmed.replace("search in youtube", "").trim();
    if (query.length > 2) {
      humanLikeResponse(`Alright, finding "${query}" on YouTube.`);
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank");
    }
  } else if (trimmed.length > 3 && /\w{3,}/.test(trimmed)) {
    askMistral(trimmed).then(answer => {
      if (answer && answer.length > 5) {
        humanLikeResponse(answer);
      }
    });
  }
}

function startSingleRecognition() {
  if (speechSynthesis.speaking) speechSynthesis.cancel();

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    processCommand(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  recognition.start();
}

function analyzeImage(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const imageDataUrl = reader.result;

    const img = new Image();
    img.src = imageDataUrl;
    img.style.maxWidth = "200px";
    img.style.margin = "10px";
    document.getElementById("output").appendChild(img);

    Tesseract.recognize(imageDataUrl, 'eng')
      .then(({ data: { text } }) => {
        if (text.trim()) {
          humanLikeResponse(`Looks like the image says:\n"${text.trim()}"`);
        } else {
          humanLikeResponse("Hmm... I couldn’t find readable text in that image.");
        }
      })
      .catch(err => {
        console.error(err);
        humanLikeResponse("Oops! Something went wrong while analyzing that image.");
      });
  };
  reader.readAsDataURL(file);
}

window.onload = () => {
  setTimeout(() => {
    speechSynthesis.onvoiceschanged = greetUser;

    document.getElementById("speakBtn").addEventListener("click", () => {
      speak("I'm listening...");
      startSingleRecognition();
    });

    document.getElementById("sendBtn").addEventListener("click", () => {
      const text = document.getElementById("textInput").value.trim();
      if (text) {
        processCommand(text);
        document.getElementById("textInput").value = "";
      }
    });

    document.getElementById("textInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") document.getElementById("sendBtn").click();
    });

    document.getElementById("fileInput").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      addMessage(`Let's check what's inside this file: ${file.name}`, "user");
      if (file.type.startsWith("image/")) {
        analyzeImage(file);
      } else {
        humanLikeResponse("Hmm... I can only analyze images for now. PDFs and text files are coming soon!");
      }
    });
  }, 1000);
};