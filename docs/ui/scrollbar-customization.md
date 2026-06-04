# Custom Scrollbar Guidelines

Tài liệu này hướng dẫn cách tùy biến thanh cuộn (scrollbar) trên toàn bộ ứng dụng (đặc biệt là trang Admin và Web) để đạt được giao diện hiện đại, tinh tế và đồng bộ giữa các hệ điều hành (Windows, macOS, Linux).

---

## 1. Yêu cầu thiết kế (Design Requirements)
* **Kích thước nhỏ gọn (Compact size):** Độ rộng của thanh cuộn đứng và độ cao của thanh cuộn ngang chỉ nên từ **6px - 8px** (mặc định của Windows rất dày và thô).
* **Nền trong suốt (Transparent track):** Thanh cuộn không nên có màu nền trắng/xám thô cứng, mà nên trong suốt (`background: transparent`) để hòa hợp vào nội dung trang.
* **Nút cuộn bo tròn và thanh lịch (Rounded thumb):**
  * Sử dụng border-radius lớn (`border-radius: 9999px`) để nút cuộn trông như một viên thuốc bo tròn (pill-shape).
  * Màu sắc sử dụng biến màu CSS hệ thống (như `--muted-foreground` với độ trong suốt thấp, khoảng `0.3`) để tự động tương thích với cả chế độ sáng (Light mode) và chế độ tối (Dark mode).
  * Hiệu ứng hover: Khi người dùng hover chuột vào thanh cuộn, tăng độ đậm của màu (`opacity` lên `0.5`) để tăng phản hồi trực quan (visual feedback).
* **Khoảng cách đệm (Padding gap):**
  * Sử dụng kỹ thuật `border: 2px solid transparent` kết hợp với `background-clip: padding-box` để tạo khoảng trống nhỏ ở hai bên nút cuộn, tạo cảm giác nút cuộn đang "lơ lửng" tinh tế giữa nội dung.
* **Tương thích trình duyệt (Browser compatibility):** Hỗ trợ đầy đủ cả trình duyệt nhân Chromium (Chrome, Edge, Opera) và Firefox.

---

## 2. Mã nguồn CSS chuẩn (Standard CSS Snippet)

Sử dụng đoạn CSS dưới đây để ghi đè phong cách thanh cuộn mặc định của trình duyệt:

```css
/* Custom Scrollbar for modern and elegant aesthetics */
@layer base {
  /* 1. Trình duyệt nhân Chromium (Chrome, Edge, Safari) */
  ::-webkit-scrollbar {
    width: 8px;   /* Độ rộng thanh cuộn dọc */
    height: 8px;  /* Độ cao thanh cuộn ngang */
  }

  ::-webkit-scrollbar-track {
    background: transparent; /* Nền thanh cuộn trong suốt */
  }

  ::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3); /* Màu đệm nhạt thích ứng theme */
    border-radius: 9999px; /* Bo góc hoàn toàn */
    border: 2px solid transparent; /* Tạo khoảng trống đệm */
    background-clip: padding-box; /* Cắt màu trong phạm vi padding để lộ viền transparent */
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground) / 0.5); /* Đậm màu hơn khi hover */
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  /* 2. Trình duyệt Firefox */
  html {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  }
}
```

---

## 3. Các tệp tin cần áp dụng (Files to Apply)
* **Admin Application:** `apps/admin/app/globals.css`
* **Web Application:** `apps/web/app/globals.css`

---

## 4. Kiểm thử (Verification Checklist)
- [ ] Thanh cuộn hiển thị mỏng, bo tròn viên thuốc ở cả chế độ sáng (Light Mode) và tối (Dark Mode).
- [ ] Hover vào thanh cuộn thấy đổi màu đậm lên.
- [ ] Không xuất hiện các nút mũi tên lên/xuống thô sơ của trình duyệt.
