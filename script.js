// Initialize Lucide icons
lucide.createIcons();

const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatWindow = document.getElementById('chatWindow');
const chips = document.querySelectorAll('.chip');
const listItems = document.querySelectorAll('.list-item');

function addMessage(text, isUser = true) {
    const group = document.createElement('div');
    group.className = `message-group ${isUser ? 'user' : 'bot'}`;

    group.innerHTML = `
        <div class="bubble ${isUser ? 'gradient-bubble' : ''}">
            ${text}
        </div>
    `;

    chatWindow.appendChild(group);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function getBotReply(message) {
    const text = message.toLowerCase();

    if (text.includes('admission') || text.includes('apply')) {
        return 'Admissions: Applications open for fall and spring terms. I can share requirements, deadlines, and the checklist. Which program and start term are you targeting?';
    }

    if (text.includes('scholar') || text.includes('aid') || text.includes('financial')) {
        return 'Financial aid includes merit scholarships, need-based grants, and work-study. Tell me your program and whether you are an undergraduate or graduate applicant.';
    }

    if (text.includes('course') || text.includes('catalog') || text.includes('class')) {
        return 'Course catalog: I can filter by department, level, and delivery mode. Which subject are you interested in?';
    }

    if (text.includes('housing') || text.includes('dorm')) {
        return 'Housing: First-year students can choose residence halls or themed communities. Do you want on-campus options or apartment-style housing?';
    }

    if (text.includes('map') || text.includes('campus') || text.includes('parking')) {
        return 'Campus services: I can share a map, parking info, and building locations. Which building or service are you looking for?';
    }

    if (text.includes('transcript') || text.includes('registrar')) {
        return 'Registrar: Transcript requests, enrollment verification, and course add/drop are handled by the registrar. Do you need a transcript or enrollment help?';
    }

    if (text.includes('library') || text.includes('hours')) {
        return 'Library: Main library hours are typically 8am-10pm on weekdays. Want hours for a specific day or branch?';
    }

    return 'Got it. I can help with admissions, courses, financial aid, housing, campus services, and registrar requests. What should I look up for you?';
}

function handleSend(text) {
    const cleaned = text.trim();
    if (!cleaned) return;

    addMessage(cleaned, true);
    userInput.value = '';

    setTimeout(() => {
        addMessage(getBotReply(cleaned), false);
    }, 700);
}

sendBtn.addEventListener('click', () => handleSend(userInput.value));

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend(userInput.value);
});

chips.forEach((chip) => {
    chip.addEventListener('click', () => handleSend(chip.textContent));
});

listItems.forEach((item) => {
    item.addEventListener('click', () => handleSend(item.textContent));
});
