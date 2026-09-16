# SE347-InterviewIQ-Frontend

Frontend của **InterviewIQ** — nền tảng luyện phỏng vấn. Đồ án môn SE347 (Công nghệ Web).

## Công nghệ

| Thành phần | Lựa chọn |
| --- | --- |
| Build tool | Vite 8 |
| UI | React 19 + TypeScript 6 |
| Styling | Tailwind CSS v4 (plugin `@tailwindcss/vite`) |
| Font | Be Vietnam Pro, tự host qua `@fontsource/be-vietnam-pro` |
| Routing | React Router v7 |
| HTTP | Axios (interceptor gắn token, xử lý 401 tập trung) |
| Chất lượng code | ESLint 10 (flat config) + Prettier |

## Chạy dự án

```bash
npm install          # cài dependencies
cp .env.example .env # tạo file biến môi trường
npm run dev          # dev server tại http://localhost:5173
```

Mở `http://localhost:5173/design-system` để xem toàn bộ token và component dùng chung.

## Scripts

| Lệnh | Tác dụng |
| --- | --- |
| `npm run dev` | Dev server kèm hot reload |
| `npm run build` | Typecheck rồi build ra `dist/` |
| `npm run preview` | Xem thử bản build production |
| `npm run lint` | Kiểm tra lỗi bằng ESLint |
| `npm run lint:fix` | Tự sửa các lỗi ESLint sửa được |
| `npm run format` | Format toàn bộ source bằng Prettier |
| `npm run typecheck` | Chỉ kiểm tra kiểu, không build |

## Biến môi trường

Khai báo trong `.env` ở thư mục gốc. Vite chỉ đọc biến có tiền tố `VITE_`.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8080/api` | Base URL của backend |
| `VITE_APP_NAME` | `InterviewIQ` | Tên app hiển thị trên UI |

`.env` đã bị `.gitignore` bỏ qua — **không commit**. Thêm biến mới thì cập nhật luôn `.env.example`.

---

# Design System

Mục tiêu: năm luồng nghiệp vụ làm song song vẫn ra **một** giao diện thống nhất. Muốn vậy thì màu, chữ, khoảng cách và component phải lấy từ một nguồn chung, không ai tự chế.

## Bốn quy tắc bắt buộc

1. **Không hardcode màu.** Không viết `#2563eb`, `bg-blue-600`, `text-gray-500`. Dùng token: `bg-brand-600`, `text-content-muted`. ESLint chặn cả ba cách viết sai này.
2. **Không tự viết lại component đã có.** Mở `/design-system` xem trước. Cần biến thể mới thì sửa component trong `src/components/ui/`, đừng copy ra chỗ khác.
3. **Import qua barrel.** `import { Button, Modal } from '@/components/ui'` — không trỏ thẳng vào từng file.
4. **Không tự chế khoảng cách.** Dùng `Stack`/`Card`, hoặc gọi token trực tiếp (`gap-(--space-lg)`). ESLint chặn các bước lệch nhịp.

## Token — sửa ở đâu

Tất cả nằm trong `src/styles/tokens.css`. Sửa một dòng ở đây là đổi đồng bộ toàn app.

### Màu ngữ nghĩa (ưu tiên dùng nhóm này)

| Token | Dùng cho |
| --- | --- |
| `surface` | Nền thẻ, panel, navbar |
| `surface-muted` | Nền trang |
| `surface-sunken` | Nền chìm, vùng disabled |
| `border` / `border-strong` | Đường viền thường / đậm |
| `content` | Chữ chính |
| `content-muted` | Chữ phụ, mô tả |
| `content-subtle` | Chữ mờ, placeholder, caption |

Dùng nhóm này thay vì gọi thẳng `slate-*`. Sau này làm dark mode chỉ cần sửa 8 dòng token.

### Màu thương hiệu và trạng thái

- `brand-50` → `brand-950`: hành động chính, link, trạng thái active. Nút chính `brand-600`, hover `brand-700`.
- `success` / `warning` / `danger` / `info`: dùng **đúng ngữ nghĩa**, không chọn vì thấy đẹp.

### Rào màu — ESLint chặn cái gì

Quy tắc 1 không chỉ nằm trên giấy, `eslint.config.js` chặn ba cách đi vòng qua token:

