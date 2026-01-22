/**
 * PHASE 2 – LOCAL JSON BUILD LOADING (GITHUB PAGES FRIENDLY)
 * - Mobile-friendly
 * - Loads builds from /build-orders/*.json
 * - Dropdown + optional JSON URL input
 * - Fully static; no web scraping
 * - Can deploy locally and on GitHub Pages
 *
 * Deployment instructions:
 * 1. In `build-advisor/`, run `npm install`.
 * 2. Use `npm run dev -- --host` to preview locally.
 * 3. Once ready, run `npm run build` to generate static files in `build-advisor/dist`.
 * 4. Deploy to GitHub Pages using `gh-pages` branch:
 *    - `npm install --save-dev gh-pages`
 *    - Add scripts `predeploy` and `deploy` in package.json pointing to `build-advisor/dist`
 *    - Run `npm run deploy`
 * 5. The public/build-orders JSON folder is served statically; use the Python ingestion script to update before deploying.
 */

import React, { useEffect, useMemo, useState, useRef } from "react";

const DEFAULT_BUILD = {
  name: "Sample Terran Macro Opener",
  race: "Terran",
  steps: [
    { supply: 14, time: "0:02", action: "Supply Depot" },
    { supply: 16, time: "0:06", action: "Barracks" },
    { supply: 19, time: "0:08", action: "Refinery" },
    { supply: 19, time: "0:12", action: "Orbital Command" },
    { supply: 20, time: "0:015", action: "Command Center (Expand)" }
  ]
};

