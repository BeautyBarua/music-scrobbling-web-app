const LISTENERS_JSON_URL = "./files/listeners.json";
const ADD_LISTENER_URL = "./php/addListener.php";
function formatDate(d) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const mm = (m < 10 ? "0" : "") + String(m);
    const dd = (day < 10 ? "0" : "") + String(day);
    return String(y) + "/" + mm + "/" + dd;
}
async function fetchListeners() {
    const res = await fetch(LISTENERS_JSON_URL, {
        cache: "no-store"
    });
    if (!res.ok)
        throw new Error("HTTP " + res.status + " while loading listeners.json");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}
function nextId(list) {
    let maxId = 0;
    for (let i = 0; i < list.length; i++) {
        const id = list[i].id;
        if (id > maxId)
            maxId = id;
    }
    return maxId + 1;
}
function buildAvatarUrl(username) {
    return "https://robohash.org/" + encodeURIComponent(username) + ".png?size=60x60&set=set5";
}
function readAndValidateForm() {
    const firstInput = document.getElementById("firstName");
    const lastInput = document.getElementById("lastName");
    const userInput = document.getElementById("username");
    let first = "";
    let last = "";
    let user = "";
    if (firstInput)
        first = firstInput.value;
    if (lastInput)
        last = lastInput.value;
    if (userInput)
        user = userInput.value;
    first = first.trim();
    last = last.trim();
    user = user.trim();
    const errors = [];
    if (first.length === 0)
        errors.push("First name is required.");
    if (last.length === 0)
        errors.push("Last name is required.");
    if (user.length === 0)
        errors.push("Username is required.");
    return { first, last, user, errors };
}
function showErrors(messages) {
    const box = document.getElementById("errors");
    if (!box)
        return;
    if (messages.length === 0) {
        box.setAttribute("hidden", "true");
        box.textContent = "";
        return;
    }
    box.innerHTML = messages.map(function (m) { return "<div>" + m + "</div>"; }).join("");
    box.removeAttribute("hidden");
}
async function handleSubmit(evt) {
    evt.preventDefault();
    const result = readAndValidateForm();
    if (result.errors.length > 0) {
        showErrors(result.errors);
        return;
    }
    showErrors([]);
    try {
        const btn = document.activeElement || null;
        if (btn)
            btn.disabled = true;
        const existing = await fetchListeners();
        const newId = nextId(existing);
        const payload = {
            id: newId,
            first_name: result.first,
            last_name: result.last,
            username: result.user,
            enrolled: formatDate(new Date()),
            avatar: buildAvatarUrl(result.user),
            scrobbles: []
        };
        const res = await fetch(ADD_LISTENER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error("Server error " + res.status + ". " + txt);
        }
        window.location.href = "./stats.html";
    }
    catch (err) {
        console.error(err);
        showErrors(["Could not add the listener. Please try again."]);
    }
}
(function initAddPage() {
    const form = document.getElementById("addForm");
    if (form)
        form.addEventListener("submit", handleSubmit);
})();
export {};