| Viết thế này | Kết quả |
| --- | --- |
| `bg-blue-600`, `text-gray-500`, `border-slate-200` | ❌ Gọi thẳng bảng màu mặc định của Tailwind |
| `bg-[#2563eb]`, `text-[rgb(37,99,235)]` | ❌ Màu tuỳ ý trong ngoặc vuông |
| `const c = '#2563eb'` | ❌ Mã hex viết thẳng trong code |
| `bg-brand-600`, `text-content-muted`, `bg-surface` | ✅ Token |
| `text-white`, `bg-black/50`, `bg-transparent` | ✅ Không thuộc bảng màu thương hiệu nên không chặn |

Cần màu mới thì **thêm token vào `tokens.css`** rồi gọi bằng tên. Đừng nới rào — nới một lần là dark mode sau này phải đi lùng từng file.

Rào chỉ soi các tiền tố màu (`bg`, `text`, `border`, `ring`, `fill`, `stroke`…). Nó **không** đụng `text-sm`, `border-2`, `ring-1` vì đó là cỡ chữ và độ dày, không phải màu.

### Bo góc, đổ bóng, khung

| Token | Dùng cho |
| --- | --- |
| `rounded-control` | Nút, ô nhập liệu |
| `rounded-card` | Thẻ, panel |
| `rounded-panel` | Modal, khối lớn |
| `shadow-card` / `shadow-popover` / `shadow-modal` | Bóng theo độ nổi |
| `max-w-page` / `max-w-form` / `max-w-text` | Bề ngang vùng nội dung / form / đoạn văn bản dài |

Một ngoại lệ có chủ đích: **toast để vuông góc**, không bo. Đây là yêu cầu thiết kế, đừng "dọn dẹp"
nó về `rounded-card` cho giống các thẻ khác.

### Khoảng cách

Thang chính thức, mọi bước là bội số của 4px, khai báo ở `:root` trong `tokens.css`:

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--space-2xs` | 4px | Khe giữa icon và chữ |
| `--space-xs` | 8px | Khe trong một nhóm nhỏ |
| `--space-sm` | 12px | Khe giữa các dòng trong một khối |
| `--space-md` | 16px | Đệm trong thẻ, khe mặc định |
| `--space-lg` | 24px | Khe giữa các khối |
| `--space-xl` | 32px | Khe giữa các vùng lớn |
| `--space-2xl` | 48px | Khe giữa các section của trang |

Cách dùng, theo thứ tự ưu tiên:

1. **Qua component** — `<Stack gap="lg">`, `<Card padding="md">`. Hai cái này đọc thẳng token nên luôn đúng nhịp.
2. **Gọi trực tiếp** khi cần — `gap-(--space-lg)`, `p-(--space-md)`, `mt-(--space-xs)`.

> **Đừng chuyển nhóm này vào `@theme`.** Tailwind sinh `max-w-*`, `w-*`, `h-*` từ cả `--container-*` lẫn `--spacing-*`, và `--spacing-*` thắng. Khai báo `--spacing-2xl` là `max-w-2xl` tụt từ 42rem xuống 3rem, `max-w-sm` còn 12px — vỡ bố cục toàn app mà không báo lỗi nào. Khai báo lại `--container-*` cũng không giành lại được. Đó là lý do nhóm này nằm ở `:root` chứ không nằm trong `@theme`.

Thang số của Tailwind vẫn dùng được cho việc căn chỉnh vặt, nhưng ESLint chặn hai thứ:

- **Bước rơi ra ngoài nhịp 4px** — `p-7`, `gap-9`, `mt-2.5` báo đỏ. Các bước được phép: `0` `0.5` `1` `1.5` `2` `3` `4` `6` `8` `12` `16`.
- **Giá trị tuỳ ý** — `p-[13px]`, `gap-[7px]` báo đỏ.

Rào nằm ở `eslint.config.js`, hằng số `ALLOWED_STEPS`. Thiếu bước thì **thêm token vào `tokens.css`** rồi gọi bằng tên, đừng nới rào.

Thang này xem được bằng mắt ở `/design-system`, mục *Khoảng cách* — thanh màu vẽ bằng `var(--space-*)` lấy thẳng từ token, nên bảng đó không thể nói dối.

### Lớp xếp chồng

`--z-navbar` < `--z-dropdown` < `--z-modal` < `--z-toast`, khai báo ở `:root` trong `tokens.css`, dùng qua `z-[var(--z-toast)]`.

## Component dùng chung

Tất cả ở `src/components/ui/`, export qua `src/components/ui/index.ts`.

| Nhóm | Component |
| --- | --- |
| Hành động | `Button` (primary/secondary/ghost/danger/link × sm/md/lg, `isLoading`, `leftIcon`) |
| Nhập liệu | `Input`, `Textarea`, `Select`, `Field` |
| Hiển thị | `Card`, `Badge`, `Spinner`, `EmptyState` |
| Bố cục | `Container`, `Stack`, `PageHeader`, `Navbar` |
| Nổi lên trên | `Modal`, `ToastViewport` |

`Input` / `Textarea` / `Select` đều bọc trong `Field` nên nhãn, mô tả, thông báo lỗi luôn đồng nhất. Class của ô nhập nằm ở `control-styles.ts` — sửa một chỗ, cả ba đổi theo.

### Modal

```tsx
const [open, setOpen] = useState(false)

