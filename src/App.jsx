import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { supabase } from "./supabase";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
// =============================================
// 案件担当 割振りシステム（GMC / GR 対応版）
// =============================================
// --- スタッフデータ ---
const INITIAL_STAFF = [
  { id: 1, name: "窪田雅也", role: "ディレクター", employment: "社員", skills: ["ビジネス", "経営"], maxCases: 20, notes: "" },
  { id: 2, name: "首藤孝太郎", role: "ディレクター", employment: "社員", skills: ["ビジネス", "マーケティング"], maxCases: 20, notes: "" },
  { id: 3, name: "安部佑介", role: "ディレクター", employment: "社員", skills: ["IT", "テクノロジー"], maxCases: 20, notes: "" },
  { id: 4, name: "北川恵介", role: "ディレクター", employment: "社員", skills: ["教育", "自己啓発"], maxCases: 20, notes: "" },
  { id: 5, name: "星合優希", role: "ディレクター", employment: "社員", skills: ["歴史", "社会"], maxCases: 20, notes: "" },
  { id: 6, name: "稲場俊哉", role: "ディレクター", employment: "業務委託", skills: ["小説", "エッセイ"], maxCases: 20, notes: "" },
  { id: 7, name: "渡邉禎則", role: "ディレクター", employment: "業務委託", skills: ["医療", "健康"], maxCases: 20, notes: "" },
  { id: 8, name: "常世田琢", role: "ディレクター", employment: "業務委託", skills: ["ビジネス", "金融"], maxCases: 20, notes: "" },
  { id: 9, name: "西村裕介", role: "ディレクター", employment: "業務委託", skills: ["ライフスタイル", "随筆"], maxCases: 20, notes: "鹿久保さんへ引き継ぐ→復活" },
  { id: 10, name: "長田年伸", role: "ディレクター", employment: "業務委託", skills: ["医療", "科学"], maxCases: 20, notes: "" },
  { id: 11, name: "長井奈々", role: "ディレクター", employment: "業務委託", skills: ["教育", "子育て"], maxCases: 20, notes: "" },
  { id: 12, name: "大和剛", role: "ディレクター", employment: "業務委託", skills: ["スポーツ", "趣味"], maxCases: 20, notes: "" },
  { id: 13, name: "兼光良枝", role: "ディレクター", employment: "業務委託", skills: ["歴史", "文学"], maxCases: 20, notes: "" },
  { id: 14, name: "小森彩", role: "エキスパート", employment: "業務委託", skills: ["全般"], maxCases: 100, notes: "" },
  { id: 15, name: "加藤美晴", role: "エキスパート", employment: "業務委託", skills: ["全般"], maxCases: 100, notes: "" },
  { id: 16, name: "山崎", role: "ディレクター", employment: "業務委託", skills: ["全般"], maxCases: 20, notes: "", retired: true },
];
const GENRES = [
  "ビジネス", "経営", "マーケティング", "医療", "健康", "IT", "テクノロジー",
  "教育", "自己啓発", "歴史", "社会", "小説", "エッセイ", "随筆",
  "金融", "料理", "ライフスタイル", "スポーツ", "趣味", "科学", "文学", "子育て", "その他"
];
// --- 案件データ（Supabaseから読み込み。空配列はフォールバック） ---
const SAMPLE_PROJECTS = [];
// --- Supabase ヘルパー ---
function generateShareToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}
async function uploadPDFToStorage(file, projectId) {
  const safeName = `${projectId}_${Date.now()}.pdf`;
  const filePath = `${projectId}/${safeName}`;
  const { error } = await supabase.storage.from("project-pdfs").upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: "application/pdf" });
  if (error) { console.error("PDF upload error:", error); return null; }
  const { data: urlData } = supabase.storage.from("project-pdfs").getPublicUrl(filePath);
  return urlData.publicUrl;
}
async function upsertProject(project) {
  const clean = { ...project };
  delete clean.pdfData; // blob URLはDB保存不可
  await supabase.from("projects").upsert({ id: clean.id, data: clean }, { onConflict: "id" });
}
async function upsertProjects(projectsArr) {
  const rows = projectsArr.map(p => ({ id: p.id, data: p }));
  for (let i = 0; i < rows.length; i += 500) {
    await supabase.from("projects").upsert(rows.slice(i, i + 500), { onConflict: "id" });
  }
}
async function upsertStaff(staffArr) {
  const rows = staffArr.map(s => ({ id: s.id, data: s }));
  await supabase.from("staff").upsert(rows, { onConflict: "id" });
}
function getShareUrl(project) {
  return `${window.location.origin}/#/share/${project.shareToken}`;
}
function generateLINEText(scenario, project, staffMember, shareUrl, allStaff) {
  const type = project.type;
  const title = project.title || "未定";
  const author = project.author || "-";
  const genre = project.genre || "-";
  const deadline = project.deadline || "未定";
  const pages = project.pages ? `${project.pages}P` : "-";
  const format = project.format || "-";
  const link = shareUrl ? `\n詳細・企画書: ${shareUrl}` : "";
  // 担当者一覧を生成（自分以外のメンバーがわかるように）
  const members = [];
  const mainD = allStaff?.find(s => s.id === project.assignedTo);
  const subD = project.subDirectorId ? allStaff?.find(s => s.id === project.subDirectorId) : null;
  const expert = project.expertId ? allStaff?.find(s => s.id === project.expertId) : null;
  if (mainD) members.push(mainD.name + "さん");
  if (subD) members.push(subD.name + "さん");
  if (expert) members.push(expert.name + "さん");
  const memberLine = members.length > 0 ? `\n担当: ${members.join("・")}` : "";
  if (scenario === "director") {
    return `【新規案件】担当決定のお願い\n\n種別: ${type}\nタイトル: ${title}\n著者: ${author}\nジャンル: ${genre}\n納期: ${deadline}\nページ数: ${pages}\n判型: ${format}${link}\n\n担当者の割り振りをお願いいたします。`;
  }
  const name = staffMember?.name || "";
  if (scenario === "employee") {
    return `【案件担当のお知らせ】\n\n${name}さん\n\n新しい案件の担当をお願いします。\n\n種別: ${type}\nタイトル: ${title}\n著者: ${author}\nジャンル: ${genre}\n納期: ${deadline}\nページ数: ${pages}${memberLine}${link}\n\nよろしくお願いいたします。`;
  }
  if (scenario === "contractor" || scenario === "expert") {
    return `【案件のご相談】\n\n${name}さん\n\n下記案件をお引き受けいただけないでしょうか。\n\n種別: ${type}\nタイトル: ${title}\n著者: ${author}\nジャンル: ${genre}\n納期: ${deadline}\nページ数: ${pages}${memberLine}${link}\n\nご検討のほど、よろしくお願いいたします。`;
  }
  return "";
}
// --- ユーティリティ ---
function getStaffLoad(staffId, projects) {
  return projects.filter(p => (p.assignedTo === staffId || p.subDirectorId === staffId || p.expertId === staffId) && p.status === "担当決定済").length;
}
function getRecommendations(project, staff, projects) {
  return staff.filter(s => s.role !== "エキスパート" && !s.retired).map(s => {
    const load = getStaffLoad(s.id, projects);
    const capacityLeft = s.maxCases - load;
    const skillMatch = s.skills.includes(project.genre) || s.skills.includes("全般");
    let score = capacityLeft * 10 + (skillMatch ? 30 : 0);
    if (capacityLeft <= 0) score -= 100;
    return { ...s, load, capacityLeft, skillMatch, score };
  }).sort((a, b) => b.score - a.score);
}
function formatCurrency(n) {
  return n ? `¥${n.toLocaleString()}` : "-";
}
// --- 共通コンポーネント ---
function Badge({ children, color }) {
  const c = {
    blue: "bg-blue-100 text-blue-800", green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800", yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800", gray: "bg-gray-100 text-gray-800",
    indigo: "bg-indigo-100 text-indigo-800", orange: "bg-orange-100 text-orange-800",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c[color] || c.gray}`}>{children}</span>;
}
function StatCard({ label, value, sub, color }) {
  const bc = { blue: "border-l-blue-500", green: "border-l-green-500", yellow: "border-l-yellow-500", red: "border-l-red-500", purple: "border-l-purple-500" };
  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${bc[color] || "border-l-gray-400"} p-5`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
function LoadBar({ current, max, gmc, gr }) {
  const pct = Math.min((current / max) * 100, 100);
  const showSplit = gmc !== undefined && gr !== undefined;
  if (showSplit) {
    const gmcPct = Math.min((gmc / max) * 100, 100);
    const grPct = Math.min((gr / max) * 100, pct >= 100 ? 100 - gmcPct : 100);
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
          {gmc > 0 && <div className="h-full bg-blue-500 transition-all" style={{ width: `${gmcPct}%` }} />}
          {gr > 0 && <div className="h-full bg-orange-400 transition-all" style={{ width: `${grPct}%` }} />}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          <span className="text-blue-600 font-medium">{gmc}</span>/<span className="text-orange-500 font-medium">{gr}</span><span className="text-gray-400">/{max}</span>
        </span>
      </div>
    );
  }
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{current}件/{max}件</span>
    </div>
  );
}
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex border-b border-gray-100 py-2">
      <dt className="w-36 text-xs font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-800 flex-1">{value}</dd>
    </div>
  );
}
// =====================
// ダッシュボード タブ
// =====================
function DashboardTab({ projects, staff }) {
  const unassigned = projects.filter(p => p.status === "未割当").length;
  const assigned = projects.filter(p => p.status === "担当決定済").length;
  const archived = projects.filter(p => p.status === "入稿完了").length;
  const active = projects.filter(p => p.status !== "入稿完了").length;
  const notifyPending = projects.filter(p => p.status === "担当決定済" && p.notified === false).length;
  const gmcCount = projects.filter(p => p.type === "GMC" && p.status !== "入稿完了").length;
  const grCount = projects.filter(p => p.type === "GR" && p.status !== "入稿完了").length;
  const activeStaff = staff.filter(s => !s.retired);
  const staffLoads = activeStaff.map(s => {
    const asgn = projects.filter(p => (p.assignedTo === s.id || p.subDirectorId === s.id || p.expertId === s.id) && p.status === "担当決定済");
    return { ...s, load: asgn.length, gmc: asgn.filter(p => p.type === "GMC").length, gr: asgn.filter(p => p.type === "GR").length };
  }).sort((a, b) => (a.role === "エキスパート" ? 1 : 0) - (b.role === "エキスパート" ? 1 : 0));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="進行中案件数" value={active} sub={`GMC ${gmcCount} / GR ${grCount}`} color="blue" />
        <StatCard label="未割当" value={unassigned} sub="要対応" color={unassigned > 0 ? "red" : "green"} />
        <StatCard label="担当決定済" value={assigned} color="green" />
        <StatCard label="入稿完了" value={archived} sub="アーカイブ済" color="purple" />
        <StatCard label="スタッフ" value={activeStaff.length} sub={`D:${activeStaff.filter(s=>s.role==="ディレクター").length} E:${activeStaff.filter(s=>s.role==="エキスパート").length}`} color="yellow" />
      </div>
      {unassigned > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-red-500 text-xl mt-0.5">!</span>
          <div>
            <p className="text-red-800 font-semibold">未割当案件が {unassigned} 件あります</p>
            <p className="text-red-600 text-sm mt-1">「案件一覧」タブから局長へ担当決定依頼、または直接割り振りを行ってください。</p>
          </div>
        </div>
      )}
      {notifyPending > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-orange-500 text-xl mt-0.5">!</span>
          <div>
            <p className="text-orange-800 font-semibold">担当者未通知の案件が {notifyPending} 件あります</p>
            <p className="text-orange-600 text-sm mt-1">「案件一覧」タブから詳細を開き、LINE通知テキストをコピーして送信してください。</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">直近のKO日（GMC）</h3>
        {(() => {
          const today = new Date();
          const koProjects = projects
            .filter(p => p.type === "GMC" && p.status !== "入稿完了" && p.notes)
            .map(p => {
              const m = p.notes.match(/KO\s*[:：/．.・\s]\s*(\d{1,2})\s*[\/．.]\s*(\d{1,2})/i);
              if (!m) return null;
              const mo = parseInt(m[1]), da = parseInt(m[2]);
              let yr = today.getFullYear();
              const d = new Date(yr, mo - 1, da);
              if (d < new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) yr++;
              const koDate = new Date(yr, mo - 1, da);
              const diffDays = Math.round((koDate - today) / (1000 * 60 * 60 * 24));
              return { ...p, koDate, koStr: `${mo}/${da}`, diffDays };
            })
            .filter(Boolean)
            .sort((a, b) => a.koDate - b.koDate)
            .slice(0, 8);
          if (koProjects.length === 0) return <p className="text-sm text-gray-400">KO日が設定されている案件はありません</p>;
          return (
            <div className="space-y-2">
              {koProjects.map(p => (
                <div key={p.id} className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 ${p.diffDays <= 0 ? "bg-red-600 text-white" : p.diffDays === 1 ? "bg-red-500 text-white" : p.diffDays === 2 ? "bg-red-400 text-white" : p.diffDays === 3 ? "bg-red-100 border border-red-300" : p.diffDays <= 7 ? "bg-orange-50 border border-orange-200" : ""}`}>
                  <div className="flex items-center gap-2 truncate">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.diffDays <= 0 ? "bg-white/20 text-white" : p.diffDays <= 3 ? "bg-red-600 text-white" : p.diffDays <= 7 ? "bg-orange-500 text-white" : p.diffDays <= 14 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                      KO {p.koStr}
                    </span>
                    <span className={`truncate ${p.diffDays <= 2 ? "text-white font-medium" : "text-gray-700"}`}>{p.clientName || p.author || p.title}</span>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ml-2 ${p.diffDays <= 0 ? "text-white animate-pulse" : p.diffDays <= 1 ? "text-white animate-pulse" : p.diffDays <= 3 ? "text-red-700" : p.diffDays <= 7 ? "text-orange-600" : "text-gray-400"}`}>
                    {p.diffDays <= 0 ? "🔥 期限超過！" : p.diffDays === 1 ? "⚠️ 明日！" : p.diffDays === 2 ? "⚠️ あと2日" : p.diffDays === 3 ? "あと3日" : p.diffDays <= 7 ? `あと${p.diffDays}日` : p.diffDays <= 14 ? `あと${p.diffDays}日` : "余裕"}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">担当者別 稼働状況</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {staffLoads.map(s => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-28 text-sm font-medium text-gray-700 truncate">{s.name}</div>
              <Badge color={s.role === "エキスパート" ? "purple" : "blue"}>{s.role === "エキスパート" ? "E" : "D"}</Badge>
              <div className="flex-1"><LoadBar current={s.load} max={s.maxCases} gmc={s.gmc} gr={s.gr} /></div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded-sm inline-block"></span>GMC</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-400 rounded-sm inline-block"></span>GR</span>
          <span className="ml-auto">数値: <span className="text-blue-600 font-medium">GMC</span>/<span className="text-orange-500 font-medium">GR</span><span className="text-gray-400">/上限</span></span>
        </div>
      </div>
    </div>
  );
}
// =====================
// CSVインポートモーダル
// =====================
function CSVImportModal({ staff, onImport, onClose }) {
  const [step, setStep] = useState("input");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [parseError, setParseError] = useState("");

  const parse = () => {
    if (!csvText.trim()) { setParseError("データを貼り付けてください"); return; }

    // RFC 4180準拠CSVパーサー（ヘッダー内改行・クォートフィールド対応）
    const parseCSVRows = (text) => {
      const firstLine = text.slice(0, Math.max(text.indexOf('\n'), 1));
      const sep = firstLine.includes('\t') ? '\t' : ',';
      const rows = []; let row = []; let cell = ''; let inQ = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          if (inQ && text[i+1] === '"') { cell += '"'; i++; }
          else inQ = !inQ;
        } else if (c === sep && !inQ) { row.push(cell); cell = ''; }
        else if (c === '\r') { /* skip */ }
        else if (c === '\n' && !inQ) {
          row.push(cell); cell = '';
          if (row.some(v => v !== '')) { rows.push(row); }
          row = [];
        } else { cell += c; }
      }
      if (cell || row.length) { row.push(cell); if (row.some(v => v !== '')) rows.push(row); }
      return rows;
    };

    const allRows = parseCSVRows(csvText.trim());
    if (allRows.length < 2) { setParseError("ヘッダー行とデータ行が必要です"); return; }

    // ヘッダー正規化（改行・カッコ・スペースを除去してマッチしやすくする）
    const rawHeaders = allRows[0].map(h => h.replace(/[\n\r]/g, '').trim());
    const normH = (h) => h.replace(/[（）()【】\s　\n＊*・]/g, '');

    // 列インデックス検索（柔軟マッチング）
    const findIdx = (...keys) => {
      for (const k of keys) {
        const kn = normH(k);
        const i = rawHeaders.findIndex(h => {
          const hn = normH(h);
          return hn === kn || hn.includes(kn) || kn.includes(hn);
        });
        if (i >= 0) return i;
      }
      return -1;
    };

    // 日付正規化: 26/06/30 → 2026-06-30 / 2026/06/30 → 2026-06-30
    const normDate = (d) => {
      if (!d) return '';
      const m2 = d.match(/^(\d{2})\/(\d{1,2})\/(\d{1,2})$/);
      if (m2) return `20${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`;
      const m4 = d.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (m4) return `${m4[1]}-${m4[2].padStart(2,'0')}-${m4[3].padStart(2,'0')}`;
      return d;
    };

    const SKIP = new Set(['なし', '未決定', '-', '']);

    const rows = allRows.slice(1).map((vals, idx) => {
      const get = (...keys) => {
        for (const k of keys) {
          const i = findIdx(k);
          if (i >= 0 && vals[i] && !SKIP.has(vals[i].trim())) return vals[i].trim();
        }
        return '';
      };

      // 種別: 1列目ヘッダーが空の場合はvals[0]を使用
      const typeIdx = rawHeaders[0] === '' ? 0 : findIdx('種別', 'type');
      const typeName = typeIdx >= 0 ? (vals[typeIdx] || '').trim() : '';
      const type = typeName === 'GR' ? 'GR' : (typeName === 'GMC' ? 'GMC' : null);
      if (!type) return null; // 種別不明行はスキップ

      const title = get('タイトル', '書名');
      // クライアント名 = 著者として扱う（GMC/GR共通）
      const author = get('クライアント名', 'クライアント', '著者名', '著者');

      // デザイン担当（ディレクター）→ 担当者として使用
      const staffName = get('デザイン担当ディレクター', 'デザイン担当', 'D担当', '担当者', '担当者名', '担当');
      const staffObj = staffName ? staff.find(s =>
        s.name === staffName || s.name.includes(staffName) || staffName.includes(s.name)
      ) : null;
      const status = staffObj ? '担当決定済' : '未割当';

      const deadline = normDate(get('刊行日', '納期', '刊行予定日'));
      const regRaw = get('カバー発注日', '登録日');
      const registeredDate = regRaw ? (normDate(regRaw) || regRaw) : new Date().toISOString().slice(0, 10);
      const genre = get('ジャンル') || (type === 'GMC' ? 'ビジネス' : 'その他');
      const pages = parseInt(get('ページ数', '頁数')) || 0;
      const productionNo = get('制作No', '制作番号');
      const editStaff = get('編集担当', 'GR担当', 'GMC編集窓口');

      // エキスパート・詳細・素材費 → 備考に追記
      const expertIdx = findIdx('デザイン担当エキスパート', 'エキスパート');
      const expertName = expertIdx >= 0 && vals[expertIdx] && !SKIP.has(vals[expertIdx].trim()) ? vals[expertIdx].trim() : '';
      const detail = get('詳細', '素材費');
      const notesArr = [];
      if (expertName) notesArr.push(`E担当: ${expertName}`);
      if (detail) notesArr.push(detail);

      return {
        _rowNum: idx + 2, _valid: !!(title && author),
        _staffName: staffName, _staffFound: !!staffObj,
        id: Date.now() + idx * 1000 + Math.floor(Math.random() * 999),
        type, title, author, clientName: type === 'GMC' ? author : '',
        genre, deadline, pages, status,
        assignedTo: staffObj ? staffObj.id : null,
        registeredDate, subtitle: get('サブタイトル') || '',
        productionNo,
        grRep: type === 'GR' ? editStaff : '',
        editContact: type === 'GMC' ? editStaff : '',
        salesRep: get('GMC営業担当', '営業担当') || '',
        printRun: parseInt(get('発行部数')) || 0,
        price: parseInt(get('定価')) || 0,
        summary: get('概要') || '',
        notes: notesArr.join(' / '),
        pdfFile: '',
        format: get('分類判型', '判型') || (type === 'GMC' ? '四六判単行本' : '四六判並製'),
      };
    }).filter(Boolean);

    if (rows.length === 0) { setParseError("データが見つかりませんでした"); return; }
    setParseError(''); setPreview(rows); setStep('preview');
  };

  const validRows = preview.filter(r => r._valid);
  const invalidRows = preview.filter(r => !r._valid);

  const doImport = () => {
    const clean = validRows.map(({ _rowNum, _valid, _staffName, _staffFound, ...rest }) => rest);
    onImport(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">📂 CSVインポート（一括登録）</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          {step === "input" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                <p className="font-semibold">📋 使い方</p>
                <p>ExcelやGoogleスプレッドシートのデータを<strong>全体コピー</strong>して下の欄に貼り付けてください。</p>
                <p className="font-medium mt-2">D局進行管理シートの列名はそのまま対応しています：</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1 text-xs bg-white rounded p-3 border border-blue-100">
                  {[
                    ["1列目（GMC/GR）", "→ 種別"],
                    ["制作No", "→ 制作番号"],
                    ["刊行日", "→ 納期（26/06/30形式も自動変換）"],
                    ["クライアント名", "→ 著者名（クライアント名=著者）"],
                    ["タイトル", "→ タイトル（必須）"],
                    ["分類（判型）", "→ 判型"],
                    ["編集担当", "→ GMCは編集窓口、GRはGR担当"],
                    ["デザイン担当（ディレクター）", "→ 担当者（自動マッチング）"],
                    ["デザイン担当（エキスパート）", "→ 備考に記録"],
                    ["カバー発注日", "→ 登録日"],
                    ["詳細 / 素材費", "→ 備考に記録"],
                    ["未決定 / なし", "→ 未割当として登録"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-1"><span className="font-medium text-gray-700">{k}</span><span className="text-blue-600">{v}</span></div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">データを貼り付け（タブ区切り・カンマ区切りどちらも対応）</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono h-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={"種別\tタイトル\t著者名\t担当者\t納期\tジャンル\nGMC\t経営の教科書\t山田太郎\t窪田雅也\t2026-08-30\tビジネス\nGR\t心の旅路\t佐藤花子\t稲場俊哉\t2026-07-15\t文学"}
                  value={csvText}
                  onChange={e => { setCsvText(e.target.value); setParseError(""); }}
                />
              </div>
              {parseError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{parseError}</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50">キャンセル</button>
                <button onClick={parse} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">解析してプレビュー →</button>
              </div>
            </div>
          )}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="text-green-700 font-semibold">✓ 登録可能: {validRows.length}件</span>
                  {invalidRows.length > 0 && <span className="text-red-600 font-medium">✗ スキップ: {invalidRows.length}件</span>}
                </div>
                <button onClick={() => setStep("input")} className="text-xs text-indigo-600 hover:underline">← 修正する</button>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">行</th>
                      <th className="px-3 py-2 text-left">種別</th>
                      <th className="px-3 py-2 text-left">タイトル</th>
                      <th className="px-3 py-2 text-left">著者名</th>
                      <th className="px-3 py-2 text-left">担当者</th>
                      <th className="px-3 py-2 text-left">納期</th>
                      <th className="px-3 py-2 text-left">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map(row => (
                      <tr key={row._rowNum} className={!row._valid ? "bg-red-50 opacity-60" : ""}>
                        <td className="px-3 py-2 text-gray-400">{row._rowNum}</td>
                        <td className="px-3 py-2"><Badge color={row.type === "GMC" ? "blue" : "orange"}>{row.type}</Badge></td>
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-xs truncate">{row.title || <span className="text-red-500">未入力</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{row.author || <span className="text-red-500">未入力</span>}</td>
                        <td className="px-3 py-2">
                          {row._staffName
                            ? row._staffFound
                              ? <span className="text-green-700 font-medium">{row._staffName} ✓</span>
                              : <span className="text-amber-600">{row._staffName} ⚠</span>
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{row.deadline || "-"}</td>
                        <td className="px-3 py-2">
                          <Badge color={row.status === "担当決定済" ? "green" : "red"}>{row.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.some(r => r._staffName && !r._staffFound) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠ ⚠マークの担当者名はスタッフ一覧と一致しませんでした。「未割当」として登録されます。スタッフ管理で名前を確認してください。
                </p>
              )}
              {invalidRows.length > 0 && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  ✗ タイトルまたは著者名が空の行はスキップされます。
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep("input")} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50">← 修正する</button>
                <button
                  onClick={doImport}
                  disabled={validRows.length === 0}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${validRows.length > 0 ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"}`}>
                  {validRows.length}件を一括登録する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// =====================
// 案件一覧 タブ
// =====================
function ProjectListTab({ projects, staff, onSelectProject, onEditProject }) {
  const [filter, setFilter] = useState("unassigned");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = projects.filter(p => {
    if (filter === "unassigned" && p.status !== "未割当") return false;
    if (filter === "assigned" && p.status !== "担当決定済") return false;
    if (filter === "notified_pending" && !(p.status === "担当決定済" && p.notified === false)) return false;
    if (filter === "archived" && p.status !== "入稿完了") return false;
    if (filter === "active" && p.status === "入稿完了") return false;
    if (typeFilter === "GMC" && p.type !== "GMC") return false;
    if (typeFilter === "GR" && p.type !== "GR") return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(p.title || "").toLowerCase().includes(s) &&
          !(p.author || "").toLowerCase().includes(s) &&
          !(p.clientName || "").toLowerCase().includes(s) &&
          !(p.genre || "").toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.status === "未割当" && b.status !== "未割当") return -1;
    if (a.status !== "未割当" && b.status === "未割当") return 1;
    return 0;
  });
  const archivedCount = projects.filter(p => p.status === "入稿完了").length;
  const notifyPendingCount = projects.filter(p => p.status === "担当決定済" && p.notified === false).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[["active", "進行中"], ["unassigned", "未割当"], ["assigned", "決定済"], ["all", "すべて"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === v ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
        ))}
        {notifyPendingCount > 0 && (
          <button onClick={() => setFilter("notified_pending")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${filter === "notified_pending" ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`}>
            通知未 <span className={`text-xs px-1.5 rounded-full ${filter === "notified_pending" ? "bg-white text-orange-600" : "bg-orange-500 text-white"}`}>{notifyPendingCount}</span>
          </button>
        )}
        <button onClick={() => setFilter("archived")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${filter === "archived" ? "bg-gray-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
          アーカイブ {archivedCount > 0 && <span className={`text-xs px-1.5 rounded-full ${filter === "archived" ? "bg-white text-gray-700" : "bg-gray-400 text-white"}`}>{archivedCount}</span>}
        </button>
        <span className="border-l border-gray-300 mx-1 h-5" />
        {[["all", "全種別"], ["GMC", "GMC"], ["GR", "GR"]].map(([v, l]) => (
          <button key={v} onClick={() => setTypeFilter(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === v ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
        ))}
        <div className="ml-auto">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="書名・著者・ジャンルで検索..." />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">種別</th>
              <th className="px-4 py-3 text-left">著者</th>
              <th className="px-4 py-3 text-left">書名</th>
              <th className="px-4 py-3 text-left">ジャンル</th>
              <th className="px-4 py-3 text-left">納期</th>
              <th className="px-4 py-3 text-left">頁数</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-left">D担当</th>
              <th className="px-4 py-3 text-left">Dサブ</th>
              <th className="px-4 py-3 text-left">E担当</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 ${p.status === "未割当" ? "bg-yellow-50" : p.status === "入稿完了" ? "opacity-60" : ""}`}>
                <td className="px-4 py-3"><Badge color={p.type === "GMC" ? "blue" : "orange"}>{p.type}</Badge></td>
                <td className="px-4 py-3 text-gray-600">{p.author}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{p.title}</div>
                  {p.subtitle && <div className="text-xs text-gray-400 truncate max-w-xs">{p.subtitle}</div>}
                </td>
                <td className="px-4 py-3"><Badge color="gray">{p.genre}</Badge></td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.deadline || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{p.pages || "-"}</td>
                <td className="px-4 py-3"><Badge color={p.status === "未割当" ? "red" : p.status === "入稿完了" ? "gray" : p.notified === false ? "orange" : "green"}>{p.status === "担当決定済" && p.notified === false ? "通知未" : p.status}</Badge></td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.assignedTo ? staff.find(s => s.id === p.assignedTo)?.name || "-" : "-"}</td>
                <td className="px-4 py-3 text-blue-600 text-xs">{p.subDirectorId ? staff.find(s => s.id === p.subDirectorId)?.name || "-" : "-"}</td>
                <td className="px-4 py-3 text-purple-600 text-xs">{p.expertId ? staff.find(s => s.id === p.expertId)?.name || "-" : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onSelectProject(p)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        p.status === "未割当"
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {p.status === "未割当" ? "割り振る" : "詳細"}
                    </button>
                    <button onClick={() => onEditProject(p)}
                      className="px-3 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200">
                      編集
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400">該当する案件がありません</div>}
      </div>
    </div>
  );
}
// =====================
// 案件詳細＆割り振りモーダル
// =====================
function ProjectDetailModal({ project, staff, projects, onAssign, onArchive, onClose, onNotified }) {
  const [selected, setSelected] = useState(project.assignedTo);
  const [selectedSub, setSelectedSub] = useState(project.subDirectorId || null);
  const [showAssign, setShowAssign] = useState(project.status === "未割当");
  const [selectedExpert, setSelectedExpert] = useState(project.expertId || null);
  const expertStaff = staff.filter(s => s.role === "エキスパート" && !s.retired);
  const [showLINEText, setShowLINEText] = useState(false);
  const recommendations = getRecommendations(project, staff, projects);
  const isGMC = project.type === "GMC";
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge color={isGMC ? "blue" : "indigo"}>{project.type}</Badge>
              <Badge color="gray">{project.genre}</Badge>
              <Badge color={project.status === "未割当" ? "red" : "green"}>{project.status}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLINEText(true)}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors border border-green-200">
                LINE通知
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mt-3">{project.title}</h2>
          {project.subtitle && <p className="text-sm text-gray-500 mt-1">{project.subtitle}</p>}
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左：案件詳細 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">案件情報</h3>
            <dl>
              <InfoRow label="著者名" value={project.author} />
              {isGMC && <InfoRow label="クライアント" value={project.clientName} />}
              {!isGMC && <InfoRow label="契約者名" value={project.contractName} />}
              {!isGMC && <InfoRow label="制作番号" value={project.productionNo} />}
              <InfoRow label="登録日" value={project.registeredDate} />
            </dl>
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mt-4">仕様</h3>
            <dl>
              <InfoRow label="判型" value={project.format} />
              <InfoRow label="ページ数" value={project.pages ? `${project.pages}P` : null} />
              {project.charCount && <InfoRow label="文字数" value={project.charCount} />}
              {isGMC && <InfoRow label="発行部数" value={project.printRun ? `${project.printRun.toLocaleString()}部` : null} />}
              {!isGMC && <InfoRow label="定価" value={project.price ? `${project.price}円` : null} />}
            </dl>
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mt-4">スケジュール</h3>
            <dl>
              {isGMC ? (
                <InfoRow label="納期" value={project.deadline} />
              ) : (
                <>
                  <InfoRow label="ラフUP希望日" value={project.roughUpDate} />
                  <InfoRow label="入稿予定日" value={project.submissionDate} />
                  <InfoRow label="刊行予定日" value={project.deadline} />
                </>
              )}
            </dl>
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mt-4">関係者</h3>
            <dl>
              {isGMC ? (
                <>
                  <InfoRow label="GMC営業担当" value={project.salesRep} />
                  <InfoRow label="GMC編集窓口" value={project.editContact} />
                  <InfoRow label="編集プロダクション" value={project.editPro} />
                  <InfoRow label="編プロ担当者" value={project.editProContact} />
                  <InfoRow label="ライター" value={project.writer} />
                </>
              ) : (
                <>
                  <InfoRow label="GR担当" value={project.grRep} />
                  <InfoRow label="打合せ形式" value={project.meetingFormat} />
                  <InfoRow label="打合せ時間" value={project.meetingTime} />
                </>
              )}
            </dl>
            {!isGMC && (project.totalFee || project.designFee) && (
              <>
                <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mt-4">費用</h3>
                <dl>
                  <InfoRow label="依頼費合計" value={formatCurrency(project.totalFee)} />
                  <InfoRow label="デザイン費" value={formatCurrency(project.designFee)} />
                  <InfoRow label="イラスト費" value={formatCurrency(project.illustFee)} />
                </dl>
              </>
            )}
            {isGMC && project.purpose && (
              <>
                <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mt-4">出版目的</h3>
                <p className="text-sm text-gray-700">{project.purpose}</p>
              </>
            )}
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mt-4">想定読者</h3>
            <p className="text-sm text-gray-700">{project.targetReader || "-"}</p>
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mt-4">概要</h3>
            <p className="text-sm text-gray-700">{project.summary || "-"}</p>
            {project.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                <p className="text-xs font-semibold text-yellow-700 mb-1">備考・特記事項</p>
                <p className="text-sm text-yellow-800">{project.notes}</p>
              </div>
            )}
            {project.pdfFile && (
              <div className="flex items-center gap-2 mt-3">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span className="text-sm text-gray-700 truncate">{project.pdfFile}</span>
                {(project.pdfUrl || project.pdfData) ? (
                  <a href={project.pdfUrl || project.pdfData} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline whitespace-nowrap">開く</a>
                ) : (
                  <span className="text-xs text-orange-500 whitespace-nowrap">※編集から再アップロードしてください</span>
                )}
              </div>
            )}
          </div>
          {/* 右：担当者割り振り */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">担当者 {showAssign ? "選択" : ""}</h3>
              {project.status === "担当決定済" && !showAssign && (
                <button onClick={() => setShowAssign(true)}
                  className="text-xs text-indigo-600 hover:underline">変更する</button>
              )}
            </div>
            {project.status === "担当決定済" && !showAssign ? (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">メイン</span>
                    <p className="font-medium text-green-800">
                      {staff.find(s => s.id === project.assignedTo)?.name || "-"}
                    </p>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {staff.find(s => s.id === project.assignedTo)?.role}
                    ・得意: {staff.find(s => s.id === project.assignedTo)?.skills.join(", ")}
                  </p>
                </div>
                {project.subDirectorId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">サブ</span>
                      <p className="font-medium text-blue-800">
                        {staff.find(s => s.id === project.subDirectorId)?.name || "-"}
                      </p>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {staff.find(s => s.id === project.subDirectorId)?.role}
                      ・得意: {staff.find(s => s.id === project.subDirectorId)?.skills.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto pr-1">
                <p className="text-xs text-gray-500 mb-2">適性Pt = 空き容量×10 + スキルマッチ30点（高いほどおすすめ）</p>
                {recommendations.map((s, i) => (
                  <button key={s.id} onClick={() => setSelected(s.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selected === s.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    } ${s.capacityLeft <= 0 ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i < 3 && s.capacityLeft > 0 && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : "bg-amber-700"
                          }`}>{i + 1}</span>
                        )}
                        <span className="font-medium text-gray-800 text-sm">{s.name}</span>
                        <Badge color={s.role === "エキスパート" ? "purple" : "blue"}>{s.role === "エキスパート" ? "E" : "D"}</Badge>
                        {s.skillMatch && <Badge color="green">一致</Badge>}
                      </div>
                      <span className="text-xs text-gray-400">適性 {s.score}</span>
                    </div>
                    <div className="mt-1.5"><LoadBar current={s.load} max={s.maxCases} /></div>
                    <div className="mt-1 text-xs text-gray-400">得意: {s.skills.join(", ")}</div>
                  </button>
                ))}
              </div>
            )}
            {showAssign && (
              <>
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <h4 className="text-xs font-bold text-gray-600 mb-2">サブディレクター（任意）</h4>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedSub(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedSub === null ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>なし</button>
                    {recommendations.filter(s => s.id !== selected).map(s => (
                      <button key={s.id} onClick={() => setSelectedSub(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selectedSub === s.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}>{s.name}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <h4 className="text-xs font-bold text-gray-600 mb-2">エキスパート（E担当）</h4>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedExpert(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedExpert === null ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>なし</button>
                    {expertStaff.map(s => (
                      <button key={s.id} onClick={() => setSelectedExpert(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selectedExpert === s.id ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}>{s.name}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                    キャンセル
                  </button>
                  <button
                    onClick={() => { if (selected) { onAssign(project.id, selected, selectedExpert, selectedSub); onClose(); } }}
                    disabled={!selected}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                      selected ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-300 cursor-not-allowed"
                    }`}>
                    担当者を決定
                  </button>
                </div>
              </>
            )}
            {project.status === "担当決定済" && !showAssign && (() => {
              const notifiedList = project.notifiedList || [];
              const members = [
                project.assignedTo ? { id: project.assignedTo, label: "メインD", name: staff.find(s => s.id === project.assignedTo)?.name } : null,
                project.subDirectorId ? { id: project.subDirectorId, label: "サブD", name: staff.find(s => s.id === project.subDirectorId)?.name } : null,
                project.expertId ? { id: project.expertId, label: "E", name: staff.find(s => s.id === project.expertId)?.name } : null,
              ].filter(Boolean);
              const allDone = members.length > 0 && members.every(m => notifiedList.includes(m.id));
              const doneCount = members.filter(m => notifiedList.includes(m.id)).length;
              return (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className={`text-center text-sm font-medium mb-3 ${allDone ? "text-green-600" : "text-orange-600"}`}>
                    {allDone ? `✅ 全員通知済み（${doneCount}/${members.length}人）` : `通知: ${doneCount}/${members.length}人完了`}
                  </div>
                  <div className="space-y-1.5">
                    {members.map(m => {
                      const done = notifiedList.includes(m.id);
                      return (
                        <div key={m.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${done ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                          <span>{done ? "✅" : "⏳"}</span>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs opacity-60">（{m.label}）</span>
                          <span className="ml-auto text-xs font-medium">{done ? "通知済み" : "未通知"}</span>
                        </div>
                      );
                    })}
                  </div>
                  {!allDone && <p className="text-xs text-gray-400 mt-2 text-center">LINE通知テキストからコピーすると自動で通知済みになります</p>}
                </div>
              );
            })()}
            {project.status === "担当決定済" && !showAssign && onArchive && (
              <div className="mt-3">
                <button
                  onClick={() => { onArchive(project.id); onClose(); }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors">
                  ✓ 入稿完了にする（アーカイブ）
                </button>
                <p className="text-xs text-gray-400 mt-1 text-center">担当件数から除外されます</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showLINEText && (
        <LINETextModal project={project} staff={staff} onClose={() => setShowLINEText(false)} onNotified={onNotified} />
      )}
    </div>
  );
}
// =====================
// PDF テキスト抽出・GRフィールド解析
// =====================
async function extractTextFromPDF(file) {
  const buffer = await file.arrayBuffer();
  // cMapUrl が必要: 日本語CIDフォントをUnicodeに正しくデコードするため
  const cMapUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`;
  const pdf = await pdfjsLib.getDocument({ data: buffer, cMapUrl, cMapPacked: true }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items
      .filter(item => item.str && item.str.trim())
      .map(item => ({ x: item.transform[4], y: item.transform[5], str: item.str }))
      .sort((a, b) => Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x);
    let lineY = null;
    let line = "";
    for (const item of items) {
      if (lineY === null || Math.abs(item.y - lineY) > 8) {
        if (line.trim()) fullText += line.trim() + "\n";
        line = item.str;
        lineY = item.y;
      } else {
        line += item.str;
      }
    }
    if (line.trim()) fullText += line.trim() + "\n";
  }
  return fullText;
}
function parseGRFields(text, filename = "") {
  const get = (pattern) => { const m = text.match(pattern); return m ? m[1].trim() : ""; };
  const getNum = (pattern) => { const m = text.match(pattern); return m ? parseInt(m[1].replace(/,/g, ""), 10) : ""; };

  // === 1. ラベルベース抽出 (CMap有効時に日本語テキストが正しく読める) ===
  const grRep = get(/担当\s*[：:]\s*(.+)/m);
  const contractName = get(/契約者名\s*[：:]\s*(.+)/m);
  const authorRaw = get(/著者名\s*[：:]\s*(.+)/m);
  const titleRaw = get(/タイトル\s*[：:]\s*(.+)/m);
  let title = titleRaw, subtitle = "";
  if (titleRaw) {
    // 「メインタイトル　～サブタイトル～(仮)」の形式を分離
    const sepMatch = titleRaw.match(/^(.+?)[　\s]+(～.+)$/) || titleRaw.match(/^(.+?)(～.+)$/);
    if (sepMatch) { title = sepMatch[1].trim(); subtitle = sepMatch[2].trim(); }
  }
  const roughUpDate = get(/ラフ\s*UP\s*希望日\s*[：:]\s*(.+)/m);
  const submissionDate = get(/入稿予定日\s*[：:]\s*(.+)/m);
  const deadline = get(/刊行予定日\s*[：:]\s*(.+)/m);
  const price = getNum(/定価\s*[：:]\s*([\d,]+)円/m);
  const format = get(/判型[（(]組み方[）)]\s*[：:]\s*(.+)/m);
  const productionNo = get(/制作番号\s*[：:]\s*(\d+)/m);
  const totalFee = getNum(/依頼費\s*[：:]\s*([\d,]+)円/m);
  const designFee = getNum(/デザイン費[　\s]*([\d,]+)円/m);
  const illustFee = getNum(/イラスト費[　\s]*([\d,]+)円/m);
  // 【書籍内容】セクションを概要として取得
  const summaryMatch = text.match(/【書籍内容】[^\n]*\n([^\n]+)/);
  const summary = summaryMatch ? summaryMatch[1].trim() : "";

  // === 2. ファイル名フォールバック (ラベル抽出が失敗した場合) ===
  let fnTitle = "", fnSubtitle = "", fnAuthor = "", fnProductionNo = "", fnGrRep = "";
  const fnm = filename.replace(/\.pdf$/i, "");
  const fnMatch = fnm.match(/【カバー発注依頼】(.+?)様[\s　]*[「『](.+?)[」』][（(](\d+)[）)].*?GR(.+)$/);
  if (fnMatch) {
    fnAuthor = fnMatch[1].trim();
    const rawTitle = fnMatch[2].trim();
    const subMatch = rawTitle.match(/^(.+?)\s*(～.+)$/);
    if (subMatch) { fnTitle = subMatch[1].trim(); fnSubtitle = subMatch[2].trim(); }
    else fnTitle = rawTitle;
    fnProductionNo = fnMatch[3];
    fnGrRep = "GR" + fnMatch[4].trim();
  }

  // === 3. 数値ポジショナルフォールバック (ラベル抽出が失敗した場合) ===
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let posPrice = price, posTotalFee = totalFee, posDesignFee = designFee, posIllustFee = illustFee;
  let posRoughUp = roughUpDate, posSubmission = submissionDate, posDeadline = deadline;
  if (!price) {
    const pl = lines.find(l => /^\d,\d{3}$/.test(l));
    posPrice = pl ? parseInt(pl.replace(/,/g, ""), 10) : "";
  }
  if (!totalFee) {
    const fa = [];
    for (const line of lines) {
      for (const m of line.matchAll(/(\d{2,3},\d{3})/g)) {
        const n = parseInt(m[1].replace(/,/g, ""), 10);
        if (n >= 10000) fa.push(n);
      }
    }
    [posTotalFee, posDesignFee, posIllustFee] = [fa[0] || "", fa[1] || "", fa[2] || ""];
  }
  if (!submissionDate && !deadline) {
    const fd = lines.filter(l => /^20\d\d\/\d{1,2}(\/\d{1,2})?$/.test(l));
    if (fd.length >= 3) { posRoughUp = fd[0]; posSubmission = fd[1]; posDeadline = fd[2]; }
    else if (fd.length === 2) { posSubmission = fd[0]; posDeadline = fd[1]; }
    else if (fd.length === 1) { posDeadline = fd[0]; }
  }

  return {
    grRep: grRep || fnGrRep,
    contractName: contractName || "",
    author: authorRaw || fnAuthor,
    title: title || fnTitle,
    subtitle: subtitle || fnSubtitle,
    roughUpDate: posRoughUp,
    submissionDate: posSubmission,
    deadline: posDeadline,
    price: posPrice || "",
    format: format || "",
    productionNo: productionNo || fnProductionNo,
    totalFee: posTotalFee || "",
    designFee: posDesignFee || "",
    illustFee: posIllustFee || "",
    summary,
  };
}
// =====================
// TSO企画書（GMC）フィールド解析
// =====================
function parseTSOFields(text, filename = "") {
  const get = (pattern) => { const m = text.match(pattern); return m ? m[1].trim() : ""; };

  // === タイトル・サブタイトル ===
  // 形式A: 【タイトル】\n（メインタイトル）\n[タイトル]
  // 形式B: 【タイトル案】\n〈サブタイトル〉\n...\n〈メインタイトル〉\n[タイトル]
  let title = "", subtitle = "";
  const titleMainMatch = text.match(/【タイトル[案]?】[\s\S]*?(?:（メインタイトル）|〈メインタイトル〉)\s*\n([^\n〈（【]+)/);
  if (titleMainMatch) title = titleMainMatch[1].trim();
  const subtitleMatch = text.match(/〈サブタイトル〉\s*\n([^\n〈（【]+)/);
  if (subtitleMatch) subtitle = subtitleMatch[1].trim();
  if (!subtitle) {
    const sub2 = text.match(/【タイトル[案]?】[\s\S]*?（サブタイトル）\s*\n([^\n〈（【]+)/);
    if (sub2) subtitle = sub2[1].trim();
  }

  // === 著者名 ===
  // 形式A: 【著者名】\n[著者名] 様  /  形式B: 【著者】\n[著者名]（読み）様
  const authorLine = get(/【著者名?】\s*\n([^\n]+)/);
  const author = authorLine.replace(/様\s*$/, "").trim();

  // === クライアント名 ===
  // 形式A: ・案件名 [クライアント名]  /  形式B: ヘッダー「[クライアント名]様／」
  const clientName = get(/・案件名\s+(.+)/m) || get(/^(.+?)様[／/]/m);

  // === 納期 ===
  // 形式A: ・納期／YYYY 年 M 月 DD 日  /  形式B: ヘッダー末尾「YYYY 年 M 月末日納品」
  const deadline = get(/・?納期[／/]\s*(.+)/m) ||
    get(/(\d{4}\s*年\s*\d+\s*月(?:末日|上旬|中旬|下旬|\d+日)?)\s*納品/m);

  // === ページ数 ===
  const pagesMatch = text.match(/(\d{2,3})\s*ページ/);
  const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : "";

  // === 判型 ===
  // 形式A: 【書籍の仕様】\n新書、...  /  形式B: ヘッダー「様／[判型]／TSO」
  const format = get(/【書籍の仕様】\s*\n([^、\n]+)/) ||
    get(/様[／/]([^／\n]+)[／/]TSO/m);

  // === 発行部数 ===
  const printRunMatch = text.match(/・発行部数[^0-9]*([\d,]+)\s*部/);
  const printRun = printRunMatch ? parseInt(printRunMatch[1].replace(/,/g, ""), 10) : "";

  // === GMC 営業担当 ===
  // 形式A: ・GMC 営業担当 [名前]  /  形式B: ヘッダー「営業担当：[名前]」
  const salesRep = get(/・GMC\s*営業担当\s+(.+)/m) ||
    get(/営業担当[：:]\s*(.+?)(?:[／/]|$)/m);

  // === GMC 編集窓口 ===
  // 形式A: ・GMC 編集窓口 [名前]  /  形式B: ヘッダー「編集担当：[名前]」
  const editContact = get(/・GMC\s*編集窓口\s+(.+)/m) ||
    get(/編集担当[：:]\s*(.+?)(?:[／/]|$)/m);

  // === 編集プロダクション ===
  const editPro = get(/・編集プロダクション名\s+(.+)/m);

  // === 編プロ担当 ===
  const editProContact = get(/・編プロ[／/]編集担当者\s+(.+)/m);

  // === ライター ===
  // 形式A: ・編プロ／ライティング担当  /  形式B: スタッフエディター
  const writer = get(/・編プロ[／/]ライティング担当\s+(.+)/m) ||
    get(/スタッフエディター[：:]\s*(.+?)(?:[／/]|$)/m);

  // === 出版目的 ===
  const purposeMatch = text.match(/【(?:クライアントの出版目的|書籍のゴール)】\s*\n([^\n]+)/);
  const purpose = purposeMatch ? purposeMatch[1].trim() : "";

  // === 想定読者 ===
  const targetMatch = text.match(/【(?:想定読者|読者ターゲット)】\s*\n([\s\S]+?)(?=\n【)/);
  const targetReader = targetMatch
    ? targetMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) : "";

  // === 企画概要 ===
  const summaryMatch = text.match(/【企画[主趣]旨】\s*\n([\s\S]+?)(?=\n【)/);
  const summary = summaryMatch
    ? summaryMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) : "";

  // === ファイル名から制作番号・クライアント名・判型のフォールバック ===
  // 例: 【わざクリニック様】大江:轟（新書）..._(1)_155968_0218.pdf
  let fnProductionNo = "", fnClientName = "", fnFormat = "";
  const fnm = filename.replace(/\.pdf$/i, "");
  const fnProdMatch = fnm.match(/_(\d{5,6})_\d{4}$/);
  if (fnProdMatch) fnProductionNo = fnProdMatch[1];
  const fnClientMatch = fnm.match(/【(.+?)様】/);
  if (fnClientMatch) fnClientName = fnClientMatch[1];
  const fnFormatMatch = fnm.match(/（(新書|単行本[^）]*)）/);
  if (fnFormatMatch) fnFormat = fnFormatMatch[1];

  return {
    title, subtitle, author,
    clientName: clientName || fnClientName,
    deadline, pages: pages || "",
    format: format || fnFormat,
    printRun: printRun || "",
    salesRep: salesRep || "", editContact: editContact || "",
    editPro: editPro || "", editProContact: editProContact || "", writer: writer || "",
    purpose: purpose || "", targetReader: targetReader || "", summary: summary || "",
    productionNo: fnProductionNo,
  };
}
// =====================
// 新規案件登録 タブ
// =====================
function RegisterTab({ onRegister, onOpenCSVImport }) {
  const [projectType, setProjectType] = useState("GMC");
  const fileInputRef = React.useRef(null);
  const today = new Date().toISOString().slice(0, 10);
  const emptyGMC = {
    title: "", subtitle: "", author: "", clientName: "", genre: "ビジネス",
    deadline: "", pages: "", format: "四六判単行本", printRun: "",
    salesRep: "", editContact: "", editPro: "", editProContact: "", writer: "",
    purpose: "", targetReader: "", summary: "", notes: "", pdfFile: "",
    productionNo: "", registeredDate: today,
  };
  const emptyGR = {
    title: "", subtitle: "", author: "", contractName: "", genre: "その他",
    roughUpDate: "", submissionDate: "", deadline: "", pages: "", format: "四六判並製",
    price: "", productionNo: "", grRep: "",
    designFee: "", illustFee: "", totalFee: "",
    meetingFormat: "オンライン", meetingTime: "",
    charCount: "", targetReader: "", summary: "", notes: "", pdfFile: "",
    registeredDate: today,
  };
  const [gmcForm, setGmcForm] = useState(emptyGMC);
  const [grForm, setGrForm] = useState(emptyGR);
  const form = projectType === "GMC" ? gmcForm : grForm;
  const setForm = projectType === "GMC" ? setGmcForm : setGrForm;
  const [submitError, setSubmitError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  const update = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (projectType === "GMC" && key === "author") next.clientName = val;
    return next;
  });
  const handlePDFFile = async (file) => {
    const objectUrl = URL.createObjectURL(file);
    update("pdfFile", file.name);
    update("pdfData", objectUrl);
    setIsParsing(true);
    setParseMsg("");
    try {
      const text = await extractTextFromPDF(file);
      console.log("[PDF extracted text]", text.slice(0, 3000));
      const fields = projectType === "GR"
        ? parseGRFields(text, file.name)
        : parseTSOFields(text, file.name);
      console.log("[PDF parsed fields]", fields);
      const count = Object.values(fields).filter(v => v !== "" && v !== 0).length;
      if (count > 0) {
        if (projectType === "GR") {
          setGrForm(prev => ({ ...prev, ...fields, pdfFile: file.name, pdfData: objectUrl }));
        } else {
          setGmcForm(prev => ({ ...prev, ...fields, clientName: fields.author || fields.clientName || "", pdfFile: file.name, pdfData: objectUrl }));
        }
        setParseMsg(`success:${count}`);
      } else {
        setParseMsg("nodata");
      }
    } catch (e) {
      console.error("[PDF parse error]", e);
      setParseMsg("error");
    } finally {
      setIsParsing(false);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.author) {
      setSubmitError("タイトルと著者名は必須です");
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await onRegister({
        ...form,
        type: projectType,
        pages: parseInt(form.pages) || 0,
        printRun: parseInt(form.printRun) || 0,
        price: parseInt(form.price) || 0,
        designFee: parseInt(form.designFee) || 0,
        illustFee: parseInt(form.illustFee) || 0,
        totalFee: parseInt(form.totalFee) || (parseInt(form.designFee) || 0) + (parseInt(form.illustFee) || 0),
        status: "未割当",
        assignedTo: null,
      });
      projectType === "GMC" ? setGmcForm(emptyGMC) : setGrForm(emptyGR);
    } catch (err) {
      setSubmitError("登録に失敗しました: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 一括インポートバナー */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-800">既存案件を一括登録しますか？</p>
          <p className="text-xs text-indigo-600 mt-0.5">ExcelやGoogleスプレッドシートのデータをコピー＆ペーストで一括インポートできます</p>
        </div>
        <button onClick={onOpenCSVImport}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap ml-4">
          📂 一括インポート
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* 種別切替 */}
        <div className="flex gap-2 mb-6">
          {["GMC", "GR"].map(t => (
            <button key={t} onClick={() => setProjectType(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                projectType === t ? (t === "GMC" ? "bg-blue-600 text-white" : "bg-indigo-600 text-white") : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              {t === "GMC" ? "GMC（企業出版）" : "GR（自費出版）"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 書籍情報 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">書籍情報</legend>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>タイトル *</label>
                <input className={inputClass} value={form.title} onChange={e => update("title", e.target.value)} placeholder="書名" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>サブタイトル</label>
                <input className={inputClass} value={form.subtitle || ""} onChange={e => update("subtitle", e.target.value)} placeholder="サブタイトル" />
              </div>
              <div>
                <label className={labelClass}>著者名 *</label>
                <input className={inputClass} value={form.author} onChange={e => update("author", e.target.value)} placeholder="著者名" />
              </div>
              {projectType === "GMC" ? (
                <div>
                  <label className={labelClass}>クライアント名</label>
                  <input className={inputClass} value={form.clientName} onChange={e => update("clientName", e.target.value)} placeholder="株式会社..." />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>契約者名</label>
                  <input className={inputClass} value={form.contractName || ""} onChange={e => update("contractName", e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelClass}>ジャンル</label>
                <select className={inputClass} value={form.genre} onChange={e => update("genre", e.target.value)}>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>制作番号</label>
                <input className={inputClass} value={form.productionNo || ""} onChange={e => update("productionNo", e.target.value)} placeholder={projectType === "GR" ? "25457" : "155968"} />
              </div>
            </div>
          </fieldset>
          {/* 仕様 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">仕様</legend>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>判型</label>
                <input className={inputClass} value={form.format} onChange={e => update("format", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>ページ数</label>
                <input type="number" className={inputClass} value={form.pages} onChange={e => update("pages", e.target.value)} placeholder="200" />
              </div>
              {projectType === "GMC" ? (
                <div>
                  <label className={labelClass}>発行部数</label>
                  <input type="number" className={inputClass} value={form.printRun} onChange={e => update("printRun", e.target.value)} placeholder="3000" />
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>定価（円）</label>
                    <input type="number" className={inputClass} value={form.price} onChange={e => update("price", e.target.value)} placeholder="800" />
                  </div>
                </>
              )}
            </div>
            {projectType === "GR" && (
              <div>
                <label className={labelClass}>文字数</label>
                <input className={inputClass} value={form.charCount || ""} onChange={e => update("charCount", e.target.value)} placeholder="約141,000文字" />
              </div>
            )}
          </fieldset>
          {/* スケジュール */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">スケジュール</legend>
            {projectType === "GMC" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>納期</label>
                  <input type="date" className={inputClass} value={form.deadline} onChange={e => update("deadline", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>備考（KO/RMTG等）</label>
                  <input className={inputClass} value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="KO: 3/9、RMTG: 4/13" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>ラフUP希望日</label>
                  <input className={inputClass} value={form.roughUpDate || ""} onChange={e => update("roughUpDate", e.target.value)} placeholder="2026年3月下旬" />
                </div>
                <div>
                  <label className={labelClass}>入稿予定日</label>
                  <input className={inputClass} value={form.submissionDate || ""} onChange={e => update("submissionDate", e.target.value)} placeholder="2026年7月上旬" />
                </div>
                <div>
                  <label className={labelClass}>刊行予定日</label>
                  <input className={inputClass} value={form.deadline} onChange={e => update("deadline", e.target.value)} placeholder="2026年8月上旬" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>登録日</label>
                <input type="date" className={inputClass} value={form.registeredDate || ""} onChange={e => update("registeredDate", e.target.value)} />
              </div>
            </div>
          </fieldset>
          {/* 関係者 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">関係者</legend>
            {projectType === "GMC" ? (
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>GMC営業担当</label><input className={inputClass} value={form.salesRep} onChange={e => update("salesRep", e.target.value)} /></div>
                <div><label className={labelClass}>GMC編集窓口</label><input className={inputClass} value={form.editContact} onChange={e => update("editContact", e.target.value)} /></div>
                <div><label className={labelClass}>編集プロダクション</label><input className={inputClass} value={form.editPro} onChange={e => update("editPro", e.target.value)} /></div>
                <div><label className={labelClass}>編プロ担当者</label><input className={inputClass} value={form.editProContact} onChange={e => update("editProContact", e.target.value)} /></div>
                <div><label className={labelClass}>ライター</label><input className={inputClass} value={form.writer} onChange={e => update("writer", e.target.value)} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>GR担当</label><input className={inputClass} value={form.grRep} onChange={e => update("grRep", e.target.value)} /></div>
                <div><label className={labelClass}>打合せ形式</label>
                  <select className={inputClass} value={form.meetingFormat} onChange={e => update("meetingFormat", e.target.value)}>
                    <option>オンライン</option><option>対面</option><option>電話</option>
                  </select>
                </div>
                <div><label className={labelClass}>打合せ時間</label><input className={inputClass} value={form.meetingTime} onChange={e => update("meetingTime", e.target.value)} placeholder="C・30分" /></div>
              </div>
            )}
          </fieldset>
          {/* GR費用 */}
          {projectType === "GR" && (
            <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
              <legend className="text-sm font-bold text-gray-700 px-2">費用</legend>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>デザイン費</label><input type="number" className={inputClass} value={form.designFee} onChange={e => update("designFee", e.target.value)} /></div>
                <div><label className={labelClass}>イラスト費</label><input type="number" className={inputClass} value={form.illustFee} onChange={e => update("illustFee", e.target.value)} /></div>
                <div><label className={labelClass}>依頼費合計</label><input type="number" className={inputClass} value={form.totalFee} onChange={e => update("totalFee", e.target.value)} /></div>
              </div>
            </fieldset>
          )}
          {/* 内容 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">内容</legend>
            {projectType === "GMC" && (
              <div><label className={labelClass}>出版目的</label><textarea className={inputClass} rows={2} value={form.purpose} onChange={e => update("purpose", e.target.value)} /></div>
            )}
            <div><label className={labelClass}>想定読者</label><input className={inputClass} value={form.targetReader} onChange={e => update("targetReader", e.target.value)} /></div>
            <div><label className={labelClass}>概要</label><textarea className={inputClass} rows={3} value={form.summary} onChange={e => update("summary", e.target.value)} /></div>
            {projectType === "GR" && (
              <div><label className={labelClass}>備考</label><textarea className={inputClass} rows={2} value={form.notes} onChange={e => update("notes", e.target.value)} /></div>
            )}
          </fieldset>
          {/* PDF */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              form.pdfFile ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-indigo-400"
            }`}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-indigo-500", "bg-indigo-50"); }}
            onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50"); }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50");
              const file = e.dataTransfer.files[0];
              if (file && file.type === "application/pdf") handlePDFFile(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files[0];
                if (file) handlePDFFile(file);
                e.target.value = "";
              }}
            />
            {isParsing ? (
              <div>
                <svg className="mx-auto h-10 w-10 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="mt-2 text-sm text-indigo-600">PDFを解析中...</p>
              </div>
            ) : form.pdfFile ? (
              <div>
                <svg className="mx-auto h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-green-700">{form.pdfFile}</p>
                {parseMsg.startsWith("success") && (
                  <p className="mt-1 text-xs text-indigo-600 font-medium">✓ PDFから{parseMsg.split(":")[1]}項目を自動入力しました</p>
                )}
                {parseMsg === "nodata" && (
                  <p className="mt-1 text-xs text-amber-600">発注情報が見つかりませんでした。手動で入力してください。</p>
                )}
                {parseMsg === "error" && (
                  <p className="mt-1 text-xs text-red-500">PDF解析に失敗しました。手動で入力してください。</p>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); update("pdfFile", ""); update("pdfData", ""); setParseMsg(""); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline">ファイルを削除</button>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  {projectType === "GMC" ? "企画書PDFをアップロード" : "カバー発注依頼メールPDFをアップロード（GRは自動入力対応）"}
                </p>
                <p className="text-xs text-gray-400 mt-1">クリックまたはドラッグ&ドロップ</p>
              </div>
            )}
          </div>
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{submitError}</div>
          )}
          <button type="submit" disabled={isSubmitting}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors text-sm ${
              isSubmitting ? "bg-gray-400 cursor-not-allowed" :
              projectType === "GMC" ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}>
            {isSubmitting ? "登録中…（PDFアップロード中）" : projectType === "GMC" ? "GMC案件を登録" : "GR案件を登録"}
          </button>
        </form>
      </div>
    </div>
  );
}
// =====================
// 案件編集モーダル
// =====================
function EditProjectModal({ project, onUpdate, onDelete, onClose }) {
  const [form, setForm] = useState({ ...project });
  const [saveError, setSaveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = React.useRef(null);
  const isGMC = project.type === "GMC";
  const update = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (isGMC && key === "author") next.clientName = val;
    return next;
  });
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";
  const handleSave = async () => {
    if (!form.title || !form.author) {
      setSaveError("タイトルと著者名は必須です");
      return;
    }
    setSaveError("");
    setSaving(true);
    const updated = {
      ...form,
      pages: parseInt(form.pages) || 0,
      printRun: parseInt(form.printRun) || 0,
      price: parseInt(form.price) || 0,
      designFee: parseInt(form.designFee) || 0,
      illustFee: parseInt(form.illustFee) || 0,
      totalFee: parseInt(form.totalFee) || (parseInt(form.designFee) || 0) + (parseInt(form.illustFee) || 0),
    };
    if (updated.pdfData && updated.pdfData.startsWith("blob:")) {
      try {
        const resp = await fetch(updated.pdfData);
        const blob = await resp.blob();
        const file = new File([blob], updated.pdfFile || "upload.pdf", { type: "application/pdf" });
        const url = await uploadPDFToStorage(file, updated.id);
        if (url) updated.pdfUrl = url;
      } catch (e) { console.error("PDF upload failed:", e); }
    }
    delete updated.pdfData;
    onUpdate(updated);
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge color={isGMC ? "blue" : "indigo"}>{project.type}</Badge>
            <h2 className="text-lg font-bold text-gray-800">案件情報の編集</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        {/* フォーム */}
        <div className="p-6 space-y-5">
          {/* 書籍情報 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">書籍情報</legend>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>タイトル *</label>
                <input className={inputClass} value={form.title || ""} onChange={e => update("title", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>サブタイトル</label>
                <input className={inputClass} value={form.subtitle || ""} onChange={e => update("subtitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>著者名 *</label>
                <input className={inputClass} value={form.author || ""} onChange={e => update("author", e.target.value)} />
              </div>
              {isGMC ? (
                <div>
                  <label className={labelClass}>クライアント名</label>
                  <input className={inputClass} value={form.clientName || ""} onChange={e => update("clientName", e.target.value)} />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>契約者名</label>
                  <input className={inputClass} value={form.contractName || ""} onChange={e => update("contractName", e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelClass}>ジャンル</label>
                <select className={inputClass} value={form.genre || "その他"} onChange={e => update("genre", e.target.value)}>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>制作番号</label>
                <input className={inputClass} value={form.productionNo || ""} onChange={e => update("productionNo", e.target.value)} />
              </div>
            </div>
          </fieldset>
          {/* 仕様 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">仕様</legend>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>判型</label>
                <input className={inputClass} value={form.format || ""} onChange={e => update("format", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>ページ数</label>
                <input type="number" className={inputClass} value={form.pages || ""} onChange={e => update("pages", e.target.value)} />
              </div>
              {isGMC ? (
                <div>
                  <label className={labelClass}>発行部数</label>
                  <input type="number" className={inputClass} value={form.printRun || ""} onChange={e => update("printRun", e.target.value)} />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>定価（円）</label>
                  <input type="number" className={inputClass} value={form.price || ""} onChange={e => update("price", e.target.value)} />
                </div>
              )}
            </div>
            {!isGMC && (
              <div>
                <label className={labelClass}>文字数</label>
                <input className={inputClass} value={form.charCount || ""} onChange={e => update("charCount", e.target.value)} />
              </div>
            )}
          </fieldset>
          {/* スケジュール */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">スケジュール</legend>
            {isGMC ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>納期</label>
                  <input type="date" className={inputClass} value={form.deadline || ""} onChange={e => update("deadline", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>備考（KO/RMTG等）</label>
                  <input className={inputClass} value={form.notes || ""} onChange={e => update("notes", e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>ラフUP希望日</label>
                  <input className={inputClass} value={form.roughUpDate || ""} onChange={e => update("roughUpDate", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>入稿予定日</label>
                  <input className={inputClass} value={form.submissionDate || ""} onChange={e => update("submissionDate", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>刊行予定日</label>
                  <input className={inputClass} value={form.deadline || ""} onChange={e => update("deadline", e.target.value)} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>登録日</label>
                <input type="date" className={inputClass} value={form.registeredDate || ""} onChange={e => update("registeredDate", e.target.value)} />
              </div>
            </div>
          </fieldset>
          {/* 関係者 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">関係者</legend>
            {isGMC ? (
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>GMC営業担当</label><input className={inputClass} value={form.salesRep || ""} onChange={e => update("salesRep", e.target.value)} /></div>
                <div><label className={labelClass}>GMC編集窓口</label><input className={inputClass} value={form.editContact || ""} onChange={e => update("editContact", e.target.value)} /></div>
                <div><label className={labelClass}>編集プロダクション</label><input className={inputClass} value={form.editPro || ""} onChange={e => update("editPro", e.target.value)} /></div>
                <div><label className={labelClass}>編プロ担当者</label><input className={inputClass} value={form.editProContact || ""} onChange={e => update("editProContact", e.target.value)} /></div>
                <div><label className={labelClass}>ライター</label><input className={inputClass} value={form.writer || ""} onChange={e => update("writer", e.target.value)} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>GR担当</label><input className={inputClass} value={form.grRep || ""} onChange={e => update("grRep", e.target.value)} /></div>
                <div>
                  <label className={labelClass}>打合せ形式</label>
                  <select className={inputClass} value={form.meetingFormat || "オンライン"} onChange={e => update("meetingFormat", e.target.value)}>
                    <option>オンライン</option><option>対面</option><option>電話</option>
                  </select>
                </div>
                <div><label className={labelClass}>打合せ時間</label><input className={inputClass} value={form.meetingTime || ""} onChange={e => update("meetingTime", e.target.value)} /></div>
              </div>
            )}
          </fieldset>
          {/* GR費用 */}
          {!isGMC && (
            <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
              <legend className="text-sm font-bold text-gray-700 px-2">費用</legend>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>デザイン費</label><input type="number" className={inputClass} value={form.designFee || ""} onChange={e => update("designFee", e.target.value)} /></div>
                <div><label className={labelClass}>イラスト費</label><input type="number" className={inputClass} value={form.illustFee || ""} onChange={e => update("illustFee", e.target.value)} /></div>
                <div><label className={labelClass}>依頼費合計</label><input type="number" className={inputClass} value={form.totalFee || ""} onChange={e => update("totalFee", e.target.value)} /></div>
              </div>
            </fieldset>
          )}
          {/* 内容 */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-bold text-gray-700 px-2">内容</legend>
            {isGMC && (
              <div><label className={labelClass}>出版目的</label><textarea className={inputClass} rows={2} value={form.purpose || ""} onChange={e => update("purpose", e.target.value)} /></div>
            )}
            <div><label className={labelClass}>想定読者</label><input className={inputClass} value={form.targetReader || ""} onChange={e => update("targetReader", e.target.value)} /></div>
            <div><label className={labelClass}>概要</label><textarea className={inputClass} rows={3} value={form.summary || ""} onChange={e => update("summary", e.target.value)} /></div>
            {!isGMC && (
              <div><label className={labelClass}>備考</label><textarea className={inputClass} rows={2} value={form.notes || ""} onChange={e => update("notes", e.target.value)} /></div>
            )}
          </fieldset>
          {/* 添付PDF */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
            <legend className="text-sm font-bold text-gray-700 px-2">添付PDF</legend>
            {(form.pdfUrl || form.pdfFile) && !form.pdfData && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span className="text-sm text-gray-700 truncate flex-1">{form.pdfFile || "PDF"}</span>
                {form.pdfUrl && (
                  <a href={form.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">開く</a>
                )}
                <button type="button" onClick={() => { update("pdfFile", ""); update("pdfUrl", ""); }}
                  className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap">削除</button>
              </div>
            )}
            {form.pdfData && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span className="text-sm text-blue-700 truncate flex-1">{form.pdfFile || "新しいPDF"}</span>
                <span className="text-xs text-blue-500">保存時にアップロード</span>
                <button type="button" onClick={() => { update("pdfFile", project.pdfFile || ""); update("pdfData", ""); update("pdfUrl", project.pdfUrl || ""); }}
                  className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap">取消</button>
              </div>
            )}
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer border-gray-300 hover:border-indigo-400 transition-colors"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-indigo-500", "bg-indigo-50"); }}
              onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50"); }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50");
                const file = e.dataTransfer.files[0];
                if (file && file.type === "application/pdf") {
                  update("pdfFile", file.name);
                  update("pdfData", URL.createObjectURL(file));
                }
              }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                onChange={e => { const file = e.target.files[0]; if (file) { update("pdfFile", file.name); update("pdfData", URL.createObjectURL(file)); } e.target.value = ""; }} />
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-1 text-sm text-gray-500">{form.pdfFile ? "PDFを差し替え" : "PDFをアップロード"}</p>
              <p className="text-xs text-gray-400">クリックまたはドラッグ&ドロップ</p>
            </div>
          </fieldset>
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{saveError}</div>
          )}
          {/* ボタン */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
              キャンセル
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white transition-colors ${isGMC ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"} ${saving ? "opacity-50" : ""}`}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
          {/* 削除セクション */}
          {onDelete && (
            <div className="border-t border-gray-200 pt-4 mt-2">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="w-full px-4 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors">
                  この案件を削除する
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-red-700">本当にこの案件を削除しますか？この操作は取り消せません。</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setConfirmDelete(false)}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                      キャンセル
                    </button>
                    <button type="button" onClick={() => { onDelete(project.id); onClose(); }}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors">
                      削除する
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// =====================
// スタッフ管理 タブ
// =====================
function StaffTab({ staff, setStaff, projects }) {
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", role: "ディレクター", employment: "業務委託", skills: "", maxCases: 8, notes: "" });
  const startEdit = (s) => { setEditing(s.id); setEditForm({ ...s, skills: s.skills.join(", ") }); };
  const saveEdit = () => {
    setStaff(prev => prev.map(s => s.id === editing ? { ...s, ...editForm, skills: editForm.skills.split(",").map(sk => sk.trim()).filter(Boolean) } : s));
    setEditing(null);
  };
  const addStaff = () => {
    if (!newForm.name) return;
    setStaff(prev => [...prev, {
      ...newForm,
      id: Date.now(),
      skills: newForm.skills.split(",").map(sk => sk.trim()).filter(Boolean),
      maxCases: parseInt(newForm.maxCases) || 8,
    }]);
    setNewForm({ name: "", role: "ディレクター", employment: "業務委託", skills: "", maxCases: 8, notes: "" });
    setAdding(false);
  };
  const removeStaff = (id) => {
    if (getStaffLoad(id, projects) > 0) return;
    setStaff(prev => prev.filter(s => s.id !== id));
  };
  const inputCls = "border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";
  const selectCls = "border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500";
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">ディレクター {staff.filter(s => s.role === "ディレクター" && !s.retired).length}名 ／ エキスパート {staff.filter(s => s.role === "エキスパート" && !s.retired).length}名</p>
        <button onClick={() => setAdding(!adding)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${adding ? "bg-gray-200 text-gray-600" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {adding ? "キャンセル" : "+ スタッフ追加"}
        </button>
      </div>
      {/* 新規追加フォーム */}
      {adding && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-indigo-800">新規スタッフ追加</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">名前 *</label>
              <input className={inputCls} value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="氏名" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">雇用形態</label>
              <select className={selectCls + " w-full"} value={newForm.employment} onChange={e => setNewForm({ ...newForm, employment: e.target.value })}>
                <option>社員</option><option>業務委託</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">役割</label>
              <select className={selectCls + " w-full"} value={newForm.role} onChange={e => setNewForm({ ...newForm, role: e.target.value })}>
                <option>ディレクター</option><option>エキスパート</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">上限件数</label>
              <input type="number" className={inputCls} value={newForm.maxCases} onChange={e => setNewForm({ ...newForm, maxCases: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">得意分野（カンマ区切り）</label>
              <input className={inputCls} value={newForm.skills} onChange={e => setNewForm({ ...newForm, skills: e.target.value })} placeholder="ビジネス, 経営, マーケティング" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">備考</label>
              <input className={inputCls} value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} placeholder="メモ・注意事項など" />
            </div>
          </div>
          <button onClick={addStaff}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            追加する
          </button>
        </div>
      )}
      {/* スタッフ一覧 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-3 py-3 text-left">名前</th>
                <th className="px-3 py-3 text-left">雇用</th>
                <th className="px-3 py-3 text-left">役割</th>
                <th className="px-3 py-3 text-left">得意分野</th>
                <th className="px-3 py-3 text-left w-16">上限</th>
                <th className="px-3 py-3 text-left" style={{minWidth: 120}}>稼働</th>
                <th className="px-3 py-3 text-left">備考</th>
                <th className="px-3 py-3 text-left w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(s => {
                const load = getStaffLoad(s.id, projects);
                if (editing === s.id) {
                  return (
                    <tr key={s.id} className="bg-indigo-50">
                      <td className="px-3 py-2"><input className={inputCls} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                      <td className="px-3 py-2">
                        <select className={selectCls} value={editForm.employment || "業務委託"} onChange={e => setEditForm({ ...editForm, employment: e.target.value })}>
                          <option>社員</option><option>業務委託</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className={selectCls} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                          <option>ディレクター</option><option>エキスパート</option>
                        </select>
                      </td>
                      <td className="px-3 py-2"><input className={inputCls} value={editForm.skills} onChange={e => setEditForm({ ...editForm, skills: e.target.value })} placeholder="カンマ区切り" /></td>
                      <td className="px-3 py-2"><input type="number" className={inputCls + " w-16"} value={editForm.maxCases} onChange={e => setEditForm({ ...editForm, maxCases: parseInt(e.target.value) || 0 })} /></td>
                      <td className="px-3 py-2 text-gray-500">{load}/{editForm.maxCases}</td>
                      <td className="px-3 py-2"><input className={inputCls} value={editForm.notes || ""} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="備考" /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium">保存</button>
                          <button onClick={() => setEditing(null)} className="px-2.5 py-1 bg-gray-200 text-gray-600 rounded text-xs font-medium">取消</button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={s.id} className={`hover:bg-gray-50 group ${s.retired ? "opacity-50" : ""}`}>
                    <td className="px-3 py-3 font-medium text-gray-800">
                      {s.name}
                      {s.retired && <Badge color="gray">退職</Badge>}
                    </td>
                    <td className="px-3 py-3"><Badge color={s.employment === "社員" ? "blue" : "orange"}>{s.employment || "-"}</Badge></td>
                    <td className="px-3 py-3"><Badge color={s.role === "エキスパート" ? "purple" : "blue"}>{s.role}</Badge></td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{s.skills.join(", ")}</td>
                    <td className="px-3 py-3 text-gray-600">{s.maxCases}</td>
                    <td className="px-3 py-3"><LoadBar current={load} max={s.maxCases} /></td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.notes || ""}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(s)} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200">編集</button>
                        <button onClick={() => setStaff(prev => prev.map(st => st.id === s.id ? { ...st, retired: !st.retired } : st))}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-opacity ${
                            s.retired
                              ? "bg-green-50 text-green-600 hover:bg-green-100"
                              : "bg-amber-50 text-amber-600 hover:bg-amber-100 opacity-0 group-hover:opacity-100"
                          }`}>
                          {s.retired ? "復帰" : "退職"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">※退職ボタンは行ホバー時に表示されます。退職済スタッフは復帰ボタンで復帰できます。</p>
    </div>
  );
}
// =====================
// 月別案件数 タブ
// =====================
function MonthlyTab({ projects, staff }) {
  const [typeFilter, setTypeFilter] = useState("GMC");
  const [roleFilter, setRoleFilter] = useState("ディレクター");
  const filteredStaff = staff.filter(s => s.role === roleFilter && !s.retired);
  const filteredProjects = projects.filter(p =>
    p.type === typeFilter &&
    p.status === "担当決定済" &&
    (roleFilter === "エキスパート"
      ? p.expertId && filteredStaff.some(s => s.id === p.expertId)
      : p.assignedTo && filteredStaff.some(s => s.id === p.assignedTo))
  );
  function getDeliveryMonth(p) {
    const d = p.deadline || "";
    const match = d.match(/^(\d{4})-(\d{1,2})/);
    if (match) return `${match[1]}/${parseInt(match[2])}`;
    const match2 = d.match(/(\d{4})\D+(\d{1,2})/);
    if (match2) return `${match2[1]}/${parseInt(match2[2])}`;
    return "未定";
  }
  const allMonths = [];
  for (let y = 2026; y <= 2027; y++) {
    for (let m = 1; m <= 12; m++) {
      allMonths.push(`${y}/${m}`);
    }
  }
  allMonths.push("調整中", "未定");
  const staffMonthCounts = {};
  filteredStaff.forEach(s => {
    staffMonthCounts[s.id] = {};
    allMonths.forEach(m => { staffMonthCounts[s.id][m] = 0; });
  });
  filteredProjects.forEach(p => {
    const month = getDeliveryMonth(p);
    const sid = roleFilter === "エキスパート" ? p.expertId : p.assignedTo;
    if (staffMonthCounts[sid]) {
      const key = allMonths.includes(month) ? month : "未定";
      staffMonthCounts[sid][key] = (staffMonthCounts[sid][key] || 0) + 1;
    }
  });
  const usedMonths = allMonths.filter(m =>
    filteredStaff.some(s => staffMonthCounts[s.id]?.[m] > 0)
  );
  function getTotal(staffId) {
    return allMonths.reduce((sum, m) => sum + (staffMonthCounts[staffId]?.[m] || 0), 0);
  }
  function getMonthTotal(month) {
    return filteredStaff.reduce((sum, s) => sum + (staffMonthCounts[s.id]?.[month] || 0), 0);
  }
  const grandTotal = filteredStaff.reduce((sum, s) => sum + getTotal(s.id), 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600 mr-1">種別:</span>
        {["GMC", "GR"].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === t
                ? (t === "GMC" ? "bg-blue-600 text-white" : "bg-indigo-600 text-white")
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>{t}</button>
        ))}
        <span className="border-l border-gray-300 mx-2 h-5" />
        <span className="text-sm font-medium text-gray-600 mr-1">役割:</span>
        {["ディレクター", "エキスパート"].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              roleFilter === r
                ? (r === "ディレクター" ? "bg-purple-600 text-white" : "bg-yellow-500 text-white")
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>{r}</button>
        ))}
        <span className="ml-auto text-sm text-gray-500">
          {typeFilter}担当案件数（{roleFilter}）ー 合計 <span className="font-bold text-gray-800">{grandTotal}</span> 件
        </span>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-700 text-white text-xs">
                <th className="px-3 py-2.5 text-left sticky left-0 bg-gray-700 z-10 min-w-32">
                  デザイン担当（{roleFilter}）
                </th>
                {usedMonths.map(m => (
                  <th key={m} className="px-2 py-2.5 text-center min-w-16 whitespace-nowrap">{m}</th>
                ))}
                <th className="px-3 py-2.5 text-center bg-gray-800 min-w-16 font-bold">総計</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s, idx) => {
                const total = getTotal(s.id);
                return (
                  <tr key={s.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                    <td className={`px-3 py-2 font-medium text-gray-800 sticky left-0 z-10 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-r border-gray-200`}>
                      {s.name}
                    </td>
                    {usedMonths.map(m => {
                      const count = staffMonthCounts[s.id]?.[m] || 0;
                      return (
                        <td key={m} className={`px-2 py-2 text-center ${count > 0 ? "text-gray-800 font-medium" : "text-gray-300"}`}>
                          {count > 0 ? count : ""}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-2 text-center font-bold border-l-2 border-gray-300 ${
                      total >= 20 ? "text-red-600 bg-red-50" : total >= 10 ? "text-orange-600 bg-orange-50" : "text-gray-800"
                    }`}>
                      {total}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td className="px-3 py-2.5 text-gray-700 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">合計</td>
                {usedMonths.map(m => {
                  const mt = getMonthTotal(m);
                  return (
                    <td key={m} className={`px-2 py-2.5 text-center ${mt > 0 ? "text-gray-800" : "text-gray-300"}`}>
                      {mt > 0 ? mt : ""}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center text-indigo-700 border-l-2 border-gray-300">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">※案件の納期（刊行予定日）を元に月別に集計しています。総計20件以上は赤、10件以上はオレンジで表示。</p>
    </div>
  );
}
// =====================
// 共有案件ページ
// =====================
function SharedProjectPage({ token }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function fetch() {
      const { data, error: err } = await supabase.from("projects").select("data").eq("data->>shareToken", token).single();
      if (err || !data) { setError("案件が見つかりません"); }
      else { setProject(data.data); }
      setLoading(false);
    }
    fetch();
  }, [token]);
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <p className="text-gray-500 text-lg">{error}</p>
      </div>
    </div>
  );
  const isGMC = project.type === "GMC";
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <p className="text-xs text-gray-400">案件情報</p>
          <h1 className="text-lg font-bold text-gray-800 mt-1">{project.title || "未定"}</h1>
          {project.subtitle && <p className="text-sm text-gray-500">{project.subtitle}</p>}
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
          <Badge color={isGMC ? "blue" : "indigo"}>{project.type}</Badge>
          <Badge color="gray">{project.genre || "-"}</Badge>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-700 border-b pb-2">案件情報</h3>
          <InfoRow label="著者名" value={project.author} />
          {isGMC && <InfoRow label="クライアント" value={project.clientName} />}
          {!isGMC && <InfoRow label="契約者名" value={project.contractName} />}
          <InfoRow label="ジャンル" value={project.genre} />
          <InfoRow label="納期" value={project.deadline} />
          <InfoRow label="ページ数" value={project.pages ? `${project.pages}P` : null} />
          <InfoRow label="判型" value={project.format} />
          {isGMC && <InfoRow label="発行部数" value={project.printRun ? `${project.printRun}部` : null} />}
          {!isGMC && <InfoRow label="定価" value={project.price ? `¥${project.price}` : null} />}
          {project.notes && <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">{project.notes}</div>}
        </div>
        {project.pdfUrl && (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">企画書PDF</h3>
            <iframe src={project.pdfUrl} className="w-full h-96 border rounded-lg hidden sm:block" title="PDF" />
            <a href={project.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="block sm:hidden px-4 py-3 bg-indigo-600 text-white rounded-lg text-center text-sm font-medium">
              PDFを開く: {project.pdfFile || "PDF"}
            </a>
          </div>
        )}
        <p className="text-center text-xs text-gray-300 mt-8">案件担当 割振りシステム</p>
      </main>
    </div>
  );
}
// =====================
// LINE通知テキストモーダル
// =====================
function LINETextModal({ project, staff, onClose, onNotified }) {
  const [ensuring, setEnsuring] = useState(false);
  const [shareUrl, setShareUrl] = useState(project.shareToken ? getShareUrl(project) : null);
  const assignedStaff = staff.find(s => s.id === project.assignedTo);
  const subDirector = staff.find(s => s.id === project.subDirectorId);
  const expertAssigned = staff.find(s => s.id === project.expertId);
  const scenarios = [];
  scenarios.push({ label: "局長向け（担当決定依頼）", key: "director" });
  if (assignedStaff) {
    if (assignedStaff.employment === "社員") {
      scenarios.push({ label: `${assignedStaff.name}（メインD）向け`, key: "employee", staffId: assignedStaff.id });
    } else {
      scenarios.push({ label: `${assignedStaff.name}（メインD）向け`, key: "contractor", staffId: assignedStaff.id });
    }
  }
  if (subDirector) {
    if (subDirector.employment === "社員") {
      scenarios.push({ label: `${subDirector.name}（サブD）向け`, key: "sub_employee", staffId: subDirector.id });
    } else {
      scenarios.push({ label: `${subDirector.name}（サブD）向け`, key: "sub_contractor", staffId: subDirector.id });
    }
  }
  if (expertAssigned) {
    scenarios.push({ label: `${expertAssigned.name}（E）向け`, key: "expert", staffId: expertAssigned.id });
  }
  // 通知が必要な人のリスト（局長は除く）
  const needNotifyIds = scenarios.filter(s => s.staffId).map(s => s.staffId);
  const notifiedList = project.notifiedList || [];
  const [selected, setSelected] = useState(scenarios[0]?.key);
  const [copied, setCopied] = useState(false);
  const currentScenario = scenarios.find(s => s.key === selected);
  const member = selected === "expert" ? expertAssigned : (selected?.startsWith("sub_") ? subDirector : assignedStaff);
  const lineKey = selected?.startsWith("sub_") ? (selected === "sub_employee" ? "employee" : "contractor") : selected;
  const text = generateLINEText(lineKey, project, member, shareUrl, staff);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // 人別通知追跡
    const staffId = currentScenario?.staffId;
    if (staffId && !notifiedList.includes(staffId)) {
      const newList = [...notifiedList, staffId];
      const allNotified = needNotifyIds.every(id => newList.includes(id));
      onNotified(project.id, newList, allNotified);
    }
  };
  // shareTokenが無ければ生成してSupabaseに保存
  useEffect(() => {
    if (!project.shareToken && !ensuring) {
      setEnsuring(true);
      const token = generateShareToken();
      project.shareToken = token;
      supabase.from("projects").update({ data: project }).eq("id", project.id)
        .then(() => { setShareUrl(getShareUrl(project)); setEnsuring(false); });
    }
  }, []);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-green-50 rounded-t-xl flex items-center justify-between">
          <h3 className="font-bold text-green-800">LINE通知テキスト</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {scenarios.map(s => {
              const done = s.staffId && notifiedList.includes(s.staffId);
              return (
                <button key={s.key} onClick={() => { setSelected(s.key); setCopied(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selected === s.key ? "bg-green-600 text-white" : done ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {done ? "✅ " : ""}{s.label}
                </button>
              );
            })}
          </div>
          {needNotifyIds.length > 0 && (
            <div className="text-xs text-gray-500">
              通知済み: {notifiedList.length}/{needNotifyIds.length}人
              {notifiedList.length >= needNotifyIds.length && " ✅ 全員通知完了！"}
            </div>
          )}
          {ensuring && <p className="text-xs text-gray-400">共有リンクを生成中...</p>}
          <pre className="bg-gray-50 border rounded-lg p-3 text-sm whitespace-pre-wrap font-sans max-h-64 overflow-auto">{text}</pre>
          <button onClick={handleCopy}
            className={`w-full py-3 rounded-lg font-medium text-sm transition-colors ${copied ? "bg-green-100 text-green-700" : "bg-green-600 text-white hover:bg-green-700"}`}>
            {copied ? "コピーしました!" : "テキストをコピー"}
          </button>
        </div>
      </div>
    </div>
  );
}
// =====================
// メインアプリ
// =====================
export default function App() {
  // --- 共有ページチェック ---
  const hash = window.location.hash;
  const shareMatch = hash.match(/^#\/share\/(.+)$/);
  if (shareMatch) {
    return <SharedProjectPage token={shareMatch[1]} />;
  }

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [staff, setStaffRaw] = useState(INITIAL_STAFF);
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showLINEText, setShowLINEText] = useState(null);

  // --- Supabase同期ラッパー ---
  const setStaff = useCallback((updater) => {
    setStaffRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      upsertStaff(next);
      return next;
    });
  }, []);

  const setStaffWithSync = setStaff;

  // --- 初回ロード ---
  useEffect(() => {
    async function load() {
      try {
        const [{ data: projRows }, { data: staffRows }] = await Promise.all([
          supabase.from("projects").select("*"),
          supabase.from("staff").select("*"),
        ]);
        if (projRows && projRows.length > 0) {
          setProjects(projRows.map(r => ({ ...r.data, id: r.id })));
        }
        if (staffRows && staffRows.length > 0) {
          setStaffRaw(staffRows.map(r => ({ ...r.data, id: r.id })));
        } else {
          // 初回: INITIAL_STAFFをSupabaseにアップロード
          await upsertStaff(INITIAL_STAFF);
        }
      } catch (e) {
        console.error("Supabase load error:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  // --- リアルタイム ---
  useEffect(() => {
    const projSub = supabase.channel("projects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setProjects(prev => prev.filter(p => p.id !== payload.old.id));
        } else {
          const updated = { ...payload.new.data, id: payload.new.id };
          setProjects(prev => {
            const idx = prev.findIndex(p => p.id === updated.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
            return [...prev, updated];
          });
        }
      })
      .subscribe();
    const staffSub = supabase.channel("staff-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setStaffRaw(prev => prev.filter(s => s.id !== payload.old.id));
        } else {
          const updated = { ...payload.new.data, id: payload.new.id };
          setStaffRaw(prev => {
            const idx = prev.findIndex(s => s.id === updated.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
            return [...prev, updated];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(projSub); supabase.removeChannel(staffSub); };
  }, []);

  // --- ハンドラー ---
  const handleAssign = async (projectId, staffId, expertId, subDirectorId) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assignedTo: staffId, subDirectorId: subDirectorId || null, expertId: expertId || null, status: "担当決定済", notified: false } : p));
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const updated = { ...proj, assignedTo: staffId, subDirectorId: subDirectorId || null, expertId: expertId || null, status: "担当決定済", notified: false };
      await upsertProject(updated);
      // Chatwork通知（担当決定）— 一時停止中
      // TODO: 通知内容を調整後に再有効化
    }
  };

  const handleRegister = async (newProject) => {
    const proj = { ...newProject, id: Date.now() };
    // PDF をStorage にアップロード
    if (proj.pdfData && proj.pdfData.startsWith("blob:")) {
      try {
        const resp = await fetch(proj.pdfData);
        const blob = await resp.blob();
        const file = new File([blob], proj.pdfFile || "upload.pdf", { type: "application/pdf" });
        const url = await uploadPDFToStorage(file, proj.id);
        if (url) { proj.pdfUrl = url; }
      } catch (e) { console.error("PDF upload failed:", e); }
    }
    delete proj.pdfData;
    setProjects(prev => [...prev, proj]);
    await upsertProject(proj);
    // Chatwork自動通知（局長へ）
    try {
      await fetch("/api/notify-chatwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: proj.title,
          author: proj.author,
          type: proj.type,
          genre: proj.genre,
          pages: proj.pages,
          deadline: proj.deadline,
          productionNo: proj.productionNo,
        }),
      });
    } catch (e) { console.error("Chatwork notify failed:", e); }
    setTab("projects");
  };

  const handleUpdate = async (updatedProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (selectedProject && selectedProject.id === updatedProject.id) {
      setSelectedProject(updatedProject);
    }
    await upsertProject(updatedProject);
  };

  const handleBulkImport = async (newProjects) => {
    setProjects(prev => [...prev, ...newProjects]);
    await upsertProjects(newProjects);
    setTab("projects");
  };

  const handleArchive = async (projectId) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: "入稿完了" } : p));
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const updated = { ...proj, status: "入稿完了" };
      await upsertProject(updated);
    }
  };

  const handleDelete = async (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    await supabase.from("projects").delete().eq("id", projectId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "ダッシュボード" },
    { id: "projects", label: "案件一覧" },
    { id: "monthly", label: "月別案件数" },
    { id: "register", label: "新規登録" },
    { id: "staff", label: "スタッフ管理" },
  ];
  const unassignedCount = projects.filter(p => p.status === "未割当").length;
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">案件担当 割振りシステム</h1>
            <p className="text-xs text-gray-400 mt-0.5">デザイン局 ダッシュボード</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{new Date().toLocaleDateString("ja-JP")}</span>
            <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs">管</span>
          </div>
        </div>
      </header>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                tab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
              {t.id === "projects" && unassignedCount > 0 && (
                <span className="absolute -top-0.5 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">{unassignedCount}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "dashboard" && <DashboardTab projects={projects} staff={staff} />}
        {tab === "projects" && <ProjectListTab projects={projects} staff={staff} onSelectProject={setSelectedProject} onEditProject={setEditingProject} />}
        {tab === "monthly" && <MonthlyTab projects={projects} staff={staff} />}
        {tab === "register" && <RegisterTab onRegister={handleRegister} onOpenCSVImport={() => setShowCSVImport(true)} />}
        {tab === "staff" && <StaffTab staff={staff} setStaff={setStaffWithSync} projects={projects} />}
      </main>
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          staff={staff}
          projects={projects}
          onAssign={handleAssign}
          onArchive={handleArchive}
          onClose={() => setSelectedProject(null)}
          onNotified={(projectId, newNotifiedList, allDone) => {
            const updates = { notifiedList: newNotifiedList, notified: allDone ? true : false };
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
            setSelectedProject(prev => prev && prev.id === projectId ? { ...prev, ...updates } : prev);
            const proj = projects.find(p => p.id === projectId);
            if (proj) upsertProject({ ...proj, ...updates });
          }}
        />
      )}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditingProject(null)}
        />
      )}
      {showCSVImport && (
        <CSVImportModal
          staff={staff}
          onImport={handleBulkImport}
          onClose={() => setShowCSVImport(false)}
        />
      )}
    </div>
  );
}
