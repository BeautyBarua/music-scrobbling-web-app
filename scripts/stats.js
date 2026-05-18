const STATS_CONTAINER_ID = "stats";
const ALBUM_FILTER_ID = "albumFilter";
const SORT_SELECT_ID = "sortOrder";
const ERROR_BOX_ID = "error";
const ALBUMS_URL = "./files/albums.json";
const LISTENERS_URL = "./files/listeners.json";
let albumsData = [];
let listenersData = [];
let listenerViewModels = [];
let trackIndex = {};
function parseDate(dateText) {
    const parts = dateText.split("/");
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, monthIndex, day);
}
function buildTrackIndex(albums) {
    trackIndex = {};
    for (let i = 0; i < albums.length; i++) {
        const album = albums[i];
        for (let j = 0; j < album.tracks.length; j++) {
            const track = album.tracks[j];
            trackIndex[track.id] = {
                trackName: track.name,
                artist: album.artist,
                albumImage: album.imageLink,
                albumTitle: album.title
            };
        }
    }
}
function toListenerViewModel(raw) {
    const view = {
        id: raw.id,
        firstName: raw.first_name,
        lastName: raw.last_name,
        username: raw.username,
        enrolled: raw.enrolled,
        avatar: raw.avatar,
        scrobbles: raw.scrobbles.slice(),
        totalScrobbles: raw.scrobbles.length
    };
    if (raw.scrobbles.length > 0) {
        let mostRecent = raw.scrobbles[0];
        for (let i = 1; i < raw.scrobbles.length; i++) {
            const current = raw.scrobbles[i];
            if (parseDate(current.date).getTime() > parseDate(mostRecent.date).getTime()) {
                mostRecent = current;
            }
        }
        const info = trackIndex[mostRecent.track_id];
        if (info) {
            view.lastScrobbleTrackName = info.trackName;
            view.lastScrobbleArtist = info.artist;
            view.lastScrobbleAlbumImage = info.albumImage;
        }
    }
    return view;
}
function renderListeners(listeners) {
    const container = document.getElementById(STATS_CONTAINER_ID);
    if (!container)
        return;
    if (listeners.length === 0) {
        container.innerHTML = `<p class="stats-empty">No listeners match the current selection.</p>`;
        return;
    }
    let html = "";
    for (let i = 0; i < listeners.length; i++) {
        const vm = listeners[i];
        let lastHtml = `<p class="last-scrobble-none">No scrobbles yet.</p>`;
        if (vm.lastScrobbleTrackName && vm.lastScrobbleArtist && vm.lastScrobbleAlbumImage) {
            lastHtml = `
        <div class="last-scrobble">
          <img class="last-scrobble_cover" src="${vm.lastScrobbleAlbumImage}" alt="Album cover">
          <div class="last-scrobble_info">
            <p class="last-scrobble_line"><strong>Track:</strong> ${vm.lastScrobbleTrackName}</p>
            <p class="last-scrobble_line"><strong>Artist:</strong> ${vm.lastScrobbleArtist}</p>
          </div>
        </div>
      `;
        }
        html += `
      <article class="listener-card">
        <div class="listener-card_header">
          <img class="listener-card_avatar" src="${vm.avatar}" alt="${vm.firstName} ${vm.lastName} avatar">
          <div class="listener-card_identity">
            <h3 class="listener-card_name">${vm.firstName} ${vm.lastName}</h3>
            <p class="listener-card_meta">@${vm.username} — Enrolled: ${vm.enrolled}</p>
          </div>
        </div>
        <div class="listener-card_body">
          <p class="listener-card_total"><strong>Total scrobbles:</strong> ${vm.totalScrobbles}</p>
          <p class="listener-card_label"><strong>Last scrobble:</strong></p>
          ${lastHtml}
        </div>
      </article>
    `;
    }
    container.innerHTML = html;
}
function uniqueAlbumTitles(albums) {
    const seen = {};
    const titles = [];
    for (let i = 0; i < albums.length; i++) {
        const title = albums[i].title;
        if (!seen[title]) {
            seen[title] = true;
            titles.push(title);
        }
    }
    titles.sort((a, b) => a.localeCompare(b));
    return titles;
}
function populateAlbumFilterOptions(albums) {
    const select = document.getElementById(ALBUM_FILTER_ID);
    if (!select)
        return;
    const titles = uniqueAlbumTitles(albums);
    for (let i = 0; i < titles.length; i++) {
        const opt = document.createElement("option");
        opt.value = titles[i];
        opt.textContent = titles[i];
        select.appendChild(opt);
    }
}
function filterByAlbumTitle(source, albumTitle) {
    if (albumTitle === "all")
        return source;
    const trackIdsForAlbum = {};
    for (let i = 0; i < albumsData.length; i++) {
        const album = albumsData[i];
        if (album.title === albumTitle) {
            for (let j = 0; j < album.tracks.length; j++) {
                trackIdsForAlbum[album.tracks[j].id] = true;
            }
        }
    }
    const result = [];
    for (let k = 0; k < source.length; k++) {
        const vm = source[k];
        let hasMatch = false;
        for (let s = 0; s < vm.scrobbles.length; s++) {
            const scrobble = vm.scrobbles[s];
            if (trackIdsForAlbum[scrobble.track_id]) {
                hasMatch = true;
                break;
            }
        }
        if (hasMatch)
            result.push(vm);
    }
    return result;
}
function sortListeners(list, sortKey) {
    const copy = list.slice();
    if (sortKey === "name") {
        copy.sort((a, b) => {
            const lastCmp = a.lastName.localeCompare(b.lastName);
            if (lastCmp !== 0)
                return lastCmp;
            return a.firstName.localeCompare(b.firstName);
        });
    }
    else if (sortKey === "scrobbles") {
        copy.sort((a, b) => b.totalScrobbles - a.totalScrobbles);
    }
    return copy;
}
function showError(message) {
    const errorBox = document.getElementById(ERROR_BOX_ID);
    if (!errorBox)
        return;
    errorBox.textContent = message;
    errorBox.removeAttribute("hidden");
}
window.addEventListener("load", function () {
    const statsDiv = document.getElementById(STATS_CONTAINER_ID);
    if (statsDiv)
        statsDiv.innerHTML = "";
    fetch(ALBUMS_URL)
        .then(function (res) { return res.json(); })
        .then(function (albums) {
        albumsData = albums;
        buildTrackIndex(albumsData);
        populateAlbumFilterOptions(albumsData);
        return fetch(LISTENERS_URL);
    })
        .then(function (res) { return res.json(); })
        .then(function (listeners) {
        listenersData = listeners;
        listenerViewModels = [];
        for (let i = 0; i < listenersData.length; i++) {
            listenerViewModels.push(toListenerViewModel(listenersData[i]));
        }
        const sortSelect = document.getElementById(SORT_SELECT_ID);
        const initialSortKey = sortSelect ? sortSelect.value : "name";
        const initialSorted = sortListeners(listenerViewModels, initialSortKey);
        renderListeners(initialSorted);
        const albumFilter = document.getElementById(ALBUM_FILTER_ID);
        if (albumFilter) {
            albumFilter.addEventListener("change", function () {
                const selectedTitle = albumFilter.value;
                const filtered = filterByAlbumTitle(listenerViewModels, selectedTitle);
                const currentSort = document.getElementById(SORT_SELECT_ID);
                const sortKey = currentSort ? currentSort.value : "name";
                const finalList = sortListeners(filtered, sortKey);
                renderListeners(finalList);
            });
        }
        const sortSelectEl = document.getElementById(SORT_SELECT_ID);
        if (sortSelectEl) {
            sortSelectEl.addEventListener("change", function () {
                const selectedAlbum = document.getElementById(ALBUM_FILTER_ID);
                const albumTitle = selectedAlbum ? selectedAlbum.value : "all";
                const filtered = filterByAlbumTitle(listenerViewModels, albumTitle);
                const finalList = sortListeners(filtered, sortSelectEl.value);
                renderListeners(finalList);
            });
        }
    })
        .catch(function (e) {
        console.error(e);
        showError("Sorry, we couldn’t load stats right now.");
    });
});
export {};
