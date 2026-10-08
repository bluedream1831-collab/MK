(() => {
  "use strict";

  const DB_NAME = "cardio_home_monitor_db";
  const DB_VERSION = 1;
  const STORE = "records";
  const LEGACY_KEY = "cardio_home_monitor_v1";
  const APP_VERSION = 3;
  const INITIAL_PHOTO_RECORDS = [{"id":"photo-2026-08-27","date":"2026-08-27","time":"","sys":"108","dia":"62","pulse":"","weight":"37.7","temp":"","note":"","createdAt":1787760000001,"updatedAt":1787760000001},{"id":"photo-2026-08-28","date":"2026-08-28","time":"","sys":"100","dia":"59","pulse":"","weight":"37.7","temp":"","note":"","createdAt":1787846400001,"updatedAt":1787846400001},{"id":"photo-2026-08-29","date":"2026-08-29","time":"","sys":"98","dia":"59","pulse":"","weight":"37.4","temp":"","note":"","createdAt":1787932800001,"updatedAt":1787932800001},{"id":"photo-2026-08-30","date":"2026-08-30","time":"","sys":"110","dia":"56","pulse":"","weight":"37.1","temp":"","note":"照片中的體溫欄字跡不明，先留白。","createdAt":1788019200001,"updatedAt":1788019200001},{"id":"photo-2026-08-31","date":"2026-08-31","time":"","sys":"118","dia":"60","pulse":"","weight":"37.1","temp":"36.5","note":"","createdAt":1788105600001,"updatedAt":1788105600001},{"id":"photo-2026-09-01","date":"2026-09-01","time":"","sys":"104","dia":"55","pulse":"","weight":"37.2","temp":"36.5","note":"","createdAt":1788192000001,"updatedAt":1788192000001},{"id":"photo-2026-09-02","date":"2026-09-02","time":"","sys":"117","dia":"54","pulse":"","weight":"36.9","temp":"36.4","note":"","createdAt":1788278400001,"updatedAt":1788278400001},{"id":"photo-2026-09-17","date":"2026-09-17","time":"","sys":"114","dia":"59","pulse":"65","weight":"40.7","temp":"35.9","note":"","createdAt":1789574400001,"updatedAt":1789574400001},{"id":"photo-2026-09-18","date":"2026-09-18","time":"","sys":"119","dia":"62","pulse":"67","weight":"40.3","temp":"36.4","note":"照片中的體重原紀錄有塗改，依可辨識的 40.3 kg 建入。","createdAt":1789660800001,"updatedAt":1789660800001},{"id":"photo-2026-09-21","date":"2026-09-21","time":"","sys":"123","dia":"65","pulse":"68","weight":"36.5","temp":"39.9","note":"","createdAt":1789920000001,"updatedAt":1789920000001},{"id":"photo-2026-09-22","date":"2026-09-22","time":"","sys":"113","dia":"54","pulse":"69","weight":"40.7","temp":"36.4","note":"體重 40.7 kg（飯後）。照片體溫欄有塗改，依旁註 36.4°C 建入。","createdAt":1790006400001,"updatedAt":1790006400001},{"id":"photo-2026-09-24","date":"2026-09-24","time":"","sys":"123","dia":"54","pulse":"68","weight":"41","temp":"36.5","note":"","createdAt":1790179200001,"updatedAt":1790179200001},{"id":"photo-2026-09-25","date":"2026-09-25","time":"","sys":"118","dia":"63","pulse":"69","weight":"39.7","temp":"36.3","note":"","createdAt":1790265600001,"updatedAt":1790265600001},{"id":"photo-2026-09-26","date":"2026-09-26","time":"","sys":"125","dia":"65","pulse":"67","weight":"40.2","temp":"36","note":"","createdAt":1790352000001,"updatedAt":1790352000001},{"id":"photo-2026-09-29","date":"2026-09-29","time":"","sys":"117","dia":"69","pulse":"61","weight":"40.6","temp":"36.4","note":"","createdAt":1790611200001,"updatedAt":1790611200001},{"id":"photo-2026-09-30","date":"2026-09-30","time":"","sys":"121","dia":"69","pulse":"67","weight":"40.5","temp":"35.8","note":"","createdAt":1790697600001,"updatedAt":1790697600001},{"id":"photo-2026-10-01","date":"2026-10-01","time":"","sys":"126","dia":"70","pulse":"66","weight":"40.6","temp":"36.3","note":"","createdAt":1790784000001,"updatedAt":1790784000001},{"id":"photo-2026-10-02","date":"2026-10-02","time":"","sys":"124","dia":"73","pulse":"63","weight":"40.6","temp":"36.3","note":"","createdAt":1790870400001,"updatedAt":1790870400001},{"id":"photo-2026-10-03","date":"2026-10-03","time":"","sys":"110","dia":"73","pulse":"66","weight":"41","temp":"36.3","note":"","createdAt":1790956800001,"updatedAt":1790956800001}];
  let db;
  let editingId = null;
  let restorePayload = null;
  let historyRange = "30";
  let deferredInstallPrompt = null;

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  function uid() {
    return (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function nowLocalDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function nowLocalTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }

  function fmtDate(dateStr) {
    if (!dateStr) return "—";
    const [y,m,d] = dateStr.split("-");
    return `${y}/${m}/${d}`;
  }

  function fmtDateTW(dateStr) {
    if (!dateStr) return "—";
    const dt = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat("zh-TW", {year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(dt);
  }

  function safe(v) {
    return String(v ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  async function openDB() {
    db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const store = d.createObjectStore(STORE, {keyPath:"id"});
          store.createIndex("date", "date", {unique:false});
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function tx(mode="readonly") {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  async function getAll() {
    return new Promise((resolve, reject) => {
      const req = tx().getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function putRecord(r) {
    return new Promise((resolve, reject) => {
      const req = tx("readwrite").put(r);
      req.onsuccess = () => resolve(r);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteRecord(id) {
    return new Promise((resolve, reject) => {
      const req = tx("readwrite").delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function clearAll() {
    return new Promise((resolve, reject) => {
      const req = tx("readwrite").clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function migrateLegacy() {
    const current = await getAll();
    if (current.length) return;
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
      if (!Array.isArray(legacy) || !legacy.length) return;
      for (const x of legacy) {
        await putRecord({
          id: x.id || uid(),
          date: x.date || nowLocalDate(),
          time: x.time || "",
          sys: x.sys || "",
          dia: x.dia || "",
          pulse: x.pulse || "",
          weight: x.weight || "",
          temp: x.temp || "",
          note: x.note || "",
          createdAt: x.createdAt || Date.now(),
          updatedAt: Date.now()
        });
      }
      toast(`已帶入舊版 ${legacy.length} 筆紀錄`);
    } catch (_) {}
  }

  async function ensurePhotoRecordsImportedOnce() {
    const FLAG = "photo_seed_2026_08_27_to_10_03_applied_v1";
    if (localStorage.getItem(FLAG) === "1") return;

    const current = await getAll();
    const existingIds = new Set(current.map(r => r.id));
    let added = 0;

    for (const r of INITIAL_PHOTO_RECORDS) {
      if (!existingIds.has(r.id)) {
        await putRecord({...r});
        added++;
      }
    }

    localStorage.setItem(FLAG, "1");
    if (added > 0) {
      toast(`已寫入紙本照片的 ${added} 筆完整紀錄`);
    }
  }

  function sortNewest(records) {
    return records.slice().sort((a,b) => {
      const ak = `${a.date || ""} ${a.time || ""}`;
      const bk = `${b.date || ""} ${b.time || ""}`;
      return bk.localeCompare(ak) || (b.updatedAt||0)-(a.updatedAt||0);
    });
  }

  function sortOldest(records) {
    return records.slice().sort((a,b) => {
      const ak = `${a.date || ""} ${a.time || ""}`;
      const bk = `${b.date || ""} ${b.time || ""}`;
      return ak.localeCompare(bk);
    });
  }

  function inLastDays(dateStr, days) {
    if (!dateStr || days === "all") return true;
    const d = new Date(`${dateStr}T00:00:00`);
    const cutoff = new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setDate(cutoff.getDate() - (Number(days)-1));
    return d >= cutoff;
  }

  function valueOrDash(v, suffix="") {
    return (v === "" || v === null || v === undefined) ? "—" : `${v}${suffix}`;
  }

  async function refreshAll() {
    const records = sortNewest(await getAll());
    renderLatest(records);
    renderHistory(records);
    renderTrends(records);
    $("historyCount").textContent = `共 ${records.length} 筆`;
  }

  function renderLatest(records) {
    const r = records[0];
    if (!r) {
      $("latestWhen").textContent = "尚無紀錄";
      $("latestSummary").innerHTML = `
        <div><strong>—</strong><span>血壓</span></div>
        <div><strong>—</strong><span>心跳</span></div>
        <div><strong>—</strong><span>體重</span></div>
        <div><strong>—</strong><span>體溫</span></div>`;
      return;
    }
    $("latestWhen").textContent = `${fmtDate(r.date)}${r.time ? " " + r.time : ""}`;
    $("latestSummary").innerHTML = `
      <div><strong>${safe(r.sys && r.dia ? `${r.sys}/${r.dia}` : "—")}</strong><span>血壓</span></div>
      <div><strong>${safe(valueOrDash(r.pulse))}</strong><span>心跳 bpm</span></div>
      <div><strong>${safe(valueOrDash(r.weight))}</strong><span>體重 kg</span></div>
      <div><strong>${safe(valueOrDash(r.temp))}</strong><span>體溫 °C</span></div>`;
  }

  function renderHistory(records) {
    const list = $("historyList");
    const filtered = records.filter(r => inLastDays(r.date, historyRange));
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">這個期間還沒有紀錄</div>`;
      return;
    }
    list.innerHTML = filtered.map(r => `
      <article class="record-item">
        <div class="record-head">
          <div>
            <span class="record-date">${safe(fmtDate(r.date))}</span>
            ${r.time ? `<span class="record-time">${safe(r.time)}</span>` : ""}
          </div>
          <div class="row-actions">
            <button class="mini-btn edit-btn" data-edit="${safe(r.id)}" type="button">編輯</button>
            <button class="mini-btn delete-btn" data-delete="${safe(r.id)}" type="button">刪除</button>
          </div>
        </div>
        <div class="record-values">
          <div><strong>${safe(r.sys && r.dia ? `${r.sys}/${r.dia}` : "—")}</strong><span>血壓</span></div>
          <div><strong>${safe(valueOrDash(r.pulse))}</strong><span>心跳</span></div>
          <div><strong>${safe(valueOrDash(r.weight))}</strong><span>體重 kg</span></div>
          <div><strong>${safe(valueOrDash(r.temp))}</strong><span>體溫 °C</span></div>
        </div>
        ${r.note ? `<div class="record-note">${safe(r.note)}</div>` : ""}
      </article>
    `).join("");
  }

  function renderTrends(records) {
    const days = $("trendRange").value;
    const selected = sortOldest(records.filter(r => inLastDays(r.date, days)));

    const bp = selected
      .filter(r => Number(r.sys) && Number(r.dia))
      .map(r => ({label:r.date.slice(5), a:Number(r.sys), b:Number(r.dia)}));
    drawChart($("bpChart"), bp, ["a","b"], ["sys-line","dia-line"]);

    // 舊紀錄未填心跳時略過，不以 0 bpm 當作測量值，也不修改原始資料。
    const pulse = selected
      .filter(r => r.pulse !== "" && r.pulse != null && Number.isFinite(Number(r.pulse)) && Number(r.pulse) > 0)
      .map(r => ({label:r.date.slice(5), a:Number(r.pulse)}));
    drawChart($("pulseChart"), pulse, ["a"], ["pulse-line"]);

    const wt = selected
      .filter(r => Number(r.weight))
      .map(r => ({label:r.date.slice(5), a:Number(r.weight)}));
    drawChart($("weightChart"), wt, ["a"], ["weight-line"]);
  }

  function drawChart(container, points, keys, classes) {
    if (points.length < 2) {
      container.className = "chart empty-chart";
      container.textContent = "至少需要 2 筆資料";
      return;
    }
    container.className = "chart";
    const W=640,H=190,padL=42,padR=12,padT=14,padB=30;
    const vals = [];
    points.forEach(p => keys.forEach(k => vals.push(Number(p[k]))));
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const margin = (max-min)*0.12;
    min -= margin; max += margin;

    const x = i => padL + i * ((W-padL-padR)/(points.length-1));
    const y = v => padT + (max-v) * ((H-padT-padB)/(max-min));

    const grid = [0,.5,1].map(t => {
      const yy = padT + t*(H-padT-padB);
      const val = max - t*(max-min);
      return `<line class="grid" x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}"/>
              <text x="2" y="${yy+3}">${val.toFixed(max-min < 10 ? 1 : 0)}</text>`;
    }).join("");

    const lines = keys.map((k,idx) => {
      const pts = points.map((p,i) => `${x(i)},${y(p[k])}`).join(" ");
      return `<polyline class="${classes[idx]}" points="${pts}"/>`;
    }).join("");

    const labelIdx = new Set([0, Math.floor((points.length-1)/2), points.length-1]);
    const labels = points.map((p,i) => labelIdx.has(i) ?
      `<text x="${x(i)}" y="${H-7}" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}">${safe(p.label)}</text>` : ""
    ).join("");

    const chartName = container.id === "pulseChart" ? "心跳趨勢（每分鐘次數）" :
      container.id === "bpChart" ? "血壓趨勢" : "體重趨勢";
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${chartName}"><title>${chartName}</title>${grid}${lines}${labels}</svg>`;
  }

  function setFormDefaults() {
    $("date").value = nowLocalDate();
    $("time").value = nowLocalTime();
  }

  function resetForm() {
    $("recordForm").reset();
    editingId = null;
    $("formTitle").textContent = "新增紀錄";
    $("saveBtn").textContent = "儲存這筆紀錄";
    $("cancelEditBtn").classList.add("hidden");
    setFormDefaults();
  }

  async function editById(id) {
    const all = await getAll();
    const r = all.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    $("date").value = r.date || "";
    $("time").value = r.time || "";
    $("sys").value = r.sys || "";
    $("dia").value = r.dia || "";
    $("pulse").value = r.pulse || "";
    $("weight").value = r.weight || "";
    $("temp").value = r.temp || "";
    $("note").value = r.note || "";
    $("formTitle").textContent = "編輯紀錄";
    $("saveBtn").textContent = "儲存修改";
    $("cancelEditBtn").classList.remove("hidden");
    goTab("entry");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function saveForm(ev) {
    ev.preventDefault();
    if (!$("date").value) {
      toast("請先選擇日期");
      return;
    }
    const old = editingId ? (await getAll()).find(x => x.id===editingId) : null;
    const r = {
      id: editingId || uid(),
      date: $("date").value,
      time: $("time").value,
      sys: $("sys").value.trim(),
      dia: $("dia").value.trim(),
      pulse: $("pulse").value.trim(),
      weight: $("weight").value.trim(),
      temp: $("temp").value.trim(),
      note: $("note").value.trim(),
      createdAt: old?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    await putRecord(r);
    const wasEdit = !!editingId;
    resetForm();
    await refreshAll();
    toast(wasEdit ? "紀錄已更新" : "紀錄已儲存");
  }

  function goTab(name) {
    $$(".tab-panel").forEach(x => x.classList.toggle("active", x.id === `tab-${name}`));
    $$(".nav-btn").forEach(x => x.classList.toggle("active", x.dataset.tab === name));
    window.scrollTo({top:0,behavior:"smooth"});
    if (name === "trends") refreshAll();
  }

  function makeBackupPayload(records) {
    const sorted = sortOldest(records);
    return {
      app: "cardio-home-monitor",
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      recordCount: sorted.length,
      records: sorted
    };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function backupNow(prefix="居家監測備份") {
    const records = await getAll();
    const payload = makeBackupPayload(records);
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json;charset=utf-8"});
    downloadBlob(blob, `${prefix}_${nowLocalDate()}.json`);
    return records.length;
  }

  function normalizeImported(obj) {
    const arr = Array.isArray(obj) ? obj : obj?.records;
    if (!Array.isArray(arr)) throw new Error("格式不正確");
    return arr.map(x => ({
      id: x.id || uid(),
      date: String(x.date || "").slice(0,10),
      time: String(x.time || "").slice(0,5),
      sys: x.sys ?? "",
      dia: x.dia ?? "",
      pulse: x.pulse ?? "",
      weight: x.weight ?? "",
      temp: x.temp ?? "",
      note: x.note ?? "",
      createdAt: Number(x.createdAt) || Date.now(),
      updatedAt: Number(x.updatedAt) || Date.now()
    })).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date));
  }

  async function handleRestoreFile(file) {
    try {
      const parsed = JSON.parse(await file.text());
      const records = normalizeImported(parsed);
      if (!records.length) throw new Error("備份中沒有有效紀錄");
      restorePayload = records;
      const dates = records.map(x=>x.date).sort();
      $("restoreSummary").innerHTML = `
        <strong>${records.length} 筆紀錄</strong><br>
        日期範圍：${safe(fmtDate(dates[0]))} ～ ${safe(fmtDate(dates[dates.length-1]))}<br>
        檔案：${safe(file.name)}
      `;
      $("restoreDialog").showModal();
    } catch (e) {
      toast(`無法讀取備份：${e.message || "格式錯誤"}`);
    }
  }

  async function mergeRestore() {
    if (!restorePayload) return;
    const current = await getAll();
    const byId = new Map(current.map(x => [x.id,x]));
    restorePayload.forEach(x => byId.set(x.id,x));
    for (const r of byId.values()) await putRecord(r);
    $("restoreDialog").close();
    restorePayload = null;
    await refreshAll();
    toast("備份已合併");
  }

  async function replaceRestore() {
    if (!restorePayload) return;
    const current = await getAll();
    if (current.length) {
      await backupNow("取代前自動備份");
    }
    await clearAll();
    for (const r of restorePayload) await putRecord(r);
    $("restoreDialog").close();
    restorePayload = null;
    await refreshAll();
    toast("備份已完整恢復");
  }

  async function exportExcel() {
    const records = sortOldest(await getAll());
    if (!records.length) return toast("目前沒有資料可匯出");

    if (!window.XLSX) {
      toast("Excel 元件尚未載入，請確認網路後再試");
      return;
    }
    const rows = records.map(r => ({
      "日期": r.date,
      "時間": r.time || "",
      "收縮壓": r.sys,
      "舒張壓": r.dia,
      "血壓": r.sys && r.dia ? `${r.sys}/${r.dia}` : "",
      "心跳(bpm)": r.pulse,
      "體重(kg)": r.weight,
      "體溫(°C)": r.temp,
      "其他/備註": r.note
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      {wch:12},{wch:8},{wch:10},{wch:10},{wch:12},
      {wch:11},{wch:11},{wch:11},{wch:34}
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "居家監測");
    wb.Props = {Title:"心臟血管手術後居家監測", CreatedDate:new Date()};
    XLSX.writeFile(wb, `心臟血管術後居家監測_${nowLocalDate()}.xlsx`);
    toast("Excel 已產出");
  }

  async function exportPDF() {
    const records = sortOldest(await getAll());
    if (!records.length) return toast("目前沒有資料可匯出");
    const dates = records.map(x=>x.date);
    $("printArea").innerHTML = `
      <div class="print-sheet">
        <h1>心臟血管手術後居家監測表</h1>
        <div class="print-meta">紀錄期間：${safe(fmtDate(dates[0]))} ～ ${safe(fmtDate(dates[dates.length-1]))}｜共 ${records.length} 筆</div>
        <table>
          <thead>
            <tr><th>日期</th><th>時間</th><th>血壓</th><th>心跳</th><th>體重</th><th>體溫</th><th>其他／備註</th></tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${safe(fmtDate(r.date))}</td>
                <td>${safe(r.time || "")}</td>
                <td>${safe(r.sys && r.dia ? `${r.sys}/${r.dia}` : "")}</td>
                <td>${safe(r.pulse || "")}</td>
                <td>${safe(r.weight || "")}</td>
                <td>${safe(r.temp || "")}</td>
                <td class="note">${safe(r.note || "")}</td>
              </tr>`).join("")}
          </tbody>
        </table>
        <div class="print-foot">本表為居家紀錄整理，不取代醫療診斷。請依醫師指示進行量測與就醫。</div>
      </div>`;
    setTimeout(() => window.print(), 80);
  }


  function setupFontSizes() {
    const key = "cardio_font_size_v1";
    let current = "large";
    try {
      const saved = localStorage.getItem(key);
      if (["normal", "large", "xlarge"].includes(saved)) current = saved;
    } catch (_) { /* 私密模式或儲存限制時仍可使用大字版 */ }
    function apply(size) {
      document.documentElement.dataset.fontSize = size;
      $$("[data-font-size]").forEach(btn => {
        btn.setAttribute("aria-pressed", String(btn.dataset.fontSize === size));
      });
    }
    apply(current);
    $$("[data-font-size]").forEach(btn => btn.addEventListener("click", () => {
      const size = btn.dataset.fontSize;
      if (!["normal", "large", "xlarge"].includes(size)) return;
      apply(size);
      try { localStorage.setItem(key, size); } catch (_) {}
    }));
  }

  function bindEvents() {
    $("recordForm").addEventListener("submit", saveForm);
    $("cancelEditBtn").addEventListener("click", resetForm);

    $$(".nav-btn").forEach(btn => btn.addEventListener("click", () => goTab(btn.dataset.tab)));
    $$("[data-go]").forEach(btn => btn.addEventListener("click", () => goTab(btn.dataset.go)));

    $("historyList").addEventListener("click", async (e) => {
      const edit = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-delete]");
      if (edit) await editById(edit.dataset.edit);
      if (del) {
        if (!confirm("確定刪除這筆紀錄？")) return;
        await deleteRecord(del.dataset.delete);
        await refreshAll();
        toast("紀錄已刪除");
      }
    });

    $$(".chip").forEach(chip => chip.addEventListener("click", async () => {
      historyRange = chip.dataset.range;
      $$(".chip").forEach(x => x.classList.toggle("active", x === chip));
      renderHistory(sortNewest(await getAll()));
    }));

    $("trendRange").addEventListener("change", refreshAll);
    $("backupBtn").addEventListener("click", async () => toast(`已建立 ${await backupNow()} 筆資料備份`));
    $("excelBtn").addEventListener("click", exportExcel);
    $("pdfBtn").addEventListener("click", exportPDF);
    $("restoreFile").addEventListener("change", async e => {
      const f = e.target.files?.[0];
      if (f) await handleRestoreFile(f);
      e.target.value = "";
    });
    $("mergeRestoreBtn").addEventListener("click", mergeRestore);
    $("replaceRestoreBtn").addEventListener("click", replaceRestore);

    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      $("installBtn").classList.remove("hidden");
    });
    $("installBtn").addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $("installBtn").classList.add("hidden");
    });
  }

  async function init() {
    $("todayText").textContent = fmtDateTW(nowLocalDate());
    setFormDefaults();
    setupFontSizes();
    bindEvents();

    try {
      await openDB();
      await migrateLegacy();
      await ensurePhotoRecordsImportedOnce();
      await refreshAll();
    } catch (e) {
      console.error(e);
      toast("資料庫初始化失敗，請重新整理");
    }

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(()=>{});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();