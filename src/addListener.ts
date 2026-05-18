
interface Scrobble {
  track_id: string;
  date: string;
}

interface ListenerJson {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  enrolled: string;
  avatar: string;
  scrobbles: Scrobble[];
}

const LISTENERS_JSON_URL: string = "./files/listeners.json";
const ADD_LISTENER_URL: string = "./php/addListener.php";


function formatDate(d: Date): string {
  const y: number = d.getFullYear();
  const m: number = d.getMonth() + 1;
  const day: number = d.getDate();
  const mm: string = (m < 10 ? "0" : "") + String(m);
  const dd: string = (day < 10 ? "0" : "") + String(day);
  return String(y) + "/" + mm + "/" + dd;
}

async function fetchListeners(): Promise<ListenerJson[]> {
  const res: Response = await fetch(LISTENERS_JSON_URL, {
    cache: "no-store"
  });
  if (!res.ok)
    throw new Error("HTTP " + res.status + " while loading listeners.json");
  const data = await res.json();
  return Array.isArray(data) ? (data as ListenerJson[]) : [];
}

function nextId(list: ListenerJson[]): number {
  let maxId: number = 0;
  for (let i = 0; i < list.length; i++) {
    const id: number = list[i].id;
    if (id > maxId) maxId = id;
  }
  return maxId + 1;
}

function buildAvatarUrl(username: string): string {
  return "https://robohash.org/" + encodeURIComponent(username) + ".png?size=60x60&set=set5";
}


function readAndValidateForm(): { first: string; last: string; user: string; errors: string[] } {
  const firstInput = document.getElementById("firstName") as HTMLInputElement | null;
  const lastInput = document.getElementById("lastName") as HTMLInputElement | null;
  const userInput = document.getElementById("username") as HTMLInputElement | null;

  let first: string = "";
  let last: string = "";
  let user: string = "";

  if (firstInput) first = firstInput.value;
  if (lastInput) last = lastInput.value;
  if (userInput) user = userInput.value;

  first = first.trim();
  last = last.trim();
  user = user.trim();

  const errors: string[] = [];
  if (first.length === 0) errors.push("First name is required.");
  if (last.length === 0) errors.push("Last name is required.");
  if (user.length === 0) errors.push("Username is required.");

  return { first, last, user, errors };
}

function showErrors(messages: string[]): void {
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


async function handleSubmit(evt: Event): Promise<void> {
  evt.preventDefault();

  const result = readAndValidateForm();
  if (result.errors.length > 0) {
    showErrors(result.errors);
    return;
  }
  showErrors([]);

  try {
    const btn = (document.activeElement as HTMLButtonElement) || null;
    if (btn) btn.disabled = true;

    const existing: ListenerJson[] = await fetchListeners();
    const newId: number = nextId(existing);

    const payload: ListenerJson = {
      id: newId,
      first_name: result.first,
      last_name: result.last,
      username: result.user,
      enrolled: formatDate(new Date()),
      avatar: buildAvatarUrl(result.user),
      scrobbles: []
    };

    const res: Response = await fetch(ADD_LISTENER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt: string = await res.text();
      throw new Error("Server error " + res.status + ". " + txt);
    }


    window.location.href = "./stats.html";
  } catch (err) {
    console.error(err);
    showErrors(["Could not add the listener. Please try again."]);
  }
}


(function initAddPage(): void {
  const form = document.getElementById("addForm") as HTMLFormElement | null;
  if (form) form.addEventListener("submit", handleSubmit);
})();
