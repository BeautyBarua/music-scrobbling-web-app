let libraryAlbums = [];
const ALBUMS_JSON_URL = "./files/albums.json";
function getDisplayTrackName(track) {
    const n = track.name ?? track.title ?? "Untitled";
    return String(n).trim();
}
function formatSecondsAsMmSs(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
function getAlbumTotalDurationSeconds(album) {
    let sum = 0;
    for (const t of album.tracks)
        sum += t.duration ?? 0;
    return sum;
}
function getUniqueYearsDesc(albums) {
    return Array.from(new Set(albums.map(a => a.year))).sort((a, b) => b - a);
}
function getUniqueGenres(albums) {
    return Array.from(new Set(albums.map(a => a.genre))).sort((a, b) => a.localeCompare(b));
}
function spotifyAlbumUrl(id) {
    return `https://open.spotify.com/album/${encodeURIComponent(id)}`;
}
function spotifyTrackUrl(id) {
    return `https://open.spotify.com/track/${encodeURIComponent(id)}`;
}
function renderAlbumCards(albums) {
    const container = document.getElementById("library");
    if (!container)
        return;
    if (albums.length === 0) {
        container.innerHTML = `<div class="empty">No albums match the current filters.</div>`;
        return;
    }
    let html = "";
    for (const album of albums) {
        const totalTime = formatSecondsAsMmSs(getAlbumTotalDurationSeconds(album));
        const trackItems = album.tracks
            .map(t => `<li><a href="${spotifyTrackUrl(t.id)}" target="_blank" rel="noopener noreferrer">${getDisplayTrackName(t)}</a> - ${formatSecondsAsMmSs(t.duration)}</li>`)
            .join("");
        html += `
      <article class="card">
        <a href="${spotifyAlbumUrl(album.id)}" target="_blank" rel="noopener noreferrer">
          <img class="cover" src="${album.imageLink}" alt="${album.title} cover" loading="lazy">
        </a>
        <h2>${album.title}</h2>
        <div class="meta">
          <div>Artist: ${album.artist}</div>
          <div>Genre: ${album.genre}</div>
          <div>Year: ${album.year}</div>
        </div>
        <ol class="tracks">${trackItems}</ol>
        <div class="footer">Tracks: ${album.tracks.length}, Total: ${totalTime}</div>
      </article>
    `;
    }
    container.innerHTML = html;
}
function applyFilters() {
    const yearSelect = document.getElementById("yearFilter");
    const genreSelect = document.getElementById("genreFilter");
    const yearValue = yearSelect ? yearSelect.value : "all";
    const genreValue = genreSelect ? genreSelect.value : "all";
    let list = libraryAlbums;
    if (yearValue !== "all") {
        list = list.filter(a => String(a.year) === yearValue);
    }
    if (genreValue !== "all") {
        list = list.filter(a => a.genre === genreValue);
    }
    renderAlbumCards(list);
}
function buildYearFilter(albums) {
    const select = document.getElementById("yearFilter");
    if (!select)
        return;
    const years = getUniqueYearsDesc(albums);
    select.innerHTML =
        `<option value="all">All years</option>` +
            years.map(y => `<option value="${y}">${y}</option>`).join("");
    select.addEventListener("change", applyFilters);
}
function buildGenreFilter(albums) {
    const select = document.getElementById("genreFilter");
    if (!select)
        return;
    const genres = getUniqueGenres(albums);
    select.innerHTML =
        `<option value="all">All genres</option>` +
            genres.map(g => `<option value="${g}">${g}</option>`).join("");
    select.addEventListener("change", applyFilters);
}
async function boot() {
    const errorBox = document.getElementById("error");
    if (errorBox)
        errorBox.setAttribute("hidden", "true");
    try {
        const res = await fetch(ALBUMS_JSON_URL, { cache: "no-store" });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = (await res.json());
        libraryAlbums = Array.isArray(data) ? data : [];
        buildYearFilter(libraryAlbums);
        buildGenreFilter(libraryAlbums);
        renderAlbumCards(libraryAlbums);
    }
    catch (err) {
        console.error(err);
        const box = document.getElementById("error");
        if (box) {
            box.textContent = "Sorry, we couldn’t load the music library. Please try again later.";
            box.removeAttribute("hidden");
        }
    }
}
boot();
export {};
