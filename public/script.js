const hotelGrid = document.getElementById('hotelGrid');
const searchBtn = document.getElementById('searchBtn');
const locationInput = document.getElementById('locationInput');
const priceInput = document.getElementById('priceInput');
const aiMessage = document.getElementById('aiMessage');
const resultsHeading = document.getElementById('resultsHeading');

const micBtn = document.getElementById('micBtn');
const listeningWaves = document.getElementById('listeningWaves');
const avatarIdle = document.getElementById('avatarIdle');
const avatarTalking = document.getElementById('avatarTalking');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

let allHotels = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchHotels();
});

// Fetch Hotels
async function fetchHotels() {
    try {
        const res = await fetch('/hotels');
        allHotels = await res.json();
        renderHotels(allHotels);
    } catch (err) {
        console.error("Error fetching hotels:", err);
        hotelGrid.innerHTML = "<p>Failed to load hotels.</p>";
    }
}

// Render Hotels
function renderHotels(hotels) {
    if (hotels.length === 0) {
        hotelGrid.innerHTML = "<p>No hotels found matching your criteria.</p>";
        return;
    }
    hotelGrid.innerHTML = hotels.map(hotel => `
        <div class="hotel-card">
            <div class="hotel-img-container">
                <img src="${hotel.image}" alt="${hotel.name}" class="hotel-img">
            </div>
            <div class="hotel-info">
                <div class="hotel-header">
                    <div class="hotel-name">${hotel.name}</div>
                    <div class="hotel-rating"><i data-lucide="star"></i> ${hotel.rating}</div>
                </div>
                <div class="hotel-location"><i data-lucide="map-pin"></i> ${hotel.location}</div>
                <div class="hotel-footer">
                    <div class="hotel-price">₹${hotel.price}<span>/night</span></div>
                    <button class="btn-primary btn-small" onclick="bookHotel(${hotel.id})">Book Now</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Re-init lucide icons for newly added elements
    lucide.createIcons();
}

// Manual Search
searchBtn.addEventListener('click', () => {
    const loc = locationInput.value.toLowerCase();
    const priceCategory = priceInput.value;

    let filtered = allHotels;

    if (loc) {
        filtered = filtered.filter(h => h.location.toLowerCase().includes(loc));
    }

    if (priceCategory === 'cheap') {
        filtered = filtered.filter(h => h.price <= 3000);
    } else if (priceCategory === 'medium') {
        filtered = filtered.filter(h => h.price > 3000 && h.price <= 10000);
    } else if (priceCategory === 'high') {
        filtered = filtered.filter(h => h.price > 10000);
    }

    resultsHeading.textContent = "Search Results";
    renderHotels(filtered);
    hideAiMessage();
});

// Booking Action
async function bookHotel(hotelId) {
    const currentUser = localStorage.getItem('username');
    if (!currentUser) {
        openAuthModal();
        return;
    }
    
    try {
        const res = await fetch('/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hotelId, user: currentUser })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
            speakText("Booking confirmed! Thank you for choosing LuxeStays.");
        }
    } catch (err) {
        console.error("Booking error:", err);
    }
}

function showToast(message) {
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// --- AI Voice Assistant Logic ---

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Indian English, fits context better
    recognition.interimResults = false;

    recognition.onstart = function() {
        micBtn.classList.add('listening');
        listeningWaves.classList.remove('hidden');
        showAiMessage("Listening...");
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        showAiMessage(`You said: "${transcript}"`);
        processCommand(transcript);
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        micBtn.classList.remove('listening');
        listeningWaves.classList.add('hidden');
        if (event.error === 'not-allowed') {
            showAiMessage("Microphone access blocked. Please click the lock icon in your address bar to allow microphone access, then try again.");
        } else {
            showAiMessage("Sorry, I didn't catch that. Please try again.");
        }
    };

    recognition.onend = function() {
        micBtn.classList.remove('listening');
        listeningWaves.classList.add('hidden');
    };
} else {
    console.warn("Speech Recognition API not supported in this browser.");
    micBtn.addEventListener('click', () => alert("Voice input is not supported in your browser. Please use Chrome."));
}

micBtn.addEventListener('click', () => {
    if (recognition) {
        recognition.start();
    }
});

async function processCommand(command) {
    try {
        const res = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        const data = await res.json();
        
        handleAiAction(data);
    } catch (err) {
        console.error("Ask API error:", err);
        showAiMessage("Network error. Could not reach the assistant server.");
    }
}

function handleAiAction(data) {
    showAiMessage(data.responseText);
    speakText(data.responseText);

    if (data.action === 'search') {
        let filtered = allHotels;
        const loc = data.filterData?.location;
        const price = data.filterData?.price;

        if (loc) {
            filtered = filtered.filter(h => h.location.toLowerCase() === loc.toLowerCase());
            locationInput.value = loc;
        }

        if (price === 'cheap') {
            filtered = filtered.filter(h => h.price <= 3000);
            priceInput.value = "cheap";
        }

        resultsHeading.textContent = "AI Recommended Hotels";
        renderHotels(filtered);
    }
}

// Speech Synthesis (Text to Speech)
function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find a female/assistant voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Female') || v.name.includes('Samantha'));
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => {
            setAvatarState('talking');
        };

        utterance.onend = () => {
            setAvatarState('idle');
        };

        utterance.onerror = () => {
            setAvatarState('idle');
        };

        window.speechSynthesis.speak(utterance);
    }
}

// Avatar State Manager
function setAvatarState(state) {
    if (state === 'talking') {
        avatarIdle.classList.add('hidden');
        avatarTalking.classList.remove('hidden');
    } else {
        avatarTalking.classList.add('hidden');
        avatarIdle.classList.remove('hidden');
    }
}

// UI Helpers
function showAiMessage(msg) {
    aiMessage.querySelector('span').textContent = msg;
    aiMessage.classList.remove('hidden');
}

function hideAiMessage() {
    aiMessage.classList.add('hidden');
}

// Initialize voices
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

// --- User Authentication Logic ---
const authModal = document.getElementById('authModal');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authForm = document.getElementById('authForm');
const navSignInBtn = document.getElementById('navSignInBtn');
const authContainer = document.getElementById('authContainer');
const authError = document.getElementById('authError');
const authTitle = document.getElementById('authTitle');
const authSwitchLink = document.getElementById('authSwitchLink');
const authSwitchText = document.getElementById('authSwitchText');

let isLoginMode = true;

function updateAuthUI() {
    const currentUser = localStorage.getItem('username');
    if (currentUser) {
        authContainer.innerHTML = `
            <div class="user-profile">
                <span class="user-name"><i data-lucide="user"></i> ${currentUser}</span>
                <button class="btn-primary btn-small logout-btn" onclick="logout()">Logout</button>
            </div>
        `;
        lucide.createIcons();
    } else {
        authContainer.innerHTML = `<button id="navSignInBtn" class="btn-primary btn-small">Sign In</button>`;
        document.getElementById('navSignInBtn').addEventListener('click', openAuthModal);
    }
}

function openAuthModal() {
    authModal.classList.remove('hidden');
    authError.classList.add('hidden');
}

function closeAuthModal() {
    authModal.classList.add('hidden');
    authForm.reset();
}

if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);
if (navSignInBtn) navSignInBtn.addEventListener('click', openAuthModal);

if (authSwitchLink) {
    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? "Sign In" : "Sign Up";
        document.getElementById('authSubmitBtn').textContent = isLoginMode ? "Sign In" : "Sign Up";
        authSwitchText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        authSwitchLink.textContent = isLoginMode ? "Sign Up" : "Sign In";
        authError.classList.add('hidden');
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('usernameInput').value.trim();
        const password = document.getElementById('passwordInput').value.trim();

        if (!username || !password) return;

        const endpoint = isLoginMode ? '/login' : '/signup';
        
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('username', username);
                closeAuthModal();
                updateAuthUI();
                showToast(data.message);
            } else {
                authError.textContent = data.message;
                authError.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Auth error:", err);
            authError.textContent = "Network error. Please try again.";
            authError.classList.remove('hidden');
        }
    });
}

function logout() {
    localStorage.removeItem('username');
    updateAuthUI();
    showToast("Logged out successfully");
}

// Initial UI setup
updateAuthUI();
