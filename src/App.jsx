import React, { useState, useMemo, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
// =============================================
// 案件担当 割振りシステム（GMC / GR 対応版）
// =============================================
// --- スタッフデータ ---
// ※得意分野は仮設定です。「スタッフ管理」タブから編集できます。
const INITIAL_STAFF = [
  { id: 1, name: "窪田雅也", role: "ディレクター", employment: "社員", skills: ["ビジネス", "経営"], maxCases: 8, notes: "" },
  { id: 2, name: "首藤孝太郎", role: "ディレクター", employment: "社員", skills: ["ビジネス", "マーケティング"], maxCases: 8, notes: "" },
  { id: 3, name: "安部佑介", role: "ディレクター", employment: "社員", skills: ["IT", "テクノロジー"], maxCases: 8, notes: "" },
  { id: 4, name: "北川恵介", role: "ディレクター", employment: "社員", skills: ["教育", "自己啓発"], maxCases: 8, notes: "" },
  { id: 5, name: "星合優希", role: "ディレクター", employment: "社員", skills: ["歴史", "社会"], maxCases: 8, notes: "" },
  { id: 6, name: "稲場俊哉", role: "ディレクター", employment: "業務委託", skills: ["小説", "エッセイ"], maxCases: 8, notes: "" },
  { id: 7, name: "渡邉禎則", role: "ディレクター", employment: "業務委託", skills: ["医療", "健康"], maxCases: 8, notes: "" },
  { id: 8, name: "常世田琢", role: "ディレクター", employment: "業務委託", skills: ["ビジネス", "金融"], maxCases: 8, notes: "" },
  { id: 9, name: "西村裕介", role: "ディレクター", employment: "業務委託", skills: ["ライフスタイル", "随筆"], maxCases: 8, notes: "鹿久保さんへ引き継ぐ→復活" },
  { id: 10, name: "長田年伸", role: "ディレクター", employment: "業務委託", skills: ["医療", "科学"], maxCases: 8, notes: "" },
  { id: 11, name: "長井奈々", role: "ディレクター", employment: "業務委託", skills: ["教育", "子育て"], maxCases: 8, notes: "" },
  { id: 12, name: "大和剛", role: "ディレクター", employment: "業務委託", skills: ["スポーツ", "趣味"], maxCases: 8, notes: "" },
  { id: 13, name: "兼光良枝", role: "ディレクター", employment: "業務委託", skills: ["歴史", "文学"], maxCases: 8, notes: "" },
  { id: 14, name: "小森彩", role: "エキスパート", employment: "業務委託", skills: ["全般"], maxCases: 5, notes: "" },
  { id: 15, name: "加藤美晴", role: "エキスパート", employment: "業務委託", skills: ["全般"], maxCases: 5, notes: "" },
];
const GENRES = [
  "ビジネス", "経営", "マーケティング", "医療", "健康", "IT", "テクノロジー",
  "教育", "自己啓発", "歴史", "社会", "小説", "エッセイ", "随筆",
  "金融", "料理", "ライフスタイル", "スポーツ", "趣味", "科学", "文学", "子育て", "その他"
];
// --- サンプル案件（実際のPDFから抽出した形式） ---
const SAMPLE_PROJECTS = [
  {
    id: 1, type: "GMC", status: "未割当", assignedTo: null,
    registeredDate: "2026-02-27",
    title: "文脈学",
    subtitle: "「こいつ、何が言いたいん？」をなくす思考のトレーニング",
    author: "山口郁未",
    clientName: "株式会社mazuWA",
    genre: "マーケティング",
    deadline: "2026-06-26",
    pages: 200, format: "四六判単行本", printRun: 3000,
    salesRep: "泉華奈",
    editContact: "景山哲太",
    editPro: "株式会社G.B.",
    editProContact: "坂尾昌昭",
    writer: "丹羽祐太朗",
    purpose: "共育プログラム 'Wow Camp' のブランディングと認知度向上／集客（PULL型営業の実現）",
    targetReader: "プロダクト企画／マーケティング従事者、チーム力を高めたいマネージャー",
    summary: "マーケティング思考から生まれた「文脈学」で、伝わる言語化力と本質をつかむ思考力を育てる。カンロ、資生堂、ヤンマーほか名だたる企業が導入。",
    notes: "KO: 3/9、RMTG: 4/13",
    pdfFile: "企画書TSO【承認】260217.pdf",
  },
  {
    id: 2, type: "GR", status: "未割当", assignedTo: null,
    registeredDate: "2026-02-27",
    title: "続・新健康夜咄",
    subtitle: "",
    author: "髙山哲夫",
    contractName: "高山哲夫",
    genre: "医療",
    roughUpDate: "2026-03-下旬",
    submissionDate: "2026-07-上旬",
    deadline: "2026-08-上旬",
    pages: 296, format: "文庫／並製／右開き", price: 800,
    productionNo: "25396",
    grRep: "前田惇史",
    designFee: 150000, illustFee: 30000, totalFee: 180000,
    meetingFormat: "オンライン",
    meetingTime: "C・30分（普通）",
    targetReader: "病院関係者",
    charCount: "約141,000文字",
    summary: "岐阜県中津川市で長年地域医療に携わってきた「化石医師」による随筆集。地域医療の最前線で経験した様々なエピソードを綴る。前前著『新健康夜咄』の続編。",
    notes: "8月案件だが制作前倒し希望。前著のデザインテイスト希望。リピーター。",
    pdfFile: "カバー発注依頼_GR前田.pdf",
  },
  {
    id: 100, type: "GMC", status: "担当決定済", assignedTo: 1,
    registeredDate: "2026-02-10", title: "成功する経営者の習慣", author: "山口健一",
    clientName: "株式会社ABC", genre: "経営", deadline: "2026-06-30", pages: 240,
    format: "四六判単行本", salesRep: "営業A", editContact: "編集A",
    summary: "経営者向けビジネス書", notes: "", pdfFile: "",
  },
  {
    id: 101, type: "GMC", status: "担当決定済", assignedTo: 3,
    registeredDate: "2026-02-12", title: "最新AIビジネス入門", author: "tech田中",
    clientName: "テック株式会社", genre: "IT", deadline: "2026-07-15", pages: 280,
    format: "四六判単行本", salesRep: "営業B", editContact: "編集B",
    summary: "AI活用ビジネス書", notes: "", pdfFile: "",
  },
  {
    id: 102, type: "GR", status: "担当決定済", assignedTo: 2,
    registeredDate: "2026-02-15", title: "家庭でできる予防医学", author: "佐々木明",
    genre: "健康", deadline: "2026-05-30", pages: 200, format: "四六判並製",
    grRep: "GR担当A", productionNo: "25380",
    summary: "予防医学の実践ガイド", notes: "", pdfFile: "",
  },
  {
    id: 103, type: "GMC", status: "担当決定済", assignedTo: 4,
    registeredDate: "2026-02-08", title: "未来の教育デザイン", author: "木下真一",
    clientName: "教育出版社", genre: "教育", deadline: "2026-08-01", pages: 320,
    format: "A5判単行本", salesRep: "営業C", editContact: "編集C",
    summary: "教育改革ビジネス書", notes: "", pdfFile: "",
  },
  {
    id: 104, type: "GR", status: "担当決定済", assignedTo: 6,
    registeredDate: "2026-02-18", title: "東京の片隅で", author: "大田誠",
    genre: "エッセイ", deadline: "2026-06-15", pages: 180, format: "四六判並製",
    grRep: "GR担当B", productionNo: "25390",
    summary: "都会暮らしのエッセイ集", notes: "", pdfFile: "",
  },
];
// --- ユーティリティ ---
function getStaffLoad(staffId, projects) {
  return projects.filter(p => p.assignedTo === staffId && p.status === "担当決定済").length;
}
function getRecommendations(project, staff, projects) {
  return staff.map(s => {
    const load = getStaffLoad(s.id, projects);
    const capacityLeft = s.maxCases - load;
    const skillMatch = s.skills.includes(project.genre) || s.skills.includes("全般");
    let score = capacityLeft * 10 + (skillMatch ? 30 : 0);
    if (s.role === "エキスパート") score -= 5;
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
function LoadBar({ current, max }) {
  const pct = Math.min((current / max) * 100, 100);
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{current}/{max}</span>
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
  const gmcCount = projects.filter(p => p.type === "GMC" && p.status !== "入稿完了").length;
  const grCount = projects.filter(p => p.type === "GR" && p.status !== "入稿完了").length;
  const staffLoads = staff.map(s => ({ ...s, load: getStaffLoad(s.id, projects) }));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="進行中案件数" value={active} sub={`GMC ${gmcCount} / GR ${grCount}`} color="blue" />
        <StatCard label="未割当" value={unassigned} sub="要対応" color={unassigned > 0 ? "red" : "green"} />
        <StatCard label="担当決定済" value={assigned} color="green" />
        <StatCard label="入稿完了" value={archived} sub="アーカイブ済" color="purple" />
        <StatCard label="スタッフ" value={staff.length} sub={`D:${staff.filter(s=>s.role==="ディレクター").length} E:${staff.filter(s=>s.role==="エキスパート").length}`} color="yellow" />
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">担当者別 稼働状況</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {staffLoads.map(s => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-28 text-sm font-medium text-gray-700 truncate">{s.name}</div>
              <Badge color={s.role === "エキスパート" ? "purple" : "blue"}>{s.role === "エキスパート" ? "E" : "D"}</Badge>
              <div className="flex-1"><LoadBar current={s.load} max={s.maxCases} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">種別内訳</h3>
          <div className="flex items-end gap-4 h-32">
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max((gmcCount / Math.max(gmcCount, grCount, 1)) * 100, 10)}%` }} />
              <span className="text-xs text-gray-500 mt-2">GMC ({gmcCount})</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${Math.max((grCount / Math.max(gmcCount, grCount, 1)) * 100, 10)}%` }} />
              <span className="text-xs text-gray-500 mt-2">GR ({grCount})</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">直近の納期</h3>
          <div className="space-y-2">
            {projects
              .filter(p => p.deadline)
              .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
              .slice(0, 5)
              .map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <Badge color={p.type === "GMC" ? "blue" : "indigo"}>{p.type}</Badge>
                    <span className="truncate text-gray-700">{p.title}</span>
                  </div>
                  <span className="text-gray-500 text-xs whitespace-nowrap ml-2">{p.deadline}</span>
                </div>
              ))
            }
          </div>
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
    const lines = csvText.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) { setParseError("ヘッダー行とデータ行が必要です（2行以上）"); return; }
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().replace(/[\r"]/g, ""));
    const rows = lines.slice(1).map((line, idx) => {
      const vals = line.split(sep).map(v => v.trim().replace(/[\r"]/g, ""));
      const get = (...keys) => {
        for (const k of keys) {
          const i = headers.findIndex(h => h === k);
          if (i >= 0 && vals[i]) return vals[i];
        }
        return "";
      };
      const typeName = get("種別", "type");
      const type = typeName === "GR" ? "GR" : "GMC";
      const title = get("タイトル", "書名");
      const author = get("著者名", "著者");
      const staffName = get("担当者", "担当者名", "デザイン担当", "D担当", "担当");
      const staffObj = staffName ? staff.find(s => s.name === staffName || s.name.includes(staffName) || staffName.includes(s.name)) : null;
      const status = staffObj ? "担当決定済" : "未割当";
      const deadline = get("納期", "刊行予定日", "刊行日");
      const genre = get("ジャンル") || (type === "GMC" ? "ビジネス" : "その他");
      const pages = parseInt(get("ページ数", "頁数", "ページ")) || 0;
      const registeredDate = get("登録日") || new Date().toISOString().slice(0, 10);
      return {
        _rowNum: idx + 2, _valid: !!(title && author),
        _staffName: staffName, _staffFound: !!staffObj,
        id: Date.now() + idx * 1000 + Math.floor(Math.random() * 999),
        type, title, author, genre, deadline, pages, status,
        assignedTo: staffObj ? staffObj.id : null,
        registeredDate, subtitle: get("サブタイトル") || "",
        clientName: get("クライアント名", "クライアント") || "",
        productionNo: get("制作番号") || "",
        grRep: get("GR担当", "GR") || "",
        salesRep: get("GMC営業担当", "営業担当") || "",
        editContact: get("GMC編集窓口", "編集窓口") || "",
        printRun: parseInt(get("発行部数")) || 0,
        price: parseInt(get("定価")) || 0,
        summary: get("概要") || "", notes: get("備考") || "",
        pdfFile: "", format: get("判型") || (type === "GMC" ? "四六判単行本" : "四六判並製"),
      };
    });
    if (rows.length === 0) { setParseError("データが見つかりませんでした"); return; }
    setParseError(""); setPreview(rows); setStep("preview");
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
                <p className="font-medium mt-2">対応している列名（1行目をヘッダーにしてください）：</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 mt-1 text-xs bg-white rounded p-3 border border-blue-100">
                  {[
                    ["種別 *", "GMC または GR"],
                    ["タイトル *", "書名（必須）"],
                    ["著者名 *", "著者（必須）"],
                    ["担当者", "スタッフ名（一致で自動紐付け）"],
                    ["ジャンル", "省略時: GMC=ビジネス, GR=その他"],
                    ["納期", "刊行予定日も可"],
                    ["ページ数", "頁数も可"],
                    ["クライアント名", "GMC用"],
                    ["制作番号", "GR用"],
                    ["GR担当", "GR担当者名"],
                    ["登録日", "省略時は今日の日付"],
                    ["概要 / 備考", "メモ"],
                  ].map(([k, v]) => (
                    <div key={k}><span className="font-medium">{k}</span><span className="text-blue-600 ml-1">= {v}</span></div>
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
                        <td className="px-3 py-2"><Badge color={row.type === "GMC" ? "blue" : "indigo"}>{row.type}</Badge></td>
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
  const [filter, setFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = projects.filter(p => {
    if (filter === "unassigned" && p.status !== "未割当") return false;
    if (filter === "assigned" && p.status !== "担当決定済") return false;
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
  });
  const archivedCount = projects.filter(p => p.status === "入稿完了").length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[["active", "進行中"], ["unassigned", "未割当"], ["assigned", "決定済"], ["all", "すべて"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === v ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
        ))}
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
              <th className="px-4 py-3 text-left">書名</th>
              <th className="px-4 py-3 text-left">著者</th>
              <th className="px-4 py-3 text-left">ジャンル</th>
              <th className="px-4 py-3 text-left">納期</th>
              <th className="px-4 py-3 text-left">頁数</th>
              <th className="px-4 py-3 text-left">ステータス</th>
              <th className="px-4 py-3 text-left">担当</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 ${p.status === "未割当" ? "bg-yellow-50" : p.status === "入稿完了" ? "opacity-60" : ""}`}>
                <td className="px-4 py-3"><Badge color={p.type === "GMC" ? "blue" : "indigo"}>{p.type}</Badge></td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{p.title}</div>
                  {p.subtitle && <div className="text-xs text-gray-400 truncate max-w-xs">{p.subtitle}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.author}</td>
                <td className="px-4 py-3"><Badge color="gray">{p.genre}</Badge></td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.deadline || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{p.pages || "-"}</td>
                <td className="px-4 py-3"><Badge color={p.status === "未割当" ? "red" : p.status === "入稿完了" ? "gray" : "green"}>{p.status}</Badge></td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.assignedTo ? staff.find(s => s.id === p.assignedTo)?.name || "-" : "-"}</td>
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
function ProjectDetailModal({ project, staff, projects, onAssign, onArchive, onClose }) {
  const [selected, setSelected] = useState(project.assignedTo);
  const [showAssign, setShowAssign] = useState(project.status === "未割当");
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
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
                {project.pdfData && (
                  <a href={project.pdfData} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline whitespace-nowrap">開く</a>
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-green-800">
                  {staff.find(s => s.id === project.assignedTo)?.name || "-"}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {staff.find(s => s.id === project.assignedTo)?.role}
                  ・得意: {staff.find(s => s.id === project.assignedTo)?.skills.join(", ")}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto pr-1">
                <p className="text-xs text-gray-500 mb-2">スコア = 空き容量×10 + スキルマッチ30点</p>
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
                      <span className="text-xs text-gray-400">スコア {s.score}</span>
                    </div>
                    <div className="mt-1.5"><LoadBar current={s.load} max={s.maxCases} /></div>
                    <div className="mt-1 text-xs text-gray-400">得意: {s.skills.join(", ")}</div>
                  </button>
                ))}
              </div>
            )}
            {showAssign && (
              <div className="mt-4 flex gap-3">
                <button onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                  キャンセル
                </button>
                <button
                  onClick={() => { if (selected) { onAssign(project.id, selected); onClose(); } }}
                  disabled={!selected}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    selected ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-300 cursor-not-allowed"
                  }`}>
                  担当者を決定
                </button>
              </div>
            )}
            {project.status === "担当決定済" && !showAssign && onArchive && (
              <div className="mt-4 border-t border-gray-200 pt-4">
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
  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
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
          setGmcForm(prev => ({ ...prev, ...fields, pdfFile: file.name, pdfData: objectUrl }));
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
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.author) {
      setSubmitError("タイトルと著者名は必須です");
      return;
    }
    setSubmitError("");
    onRegister({
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
          <button type="submit"
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors text-sm ${
              projectType === "GMC" ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}>
            {projectType === "GMC" ? "GMC案件を登録" : "GR案件を登録"}
          </button>
        </form>
      </div>
    </div>
  );
}
// =====================
// 案件編集モーダル
// =====================
function EditProjectModal({ project, onUpdate, onClose }) {
  const [form, setForm] = useState({ ...project });
  const [saveError, setSaveError] = useState("");
  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";
  const isGMC = project.type === "GMC";
  const handleSave = () => {
    if (!form.title || !form.author) {
      setSaveError("タイトルと著者名は必須です");
      return;
    }
    setSaveError("");
    onUpdate({
      ...form,
      pages: parseInt(form.pages) || 0,
      printRun: parseInt(form.printRun) || 0,
      price: parseInt(form.price) || 0,
      designFee: parseInt(form.designFee) || 0,
      illustFee: parseInt(form.illustFee) || 0,
      totalFee: parseInt(form.totalFee) || (parseInt(form.designFee) || 0) + (parseInt(form.illustFee) || 0),
    });
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
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{saveError}</div>
          )}
          {/* ボタン */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
              キャンセル
            </button>
            <button type="button" onClick={handleSave}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white transition-colors ${isGMC ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
              変更を保存
            </button>
          </div>
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
        <p className="text-sm text-gray-500">ディレクター {staff.filter(s => s.role === "ディレクター").length}名 ／ エキスパート {staff.filter(s => s.role === "エキスパート").length}名</p>
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
                  <tr key={s.id} className="hover:bg-gray-50 group">
                    <td className="px-3 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-3 py-3"><Badge color={s.employment === "社員" ? "blue" : "orange"}>{s.employment || "-"}</Badge></td>
                    <td className="px-3 py-3"><Badge color={s.role === "エキスパート" ? "purple" : "blue"}>{s.role}</Badge></td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{s.skills.join(", ")}</td>
                    <td className="px-3 py-3 text-gray-600">{s.maxCases}</td>
                    <td className="px-3 py-3"><LoadBar current={load} max={s.maxCases} /></td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.notes || ""}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(s)} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200">編集</button>
                        {load === 0 && (
                          <button onClick={() => removeStaff(s.id)} className="px-2.5 py-1 bg-red-50 text-red-500 rounded text-xs font-medium hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity">削除</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">※担当案件がある場合は削除できません。削除ボタンは行ホバー時に表示されます。</p>
    </div>
  );
}
// =====================
// 月別案件数 タブ
// =====================
function MonthlyTab({ projects, staff }) {
  const [typeFilter, setTypeFilter] = useState("GMC");
  const [roleFilter, setRoleFilter] = useState("ディレクター");
  const filteredStaff = staff.filter(s => s.role === roleFilter);
  const filteredProjects = projects.filter(p =>
    p.type === typeFilter &&
    p.status === "担当決定済" &&
    p.assignedTo &&
    filteredStaff.some(s => s.id === p.assignedTo)
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
    if (staffMonthCounts[p.assignedTo]) {
      const key = allMonths.includes(month) ? month : "未定";
      staffMonthCounts[p.assignedTo][key] = (staffMonthCounts[p.assignedTo][key] || 0) + 1;
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
// メインアプリ
// =====================
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const handleAssign = (projectId, staffId) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assignedTo: staffId, status: "担当決定済" } : p));
  };
  const handleRegister = (newProject) => {
    setProjects(prev => [...prev, { ...newProject, id: Date.now() }]);
    setTab("projects");
  };
  const handleUpdate = (updatedProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };
  const handleBulkImport = (newProjects) => {
    setProjects(prev => [...prev, ...newProjects]);
    setTab("projects");
  };
  const handleArchive = (projectId) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: "入稿完了" } : p));
  };
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
        {tab === "staff" && <StaffTab staff={staff} setStaff={setStaff} projects={projects} />}
      </main>
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          staff={staff}
          projects={projects}
          onAssign={handleAssign}
          onArchive={handleArchive}
          onClose={() => setSelectedProject(null)}
        />
      )}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onUpdate={handleUpdate}
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
