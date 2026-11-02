/* =========================================================
   VIDEO PORTFOLIO ADMIN
========================================================= */

let currentVideoProjects = [];
let currentCategories = [];
let autoPoster = null; // JPEG frame grabbed from the chosen video
let inspectToken = 0;

const BUCKET = "portfolio-videos";

const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");

/* ---------------- AUTH ---------------- */

async function checkAuth() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    await startAdmin();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  adminPanel.classList.add("hidden");
}

async function startAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError) {
    console.error("AUTH ERROR:", userError);
    alert("Auth error:\n\n" + userError.message);
    showLogin();
    return;
  }

  if (!user) {
    showLogin();
    return;
  }

  const { data: admin, error: adminError } = await supabaseClient
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("ADMIN QUERY ERROR:", adminError);
    alert(
      "Admin check failed:\n\n" +
        adminError.message +
        "\n\nCode: " +
        adminError.code
    );
    return;
  }

  if (!admin) {
    alert("Your login works, but this account is not an admin.");
    await supabaseClient.auth.signOut();
    showLogin();
    return;
  }

  loginScreen.classList.add("hidden");
  adminPanel.classList.remove("hidden");

  await loadCategories();
  await loadVideoProjects();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  loginMessage.textContent = "Signing in...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  loginMessage.textContent = "";
  await startAdmin();
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

/* ---------------- CATEGORIES ---------------- */

async function loadCategories() {
  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    showToast("Could not load categories: " + error.message);
    return;
  }

  currentCategories = data || [];
  renderCategories();
}

function renderCategories() {
  const container = document.getElementById("categoriesList");

  if (!currentCategories.length) {
    container.innerHTML = `
      <div class="admin-card">
        <p>No categories yet. Add one above, then you can add videos.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentCategories
    .map((cat) => {
      const count = currentVideoProjects.filter(
        (v) => v.category_id === cat.id
      ).length;

      return `
        <div class="category-row">
          <div>
            <strong>${escapeHTML(cat.name)}</strong>
            <small>${count} video${count === 1 ? "" : "s"}</small>
          </div>
          <div class="project-actions">
            <button onclick="renameCategory('${cat.id}')">RENAME</button>
            <button class="delete" onclick="deleteCategory('${cat.id}')">
              DELETE
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

document
  .getElementById("categoryForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = document.getElementById("categoryName");
    const name = input.value.trim();
    if (!name) return;

    const nextOrder =
      currentCategories.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) +
      1;

    const { error } = await supabaseClient
      .from("categories")
      .insert({ name, sort_order: nextOrder });

    if (error) {
      alert(
        error.code === "23505"
          ? "A category with that name already exists."
          : "Could not add category:\n\n" + error.message
      );
      return;
    }

    input.value = "";
    await loadCategories();
    showToast("Category added.");
  });

async function renameCategory(id) {
  const cat = currentCategories.find((c) => c.id === id);
  if (!cat) return;

  const name = (prompt("Rename category:", cat.name) || "").trim();
  if (!name || name === cat.name) return;

  const { error } = await supabaseClient
    .from("categories")
    .update({ name })
    .eq("id", id);

  if (error) {
    alert(
      error.code === "23505"
        ? "A category with that name already exists."
        : "Could not rename:\n\n" + error.message
    );
    return;
  }

  await loadCategories();
  await loadVideoProjects();
  showToast("Category renamed.");
}

async function deleteCategory(id) {
  const cat = currentCategories.find((c) => c.id === id);
  if (!cat) return;

  const used = currentVideoProjects.filter((v) => v.category_id === id).length;

  if (used) {
    alert(
      `"${cat.name}" still has ${used} video${used === 1 ? "" : "s"}.\n\n` +
        "Move those videos to another category (or delete them) first."
    );
    return;
  }

  if (!confirm(`Delete category "${cat.name}"?`)) return;

  const { error } = await supabaseClient
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadCategories();
  showToast("Category deleted.");
}

/* ---------------- VIDEO LIST ---------------- */

function sortProjects(list) {
  return [...list].sort(
    (a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0) ||
      new Date(b.created_at) - new Date(a.created_at)
  );
}

async function loadVideoProjects() {
  const { data, error } = await supabaseClient
    .from("video_projects")
    .select("*");

  if (error) {
    console.error(error);
    showToast("Could not load videos: " + error.message);
    return;
  }

  currentVideoProjects = sortProjects(data || []);
  renderVideoProjects();
  renderCategories(); // refresh the per-category counts
}

function ratioLabel(orientation) {
  return orientation === "vertical" ? "9:16" : "16:9";
}

