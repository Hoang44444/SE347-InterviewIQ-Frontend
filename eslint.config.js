import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/*
 * ============================================================
 *  HÀNG RÀO DESIGN SYSTEM
 * ============================================================
 *  Nguồn sự thật là src/styles/tokens.css. Hai hàng rào dưới đây
 *  không thay thế token — chúng chỉ chặn những cách viết đi vòng
 *  qua token, để năm luồng làm song song không ra năm kiểu giao diện.
 *
 *  Viết regex bằng .source của regex literal thay vì chuỗi, để
 *  backslash chỉ phải escape một lần chứ không phải hai.
 *
 *  LƯU Ý: file này cố tình nhắc tên các class bị cấm để làm ví dụ.
 *  Tailwind quét mọi file trong repo nên nó đã được loại trừ ở
 *  src/styles/index.css, nếu không mấy class đó lọt vào bản build.
 * ============================================================
 */

/* Trước một class là đầu dòng, khoảng trắng, hoặc dấu hai chấm của variant. */
const BEFORE = /(?:^|[\s:])-?/.source
const AFTER = /(?:\s|$)/.source

/*
 * ---------- RÀO KHOẢNG CÁCH ----------
 * Không cấm thang số của Tailwind, chỉ cấm hai thứ:
 *   1. Bước rơi ra ngoài nhịp 4px (ví dụ p-7, gap-9, mt-2.5)
 *   2. Giá trị tuỳ ý viết thẳng trong ngoặc vuông
 * Đổi thang thì sửa ALLOWED_STEPS ngay dưới đây.
 * Rào này chỉ soi padding/margin/gap/space — không đụng w-*, h-*,
 * size-* vì đó là kích thước, không phải nhịp bố cục.
 */
const SPACING_PREFIX =
  /(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y)/.source
const ALLOWED_STEPS = /0|0\.5|1|1\.5|2|3|4|6|8|12|16/.source

const OFF_SCALE = BEFORE + SPACING_PREFIX + '-(?!(?:' + ALLOWED_STEPS + ')' + AFTER + ')[0-9]'
const SPACING_ARBITRARY = BEFORE + SPACING_PREFIX + /-\[/.source

const OFF_SCALE_MESSAGE =
  'Khoảng cách này rơi ra ngoài nhịp 4px. Dùng một bước trong thang chính thức (xem src/styles/tokens.css), hoặc gọi token qua Stack/Card nếu là component dùng chung.'
const SPACING_ARBITRARY_MESSAGE =
  'Không viết khoảng cách tuỳ ý trong ngoặc vuông. Nếu thang hiện tại thiếu bước thì thêm token vào src/styles/tokens.css rồi gọi bằng tên.'

/*
 * ---------- RÀO MÀU ----------
 * Chặn ba cách đi vòng qua token màu:
 *   1. Gọi thẳng bảng màu mặc định của Tailwind (bg-blue-600, text-gray-500)
 *   2. Màu tuỳ ý trong ngoặc vuông (bg-[#2563eb], text-[rgb(...)])
 *   3. Mã hex viết thẳng trong code
 * Trắng, đen, transparent, current KHÔNG bị chặn: chúng không thuộc
 * bảng màu thương hiệu, và text-white là cách viết đúng cho chữ trên
 * nền brand.
 */
const BANNED_COLORS =
  /(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)/
    .source
const COLOR_PREFIX =
  /(?:bg|text|border-[xytrbles]|border|ring-offset|ring|outline|decoration|divide-[xy]|divide|from|via|to|fill|stroke|accent|caret|placeholder|shadow)/
    .source

const PALETTE = BEFORE + COLOR_PREFIX + '-' + BANNED_COLORS + /-\d{2,3}(?:\/\d{1,3})?\b/.source
const COLOR_ARBITRARY =
  BEFORE + COLOR_PREFIX + /-\[(?:#|rgb|hsl|oklch|oklab|lab|lch|color\()/.source
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/.source

const PALETTE_MESSAGE =
  'Không gọi thẳng bảng màu mặc định của Tailwind. Dùng token ngữ nghĩa trong src/styles/tokens.css: bg-surface, bg-surface-muted, text-content, text-content-muted, border-border, và bg-brand-600 cho hành động chính.'
const COLOR_ARBITRARY_MESSAGE =
  'Không viết màu tuỳ ý trong ngoặc vuông. Màu mới phải vào src/styles/tokens.css trước rồi mới gọi bằng tên, nếu không dark mode và việc đổi nhận diện sau này sẽ phải đi lùng từng file.'
const HEX_MESSAGE =
  'Không hardcode mã màu trong code. Khai báo trong src/styles/tokens.css rồi gọi qua token.'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${OFF_SCALE}/]`, message: OFF_SCALE_MESSAGE },
        { selector: `TemplateElement[value.raw=/${OFF_SCALE}/]`, message: OFF_SCALE_MESSAGE },
        {
          selector: `Literal[value=/${SPACING_ARBITRARY}/]`,
          message: SPACING_ARBITRARY_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${SPACING_ARBITRARY}/]`,
          message: SPACING_ARBITRARY_MESSAGE,
        },
        { selector: `Literal[value=/${PALETTE}/]`, message: PALETTE_MESSAGE },
        { selector: `TemplateElement[value.raw=/${PALETTE}/]`, message: PALETTE_MESSAGE },
        {
          selector: `Literal[value=/${COLOR_ARBITRARY}/]`,
          message: COLOR_ARBITRARY_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${COLOR_ARBITRARY}/]`,
          message: COLOR_ARBITRARY_MESSAGE,
        },
        { selector: `Literal[value=/${HEX}/]`, message: HEX_MESSAGE },
        { selector: `TemplateElement[value.raw=/${HEX}/]`, message: HEX_MESSAGE },
      ],
    },
  },
  // Cấu hình file chạy trên Node (vite.config.ts, eslint.config.js)
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  prettier,
)