<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Tạo buổi phỏng vấn"
  footer={<Button onClick={handleSave}>Lưu</Button>}
>
  <Input label="Tiêu đề" />
</Modal>
```

Dựng trên thẻ `<dialog>` của trình duyệt nên được miễn phí: bẫy focus, trả focus về chỗ cũ khi đóng, đóng bằng Escape, và hiển thị ở top layer nên không bao giờ bị z-index của thành phần khác đè lên.

### Toast

```tsx
const toast = useToast()

toast.success('Lưu thành công')
toast.error('Không kết nối được máy chủ', 'Thử lại sau ít phút')
toast.show({ title: 'Đang xử lý', duration: 0 }) // duration 0 = nằm mãi tới khi bấm đóng
```

`ToastProvider` đã bọc sẵn ở `App.tsx`. Vùng hiển thị toast dùng thuộc tính `popover` để cũng được đẩy lên top layer — nếu không, toast bắn ra từ trong một modal sẽ bị nền mờ của modal che mất.

Thẻ toast để **vuông góc** (cả nút đóng bên trong), khác với `Card` và `Modal`.

## Cấu trúc thư mục

```
src/
├── assets/          # Ảnh, icon, font tĩnh
├── components/
│   ├── ui/          # DESIGN SYSTEM - mọi primitive dùng chung
│   │   ├── index.ts        # barrel, chỗ duy nhất nên import
│   │   └── control-styles.ts  # class dùng chung của các ô nhập liệu
│   └── interview/   # Component riêng của nghiệp vụ phỏng vấn
│       └── index.ts        # CountdownTimer, QuestionNavigator
├── constants/       # Key localStorage, API_URL, timeout, nhãn/màu theo domain
├── contexts/        # React Context
│   ├── auth-context.ts   / AuthProvider.tsx
│   └── toast-context.ts  / ToastProvider.tsx
├── hooks/           # useAuth, useToast, useDocumentTitle, useCountdown
├── layouts/         # Khung trang dùng <Outlet />: MainLayout, AuthLayout
├── pages/           # Mỗi route một page component
│   ├── auth/        # LoginPage, RegisterPage
│   ├── interview/   # InterviewListPage, InterviewRoomPage
│   └── DesignSystemPage.tsx   # trang tra cứu design system
├── routes/          # AppRoutes, ProtectedRoute, paths.ts
├── services/        # apiClient (interceptor) + service theo domain
├── styles/          # tokens.css (design token) + index.css (global)
├── types/           # Kiểu TypeScript dùng chung
└── utils/           # cn, storage, format
```

Ghi chú: context được tách làm hai file — `*-context.ts` giữ `createContext` và kiểu, `*Provider.tsx` giữ component. Tách vậy để React Fast Refresh không cảnh báo "only export components".

## Quy ước code

- **Alias `@/`** thay cho đường dẫn tương đối dài. Khai báo ở `tsconfig.app.json` và `vite.config.ts` — sửa thì phải sửa cả hai.
- **Gọi API luôn qua `services/`**, không dùng `axios` trực tiếp trong component.
- **Không dùng `enum`** vì `tsconfig` bật `erasableSyntaxOnly`; dùng union type (xem `types/auth.ts`).
- **Import kiểu phải có `import type`** vì bật `verbatimModuleSyntax`.
- **Thêm route mới**: khai báo ở `routes/paths.ts` rồi thêm `<Route>` vào `routes/AppRoutes.tsx`.
- **Tailwind quét cả comment.** Đừng viết tên class trong comment, nó sẽ sinh ra CSS thừa.