function renderVideoProjects() {
  const container = document.getElementById("videoProjectsList");

  if (!currentVideoProjects.length) {
    container.innerHTML = `
      <div class="admin-card">
        <p>No video edits yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentVideoProjects
    .map((video) => {
      const cat = currentCategories.find((c) => c.id === video.category_id);

      const thumb = video.poster_url
        ? `<img class="project-thumb" src="${escapeAttribute(
            video.poster_url
          )}" alt="" loading="lazy" />`
        : `<video class="project-thumb" src="${escapeAttribute(
            video.video_url
          )}#t=0.1" muted playsinline preload="metadata"></video>`;

      return `
      <div class="project-admin-card">
        ${thumb}

        <div class="project-admin-info">
          <h3>${escapeHTML(video.title || "Untitled Edit")}</h3>
          <div class="meta-line">
            ${
              cat
                ? `<span class="badge">${escapeHTML(cat.name)}</span>`
                : `<span class="badge warn">NO CATEGORY</span>`
            }
            <span class="badge">${ratioLabel(video.orientation)}</span>
          </div>
        </div>

        <div class="project-actions">
          <button onclick="editVideoProject('${video.id}')">EDIT</button>
          <button class="delete" onclick="deleteVideoProject('${video.id}')">
            DELETE
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

/* ---------------- VIDEO FORM ---------------- */

function fillCategorySelect(selectedId) {
  const select = document.getElementById("videoCategory");

  select.innerHTML =
    `<option value="" disabled ${selectedId ? "" : "selected"}>Select a category</option>` +
    currentCategories
      .map(
        (c) =>
          `<option value="${escapeAttribute(c.id)}" ${
            c.id === selectedId ? "selected" : ""
          }>${escapeHTML(c.name)}</option>`
      )
      .join("");
}

function openVideoProjectForm() {
  if (!currentCategories.length) {
    alert("Add at least one category first.");
    return;
  }

  inspectToken++;
  autoPoster = null;

  document.getElementById("videoProjectForm").reset();
  fillCategorySelect(null);

  document.getElementById("videoProjectId").value = "";
  document.getElementById("videoModalTitle").textContent = "Add Video Edit";
  document.getElementById("videoCurrent").textContent = "";
  document.getElementById("videoDetected").textContent = "";
  document.getElementById("videoOrientation").value = "horizontal";
  document.getElementById("videoOrder").value = "0";
  document.getElementById("videoSaveBtn").disabled = false;
  document.getElementById("videoProjectModal").classList.remove("hidden");
}

function closeVideoProjectForm() {
  document.getElementById("videoProjectModal").classList.add("hidden");
}

function editVideoProject(id) {
  const video = currentVideoProjects.find((item) => item.id === id);
  if (!video) return;

  openVideoProjectForm();
  if (document.getElementById("videoProjectModal").classList.contains("hidden"))
    return;

  document.getElementById("videoModalTitle").textContent = "Edit Video Edit";
  document.getElementById("videoProjectId").value = video.id;
  document.getElementById("videoTitle").value = video.title || "";
  document.getElementById("videoOrientation").value =
    video.orientation === "vertical" ? "vertical" : "horizontal";
  document.getElementById("videoOrder").value = video.sort_order || 0;
  fillCategorySelect(video.category_id);

  document.getElementById("videoCurrent").innerHTML = `
    Current video (leave the file empty to keep it):<br>
    <a href="${escapeAttribute(video.video_url)}" target="_blank" rel="noopener">Open video</a>
    ${
      video.poster_url
        ? ` · <a href="${escapeAttribute(
            video.poster_url
          )}" target="_blank" rel="noopener">Open thumbnail</a>`
        : ""
    }
  `;
}

document
  .getElementById("videoProjectForm")
  .addEventListener("submit", saveVideoProject);

/* ---------------- READ THE CHOSEN VIDEO (ratio + thumbnail) ---------------- */

function inspectVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let finished = false;
    let size = null;

    const finish = (fn, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      fn(value);
    };

    const timer = setTimeout(
      () => finish(reject, new Error("Timed out reading the video.")),
      20000
    );

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onerror = () => finish(reject, new Error("Unreadable video."));

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        finish(reject, new Error("No video size."));
        return;
      }

      size = { width, height };

      const duration = isFinite(video.duration) ? video.duration : 1;
      video.currentTime = Math.max(0.1, Math.min(1, duration * 0.1));
    };

    video.onseeked = () => {
      try {
        const scale = Math.min(1, 1280 / Math.max(size.width, size.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(size.width * scale);
        canvas.height = Math.round(size.height * scale);
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (poster) => finish(resolve, { ...size, poster }),
          "image/jpeg",
          0.82
        );
      } catch (e) {
        finish(resolve, { ...size, poster: null });
      }
    };

    video.src = url;
  });
}

document.getElementById("videoFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const info = document.getElementById("videoDetected");
  const token = ++inspectToken;

  autoPoster = null;

  if (!file) {
    info.textContent = "";
    return;
  }

  info.textContent = "Reading video…";

  try {
    const meta = await inspectVideo(file);
    if (token !== inspectToken) return;

    const orientation = meta.height > meta.width ? "vertical" : "horizontal";
    document.getElementById("videoOrientation").value = orientation;
    autoPoster = meta.poster;

    info.textContent = `Detected ${meta.width}×${meta.height} → ${ratioLabel(
      orientation
    )}. You can change the ratio below if needed.`;
  } catch (error) {
    if (token !== inspectToken) return;
    console.warn(error);
    info.textContent =
      "Couldn't read this video in the browser — pick the ratio below manually.";
  }
});

/* ---------------- UPLOAD ---------------- */

function extensionOf(file, fallback) {
  const fromName = (file.name || "").split(".").pop().toLowerCase();
  return fromName && fromName !== (file.name || "").toLowerCase()
    ? fromName
    : fallback;
}

async function uploadFile(file, folder, fallbackExt) {
  const path = `${folder}/${crypto.randomUUID()}.${extensionOf(file, fallbackExt)}`;

  const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function storagePathFromUrl(url) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

async function removeFiles(urls) {
  const paths = urls.map(storagePathFromUrl).filter(Boolean);
  if (!paths.length) return;

  const { error } = await supabaseClient.storage.from(BUCKET).remove(paths);
  if (error) console.warn("Could not remove old files:", error);
}

/* ---------------- SAVE ---------------- */

async function saveVideoProject(event) {
  event.preventDefault();

  const saveBtn = document.getElementById("videoSaveBtn");

  try {
    const id = document.getElementById("videoProjectId").value;
    const title = document.getElementById("videoTitle").value.trim();
    const categoryId = document.getElementById("videoCategory").value;
    const orientation = document.getElementById("videoOrientation").value;
    const sortOrder = parseInt(document.getElementById("videoOrder").value, 10) || 0;
    const file = document.getElementById("videoFile").files[0];
    const posterFile = document.getElementById("posterFile").files[0];

    if (!title) {
      alert("Please enter a title.");
      return;
    }

    if (!categoryId) {
      alert("Please choose a category.");
      return;
    }

    if (!id && !file) {
      alert("Please choose a video.");
      return;
    }

    if (file && !file.type.startsWith("video/")) {
      alert("Please choose a video file.");
      return;
    }

    if (posterFile && !posterFile.type.startsWith("image/")) {
      alert("The thumbnail must be an image.");
      return;
    }

    const existing = id
      ? currentVideoProjects.find((item) => item.id === id)
      : null;

    saveBtn.disabled = true;

    let videoUrl = null;
    let posterUrl = null;

    if (file) {
      showToast("Uploading video… keep this tab open.");
      videoUrl = await uploadFile(file, "videos", "mp4");
    }

    if (posterFile) {
      showToast("Uploading thumbnail…");
      posterUrl = await uploadFile(posterFile, "posters", "jpg");
    } else if (file && autoPoster) {
      posterUrl = await uploadFile(
        new File([autoPoster], "poster.jpg", { type: "image/jpeg" }),
        "posters",
        "jpg"
      );
    }

    const row = {
      title,
      category_id: categoryId,
      orientation,
      sort_order: sortOrder,
    };

    if (existing) {
      row.updated_at = new Date().toISOString();

      if (videoUrl) row.video_url = videoUrl;

      // a new video must not keep the old video's thumbnail
      if (posterUrl) row.poster_url = posterUrl;
      else if (videoUrl) row.poster_url = null;

      const { error } = await supabaseClient
        .from("video_projects")
        .update(row)
        .eq("id", id);

      if (error) throw error;

      const stale = [];
      if (videoUrl) stale.push(existing.video_url);
      if ((posterUrl || videoUrl) && existing.poster_url) stale.push(existing.poster_url);
      await removeFiles(stale);
    } else {
      row.video_url = videoUrl;
      row.poster_url = posterUrl;

      const { error } = await supabaseClient.from("video_projects").insert(row);
      if (error) throw error;
    }

    closeVideoProjectForm();
    await loadVideoProjects();
    showToast("Video saved.");
  } catch (error) {
    console.error(error);
    alert("Could not save video:\n\n" + (error.message || error));
  } finally {
    saveBtn.disabled = false;
  }
}

/* ---------------- DELETE ---------------- */

async function deleteVideoProject(id) {
  if (!confirm("Delete this video?")) return;

  const existing = currentVideoProjects.find((item) => item.id === id);

  const { error } = await supabaseClient
    .from("video_projects")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  if (existing) await removeFiles([existing.video_url, existing.poster_url]);

  await loadVideoProjects();
  showToast("Video deleted.");
}

/* ---------------- HELPERS ---------------- */

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

checkAuth();