function parseTimeSafe(t) {
  if (!t || !t.includes(":")) return 0;
  const [m, s] = t.split(":").map(n => Number(n) || 0);
  return m * 60 + s;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// NEW: Validate build JSON (tolerant – allows extra keys)
function validateBuild(json) {
  if (!json || typeof json !== "object") return false;
  if (typeof json.name !== "string") return false;
  if (typeof json.race !== "string") return false;
  if (!Array.isArray(json.steps)) return false;

  for (const step of json.steps) {
    if (!step || typeof step !== "object") return false;
    if (typeof step.time !== "string") return false;
    if (typeof step.supply !== "number") return false;
    if (typeof step.action !== "string") return false;
  }

  return true;
}

export default function BuildAdvisor() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [availableBuilds, setAvailableBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState("");
  const [build, setBuild] = useState(() => {
    const saved = localStorage.getItem("build-advisor:build");
    return saved ? JSON.parse(saved) : DEFAULT_BUILD;
  });

  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // NEW: user-visible error text
  const [successMessage, setSuccessMessage] = useState(""); // NEW: success text(""); // NEW: user-visible error text
  const fileInputRef = useRef(null); // NEW: local file loader(""); // NEW: success text(""); // NEW: user-visible error text
  const dropRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false); // NEW: drag-over visual state

  // NEW: Screen wake lock state (mobile keep-screen-on)
  const [wakeLock, setWakeLock] = useState(null);
  const audioRef = useRef(null);

  // NEW: Request or release screen wake lock
  async function toggleWakeLock() {
    try {
      if (wakeLock) {
        await wakeLock.release();
        setWakeLock(null);
      } else if ('wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        lock.addEventListener('release', () => setWakeLock(null));
      } else {
        alert('Screen wake lock is not supported on this device/browser.');
      }
    } catch (err) {
      console.error('Wake lock error:', err);
    }
  }

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}build-orders/index.json`)
      .then(r => r.json())
      .then(setAvailableBuilds)
      .catch(() => setAvailableBuilds([]));

    const params = new URLSearchParams(window.location.search);
    const buildId = params.get("build");
    if (buildId) loadLocalBuild(buildId);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const enrichedSteps = useMemo(() => {
    return build.steps.map((step, i) => {
      const start = parseTimeSafe(step.time);
      const end = i < build.steps.length - 1
        ? parseTimeSafe(build.steps[i + 1].time)
        : Infinity;
      return { ...step, start, end };
    });
  }, [build]);

  const visibleSteps = useMemo(() => {
    const done = enrichedSteps.filter(s => seconds >= s.end);
    const lastDone = done.slice(-2);
    const remaining = enrichedSteps.filter(s => seconds < s.end);

    // Audio notification on new completed step
    if (done.length > 0 && !muted) {
      const lastStep = done[done.length - 1];
      if (audioRef.current && seconds === lastStep.end) {
        audioRef.current.play().catch(() => {});
      }
    }

    return [...lastDone, ...remaining];
  }, [enrichedSteps, seconds, muted]);

  async function loadLocalBuild(buildId) {
    try {
      setLoadingLink(true);
      setErrorMessage("");
      setSuccessMessage("");
      const res = await fetch(`${import.meta.env.BASE_URL}build-orders/${buildId}.json`);
      if (!res.ok) throw new Error("Build not found");
      const json = await res.json();
      if (!validateBuild(json)) throw new Error("Invalid build format");
      setBuild(json);
      setSeconds(0);
      setSuccessMessage("Build Loaded");
      setRunning(false);
      setSelectedBuild(buildId);
    } catch (err) {
      setErrorMessage(err.message || "Build not available locally.");
    } finally {
      setLoadingLink(false);
    }
  }

// NEW: Load build from local file (shared by file input + drag/drop)
  async function loadFromFile(file) {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      if (!file) throw new Error("No file provided");

      // Some browsers do not set file.type reliably, so only check extension
      if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Please drop a valid .json file");
      }

      const text = await file.text();
      const json = JSON.parse(text);

      if (!validateBuild(json)) throw new Error("Invalid build JSON schema");

      setBuild(json);
      setSuccessMessage("Build Loaded");
      setSeconds(0);
      setRunning(false);
    } catch (err) {
      setErrorMessage(err.message || "Invalid JSON file");
    }
  }

  async function loadFromLink(url) {
    try {
      setLoadingLink(true);
      setErrorMessage("");
      setSuccessMessage("");
      // NEW: Normalize GitHub blob URLs to raw.githubusercontent.com
      let fetchUrl = url;
      if (url.includes("github.com") && url.includes("/blob/")) {
        fetchUrl = url
          .replace("https://github.com/", "https://raw.githubusercontent.com/")
          .replace("/blob/", "/");
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("Fetch failed");

      const json = await res.json();
      if (!validateBuild(json)) throw new Error("Invalid build format");

      setBuild(json);
      setSeconds(0);
      setSuccessMessage("Build Loaded");
      setRunning(false);
      setLinkInput("");
    }  catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Unable to load build JSON from link.");
    } finally {
      setLoadingLink(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <header className="mb-6">
        
        <h1 className="text-2xl font-bold">Build Advisor</h1>
        <p className="opacity-70">{build.name} • {build.race}</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button onClick={() => setRunning(true)} className="px-4 py-2 rounded-xl bg-green-600">Start</button>
        <button onClick={() => setRunning(false)} className="px-4 py-2 rounded-xl bg-yellow-600">Pause</button>
        <button onClick={() => { setRunning(false); setSeconds(0); }} className="px-4 py-2 rounded-xl bg-red-600">Reset</button>
        <button onClick={() => setMuted(m => !m)} className={`ml-4 p-2 rounded-full transition ${muted ? 'bg-red-600' : 'bg-green-600'}`}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm opacity-80 mb-1">Select build</label>
        <select
          value={selectedBuild}
          onChange={e => loadLocalBuild(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700"
        >
          <option value="">-- Choose a build --</option>
          {availableBuilds.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm opacity-80 mb-1">Load build from JSON URL</label>
        <div className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="https://example.com/build.json"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 focus:outline-none focus:ring"
          />
          <button
            disabled={!linkInput || loadingLink}
            onClick={() => loadFromLink(linkInput)}
            className="px-4 py-2 rounded-xl bg-blue-600 disabled:opacity-50"
          >
            {loadingLink ? "Loading…" : "Load"}
          </button>
        </div>
      </div>

      

      {/* NEW: Load build from local JSON file */}
      <div className="mb-6">
        <label className="block text-sm opacity-80 mb-1">Load build from local file</label>

        {/* NEW: Drag-and-drop zone */}
        <div
          onDragOver={e => {
            e.preventDefault();        // REQUIRED
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault();        // REQUIRED
            setIsDragging(false);

            const file = e.dataTransfer.files?.[0];
            if (file) {
              loadFromFile(file);
            }
          }}
          className={`mb-3 flex items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-sm transition-all duration-200 ${
            isDragging
              ? "border-blue-400 bg-blue-900/30 scale-[1.02]"
              : "border-neutral-700 bg-neutral-900 opacity-80"
          }`}
        >
          Drag & drop a build JSON here
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={e => e.target.files && loadFromFile(e.target.files[0])}
          className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-neutral-200 hover:file:bg-neutral-700"
        />
      </div>

      <div className="mb-6">
        {successMessage && !errorMessage && (
          <div className="mb-4 rounded-xl border border-green-700 bg-green-900/40 px-4 py-2 text-sm text-green-200">
            {successMessage} 
            <p className="opacity-70">{build.name} • {build.race}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        )}
      </div>

      <p className="mb-4 text-lg flex items-center gap-2">
        Game Time: <strong>{formatTime(seconds)}</strong>

        {/* NEW: Keep screen awake button (mobile-friendly) */}
        <button
          onClick={toggleWakeLock}
          className={`ml-2 p-1.5 rounded-full text-sm transition ${wakeLock ? 'bg-blue-600' : 'bg-neutral-700'}`}
          title={wakeLock ? 'Allow screen to sleep' : 'Keep screen on'}
        >
          {wakeLock ? '📱🔆' : '📱'}
        </button>

        <small>Screen Lock</small>
      </p>

      

      <div className="grid gap-3">
        {visibleSteps.map((step, i) => {
          const active = seconds >= step.start && seconds < step.end;
          const done = seconds >= step.end;

          return (
            <div
              key={i}
              className={`p-4 rounded-2xl shadow transition border ${
                active
                  ? "bg-blue-600 border-blue-400"
                  : done
                  ? "bg-neutral-800 opacity-60 border-neutral-700"
                  : "bg-neutral-900 border-neutral-700"
              }`}
            >
              <div className="text-sm opacity-80">@ {step.time} • {step.supply} supply</div>
              <div className="text-lg font-semibold">{step.action}</div>
            </div>
          );
        })}
      </div>

      {/* Audio element for notifications */}
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/notification.mp3`} preload="auto" />
    </div>
  );
}
