
interface TrackFromJson {
  id: string;
  duration: number; 
  name: string;     
}

interface AlbumFromJson {
  title: string;
  artist: string;
  id: string;       
  year: number;
  genre: string;
  imageLink: string;
  tracks: TrackFromJson[];
}

interface Scrobble {
  track_id: string;
  date: string;     
}

interface ListenerFromJson {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  enrolled: string; 
  avatar: string;  
  scrobbles: Scrobble[];
}


interface ListenerViewModel {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  enrolled: string;
  avatar: string;
  scrobbles: Scrobble[];
  totalScrobbles: number;
  lastScrobbleTrackName: string;
  lastScrobbleArtist: string;
  lastScrobbleAlbumImage: string;
}


const STATS_CONTAINER_ID: string = "stats";
const ALBUM_FILTER_ID: string = "albumFilter";
const SORT_SELECT_ID: string = "sortOrder";
const ERROR_BOX_ID: string = "error";

const ALBUMS_URL: string = "./files/albums.json";
const LISTENERS_URL: string = "./files/listeners.json";


let albumsData: AlbumFromJson[] = [];
let listenersData: ListenerFromJson[] = [];
let listenerViewModels: ListenerViewModel[] = [];

interface TrackLookupInfo {
  trackName: string;
  artist: string;
  albumImage: string;
  albumTitle: string;
}
let trackIndex: { [trackId: string]: TrackLookupInfo } = {};


function parseDate(dateText: string): Date {
  
  const parts: string[] = dateText.split("/");
  const year: number = parseInt(parts[0], 10);
  const monthIndex: number = parseInt(parts[1], 10) - 1; 
  const day: number = parseInt(parts[2], 10);
  return new Date(year, monthIndex, day);
}

function buildTrackIndex(albums: AlbumFromJson[]): void {
  trackIndex = {};
  for (let i = 0; i < albums.length; i++) {
    const album: AlbumFromJson = albums[i];
    for (let j = 0; j < album.tracks.length; j++) {
      const track: TrackFromJson = album.tracks[j];
      trackIndex[track.id] = {
        trackName: track.name,
        artist: album.artist,
        albumImage: album.imageLink,
        albumTitle: album.title
      };
    }
  }
}

function toListenerViewModel(raw: ListenerFromJson): ListenerViewModel {
  const view: ListenerViewModel = {
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
    
    let mostRecent: Scrobble = raw.scrobbles[0];
    for (let i = 1; i < raw.scrobbles.length; i++) {
      const current: Scrobble = raw.scrobbles[i];
      if (parseDate(current.date).getTime() > parseDate(mostRecent.date).getTime()) {
        mostRecent = current;
      }
    }

    const info: TrackLookupInfo | undefined = trackIndex[mostRecent.track_id];
    if (info) {
      view.lastScrobbleTrackName = info.trackName;
      view.lastScrobbleArtist = info.artist;
      view.lastScrobbleAlbumImage = info.albumImage;
    }
  }

  return view;
}

