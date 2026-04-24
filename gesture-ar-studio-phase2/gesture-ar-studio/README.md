# GestureAR Studio — Phase 1 & 2

Ứng dụng web nhận diện cử chỉ tay qua camera, render object 3D thật (Three.js) trong các hình dạng tay, và **chuyển phong cách ảnh bằng AI** với một cú nhấn nút.

## Tính năng

**Phase 1 — 3D Objects (local, không cần backend):**
- Tam giác 1 tay → pha lê kim cương iridescent
- L-Frame 2 tay → khối lập phương wireframe
- Vòng tròn 2 tay → cầu 400 hạt phát sáng

**Phase 2 — AI Style Transfer (cần backend):**
- Giữ cử chỉ 2s → panel chọn phong cách hiện ra
- 8 phong cách: Van Gogh, Anime, Cyberpunk, Màu nước, Sơn dầu, Phác thảo, Pixel art, Thủy mặc
- AI render (~15-30s) → kết quả hiển thị full màn hình
- Nút: Đổi phong cách · Lưu ảnh · Xóa

## Cấu trúc dự án

```
gesture-ar-studio/
├── index.html              # Frontend: MediaPipe + Three.js + AI UI
├── package.json
├── vercel.json             # Cấu hình deploy Vercel
├── .gitignore
├── .env.example            # Template env variables
└── api/
    ├── stylize.js          # AI style transfer qua Replicate
    └── health.js           # Health check
```

## Yêu cầu

- **Node.js 18+** — tải tại https://nodejs.org (chọn LTS)
- **Tài khoản Vercel** (miễn phí) — https://vercel.com/signup
- **Tài khoản Replicate** (có $1 free credit) — https://replicate.com

## Phần 1 — Chạy local để test Three.js

Phần này **chưa cần** Replicate hay Vercel. Chỉ cần xem object 3D xuất hiện trong gesture.

### Cách 1 — Python (đã có sẵn nếu bạn đã cài)
```
cd gesture-ar-studio
python -m http.server 8000
```
Mở http://localhost:8000

### Cách 2 — Node.js
```
cd gesture-ar-studio
npx serve
```

Mở trình duyệt (Chrome/Edge) → Allow camera → thử các cử chỉ:

| Cử chỉ | Kết quả 3D |
|--------|------------|
| Tam giác 1 tay (cái + trỏ + giữa) | Pha lê icosahedron iridescent xoay |
| L-Frame 2 tay | Khối lập phương wireframe + lõi trong suốt |
| Vòng tròn 2 tay (cái + trỏ + út) | Cầu 400 hạt phát sáng |

## Phần 2 — Setup AI Backend (Replicate + Vercel)

### Bước 1: Lấy Replicate API Token

1. Đăng ký/đăng nhập tại https://replicate.com
2. Vào https://replicate.com/account/api-tokens
3. Tạo token mới → copy (bắt đầu bằng `r8_...`)
4. Nạp $1 (hoặc dùng free credit) để chạy model SDXL

### Bước 2: Cài Vercel CLI

Mở CMD/PowerShell trên Windows:

```
npm install -g vercel
```

Kiểm tra: `vercel --version`

### Bước 3: Login & link project

```
cd gesture-ar-studio
vercel login
vercel link
```

Chọn team của bạn, đặt tên project.

### Bước 4: Set environment variable

**Cách A — Qua CLI:**
```
vercel env add REPLICATE_API_TOKEN
```
Dán token vào, chọn apply cho cả 3 môi trường (Production, Preview, Development).

**Cách B — Qua dashboard:**
1. https://vercel.com/dashboard → project → Settings → Environment Variables
2. Thêm `REPLICATE_API_TOKEN` = token của bạn
3. Apply cho cả 3 môi trường

### Bước 5: Chạy dev server có backend

```
vercel dev
```

Server chạy tại http://localhost:3000 (cả frontend + API).

### Bước 6: Test API

Mở trình duyệt → http://localhost:3000/api/health

Kết quả mong đợi:
```json
{
  "ok": true,
  "env": { "hasReplicateToken": true }
}
```

Nếu `hasReplicateToken: false` → kiểm tra lại Bước 4.

### Bước 7: Deploy production

```
vercel --prod
```

Sau ~30 giây, bạn sẽ có URL dạng `https://gesture-ar-studio-xxx.vercel.app`. Đây là HTTPS nên camera hoạt động trên cả mobile.

