export default async function handler(req, res) {
  // CORSヘッダー
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.CHATWORK_API_TOKEN;
  const roomId = process.env.CHATWORK_ROOM_ID;

  if (!token || !roomId) {
    return res.status(500).json({ error: "Chatwork credentials not configured" });
  }

  const DIRECTOR_ID = "2173520";
  const DIRECTOR_NAME = "坂本 洋介さん";
  const MANAGER_ID = "7951827";
  const MANAGER_NAME = "柳 智子さん";

  try {
    const { type: notifyType, title, author, type, genre, pages, deadline, productionNo, staffName, expertName } = req.body;

    let lines;

    if (notifyType === "assigned") {
      // --- 担当決定通知 → 管理者（柳さん）宛 ---
      lines = [
        `[To:${MANAGER_ID}]${MANAGER_NAME}`,
        "[info][title]✅ 担当者が決定しました[/title]",
        `【種別】${type || "-"}`,
        `【書名】${title || "未定"}`,
        `【著者】${author || "-"}`,
        staffName ? `【担当D】${staffName}` : null,
        expertName ? `【担当E】${expertName}` : null,
        "",
        "LINE通知テキストを確認し、担当者へお知らせください。",
        "▶ https://auto-assignment-system.vercel.app",
        "[/info]",
      ].filter(Boolean).join("\n");
    } else {
      // --- 新規案件登録通知 → 局長宛（既存） ---
      lines = [
        `[To:${DIRECTOR_ID}]${DIRECTOR_NAME}`,
        "[info][title]📚 新規案件が登録されました[/title]",
        `【種別】${type || "-"}`,
        `【書名】${title || "未定"}`,
        `【著者】${author || "-"}`,
        genre ? `【ジャンル】${genre}` : null,
        pages ? `【ページ数】${pages}` : null,
        productionNo ? `【制作番号】${productionNo}` : null,
        deadline ? `【刊行予定】${deadline}` : null,
        "",
        "担当者の割り振りをお願いいたします。",
        "▶ https://auto-assignment-system.vercel.app",
        "[/info]",
      ].filter(Boolean).join("\n");
    }

    const response = await fetch(
      `https://api.chatwork.com/v2/rooms/${roomId}/messages`,
      {
        method: "POST",
        headers: {
          "X-ChatWorkToken": token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `body=${encodeURIComponent(lines)}`,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Chatwork API error:", response.status, errText);
      return res.status(response.status).json({ error: "Chatwork API error", detail: errText });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, messageId: data.message_id });
  } catch (err) {
    console.error("Notify error:", err);
    return res.status(500).json({ error: err.message });
  }
}
