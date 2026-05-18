const ALBUMS_URL = "./files/albums.json";
const LISTENERS_URL = "./files/listeners.json";
const SCROBBLE_POST_URL = "./php/scrobble.php";
let allAlbums = [];
let allListeners = [];
function getTrackLabel(t) {
    if (t.name && t.name.trim().length > 0)
        return t.name.trim();
    if (t.title && t.title.trim().length > 0)
        return t.title.trim();
    return "Untitled";
}
function toJsonDate(input) {
    let year;
    let month;
    let day;
    if (input && input.length === 10) {
        const parts = input.split("-");
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
    }
    else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
        day = now.getDate();
    }
    const mm = month < 10 ? "0" + String(month) : String(month);
    const dd = day < 10 ? "0" + String(day) : String(day);
    return String(year) + "/" + mm + "/" + dd;
}
function sortListenersByName(list) {
    const copy = list.slice();
    copy.sort(function (a, b) {
        const ln = a.last_name.localeCompare(b.last_name);
        if (ln !== 0)
            return ln;
        return a.first_name.localeCompare(b.first_name);
    });
    return copy;
}
async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        throw new Error("HTTP " + res.status + " for " + url);
    }
    return (await res.json());
}
function qs(id) {
    return document.getElementById(id);
}
function showErrors(messages) {
    const box = qs("errors");
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
function populateListenerSelect(listeners) {
    const sel = qs("listenerSelect");
    if (!sel)
        return;
    sel.innerHTML = '<option value="" disabled selected>Select a listener</option>';
    const sorted = sortListenersByName(listeners);
    for (let i = 0; i < sorted.length; i++) {
        const listener = sorted[i];
        const opt = document.createElement("option");
        opt.value = String(listener.id);
        opt.textContent = listener.first_name + " " + listener.last_name + " (@" + listener.username + ")";
        sel.appendChild(opt);
    }
}
function populateAlbumSelect(albums) {
    const sel = qs("albumSelect");
    const trackSel = qs("trackSelect");
    if (!sel || !trackSel)
        return;
    sel.innerHTML = '<option value="" disabled selected>Select an album</option>';
    trackSel.innerHTML = '<option value="" disabled selected>Select a track</option>';
    trackSel.disabled = true;
    const copy = albums.slice();
    copy.sort(function (a, b) {
        if (b.year !== a.year)
            return b.year - a.year;
        return a.title.localeCompare(b.title);
    });
    for (let i = 0; i < copy.length; i++) {
        const album = copy[i];
        const opt = document.createElement("option");
        opt.value = album.id;
        opt.textContent = album.title;
        sel.appendChild(opt);
    }
    sel.addEventListener("change", function () {
        const albumId = sel.value;
        const album = allAlbums.find(function (a) { return a.id === albumId; });
        trackSel.innerHTML = '<option value="" disabled selected>Select a track</option>';
        trackSel.disabled = true;
        if (!album)
            return;
        for (let j = 0; j < album.tracks.length; j++) {
            const t = album.tracks[j];
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = getTrackLabel(t);
            trackSel.appendChild(opt);
        }
        trackSel.disabled = album.tracks.length === 0;
    });
}
function readAndValidateForm() {
    const listenerSel = qs("listenerSelect");
    const albumSel = qs("albumSelect");
    const trackSel = qs("trackSelect");
    const dateInput = qs("dateInput");
    let listenerId = 0;
    let albumId = "";
    let trackId = "";
    let dateJson = "";
    const errors = [];
    if (listenerSel && listenerSel.value) {
        listenerId = parseInt(listenerSel.value, 10);
    }
    else {
        errors.push("Please select a listener.");
    }
    if (albumSel && albumSel.value) {
        albumId = albumSel.value;
    }
    else {
        errors.push("Please select an album.");
    }
    if (trackSel && trackSel.value) {
        trackId = trackSel.value;
    }
    else {
        errors.push("Please select a track.");
    }
    if (dateInput && dateInput.value) {
        dateJson = toJsonDate(dateInput.value);
    }
    else {
        dateJson = toJsonDate(""); // today
    }
    return { listenerId, albumId, trackId, dateJson, errors };
}
async function handleSubmit(evt) {
    evt.preventDefault();
    const result = readAndValidateForm();
    if (result.errors.length > 0) {
        showErrors(result.errors);
        return;
    }
    showErrors([]);
    const payload = {
        id: result.listenerId,
        track_id: result.trackId,
        date: result.dateJson
    };
    const button = document.activeElement;
    if (button)
        button.disabled = true;
    try {
        const res = await fetch(SCROBBLE_POST_URL, {
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
        showErrors(["Could not add the scrobble. Please try again."]);
        if (button)
            button.disabled = false;
    }
}
async function initScrobblePage() {
    const form = qs("scrobbleForm");
    if (form)
        form.addEventListener("submit", handleSubmit);
    const dateInput = qs("dateInput");
    if (dateInput) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        const mm = m < 10 ? "0" + String(m) : String(m);
        const dd = d < 10 ? "0" + String(d) : String(d);
        dateInput.value = y + "-" + mm + "-" + dd;
    }
    try {
        const albums = await fetchJson(ALBUMS_URL);
        const listeners = await fetchJson(LISTENERS_URL);
        allAlbums = Array.isArray(albums) ? albums : [];
        allListeners = Array.isArray(listeners) ? listeners : [];
        populateAlbumSelect(allAlbums);
        populateListenerSelect(allListeners);
    }
    catch (err) {
        console.error(err);
        showErrors(["Could not load data for albums/listeners. Please try again."]);
    }
}
initScrobblePage();
export {};