function renderListeners(listeners: ListenerViewModel[]): void {
  const container = document.getElementById(STATS_CONTAINER_ID);
  if (!container) return;

  if (listeners.length === 0) {
    container.innerHTML = `<p class="stats-empty">No listeners match the current selection.</p>`;
    return;
  }

  let html = "";
  for (let i = 0; i < listeners.length; i++) {
    const vm: ListenerViewModel = listeners[i];

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

function uniqueAlbumTitles(albums: AlbumFromJson[]): string[] {
  const seen: { [title: string]: boolean } = {};
  const titles: string[] = [];
  for (let i = 0; i < albums.length; i++) {
    const title: string = albums[i].title;
    if (!seen[title]) {
      seen[title] = true;
      titles.push(title);
    }
  }
  titles.sort((a, b) => a.localeCompare(b));
  return titles;
}

function populateAlbumFilterOptions(albums: AlbumFromJson[]): void {
  const select = document.getElementById(ALBUM_FILTER_ID) as HTMLSelectElement | null;
  if (!select) return;

  
  const titles = uniqueAlbumTitles(albums);
  for (let i = 0; i < titles.length; i++) {
    const opt = document.createElement("option");
    opt.value = titles[i];
    opt.textContent = titles[i];
    select.appendChild(opt);
  }
}

function filterByAlbumTitle(source: ListenerViewModel[], albumTitle: string): ListenerViewModel[] {
  if (albumTitle === "all") return source;

  
  const trackIdsForAlbum: { [id: string]: boolean } = {};
  for (let i = 0; i < albumsData.length; i++) {
    const album: AlbumFromJson = albumsData[i];
    if (album.title === albumTitle) {
      for (let j = 0; j < album.tracks.length; j++) {
        trackIdsForAlbum[album.tracks[j].id] = true;
      }
    }
  }

  const result: ListenerViewModel[] = [];
  for (let k = 0; k < source.length; k++) {
    const vm: ListenerViewModel = source[k];
    let hasMatch: boolean = false;
    for (let s = 0; s < vm.scrobbles.length; s++) {
      const scrobble: Scrobble = vm.scrobbles[s];
      if (trackIdsForAlbum[scrobble.track_id]) {
        hasMatch = true;
        break;
      }
    }
    if (hasMatch) result.push(vm);
  }
  return result;
}

function sortListeners(list: ListenerViewModel[], sortKey: string): ListenerViewModel[] {
  const copy = list.slice();
  if (sortKey === "name") {
    copy.sort((a, b) => {
      const lastCmp = a.lastName.localeCompare(b.lastName);
      if (lastCmp !== 0) return lastCmp;
      return a.firstName.localeCompare(b.firstName);
    });
  } else if (sortKey === "scrobbles") {
    copy.sort((a, b) => b.totalScrobbles - a.totalScrobbles);
  }
  return copy;
}

function showError(message: string): void {
  const errorBox = document.getElementById(ERROR_BOX_ID);
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.removeAttribute("hidden");
}


window.addEventListener("load", function () {
  const statsDiv = document.getElementById(STATS_CONTAINER_ID);
  if (statsDiv) statsDiv.innerHTML = "";

  
  fetch(ALBUMS_URL)
    .then(function (res) { return res.json(); })
    .then(function (albums: AlbumFromJson[]) {
      albumsData = albums;
      buildTrackIndex(albumsData);
      populateAlbumFilterOptions(albumsData);

      
      return fetch(LISTENERS_URL);
    })
    .then(function (res) { return res.json(); })
    .then(function (listeners: ListenerFromJson[]) {
      listenersData = listeners;

      
      listenerViewModels = [];
      for (let i = 0; i < listenersData.length; i++) {
        listenerViewModels.push(toListenerViewModel(listenersData[i]));
      }

    
      const sortSelect = document.getElementById(SORT_SELECT_ID) as HTMLSelectElement | null;
      const initialSortKey: string = sortSelect ? sortSelect.value : "name";
      const initialSorted: ListenerViewModel[] = sortListeners(listenerViewModels, initialSortKey);
      renderListeners(initialSorted);

    
      const albumFilter = document.getElementById(ALBUM_FILTER_ID) as HTMLSelectElement | null;
      if (albumFilter) {
        albumFilter.addEventListener("change", function () {
          const selectedTitle: string = albumFilter.value;
          const filtered: ListenerViewModel[] = filterByAlbumTitle(listenerViewModels, selectedTitle);

          const currentSort = (document.getElementById(SORT_SELECT_ID) as HTMLSelectElement | null);
          const sortKey: string = currentSort ? currentSort.value : "name";

          const finalList: ListenerViewModel[] = sortListeners(filtered, sortKey);
          renderListeners(finalList);
        });
      }

      const sortSelectEl = document.getElementById(SORT_SELECT_ID) as HTMLSelectElement | null;
      if (sortSelectEl) {
        sortSelectEl.addEventListener("change", function () {
          const selectedAlbum = (document.getElementById(ALBUM_FILTER_ID) as HTMLSelectElement | null);
          const albumTitle: string = selectedAlbum ? selectedAlbum.value : "all";

          const filtered: ListenerViewModel[] = filterByAlbumTitle(listenerViewModels, albumTitle);
          const finalList: ListenerViewModel[] = sortListeners(filtered, sortSelectEl.value);
          renderListeners(finalList);
        });
      }
    })
    .catch(function (e) {
      console.error(e);
      showError("Sorry, we couldn’t load stats right now.");
    });
});
