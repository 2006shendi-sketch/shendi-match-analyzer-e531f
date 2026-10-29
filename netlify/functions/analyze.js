exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "طريقة الطلب غير مدعومة." }) };
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY1;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "مفتاح Gemini غير ظاهر للدالة. في Netlify تأكد أن اسم المتغير GEMINI_API_KEY أو GEMINI_API_KEY1، وأنه مفعّل لكل سياقات النشر، ثم أعد النشر." }) };
  try {
    const body = JSON.parse(event.body || "{}");
    if (!body.image || typeof body.image !== "string") return { statusCode: 400, headers, body: JSON.stringify({ error: "اختَر صورة أولاً." }) };
    const mimeType = ["image/jpeg","image/png","image/webp","image/heic","image/heif"].includes(body.mimeType) ? body.mimeType : "image/jpeg";
    const prompt = "أنت محلل كرة قدم. حلل صورة المباراة المرفقة باللغة العربية. المستخدم يريد رفع الصورة فقط ولا يدخل أي بيانات يدوياً. استخرج أسماء الفريقين والإحصائيات الظاهرة في الصورة فقط. لا تخترع الأرقام ولا تستنتج أن الصورة تحتوي معلومات غير ظاهرة. إذا لم تتوفر موثوقاً أهداف كل فريق في آخر خمس مباريات أو الأهداف المستقبلة أو الملعب أو نوع المباراة، اكتب (غير متوفرة) واترك القيمة فارغة. اذكر ما يمكن استخراجه من الصورة، نقاط القوة والضعف المستندة إلى الأرقام الظاهرة، ثم توقعاً حذراً للنتيجة واحتمالات الفوز/التعادل/الخسارة فقط إذا كانت البيانات كافية. ميّز بوضوح بين الأرقام الظاهرة والتوقعات، ولا تقدم التوقع كضمان. إذا كانت الصورة لا تخص مباراة كرة قدم، وضح ذلك.";
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: body.image } }] }],
        generationConfig: { maxOutputTokens: 1800 }
      })
    });
    const data = await response.json();
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: data?.error?.message || "فشل الاتصال بنموذج التحليل." }) };
    const text = (data.candidates || []).flatMap(c => c.content?.parts || []).map(p => p.text || "").join("\n").trim();
    if (!text) return { statusCode: 502, headers, body: JSON.stringify({ error: "لم يرجع النموذج تحليلاً. جرب صورة أوضح." }) };
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "حدث خطأ أثناء تحليل الصورة." }) };
  }
};
