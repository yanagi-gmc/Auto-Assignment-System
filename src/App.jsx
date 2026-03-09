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
  const gmcCount = projects.filter(p => p.type === "GMC").length;
  const grCount = projects.filter(p => p.type === "GR").length;
  const staffLoads = staff.map(s => ({ ...s, load: getStaffLoad(s.id, projects) }));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="総案件数" value={projects.length} sub={`GMC ${gmcCount} / GR ${grCount}`} color="blue" />
        <StatCard label="未割当" value={unassigned} sub="要対応" color={unassigned > 0 ? "red" : "green"} />
        <StatCard label="担当決定済" value={assigned} color="green" />
        <StatCard label="ディレクター" value={staff.filter(s => s.role === "ディレクター").length} sub="名" color="purple" />
        <StatCard label="エキスパート" value={staff.filter(s => s.role === "エキスパート").length} sub="名" color="yellow" />
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
// 案件一覧 タブ
// =====================
function ProjectListTab({ projects, staff, onSelectProject }) {
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = projects.filter(p => {
    if (filter === "unassigned" && p.status !== "未割当") return false;
    if (filter === "assigned" && p.status !== "担当決定済") return false;
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[["all", "すべて"], ["unassigned", "未割当"], ["assigned", "決定済"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === v ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
        ))}
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
              <tr key={p.id} className={`hover:bg-gray-50 ${p.status === "未割当" ? "bg-yellow-50" : ""}`}>
                <td className="px-4 py-3"><Badge color={p.type === "GMC" ? "blue" : "indigo"}>{p.type}</Badge></td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{p.title}</div>
                  {p.subtitle && <div className="text-xs text-gray-400 truncate max-w-xs">{p.subtitle}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.author}</td>
                <td className="px-4 py-3"><Badge color="gray">{p.genre}</Badge></td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.deadline || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{p.pages || "-"}</td>
                <td className="px-4 py-3"><Badge color={p.status === "未割当" ? "red" : "green"}>{p.status}</Badge></td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.assignedTo ? staff.find(s => s.id === p.assignedTo)?.name || "-" : "-"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => onSelectProject(p)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      p.status === "未割当"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {p.status === "未割当" ? "割り振る" : "詳細"}
                  </button>
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
function ProjectDetailModal({ project, staff, projects, onAssign, onClose }) {
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
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Sort items: y descending (top of page first), then x ascending (left to right)
    const items = content.items
      .filter(item => item.str)
      .map(item => ({ x: item.transform[4], y: item.transform[5], str: item.str }))
      .sort((a, b) => Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x);
    // Group into lines with 8pt y-tolerance
    let lineY = null;
    let line = "";
    for (const item of items) {
      if (lineY === null || Math.abs(item.y - lineY) > 8) {
        if (line) fullText += line + "\n";
        line = item.str;
        lineY = item.y;
      } else {
        line += item.str;
      }
    }
    if (line) fullText += line + "\n";
  }
  return fullText;
}
function parseGRFields(text, filename = "") {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // === 1. Parse filename (most reliable source since Japanese labels are unreadable in PDF) ===
  // e.g. 【カバー発注依頼】岩田彰人様 「通信制高校は人生はじまり」（25457）＿GR田口.pdf
  let grRep = "", author = "", title = "", subtitle = "", productionNo = "";
  const fnm = filename.replace(/\.pdf$/i, "");
  const fnMatch = fnm.match(/【カバー発注依頼】(.+?)様[\s　]*[「『](.+?)[」』][（(](\d+)[）)].*?GR(.+)$/);
  if (fnMatch) {
    author = fnMatch[1].trim();
    const rawTitle = fnMatch[2].trim();
    const subMatch = rawTitle.match(/^(.+?)\s*(～.+)$/);
    if (subMatch) { title = subMatch[1].trim(); subtitle = subMatch[2].trim(); }
    else title = rawTitle;
    productionNo = fnMatch[3];
    grRep = "GR" + fnMatch[4].trim();
  }

  // === 2. Parse dates from text (form dates: 2026/6 or 2026/6/30, not email dates like "2026 3 5") ===
  const formDates = lines.filter(l => /^20\d\d\/\d{1,2}(\/\d{1,2})?$/.test(l));
  const roughUpDate = formDates[0] || "";
  const submissionDate = formDates[1] || "";
  const deadline = formDates[2] || "";

  // === 3. Parse price (定価): small amount like 1,600 ===
  const priceLine = lines.find(l => /^\d,\d{3}$/.test(l));
  const price = priceLine ? parseInt(priceLine.replace(/,/g, ""), 10) : "";

  // === 4. Parse fees (依頼費, デザイン費, イラスト費): large amounts like 180,000 ===
  const feeAmounts = [];
  for (const line of lines) {
    for (const m of line.matchAll(/(\d{2,3},\d{3})/g)) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (n >= 10000) feeAmounts.push(n);
    }
  }

  return {
    grRep, contractName: "", author, title, subtitle,
    roughUpDate, submissionDate, deadline,
    price: price || "",
    productionNo,
    totalFee: feeAmounts[0] || "",
    designFee: feeAmounts[1] || "",
    illustFee: feeAmounts[2] || "",
  };
}
// =====================
// 新規案件登録 タブ
// =====================
function RegisterTab({ onRegister }) {
  const [projectType, setProjectType] = useState("GMC");
  const fileInputRef = React.useRef(null);
  const emptyGMC = {
    title: "", subtitle: "", author: "", clientName: "", genre: "ビジネス",
    deadline: "", pages: "", format: "四六判単行本", printRun: "",
    salesRep: "", editContact: "", editPro: "", editProContact: "", writer: "",
    purpose: "", targetReader: "", summary: "", notes: "", pdfFile: "",
  };
  const emptyGR = {
    title: "", subtitle: "", author: "", contractName: "", genre: "その他",
    roughUpDate: "", submissionDate: "", deadline: "", pages: "", format: "四六判並製",
    price: "", productionNo: "", grRep: "",
    designFee: "", illustFee: "", totalFee: "",
    meetingFormat: "オンライン", meetingTime: "",
    charCount: "", targetReader: "", summary: "", notes: "", pdfFile: "",
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
    if (projectType !== "GR") return;
    setIsParsing(true);
    setParseMsg("");
    try {
      const text = await extractTextFromPDF(file);
      console.log("[PDF extracted text]", text.slice(0, 2000));
      const fields = parseGRFields(text, file.name);
      console.log("[PDF parsed fields]", fields);
      const count = Object.values(fields).filter(v => v !== "" && v !== 0).length;
      if (count > 0) {
        setGrForm(prev => ({ ...prev, ...fields, pdfFile: file.name, pdfData: objectUrl }));
        setParseMsg(`success:${count}`);
      } else {
        setParseMsg("nodata");
      }
    } catch {
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
      registeredDate: new Date().toISOString().slice(0, 10),
    });
    projectType === "GMC" ? setGmcForm(emptyGMC) : setGrForm(emptyGR);
  };
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";
  return (
    <div className="max-w-3xl mx-auto">
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
              {projectType === "GR" && (
                <div>
                  <label className={labelClass}>制作番号</label>
                  <input className={inputClass} value={form.productionNo || ""} onChange={e => update("productionNo", e.target.value)} placeholder="25396" />
                </div>
              )}
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
  const handleAssign = (projectId, staffId) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assignedTo: staffId, status: "担当決定済" } : p));
  };
  const handleRegister = (newProject) => {
    setProjects(prev => [...prev, { ...newProject, id: Date.now() }]);
    setTab("projects");
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
        {tab === "projects" && <ProjectListTab projects={projects} staff={staff} onSelectProject={setSelectedProject} />}
        {tab === "monthly" && <MonthlyTab projects={projects} staff={staff} />}
        {tab === "register" && <RegisterTab onRegister={handleRegister} />}
        {tab === "staff" && <StaffTab staff={staff} setStaff={setStaff} projects={projects} />}
      </main>
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          staff={staff}
          projects={projects}
          onAssign={handleAssign}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