## Test API stylize (manual)

Trong PowerShell/CMD — thay `YOUR_URL` bằng URL Vercel của bạn (hoặc `http://localhost:3000`):

```
curl -X POST YOUR_URL/api/stylize ^
  -H "Content-Type: application/json" ^
  -d "{\"imageBase64\":\"data:image/jpeg;base64,/9j/...\",\"style\":\"van-gogh\"}"
```

Response:
```json
{
  "ok": true,
  "imageUrl": "https://replicate.delivery/.../output.png",
  "style": "van-gogh",
  "processingMs": 12500
}
```

## Các phong cách hỗ trợ

| Key | Tên | Mô tả |
|-----|-----|-------|
| `van-gogh`   | 🌻 Van Gogh   | Tranh sơn dầu phong cách hậu ấn tượng |
| `anime`      | 🌸 Anime      | Studio Ghibli, ánh sáng mềm |
| `cyberpunk`  | 🌃 Cyberpunk  | Neon futuristic, Blade Runner |
| `watercolor` | 💧 Màu nước   | Tranh màu nước loang nhẹ |
| `oil`        | 🖼️ Sơn dầu    | Sơn dầu cổ điển Phục Hưng |
| `sketch`     | ✏️ Phác thảo  | Bút chì line art |
| `pixel-art`  | 👾 Pixel art  | Pixel art 16-bit retro |
| `ink-wash`   | 🎋 Thủy mặc   | Tranh thủy mặc phương Đông |

## Luồng sử dụng hoàn chỉnh

1. Mở app → cho phép camera
2. Giơ tay làm một trong 3 cử chỉ (tam giác / L-Frame / vòng tròn)
3. Giữ ổn định ~2 giây → vòng xoay tiến trình hoàn tất + flash + object 3D xuất hiện
4. **Panel AI hiện ra ở dưới** với 8 chip phong cách
5. Nhấn vào 1 chip → overlay loading "AI đang sáng tác..."
6. Sau 15-30s → ảnh AI hiện full màn hình + tag phong cách ở trên
7. Chọn:
   - **🔄 Đổi phong cách**: quay lại panel để thử phong cách khác (vẫn dùng frame đã đóng băng)
   - **💾 Lưu ảnh**: tải ảnh gốc AI về máy (độ phân giải SDXL, ~1024px)
   - **✕ Xóa**: reset về camera live

## Troubleshooting

**Camera không bật:**
- Phải chạy qua `localhost` hoặc HTTPS (không phải `file://`)
- Vào ổ khóa trên thanh địa chỉ → bật quyền camera
- Trên mobile: chỉ hoạt động khi deploy lên Vercel (HTTPS)

**Three.js object không xuất hiện:**
- F12 → Console xem lỗi
- Kiểm tra CDN Three.js đã load: gõ `THREE.REVISION` trong console
- Thử giơ tay vào giữa khung hình, giữ tay thật ổn định

**API stylize lỗi 500 `REPLICATE_API_TOKEN missing`:**
- Chạy `vercel env ls` để kiểm tra
- Sau khi thêm env var, cần deploy lại: `vercel --prod`

**Ảnh kết quả bị lỗi CORS khi vẽ lên canvas:**
- Dùng `img.crossOrigin = 'anonymous'` TRƯỚC khi set `img.src`

**Replicate model version bị lỗi 404:**
- Model hash đổi theo thời gian. Vào https://replicate.com/stability-ai/sdxl → copy hash mới
- Cập nhật `REPLICATE_MODEL_VERSION` trong `api/stylize.js`

## Chi phí tham khảo

- **Vercel Hobby**: Miễn phí cho cá nhân (bandwidth 100GB/tháng, function 100GB-hours)
- **Replicate SDXL**: ~$0.004/ảnh (250 ảnh = $1)

## Bước tiếp theo (Roadmap)

- **Giai đoạn 3**: ControlNet — dùng hình dạng tay làm mask cho AI sinh ảnh + prompt tự do (Web Speech API)
- **Giai đoạn 4**: Supabase Auth + gallery chia sẻ công khai
- **Giai đoạn 5**: PWA + tối ưu mobile (`modelComplexity: 0`, giảm particle count)
- **Giai đoạn 6**: WebXR AR thật sự (object neo trong không gian 3D)
