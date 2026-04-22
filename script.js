// API Configuration
        const apiKey = "AIzaSyAr2gaTDuIV-8i2pED3a-Ngk0JVbBwuBUE"; // Sẽ được môi trường tự động điền
        const MODEL_NAME = "gemini-1.5-flash";

        // Navigation
        function showPage(pageId, e) {
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            const targetPage = document.getElementById(`page-${pageId}`);
            if (targetPage) targetPage.classList.remove('hidden');

            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
            if (e) e.currentTarget.classList.add('nav-active');
        }

        // Generic Gemini Call
        async function askGemini(prompt, systemInstruction = "", isVision = false, base64Image = null, isJson = false) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

            let parts = [{ text: prompt }];
            if (isVision && base64Image) {
                parts.push({ inlineData: { mimeType: "image/png", data: base64Image } });
            }

            const payload = {
                contents: [{ parts: parts }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: isJson ? { responseMimeType: "application/json" } : {}
            };

            for (let i = 0; i < 5; i++) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("API Response Error:", errorData);
                        throw new Error(`Status: ${response.status}`);
                    }

                    const data = await response.json();
                    return data.candidates[0].content.parts[0].text;
                } catch (e) {
                    console.warn(`Đang thử lại lần ${i + 1}...`, e);
                    await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
                }
            }
            return "Lỗi kết nối. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.";
        }

        // Feature: Study Plan
        async function generatePlan() {
            const level = document.getElementById('current-level').value;
            const goal = document.getElementById('target-goal').value;
            const loader = document.getElementById('plan-loader');
            const display = document.getElementById('plan-display');

            if (!level || !goal) return;

            loader.classList.remove('hidden');
            display.textContent = "";

            const prompt = `Trình độ hiện tại: ${level}. Mục tiêu: ${goal}. Hãy thiết kế lộ trình học HSK chi tiết theo từng tuần trong vòng 3 tháng.`;
            const res = await askGemini(prompt, "Bạn là một chuyên gia giáo dục tiếng Trung bản ngữ.");

            display.textContent = res;
            loader.classList.add('hidden');
        }

        // Feature: Writing Analysis
        async function processWriting(mode) {
            const text = document.getElementById('writing-input').value;
            const output = document.getElementById('writing-output');
            if (!text) return;

            output.innerHTML = '<div class="loader mx-auto"></div><p class="text-center mt-4 text-xs text-slate-400">Gemini đang chấm bài...</p>';

            const instructions = "Hãy chấm điểm bài viết này theo tiêu chí HSK 6. Chỉ ra lỗi sai cụ thể và cung cấp bản sửa lỗi hoàn chỉnh.";
            const res = await askGemini(text, instructions);
            output.innerHTML = `<div class="whitespace-pre-wrap">${res}</div>`;
        }

        // Feature: Sentence Transformer
        async function transformSentence() {
            const text = document.getElementById('writing-input').value;
            if (!text) return;
            const output = document.getElementById('writing-output');
            output.innerHTML = '<div class="loader mx-auto"></div>';

            const res = await askGemini(text, "Hãy nâng cấp các câu văn này thành trình độ HSK 6 cao cấp, sử dụng từ vựng học thuật và thành ngữ.");
            output.innerHTML = `<h4 class="font-bold text-red-600 mb-2 underline text-xs uppercase">Bản nâng cấp HSK 6:</h4><div class="whitespace-pre-wrap">${res}</div>`;
        }

        // Feature: Vision
        let currentImageBase64 = null;
        function handleImage(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function() {
                const img = document.getElementById('preview-img');
                img.src = reader.result;
                img.classList.remove('hidden');
                document.getElementById('upload-ui').classList.add('hidden');
                currentImageBase64 = reader.result.split(',')[1];
            };
            reader.readAsDataURL(file);
        }

        async function analyzeImage() {
            if (!currentImageBase64) return;
            const out = document.getElementById('vision-output');
            out.textContent = "✨ Đang quét hình ảnh và phân tích nội dung...";

            const res = await askGemini("Hãy trích xuất văn bản tiếng Trung từ ảnh này, dịch nghĩa và giải thích các điểm ngữ pháp quan trọng.", "Bạn là chuyên gia ngôn ngữ học tiếng Trung.", true, currentImageBase64);
            out.textContent = res;
        }

        // Feature: Flashcards
        async function generateFlashcards() {
            const text = document.getElementById('flashcard-input').value;
            const grid = document.getElementById('flashcard-grid');
            if (!text) return;

            grid.innerHTML = '<div class="col-span-full text-center py-10">✨ Đang tạo bộ thẻ từ vựng...</div>';

            const sys = "Bạn là máy tạo từ vựng. Trích lọc 6 từ quan trọng. Trả về JSON: [{\"word\":\"...\", \"pinyin\":\"...\", \"meaning\":\"...\"}]. Chỉ trả về JSON.";
            const res = await askGemini(text, sys, false, null, true);

            try {
                const cleanJson = res.replace(/```json|```/g, '').trim();
                const data = JSON.parse(cleanJson);
                grid.innerHTML = '';
                data.forEach(item => {
                    const card = document.createElement('div');
                    card.className = "flip-card cursor-pointer";
                    card.onclick = () => card.classList.toggle('flipped');
                    card.innerHTML = `
                        <div class="flip-card-inner">
                            <div class="flip-card-front bg-white border shadow-sm">
                                <h4 class="text-3xl font-bold text-slate-800">${item.word}</h4>
                                <p class="text-red-500 font-medium mt-2">${item.pinyin}</p>
                            </div>
                            <div class="flip-card-back shadow-sm px-4">
                                <p class="text-slate-800 font-bold mb-1 text-sm">Ý nghĩa:</p>
                                <p class="text-slate-700 text-xs text-center line-clamp-4">${item.meaning}</p>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            } catch (e) {
                console.error("JSON Parse Error:", e);
                grid.innerHTML = '<div class="col-span-full text-center text-red-500 italic">Không thể tạo thẻ. Vui lòng thử lại với nội dung khác.</div>';
            }
        }
