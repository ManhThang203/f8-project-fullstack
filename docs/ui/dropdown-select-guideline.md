# 🎨 Quy chuẩn Thiết kế UI: Hướng dẫn sử dụng Dropdown Select

Tài liệu này định nghĩa quy chuẩn phát triển và thiết kế cho các thành phần lựa chọn (Dropdown Select) trong hệ thống Costy. Tất cả Lập trình viên và AI khi tham gia phát triển dự án **BẮT BUỘC** phải tuân thủ hướng dẫn này.

---

## 🚫 1. Nghiêm cấm sử dụng Thẻ Select mặc định của Trình duyệt

Không được phép sử dụng thẻ `<select>` và `<option>` mặc định của HTML.

- **Lý do:** Thẻ mặc định của trình duyệt không đồng nhất về mặt hiển thị giữa các hệ điều hành (Windows, macOS, iOS, Android), không hỗ trợ các hiệu ứng bo góc tròn cao cấp, bóng đổ (shadow), dấu tích chọn (checkmark) tùy biến và các hiệu ứng chuyển động mượt mà (animations).

---

## 🏆 2. Tiêu chuẩn UI Dropdown Select (Premium Style)

Bất kỳ danh sách lựa chọn dropdown nào cũng phải tuân thủ chuẩn thiết kế sau (giống Hình 1):

1. **Trigger Button (Nút kích hoạt):**
   - Bo góc tròn cao cấp (`rounded-xl` hoặc `rounded-lg`).
   - Viền mảnh tinh tế (`border border-border`), nền thẻ (`bg-card` hoặc `bg-transparent`).
   - Phải có Icon mũi tên trỏ xuống (`ChevronDown` ở góc phải) có độ mờ (`opacity-50`).
   - Trạng thái Hover: đổi màu nền nhẹ nhàng (`hover:bg-muted/50`).
   - Trạng thái Focus: có vòng viền ngoài (`focus:ring-1 focus:ring-ring`).

2. **Dropdown Content (Menu lựa chọn):**
   - Nền đồng bộ (`bg-popover` bg-card) với viền mỏng (`border`).
   - Bo góc lớn (`rounded-xl`).
   - Bóng đổ nổi bật (`shadow-md` hoặc `shadow-lg`).
   - Hiệu ứng mở/đóng mượt mà (`animate-in fade-in zoom-in-95 duration-150`).

3. **Dropdown Item (Từng mục lựa chọn):**
   - Có khoảng đệm dễ bấm (`px-3 py-2` hoặc `pl-8 pr-2`).
   - Hiển thị dấu tích (`Check` icon) nằm ở bên trái hoặc phải của tùy chọn đang được chọn.
   - Hiệu ứng Hover/Focus item: Nền đổi màu (`hover:bg-accent hover:text-accent-foreground` hoặc `bg-muted`).

---

## 💻 3. Cách triển khai thực tế (Tái sử dụng Component)

Dự án đã có sẵn component Radix-based Select dùng chung tại thư mục shared. **BẮT BUỘC** import và sử dụng bộ component này:

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/select';
```

### 📝 Mã mẫu chuẩn:

```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger className="border-border bg-card w-[180px] rounded-xl">
    <SelectValue placeholder="Chọn giá trị" />
  </SelectTrigger>
  <SelectContent className="bg-card rounded-xl border shadow-lg">
    <SelectItem value="option1">Lựa chọn 1</SelectItem>
    <SelectItem value="option2">Lựa chọn 2</SelectItem>
  </SelectContent>
</Select>
```

---

## 🤖 Chỉ thị bắt buộc dành cho AI (AI Instructions)

- Khi người dùng yêu cầu tạo mới hoặc chỉnh sửa bất kỳ dropdown select nào trong admin dashboard hoặc web frontend, AI **phải** tự động thay thế toàn bộ thẻ `<select>` mặc định bằng bộ component `<Select>` tùy biến nêu trên để đảm bảo giao diện thống nhất, premium và sang trọng.
