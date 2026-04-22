
const apiKey = "AIzaSyAr2gaTDuIV-8i2pED3a-Ngk0JVbBwuBUE"; // API key will be provided by environment

	// Navigation
	function showPage(pageId) {
		document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
		document.getElementById(`page-${pageId}`).classList.remove('hidden');

		document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
		event.currentTarget.classList.add('nav-active');
	}

	// Generic Gemini Call
	async function askGemini(prompt, systemInstruction = "", isVision = false, base64Image = null) {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

		let parts = [{ text: prompt }];
		if (isVision && base64Image) {
			parts.push({ inlineData: { mimeType: "image/png", data: base64Image } });
		}

		const payload = {
			contents: [{ parts: parts }],
			systemInstruction: { parts: [{ text: systemInstruction }] }
		};

		for (let i = 0; i < 5; i++) {
			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				const data = await response.json();
				return data.candidates[0].content.parts[0].text;
			} catch (e) {
				await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
			}
		}
		return "Xin lỗi, tôi gặp sự cố kết nối. Vui lòng thử lại.";
	}

	// Feature: Study Plan
	async function generatePlan() {
		const level = document.getElementById('current-level').value;
		const goal = document.getElementById('target-goal').value;
		const loader = document.getElementById('plan-loader');
		const display = document.getElementById('plan-display');

		loader.classList.remove('hidden');
		display.textContent = "✨ Gemini đang thiết kế lộ trình cho bạn...";

		const prompt = `Trình độ hiện tại: ${level}. Mục tiêu: ${goal}. Hãy thiết kế lộ trình học HSK 3.0 chi tiết theo từng tuần trong vòng 3 tháng.`;
		const res = await askGemini(prompt, "Bạn là một chuyên gia giáo dục tiếng Trung bản ngữ.");

		display.textContent = res;
		loader.classList.add('hidden');
	}

	// Feature: Writing Analysis
	async function processWriting(mode) {
		const text = document.getElementById('writing-input').value;
		const output = document.getElementById('writing-output');
		if (!text) return;

		output.innerHTML = '<div class="loader mx-auto"></div><p class="text-center mt-4 text-sm text-slate-400">Gemini đang đọc bài của bạn...</p>';

		const instructions = mode === 'summarize'
			? "Hãy tóm tắt bài viết này trong khoảng 400 chữ chuẩn phong cách HSK 6. Sử dụng nhiều thành ngữ."
			: "Hãy chấm điểm bài viết này theo tiêu chí HSK 6 (Từ vựng, Ngữ pháp, Độ trung thực thông tin). Chỉ ra lỗi sai cụ thể.";

		const res = await askGemini(text, instructions);
		output.innerHTML = `<div class="whitespace-pre-wrap">${res}</div>`;
	}

	// Feature: Sentence Transformer
	async function transformSentence() {
		const text = document.getElementById('writing-input').value;
		if (!text) return;
		const output = document.getElementById('writing-output');
		output.innerHTML = '<div class="loader mx-auto"></div>';

		const res = await askGemini(text, "Hãy nâng cấp các câu văn này thành trình độ HSK 6 học thuật, sử dụng các cấu trúc câu phức tạp và thành ngữ (chengyu).");
		output.innerHTML = `<h4 class="font-bold text-red-600 mb-4">Câu văn đã nâng cấp:</h4><div class="whitespace-pre-wrap">${res}</div>`;
	}

	// Feature: Vision
	let currentImageBase64 = null;
	function handleImage(e) {
		const file = e.target.files[0];
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
		out.textContent = "✨ Đang quét hình ảnh và tạo bài tập...";

		const res = await askGemini("Hãy trích xuất văn bản từ ảnh này, giải thích các từ vựng HSK 6 khó và tạo ra 3 câu hỏi đọc hiểu dựa trên nội dung ảnh.", "", true, currentImageBase64);
		out.textContent = res;
	}

	// Feature: Debate Chat
	async function sendMessage() {
		const input = document.getElementById('chat-input');
		const chat = document.getElementById('chat-box');
		const msg = input.value;
		if (!msg) return;

		chat.innerHTML += `<div class="bg-red-600 text-white p-4 rounded-2xl shadow-sm max-w-[80%] ml-auto self-end"><p>${msg}</p></div>`;
		input.value = "";

		const res = await askGemini(msg, "Bạn là một đối thủ tranh luận tiếng Trung khó tính cho phần HSKK cao cấp. Hãy phản biện lại người học bằng tiếng Trung.");

		chat.innerHTML += `<div class="bg-white border p-4 rounded-2xl shadow-sm max-w-[80%]"><p class="text-red-600 font-bold text-xs mb-1 uppercase tracking-wider">Gemini Tutor</p><p>${res}</p></div>`;
		chat.scrollTop = chat.scrollHeight;
	}

	// Feature: Flashcards
	async function generateFlashcards() {
		const text = document.getElementById('flashcard-input').value;
		const grid = document.getElementById('flashcard-grid');
		if (!text) return;

		grid.innerHTML = '<div class="col-span-full text-center">✨ Đang trích lọc từ vựng thông minh...</div>';

		const res = await askGemini(text, "Hãy tìm ra 6 từ vựng HSK 5-6 quan trọng nhất trong đoạn văn này. Trả về định dạng JSON: [{\"word\":\"...\", \"pinyin\":\"...\", \"meaning\":\"...\"}]");

		try {
			const data = JSON.parse(res.replace(/```json|```/g, ''));
			grid.innerHTML = '';
			data.forEach(item => {
				const card = document.createElement('div');
				card.className = "flip-card cursor-pointer";
				card.onclick = () => card.classList.toggle('flipped');
				card.innerHTML = `
                        <div class="flip-card-inner">
                            <div class="flip-card-front bg-white border shadow-sm">
                                <h4 class="text-2xl font-bold">${item.word}</h4>
                                <p class="text-red-500 text-sm mt-2">${item.pinyin}</p>
                            </div>
                            <div class="flip-card-back shadow-sm">
                                <p class="text-slate-700 font-medium text-center">${item.meaning}</p>
                            </div>
                        </div>
                    `;
				grid.appendChild(card);
			});
		} catch (e) {
			grid.innerHTML = '<div class="col-span-full text-center text-red-500">Lỗi phân tích từ vựng. Vui lòng thử lại.</div>';
		}
	}
