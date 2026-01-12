import { useEffect, useMemo, useState } from "react";

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
 * 2. Use `npm run dev` to preview locally.
 * 3. Once ready, run `npm run build` to generate static files in `build-advisor/dist`.
 * 4. Deploy to GitHub Pages using `gh-pages` branch:
 *    - `npm install --save-dev gh-pages`
 *    - Add scripts `predeploy` and `deploy` in package.json pointing to `build-advisor/dist`
 *    - Run `npm run deploy`
 * 5. The public/build-orders JSON folder is served statically; use the Python ingestion script to update before deploying.
 */

const DEFAULT_BUILD = {
  name: "Sample Terran Macro Opener",
  race: "Terran",
  steps: [
    { supply: 14, time: "0:18", action: "Supply Depot" },
    { supply: 16, time: "0:38", action: "Barracks" },
    { supply: 19, time: "1:05", action: "Refinery" },
    { supply: 19, time: "1:20", action: "Orbital Command" },
    { supply: 20, time: "1:45", action: "Command Center (Expand)" }
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

  async function loadLocalBuild(buildId) {
    try {
      setLoadingLink(true);
      const res = await fetch(`${import.meta.env.BASE_URL}build-orders/${buildId}.json`);
      if (!res.ok) throw new Error("Build not found");
      const json = await res.json();
      if (!json.steps) throw new Error("Invalid build format");
      setBuild(json);
      setSeconds(0);
      setRunning(false);
      setSelectedBuild(buildId);
    } catch {
      alert("Build not available locally.");
    } finally {
      setLoadingLink(false);
    }
  }

  async function loadFromLink(url) {
    try {
      setLoadingLink(true);
      const res = await fetch(url);
      const json = await res.json();
      if (!json.steps) throw new Error("Invalid JSON build");
      setBuild(json);
      setSeconds(0);
      setRunning(false);
      setLinkInput("");
    } catch {
      alert("Unable to load build JSON from link.");
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

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setRunning(true)} className="px-4 py-2 rounded-xl bg-green-600">Start</button>
        <button onClick={() => setRunning(false)} className="px-4 py-2 rounded-xl bg-yellow-600">Pause</button>
        <button onClick={() => { setRunning(false); setSeconds(0); }} className="px-4 py-2 rounded-xl bg-red-600">Reset</button>
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

      <p className="mb-4 text-lg">Game Time: <strong>{formatTime(seconds)}</strong></p>

      <div className="grid gap-3">
        {enrichedSteps.map((step, i) => {
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
    </div>
  );
}
