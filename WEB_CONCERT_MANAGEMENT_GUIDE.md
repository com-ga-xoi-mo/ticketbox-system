# 🎪 WEB CONCERT MANAGEMENT - HƯỚNG DẪN CHI TIẾT

**Tài liệu này giải thích toàn bộ cách hoạt động của Web Concert Management Dashboard**

---

## 📑 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
3. [Từng File Chi Tiết](#từng-file-chi-tiết)
4. [Cách Các File Kết Nối](#cách-các-file-kết-nối)
5. [Flow Hoàn Chỉnh](#flow-hoàn-chỉnh)
6. [Các Khái Niệm Quan Trọng](#các-khái-niệm-quan-trọng)
7. [Kiến Trúc Ứng Dụng](#kiến-trúc-ứng-dụng)

---

## 🎯 TỔNG QUAN

### Web Concert Management là gì?

**Web Concert Management** là một **dashboard React** cho phép:
- **Organizer** (nhà tổ chức): Tạo, sửa, phát hành concert của họ
- **Admin** (quản trị viên): Xem, quản lý tất cả concerts trong hệ thống

### Công Nghệ Sử Dụng

```
Frontend:
  - React + TypeScript: Xây dựng UI
  - Vite: Build tool (nhanh hơn Webpack)
  - React Router: Điều hướng giữa các trang
  - React Query: Quản lý cache API
  - TailwindCSS: CSS utility classes
  - Material Symbols: Icons

Backend:
  - NestJS: Framework Node.js
  - Prisma: ORM (truy cập database)
  - JWT: Xác thực người dùng

Database:
  - PostgreSQL: Lưu trữ dữ liệu concerts

Communication:
  - HTTP REST API + JWT Token
```

---

## 📁 CẤU TRÚC DỰ ÁN

```
apps/web/src/
│
├── main.tsx                          # 🟢 ENTRY POINT - Khởi động ứng dụng
│
├── app/                              # 🟡 LAYER: Cấu hình ứng dụng
│   ├── App.tsx                       # Root component
│   ├── router.tsx                    # Định tuyến (routing)
│   ├── providers.tsx                 # Setup global state
│   ├── sidebar-config.ts             # Cấu hình menu
│   └── sidebar-config.spec.ts        # Test sidebar
│
├── features/                         # 🔵 LAYER: Tính năng ứng dụng
│   ├── auth/                         # Đăng nhập
│   │   ├── LoginPage.tsx             # Giao diện login
│   │   ├── AccessDeniedPage.tsx      # Trang "không có quyền"
│   │   ├── api.ts                    # Gọi API login
│   │   ├── useLogin.ts               # Hook login logic
│   │   └── login-validation.ts       # Validate form login
│   │
│   ├── concerts/                     # ⭐ DOMAIN CHÍNH: Quản lý concerts
│   │   ├── ConcertsPage.tsx          # Trang danh sách
│   │   ├── ConcertEditPage.tsx       # Trang chỉnh sửa
│   │   ├── api.ts                    # Gọi API (list, create, update)
│   │   ├── hooks.ts                  # React Query hooks
│   │   ├── types.ts                  # TypeScript types
│   │   ├── query-keys.ts             # Cache keys
│   │   ├── concert-form.ts           # Validate form
│   │   ├── status.ts                 # Map trạng thái
│   │   ├── components/               # Sub-components
│   │   │   ├── ConcertTable.tsx      # Bảng danh sách
│   │   │   ├── ConcertFormModal.tsx  # Modal tạo/sửa
│   │   │   ├── ConcertDetailPanel.tsx # Panel chi tiết
│   │   │   ├── ConcertEmptyState.tsx # Trạng thái trống
│   │   │   └── StatusFilterTabs.tsx  # Tab lọc
│   │   └── __tests__/                # Unit tests
│   │
│   └── dashboard/                    # Dashboard admin
│       ├── OrganizerDashboard.tsx    # Trang dashboard
│       ├── RecentConcertsTable.tsx   # Bảng concerts
│       ├── QuickActions.tsx          # Nút actions
│       └── mock-data.ts              # Dữ liệu giả
│
└── shared/                           # 🟣 LAYER: Code dùng chung
    ├── api/                          # HTTP client
    │   ├── client.ts                 # Fetch + auto token
    │   └── client.spec.ts            # Tests
    │
    ├── auth/                         # Xác thực
    │   ├── AuthContext.tsx           # Global auth state
    │   ├── ProtectedRoute.tsx        # Check quyền truy cập
    │   ├── jwt-decode.ts             # Giải mã JWT
    │   ├── token-storage.ts          # Lưu/lấy token
    │   ├── role-access.ts            # Logic phân quyền
    │   └── *.spec.ts                 # Tests
    │
    └── ui/                           # UI Components dùng chung
        ├── Button.tsx                # Nút
        ├── Input.tsx                 # Input field
        ├── Dialog.tsx                # Modal
        ├── Table.tsx                 # Bảng
        ├── Card.tsx                  # Card
        ├── Badge.tsx                 # Badge/label
        ├── Tabs.tsx                  # Tabs
        ├── Pagination.tsx            # Phân trang
        ├── TopNavbar.tsx             # Thanh trên cùng
        ├── Sidebar.tsx               # Menu bên trái
        ├── ShellLayout.tsx           # Layout chính
        ├── Textarea.tsx              # Text area
        ├── FieldError.tsx            # Error message
        └── cn.ts                     # Utility className
```

---

## 📄 TỪNG FILE CHI TIẾT

### 🟢 LAYER 1: ENTRY POINT & KHỞI ĐỘNG

#### `main.tsx` - Khởi động ứng dụng

**Mục đích:** Điểm vào duy nhất của ứng dụng React

**Công việc:**
```typescript
1. Import React + ReactDOM
2. Tìm element <div id="root"></div> trong index.html
3. Render App component vào element đó
4. Kích hoạt Strict Mode (detect bugs)
```

**Tại sao cần?**
- Mỗi React app cần một điểm khởi động
- Browser không hiểu JSX → cần React để chuyển JSX → JavaScript
- main.tsx là nơi React "gắn" vào HTML

**Kết nối tới:**
- `App.tsx` (render)

---

#### `app/App.tsx` - Root Component

**Mục đích:** Component gốc chứa toàn bộ ứng dụng

**Công việc:**
```typescript
function App() {
  return <Providers>
    {/* Tất cả mọi thứ ở đây */}
  </Providers>
}
```

**Tại sao cần?**
- Là "lão bà đồn" của tất cả components
- Render providers (global state setup)

**Kết nối tới:**
- `providers.tsx` (setup)

---

#### `app/providers.tsx` - Setup Global State

**Mục đích:** Cấu hình 3 provider toàn cục

```typescript
function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>      {/* 1. React Query */}
      <AuthProvider>                                 {/* 2. Auth state */}
        <RouterProvider router={router}>             {/* 3. Routing */}
          {children}
        </RouterProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

**3 Provider là gì?**

| Provider | Mục đích | Quản lý |
|----------|---------|---------|
| **QueryClientProvider** | Cache API data | Concert data, loading state, refetch logic |
| **AuthProvider** | JWT token + user session | Logged-in user, roles, permission check |
| **RouterProvider** | URL navigation | Hiển thị component nào dựa vào URL |

**Tại sao cần?**
- Providers "bao quanh" toàn app
- Mọi component con có thể `useAuth()` hoặc `useQuery()`
- Giống cấp nước chung cho tòa nhà

**Kết nối tới:**
- `router.tsx`
- `AuthContext.tsx`
- React Query QueryClient

---

#### `app/router.tsx` - Định Tuyến (Routing)

**Mục đích:** Ánh xạ URL → Component

```typescript
Ví dụ:
/login → <LoginPage />
/concerts → <ConcertsPage />
/concerts/:id/edit → <ConcertEditPage />
/dashboard → <OrganizerDashboard /> (ADMIN only)
```

**Tính năng chính:**

1. **Path Mapping** (URL → Component)
   ```
   User vào /concerts
   → Router check route definition
   → Tìm thấy { path: '/concerts', element: <ConcertsPage /> }
   → Render <ConcertsPage />
   ```

2. **Role-Based Protection** (Kiểm tra quyền)
   ```typescript
   <ProtectedRoute allowedRoles={['ADMIN']}>
     <OrganizerDashboard />
   </ProtectedRoute>
   
   // Nếu user không phải ADMIN
   // → Redirect /no-access
   ```

3. **Redirect Logic** (Chuyển hướng thông minh)
   ```
   User vào http://localhost:5173/
   ↓
   RootRedirect() check session
   ↓
   Nếu ADMIN → /dashboard
   Nếu ORGANIZER → /concerts
   Nếu không login → /login
   ```

**Kết nối tới:**
- Tất cả pages (LoginPage, ConcertsPage, etc.)
- ProtectedRoute.tsx (check quyền)
- AuthContext.tsx (lấy session)

---

#### `app/sidebar-config.ts` - Cấu hình Menu

**Mục đích:** Định nghĩa menu sidebar

```typescript
Ví dụ:
[
  {
    icon: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['ADMIN']  // Chỉ ADMIN thấy menu này
  },
  {
    icon: 'concert_ticket',
    label: 'Concerts',
    path: '/concerts',
    roles: ['ADMIN', 'ORGANIZER']  // Cả hai thấy
  }
]
```

**Tại sao cần?**
- Tránh hardcode menu ở mỗi chỗ
- Dễ thêm/bớt menu items
- Kiểm soát menu dựa vào role

**Kết nối tới:**
- `Sidebar.tsx` (render menu)
- `ShellLayout.tsx` (layout chính)

---

### 🔐 LAYER 2: XÁC THỰC (AUTHENTICATION)

#### `shared/auth/AuthContext.tsx` - Global Auth State

**Mục đích:** Quản lý JWT token + session thông tin user

**State được lưu:**
```typescript
type Session = {
  sub: string              // User ID
  email: string
  roles: string[]          // ['ORGANIZER'] hoặc ['ADMIN']
  iat: number              // Issued at (thời gian tạo token)
  exp: number              // Expiration (thời gian hết hạn)
}
```

**Hàm chính:**
```typescript
1. login(token: string)
   - Lưu token vào localStorage
   - Decode JWT → lấy session
   - Lưu session vào React state

2. logout()
   - Xóa token từ localStorage
   - Clear session state

3. useAuth() hook
   - Gọi ở bất kỳ component nào
   - Return { session, login, logout }
```

**Luồng Login:**
```
1. User nhập email/password ở LoginPage
   ↓
2. Gọi API /auth/login
   ↓
3. Backend xác thực, trả JWT token
   ↓
4. Gọi AuthContext.login(token)
   ↓
5. Token:
   - Lưu vào localStorage (phục hồi sau refresh)
   - Decode → lấy { sub, roles, ... }
   - Lưu vào React state
   ↓
6. Router check: có role được truy cập không?
   ↓
7. Redirect /concerts hoặc /dashboard
```

**Tại sao lưu ở 2 chỗ?**

| Nơi lưu | Tác dụng | Tính năng |
|---------|---------|----------|
| **localStorage** | Persistent storage | Token tồn tại khi refresh page |
| **React state** | In-memory cache | Truy cập nhanh, không cần query localStorage |

**Kết nối tới:**
- `token-storage.ts` (save/load token)
- `jwt-decode.ts` (decode JWT)
- Mọi component (gọi `useAuth()`)

---

#### `shared/auth/jwt-decode.ts` - Giải Mã JWT

**Mục đích:** Chuyển JWT string → Object thông tin user

**JWT Format:**
```
JWT = header.payload.signature

Ví dụ:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiJ1c2VyLTEyMyIsInJvbGVzIjpbIk9SR0FOSVpFUiJdLCJpYXQiOjE2OTkwMDAwMDB9.
sig...

Decode payload → {
  sub: 'user-123',
  roles: ['ORGANIZER'],
  iat: 1699000000
}
```

**Tại sao cần?**
- JWT được mã hóa (không phải mật khẩu)
- Payload (phần giữa) là Base64 → có thể decode
- Decode lấy user info mà không cần call backend

**Kết nối tới:**
- `AuthContext.tsx` (decode token)

---

#### `shared/auth/token-storage.ts` - Lưu Trữ Token

**Mục đích:** Save/load/clear JWT từ localStorage

```typescript
3 hàm:

1. setToken(token)
   → localStorage.setItem('auth_token', token)

2. getToken()
   → localStorage.getItem('auth_token')

3. clearToken()
   → localStorage.removeItem('auth_token')
```

**Tại sao cần?**
- localStorage tồn tại khi user refresh page
- Nếu chỉ lưu ở state → token mất sau refresh
- setToken/getToken là wrapper để không hardcode 'auth_token' ở nhiều chỗ

**Kết nối tới:**
- `AuthContext.tsx` (restore session)
- `client.ts` (lấy token cho API calls)

---

#### `shared/auth/ProtectedRoute.tsx` - Check Quyền Truy Cập

**Mục đích:** Wrapper component kiểm tra role

```typescript
<ProtectedRoute allowedRoles={['ADMIN']}>
  <OrganizerDashboard />
</ProtectedRoute>

Logic:
1. Lấy session từ useAuth()
2. Kiểm tra: user.roles có trong allowedRoles không?
   - Có → render <OrganizerDashboard />
   - Không → redirect /no-access
   - Chưa login → redirect /login
```

**Tại sao cần?**
- Tránh user trực tiếp vào URL /dashboard khi không phải ADMIN
- Check quyền ở mọi component cần bảo vệ
- Tập trung logic check ở 1 chỗ

**Kết nối tới:**
- `router.tsx` (bảo vệ routes)

---

#### `shared/auth/role-access.ts` - Logic Phân Quyền

**Mục đích:** Xác định user có quyền gì dựa vào role

```typescript
2 hàm chính:

1. redirectFor(session)
   → Nên redirect tới trang nào?
   Nếu ADMIN → /dashboard
   Nếu ORGANIZER → /concerts

2. hasRole(roles, required)
   → User có role cần không?
   hasRole(['ADMIN', 'ORGANIZER'], 'ADMIN') → true
```

**Kết nối tới:**
- `router.tsx` (RootRedirect)
- `ProtectedRoute.tsx`

---

### 🌐 LAYER 3: HTTP CLIENT

#### `shared/api/client.ts` - HTTP Client

**Mục đích:** Fetch API từ backend với JWT auto-inject

```typescript
4 hàm chính:

1. buildHeaders()
   → Tạo headers object:
     {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer <token>'
     }

2. handleResponse(response)
   → Check response status:
     - 401 → logout + redirect /login
     - !ok → throw error
     - ok → return response.json()

3. get<T>(path)
   → fetch(path, { method: 'GET', headers })

4. post<T>(path, body)
   → fetch(path, { method: 'POST', headers, body })

5. patch<T>(path, body)
   → fetch(path, { method: 'PATCH', headers, body })
```

**Tại sao auto inject token?**

```
Thay vì:
fetch('/concerts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

Chúng ta:
get('/concerts')

→ Tiết kiệm code + tránh quên token
```

**Handle 401 Error:**
```
Khi backend trả 401 (Unauthorized):
1. Token hết hạn hoặc invalid
2. client.ts auto:
   - clearToken() → xóa token
   - unauthorizedHandler?.() → callback (navigate /login)
3. User redirect /login
```

**Kết nối tới:**
- `features/*/api.ts` (gọi API endpoints)

---

### 🎪 LAYER 4: CONCERT MANAGEMENT (DOMAIN CHÍNH)

#### `features/concerts/types.ts` - Định Nghĩa Dữ Liệu

**Mục đích:** TypeScript types - định hình dữ liệu

```typescript
1. Concert
   {
     id: string
     slug: string
     title: string
     artistName: string
     venueName: string
     city: string
     startsAt: string (ISO date)
     endsAt: string (ISO date)
     status: ConcertStatus
     ... (more fields)
   }

2. ConcertStatus
   'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'ENDED'

3. ConcertFormValues
   Dữ liệu khi fill form (có thể không complete)

4. ConcertFormErrors
   { slug?: string, title?: string, ... }
```

**Tại sao cần?**
- TypeScript catch lỗi sớm
- IDE auto-complete ✨
- Tránh bug "undefined property"

**Kết nối tới:**
- Mọi file dùng Concert data

---

#### `features/concerts/api.ts` - Gọi API

**Mục đích:** Định nghĩa 6 API endpoints

```typescript
1. listConcerts(basePath: string)
   GET /organizer/concerts hoặc /admin/concerts
   Return: Concert[]

2. getConcert(basePath: string, id: string)
   GET /organizer/concerts/:id hoặc /admin/concerts/:id
   Return: Concert

3. createConcert(basePath: string, payload)
   POST /organizer/concerts
   Return: Concert (vừa tạo)

4. updateConcert(basePath: string, id: string, payload)
   PATCH /organizer/concerts/:id hoặc /admin/concerts/:id
   Return: Concert (đã update)

5. publishConcert(basePath: string, id: string)
   POST /organizer/concerts/:id/publish
   Return: Concert (status = 'PUBLISHED')

6. cancelConcert(basePath: string, id: string)
   POST /organizer/concerts/:id/cancel
   Return: Concert (status = 'CANCELLED')
```

**`basePath` là gì?**

```
basePath được quyết định dựa vào role:

Nếu user là ADMIN
  → basePath = '/admin/concerts'
  → listConcerts(basePath) gọi GET /admin/concerts
  → Backend không filter → trả tất cả concerts

Nếu user là ORGANIZER
  → basePath = '/organizer/concerts'
  → listConcerts(basePath) gọi GET /organizer/concerts
  → Backend filter by userId → chỉ concerts của user

→ Component KHÔNG cần check role, chỉ gọi api.ts thôi
```

**Tại sao tách hàm api.ts?**
- Tập trung tất cả API calls ở 1 chỗ
- Dễ debug nếu API có lỗi
- Dễ test (mock api.ts)
- Dễ thay đổi endpoint

**Kết nối tới:**
- `hooks.ts` (gọi functions này)

---

#### `features/concerts/query-keys.ts` - Cache Keys

**Mục đích:** Tạo cache keys cho React Query

**Cache key là gì?**
```
React Query dùng key để nhận diện dữ liệu khác nhau

Nếu 2 component request cùng key
  → React Query dùng cache (không fetch lại)

Nếu 2 component request khác key
  → React Query fetch lại từ server
```

**Ví dụ cache keys:**
```
User A (ORGANIZER):
  queryKey = ['concerts', 'list', {role: 'ORGANIZER', sub: 'user-A'}]

User B (ADMIN):
  queryKey = ['concerts', 'list', {role: 'ADMIN', sub: 'user-B'}]

→ 2 users khác dữ liệu → cache khác
→ Nếu user A vào, sau đó user B login
  → cache của A không bị dùng cho B ✨
```

**Tại sao cần?**
- Tránh data leak (user A thấy data của user B)
- Cache miss khi user/role thay đổi
- React Query biết khi nào invalidate cache

**Kết nối tới:**
- `hooks.ts` (sử dụng queryKeys)

---

#### `features/concerts/hooks.ts` - React Query Hooks (QUAN TRỌNG!)

**Mục đích:** Custom hooks quản lý data fetching + mutations

**Hàm 1: `useConcertSession()`**
```typescript
Mục đích: Quyết định API endpoint + cache key dựa vào role

Logic:
1. Lấy session từ useAuth()
2. Check: user có 'ADMIN' role không?
3. Nếu ADMIN:
     basePath = '/admin/concerts'
     Sẽ fetch tất cả concerts
4. Nếu ORGANIZER:
     basePath = '/organizer/concerts'
     Sẽ fetch concerts của mình
5. Return: { role, basePath, scope }

Ví dụ:
const { basePath, role, scope } = useConcertSession()
// basePath = '/organizer/concerts' hoặc '/admin/concerts'
// role = 'ORGANIZER' hoặc 'ADMIN'
// scope = { role, sub } ← dùng cho cache key
```

**Hàm 2: `useConcerts()`**
```typescript
Mục đích: Fetch danh sách concerts

Logic:
1. Gọi useConcertSession() → lấy basePath + scope
2. useQuery({
     queryKey: concertKeys.list(scope),
     queryFn: () => listConcerts(basePath)
   })
3. React Query tự động:
   - Fetch data
   - Cache result
   - Return: { data, isLoading, isError, refetch }

Tại sao dùng React Query?
- Auto caching (fetch 1 lần, share giữa components)
- Auto deduplication (2 components gọi = 1 request)
- Auto error handling
- Auto background refetching

Ví dụ:
const { data: concerts, isLoading } = useConcerts()
if (isLoading) return <div>Loading...</div>
return <ConcertTable concerts={concerts} />
```

**Hàm 3: `useConcert(id)`**
```typescript
Mục đích: Fetch detail của 1 concert

Giống useConcerts nhưng:
- queryKey bao gồm cả ID
- enabled: !!id (chỉ fetch khi id có value)

Ví dụ:
const { id } = useParams()
const { data: concert } = useConcert(id)
// Khi id thay đổi → React Query auto refetch
```

**Hàm 4: `useCreateConcertMutation()`**
```typescript
Mục đích: Tạo concert mới + auto update cache

Logic:
1. useMutation({
     mutationFn: (payload) => createConcert(basePath, payload),
     onSuccess: () => {
       // Sau khi backend trả success
       // Invalidate cache → React Query refetch danh sách
       queryClient.invalidateQueries({ 
         queryKey: concertKeys.list(scope) 
       })
     }
   })

2. Return mutation object: { mutate, isPending, error, data }

Ví dụ:
const createMutation = useCreateConcertMutation()
const handleCreate = (formData) => {
  createMutation.mutate(formData)
  // → Gọi POST /organizer/concerts
  // → Khi success → refetch danh sách
  // → UI tự update
}

// Kiểm tra trạng thái
{createMutation.isPending && <div>Creating...</div>}
{createMutation.error && <div>Error: {createMutation.error.message}</div>}
{createMutation.data && <div>Created: {createMutation.data.title}</div>}
```

**Hàm 5, 6: `useUpdateConcertMutation`, `usePublishConcertMutation`, ...**
```
Tương tự createMutation nhưng:
- useUpdateConcertMutation: PATCH request
- usePublishConcertMutation: POST /concerts/:id/publish
- useCancelConcertMutation: POST /concerts/:id/cancel

Tất cả auto invalidate cache after success
```

**Diagram Flow của Hooks:**
```
Component gọi useConcerts()
    ↓
useConcertSession() 
  → role = 'ORGANIZER'
  → basePath = '/organizer/concerts'
  → scope = { role, sub: 'user-123' }
    ↓
useQuery({
  queryKey: ['concerts', 'list', {role: 'ORGANIZER', sub: 'user-123'}],
  queryFn: () => get('/organizer/concerts')  // gọi client.ts
})
    ↓
React Query:
  1. Check: Đã fetch trước không?
     - Có cache? → Return cache (nhanh!)
     - Không? → Fetch từ server
  
  2. Fetch: GET /organizer/concerts
     - client.ts thêm header: Authorization: Bearer <token>
     - Backend kiểm tra token
     - Decode token → userId = 'user-123'
     - Query: SELECT * FROM concerts WHERE createdById = 'user-123'
     - Return: Concert[] (chỉ concerts của user)
  
  3. Save cache với key = ['concerts', 'list', {...}]
  
  4. Return: { data: Concert[], isLoading: false, isError: false }
    ↓
Component nhận data + re-render
    ↓
<ConcertTable concerts={concerts} />
```

**Kết nối tới:**
- `ConcertsPage.tsx` (gọi useConcerts)
- `ConcertFormModal.tsx` (gọi mutations)
- `ConcertEditPage.tsx` (gọi useConcert + updateMutation)

---

#### `features/concerts/concert-form.ts` - Validate Form

**Mục đích:** Kiểm tra + transform dữ liệu form

```typescript
Hàm 1: validateConcertForm(values)
Check:
  - Có field nào empty không?
  - slug có đúng format không? (/^[a-z0-9-]+$/)
  - start date có trước end date không?

Return: errors object
Ví dụ:
Input: { title: '', slug: 'INVALID!', startsAt: '2024-01-10', endsAt: '2024-01-01' }
Output: {
  title: 'Title is required',
  slug: 'Slug must be URL-safe',
  endsAt: 'End date must be after start date'
}


Hàm 2: toCreatePayload(values)
Transform form values → dữ liệu gửi API
Ví dụ:
Input: { slug: 'pink-concert', title: 'Pink Concert', startsAt: '2024-06-20T20:00' }
Output: { slug: '...', title: '...', startsAt: Date object, ... }


Hàm 3: toUpdatePayload(values)
Tương tự toCreatePayload nhưng cho update
```

**Tại sao validate ở frontend?**
```
Frontend validation:
  ✅ Instant feedback (user nhập xong liền see error)
  ✅ Tốt UX (không cần gửi server mới biết lỗi)
  ❌ User có thể bypass (devtools)

Backend validation:
  ✅ Security (không ai bypass được)
  ❌ Slow UX (phải gửi server rồi mới see error)

→ Cần CẶNG HAI:
  Frontend: Fast feedback
  Backend: Security
```

**Kết nối tới:**
- `ConcertFormModal.tsx`
- `ConcertEditPage.tsx`

---

#### `features/concerts/status.ts` - Map Trạng Thái

**Mục đích:** Convert status backend → label + color + icon

```typescript
Status backend: 'PUBLISHED'
        ↓ mapStatus()
Kết quả: {
  label: '✅ Đã phát hành',
  color: 'green',
  icon: 'check_circle'
}

Lợi ích:
  - Backend lưu trữ được (PUBLISHED)
  - Frontend hiển thị friendly (✅ Đã phát hành)
  - Dễ thay đổi display mà không thay code backend
```

**Kết nối tới:**
- `ConcertTable.tsx` (hiển thị status)
- `ConcertDetailPanel.tsx`
- Badges + UI elements

---

### 🎨 LAYER 5: PAGES & FEATURE COMPONENTS

#### `features/concerts/ConcertsPage.tsx` - Trang Danh Sách (QUAN TRỌNG!)

**Mục đích:** Trang chính hiển thị danh sách concerts + filtering + pagination

**Component này là "rồi vàng" - quản lý tất cả logic!**

**5 phần chính:**

**1️⃣ Data Fetching**
```typescript
const { data: concerts, isLoading, isError } = useConcerts()
// Gọi API, lấy danh sách concerts
```

**2️⃣ Local State (UI Filters)**
```typescript
const [selectedStatus, setSelectedStatus] = useState<ConcertStatus>('ALL')
// Filter by status: ALL, DRAFT, PUBLISHED, CANCELLED, ENDED

const [selectedCity, setSelectedCity] = useState('ALL')
// Filter by city: ALL, Hà Nội, TP HCM, ...

const [searchQuery, setSearchQuery] = useState('')
// Search by title, artist, venue, city

const [currentPage, setCurrentPage] = useState(1)
// Pagination: page 1, 2, 3, ...

const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)
// Cho detail panel biết concert nào được select
```

**3️⃣ Computed Values (useMemo - calculate 1 lần)**
```typescript
const counts = useMemo(() => {
  // Count: ALL: 15, DRAFT: 3, PUBLISHED: 10, CANCELLED: 2, ENDED: 0
  const result = { ALL: 0, DRAFT: 0, PUBLISHED: 0, ... }
  concerts.forEach(c => result[c.status]++)
  return result
}, [concerts])
// Chỉ tính lại khi concerts thay đổi

const uniqueCities = useMemo(() => {
  // Lấy list cities từ concerts: [Hà Nội, TP HCM, ...]
  const cities = new Set()
  concerts.forEach(c => cities.add(c.city))
  return Array.from(cities).sort()
}, [concerts])

const filteredConcerts = useMemo(() => {
  // Apply filters: status + city + search
  return concerts.filter(c => {
    const statusMatch = selectedStatus === 'ALL' || c.status === selectedStatus
    const cityMatch = selectedCity === 'ALL' || c.city === selectedCity
    const searchMatch = !searchQuery || 
      c.title.includes(searchQuery) || 
      c.artistName.includes(searchQuery) ||
      c.venueName.includes(searchQuery)
    return statusMatch && cityMatch && searchMatch
  })
}, [concerts, selectedStatus, selectedCity, searchQuery])

const paginatedConcerts = useMemo(() => {
  // Slice array: lấy 10 items của page hiện tại
  const start = (currentPage - 1) * 10
  return filteredConcerts.slice(start, start + 10)
}, [filteredConcerts, currentPage])
```

**Tại sao dùng useMemo?**
```
Nếu không có useMemo:
  Component re-render
  → Tính lại filteredConcerts (loop 100 concerts)
  → Tính lại counts (loop 100 concerts)
  → Tính lại uniqueCities (loop 100 concerts)
  → Lâm 😅

Với useMemo:
  Component re-render
  → React: "Chờ, filteredConcerts dependencies thay đổi rồi không?"
  → Nếu không → return cached kết quả
  → Nếu có → tính lại
  → Nhanh! ⚡
```

**4️⃣ Render Structure**

```
Header
  ├─ Title: "Concert Management"
  └─ [Create Concert] button (organizers only)

Tabs
  ├─ ALL (15)
  ├─ PUBLISHED (10)
  ├─ DRAFT (3)
  ├─ CANCELLED (2)
  └─ ENDED (0)
  Click = change selectedStatus

SearchBar + Filters
  ├─ Search input
  ├─ Status dropdown
  ├─ City dropdown
  └─ Reset button

Main Content (2 columns)
  ├─ Left: ConcertTable
  │   └─ Render paginatedConcerts
  │
  └─ Right (if selected): ConcertDetailPanel
      └─ Render selectedConcert detail
```

**5️⃣ Event Handlers**
```typescript
onClick → setSelectedStatus() → state update → re-render → filters apply
onClick → setSelectedCity() → state update → re-render → filters apply
onInput → setSearchQuery() → state update → re-render → search apply
onClick → setCurrentPage() → state update → re-render → pagination apply
onClick row → setSelectedConcert() → state update → show detail panel
```

**Tại sao filtering ở client (memory)?**
```
Thay vì:
  User click filter
  → Gọi API GET /organizer/concerts?status=PUBLISHED
  → Server filter
  → Return concerts
  → Re-render

Chúng ta:
  User click filter
  → setSelectedStatus('PUBLISHED')
  → useMemo filteredConcerts recalculate (instant!)
  → Re-render
  → Nhanh! ⚡⚡⚡

Tại sao?
  - Data đã có ở client (cached từ lần fetch trước)
  - Filtering in memory nhanh hơn network call
  - Không cần load lại dữ liệu từ server
```

**Kết nối tới:**
- `hooks.ts` (gọi useConcerts)
- `ConcertTable.tsx` (render danh sách)
- `ConcertDetailPanel.tsx` (show detail)
- `ConcertFormModal.tsx` (create form)

---

#### `features/concerts/ConcertFormModal.tsx` - Modal Tạo/Sửa

**Mục đích:** Modal form để tạo hoặc sửa concert

**Props:**
```typescript
concert?: Concert | null
  - null → CREATE MODE
  - concert object → EDIT MODE

onClose: () => void
  - Callback đóng modal
```

**Logic:**
```
1. Khởi tạo form values:
   - Nếu concert = null: empty values
   - Nếu concert != null: pre-fill từ concert

2. Form fields:
   <Input label="Slug" value={values.slug} onChange={...} />
   <Input label="Title" value={values.title} onChange={...} />
   ... (more fields)

3. Auto-slugify:
   Khi user nhập Title → auto generate slug
   Ví dụ: "Pink Concert" → "pink-concert"

4. Validation:
   User click [Submit]
   → validateConcertForm(values)
   → Nếu error → show errors, không submit
   → Nếu ok → gọi mutation

5. Mutation:
   - CREATE: createMutation.mutate()
   - EDIT: updateMutation.mutate()

6. After success:
   - React Query invalidate cache
   - Cache refetch
   - Modal close
   - Page tự update
```

**Kết nối tới:**
- `hooks.ts` (gọi mutations)
- `ConcertsPage.tsx` (controlled by isFormOpen state)

---

#### `features/concerts/ConcertEditPage.tsx` - Trang Chi Tiết Edit

**Mục đích:** Full-page form để chỉnh sửa concert

**Tương tự modal nhưng full-page:**
- Fetch concert by ID
- Pre-fill form
- Show more info (poster, seating map, etc)
- Multiple action buttons (Save, Publish, Cancel)

**Kết nối tới:**
- `/concerts/:id/edit` route
- `hooks.ts`

---

#### `features/concerts/components/ConcertTable.tsx` - Bảng Danh Sách

**Mục đích:** Render concerts dưới dạng bảng

**Props:**
```typescript
concerts: Concert[]          // Danh sách đã filter + paginate
onSelect?: (concert) => void // Callback khi click row
selectedId?: string          // Highlight row nào
```

**Render:**
```
| Concert & Artist | Venue & City | Schedule | Status |
├──────────────────┼──────────────┼──────────┼────────┤
| Pink Concert     | FPT Arena    | Jun 20   | Draft  |
| Blue Paint       | Campus Hall  | Jun 21   | Pub.   |
```

**Tại sao tách component?**
- ConcertsPage file quá dài
- Reuse ở chỗ khác
- Dễ test riêng

**Kết nối tới:**
- `ConcertsPage.tsx` (display + get onSelect callback)

---

#### `features/concerts/components/ConcertDetailPanel.tsx` - Panel Chi Tiết

**Mục đích:** Hiển thị chi tiết concert ở panel bên phải

**Tại sao cần?**
- Show more info khi click row
- Nhanh hơn navigate sang page khác
- UX: vừa thấy list vừa thấy detail

**Kết nối tới:**
- `ConcertsPage.tsx`

---

### 🎨 LAYER 6: SHARED UI COMPONENTS

Các component dùng chung:
- `Button.tsx` - Nút
- `Input.tsx` - Input field
- `Dialog.tsx` - Modal
- `Table.tsx` - Bảng
- `Badge.tsx` - Label
- `Tabs.tsx` - Tabs
- `Pagination.tsx` - Phân trang
- `ShellLayout.tsx` - Layout chính (sidebar + navbar + content)

---

## 🔄 CÁC FILE KẾT NỐI VỚI NHAU

```
┌─────────────────────────────────────────────────────────┐
│  main.tsx                                               │
│  └─→ Creates React root                                │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  App.tsx                                                │
│  └─→ Render <Providers>                                │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  providers.tsx                                          │
│  ├─→ QueryClientProvider (React Query)                │
│  ├─→ AuthProvider (JWT + session)                      │
│  └─→ RouterProvider (routing)                          │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  router.tsx                                             │
│  ├─→ /login → LoginPage                                │
│  ├─→ /concerts → ConcertsPage                          │
│  ├─→ /concerts/:id/edit → ConcertEditPage             │
│  └─→ /dashboard → OrganizerDashboard (ADMIN only)     │
└─────────────────────────────────────────────────────────┘
              ↓
       (User interacts)
              ↓
┌─────────────────────────────────────────────────────────┐
│  ConcertsPage.tsx                                       │
│  ├─→ import useConcerts() from hooks.ts               │
│  ├─→ import <ConcertTable>, <DetailPanel>, ...        │
│  └─→ Manage: filters, pagination, selection           │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  hooks.ts                                               │
│  ├─→ useConcerts()                                     │
│  │   ├─→ useConcertSession() → basePath + scope       │
│  │   └─→ useQuery() with React Query                  │
│  │
│  ├─→ useCreateConcertMutation()                        │
│  │   └─→ useMutation() call API + invalidate cache   │
│  │
│  └─→ (other hooks)                                     │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  api.ts                                                 │
│  ├─→ listConcerts(basePath)                            │
│  ├─→ getConcert(basePath, id)                          │
│  ├─→ createConcert(basePath, payload)                  │
│  ├─→ updateConcert(basePath, id, payload)             │
│  ├─→ publishConcert(basePath, id)                      │
│  └─→ cancelConcert(basePath, id)                       │
│      (each call get() or post() or patch())            │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  shared/api/client.ts                                   │
│  ├─→ buildHeaders() → add Authorization header        │
│  ├─→ get<T>(path)                                      │
│  ├─→ post<T>(path, body)                               │
│  ├─→ patch<T>(path, body)                              │
│  └─→ handleResponse() → check 401, parse JSON         │
└─────────────────────────────────────────────────────────┘
              ↓ HTTP Request with JWT
┌─────────────────────────────────────────────────────────┐
│  Backend API (NestJS)                                   │
│  ├─→ Verify JWT token                                 │
│  ├─→ Extract userId from token                        │
│  ├─→ Filter/validate data based on userId             │
│  └─→ Return response                                    │
└─────────────────────────────────────────────────────────┘
              ↓ HTTP Response
┌─────────────────────────────────────────────────────────┐
│  React Query (Cache)                                    │
│  └─→ Store response → serve to components             │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  ConcertsPage.tsx re-render                             │
│  └─→ Display new data                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 FLOW HOÀN CHỈNH: USER TẠO CONCERT

```
1️⃣ USER NAVIGATE TỚI PAGE

User gõ http://localhost:5173/concerts
    ↓
Browser navigate
    ↓
router.tsx: match /concerts path
    ↓
Render <ConcertsPage />


2️⃣ COMPONENT MOUNT & FETCH DATA

ConcertsPage.tsx mounts
    ↓
useConcerts() hook runs
    ↓
  useConcertSession()
    → role = 'ORGANIZER'
    → basePath = '/organizer/concerts'
    → scope = { role, sub: 'user-123' }
    ↓
  useQuery({
    queryKey: ['concerts', 'list', scope],
    queryFn: () => listConcerts('/organizer/concerts')
  })
    ↓
    React Query check: cache exist?
      No → fetch from server
      ↓
      listConcerts() call get('/organizer/concerts')
        ↓
        client.ts:
          - buildHeaders() + Bearer token
          - fetch() to server
            ↓
            Backend:
              - Verify JWT
              - Extract userId = 'user-123'
              - Query DB: SELECT * FROM concerts WHERE createdById = 'user-123'
              - Return: Concert[]
            ↓
          - handleResponse() parse JSON
        ↓
      React Query cache result
    ↓
  useQuery return: { data: Concert[], isLoading: false }
    ↓
ConcertsPage re-render with concerts data
    ↓
Render: <ConcertTable concerts={concerts} />


3️⃣ USER CLICKS [CREATE CONCERT]

User click button
    ↓
handleOpenCreate()
    ↓
setIsFormOpen(true)
    ↓
ConcertFormModal render


4️⃣ USER FILLS FORM

User type:
  Title: "Pink Concert"
  Artist: "Pink"
  Slug: auto-generate "pink-concert"
  ...


5️⃣ USER SUBMITS

User click [Create]
    ↓
handleSubmit()
    ↓
validateConcertForm(values)
    → Check all required fields
    → Check slug format
    → Check dates
    ↓
If errors: setErrors() → show UI errors
If ok: createMutation.mutate(payload)
    ↓
    useCreateConcertMutation() → mutationFn runs:
      createConcert('/organizer/concerts', payload)
        ↓
        client.ts: post('/organizer/concerts', payload)
          - buildHeaders() + Bearer token
          - fetch() to server
            ↓
            Backend:
              - Verify @Roles guard: user have ORGANIZER?
              - Validate payload
              - Create concert: INSERT INTO concerts ...
              - Return: Concert (with id, createdAt, etc)
            ↓
          - handleResponse() parse JSON
        ↓
      Return created concert
    ↓
    onSuccess callback:
      queryClient.invalidateQueries({
        queryKey: ['concerts', 'list', scope]
      })
        ↓
        React Query: "invalidate this cache"
        ↓
        React Query auto refetch:
          useQuery will fetch again
            ↓
            GET /organizer/concerts
              ↓
              Backend: SELECT * FROM concerts WHERE createdById = 'user-123'
              → Now include new concert! ✨
              ↓
              Return updated list
            ↓
          React Query cache new list
        ↓
        useQuery return new data
        ↓
        ConcertsPage re-render
        ↓
        <ConcertTable /> shows new concert! 🎉
    ↓
Modal closes
    ↓
User sees new concert in table
```

---

## 🎯 CÁC KHÁI NIỆM QUAN TRỌNG CẦN HIỂU

### 1. Role-Based Endpoint Routing

**Khái niệm:**
Frontend không tự check role để filter dữ liệu.
Thay vào đó, frontend gọi khác API endpoint dựa vào role.

**Cách hoạt động:**
```
User A (ORGANIZER):
  useConcertSession() → basePath = '/organizer/concerts'
  → GET /organizer/concerts
  → Backend: SELECT * FROM concerts WHERE createdById = 'user-A'
  → Trả chỉ concerts của user A

User B (ADMIN):
  useConcertSession() → basePath = '/admin/concerts'
  → GET /admin/concerts
  → Backend: SELECT * FROM concerts (no filter)
  → Trả tất cả concerts
```

**Lợi ích:**
- ✅ Backend kiểm soát data access (security)
- ✅ Frontend không cần biết filter logic (simplicity)
- ✅ Dễ thay đổi filter rules ở backend mà không touch frontend

---

### 2. React Query - Automatic Cache Management

**Khái niệm:**
React Query tự động quản lý cache, deduplication, background sync.

**Tại sao cần?**
```
Không có React Query:
  Component A: fetch /concerts → state
  Component B: fetch /concerts → state
  Component C: fetch /concerts → state
  → 3 requests giống nhau! (낭비)

Với React Query:
  Component A: useQuery({ queryKey: ['concerts', ...], ... })
  Component B: useQuery({ queryKey: ['concerts', ...], ... })
  Component C: useQuery({ queryKey: ['concerts', ...], ... })
  → React Query: "queryKey giống nhau → dùng cache"
  → 1 request! (efficient)
  
Ngoài ra:
  - Auto handle loading, error states
  - Auto refetch background
  - Auto invalidate + refetch after mutation
```

**Ví dụ:**
```
Step 1: Component mount
  useQuery({ queryKey: 'concerts', queryFn: fetch })
  → queryKey not in cache → fetch
  → Save cache with key 'concerts'

Step 2: Another component mount
  useQuery({ queryKey: 'concerts', queryFn: fetch })
  → queryKey in cache → return cache (NO FETCH!)

Step 3: User create concert
  mutation.mutate()
  → onSuccess: queryClient.invalidateQueries({ queryKey: 'concerts' })
  → React Query: "concert cache invalid"
  → Remove cache

Step 4: Component still mounted
  useQuery see cache removed
  → Auto fetch again
  → New data appear!
```

---

### 3. Validation: Frontend + Backend

**Tại sao cần CẶP HAI?**

| Nơi | Tốc độ | Security | UX |
|-----|--------|----------|-----|
| **Frontend only** | ⚡ Instant | ❌ Bypass được | ✅ Good |
| **Backend only** | 🐢 Slow | ✅ Safe | ❌ Bad |
| **BOTH** | ⚡ Instant | ✅ Safe | ✅ Good |

**Frontend validation:**
- `concert-form.ts` validate
- User nhập xong → instant feedback
- Bad UX nếu chỉ backend

**Backend validation:**
- NestJS DTO validators
- Security: frontend có thể bypass
- Bắt buộc check ở backend

---

### 4. Local State vs Server State

**Local State (React useState):**
```typescript
const [selectedStatus, setSelectedStatus] = useState('ALL')
const [searchQuery, setSearchQuery] = useState('')
const [currentPage, setCurrentPage] = useState(1)

Đặc điểm:
- Chỉ ở component
- Mất khi refresh page
- Dùng cho UI state
```

**Server State (React Query cache):**
```typescript
const { data: concerts } = useQuery(...)

Đặc điểm:
- Tồn tại trong cache
- Share giữa components
- Sync với backend
- Persist nếu config staleTime
```

**Ví dụ:**
```
User filter by status = 'PUBLISHED'
  ↓ setSelectedStatus('PUBLISHED') ← LOCAL STATE
  ↓ UI update (instant)

User refetch data
  ↓ useQuery re-fetch ← SERVER STATE
  ↓ Backend return new data
  ↓ React Query update cache
  ↓ Components re-render with new data
```

---

### 5. Token Auto Injection

**Vấn đề:**
Mọi request tới backend phải có JWT token ở header.
Nếu mỗi API call phải manual thêm:
```typescript
// Tẻ nhạt + dễ quên
fetch('/concerts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**Giải pháp:**
client.ts tự động inject:
```typescript
// Sạch + dễ dùng
get('/concerts')

// client.ts làm:
// - getToken() từ localStorage
// - buildHeaders() + token
// - fetch()
```

---

## 🏛️ KIẾN TRÚC ỨNG DỤNG

### Layered Architecture

```
┌───────────────────────────────────────────────────────────┐
│  Layer 6: UI Components (Reusable)                        │
│  Button, Input, Dialog, Table, Badge, etc                 │
└───────────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Layer 5: Pages & Feature Components                      │
│  ConcertsPage, ConcertFormModal, ConcertEditPage         │
└───────────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Layer 4: Data Fetching (React Query)                     │
│  hooks.ts, api.ts, query-keys.ts, concert-form.ts        │
│  Chứa: business logic, validation, transformation         │
└───────────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Layer 3: HTTP Client                                     │
│  client.ts (fetch + auto JWT injection)                   │
└───────────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Layer 2: Authentication                                  │
│  AuthContext, ProtectedRoute, jwt-decode, token-storage  │
│  Chứa: JWT token, user session, role check               │
└───────────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────┐
│  Layer 1: App Setup                                       │
│  main.tsx, App.tsx, providers.tsx, router.tsx            │
│  Chứa: entry point, global providers, routing             │
└───────────────────────────────────────────────────────────┘
                         ↓ HTTP
         ┌─────────────────────────────────┐
         │    Backend API (NestJS)         │
         │  /organizer/concerts            │
         │  /admin/concerts                │
         └─────────────────────────────────┘
```

### Separation of Concerns

```
UI Layer:
  - ConcertsPage.tsx: Manage UI state (filters, selection)
  - Components: Render JSX, handle clicks

Business Logic Layer:
  - hooks.ts: Data fetching with React Query
  - concert-form.ts: Validation, transformation

API Layer:
  - client.ts: HTTP requests
  - api.ts: API endpoints

Auth Layer:
  - AuthContext: Global JWT + session
  - ProtectedRoute: Check permissions
  
App Setup Layer:
  - router.tsx: URL routing
  - providers.tsx: Global state setup
```

---

## 📝 TÓNG KẾT NHANH

| Layer | File | Mục đích | Kết nối tới |
|-------|------|---------|------------|
| 1 | `main.tsx` | Entry point | App.tsx |
| 1 | `App.tsx` | Root component | providers.tsx |
| 1 | `providers.tsx` | Setup global state | All layers |
| 1 | `router.tsx` | URL → Component | All pages |
| 2 | `AuthContext.tsx` | JWT + session | All components |
| 2 | `ProtectedRoute.tsx` | Check quyền | router.tsx |
| 3 | `client.ts` | HTTP + auto token | api.ts |
| 4 | `concerts/api.ts` | API endpoints | hooks.ts |
| 4 | `concerts/hooks.ts` | React Query | Pages |
| 4 | `concerts/concert-form.ts` | Validation | Forms |
| 5 | `ConcertsPage.tsx` | Main page | hooks.ts + components |
| 5 | `ConcertFormModal.tsx` | Create/edit form | hooks.ts |
| 6 | `Button.tsx`, `Input.tsx`, etc | UI elements | Pages |

---

## ❓ CẦU HỎI CÓ THỂ

**Q: Tại sao có 2 cách gọi API: `/organizer/concerts` và `/admin/concerts`?**
A: Backend cần biết user là gì để filter dữ liệu. Frontend đã biết role từ JWT → gọi endpoint phù hợp.

**Q: Khi nào React Query refetch data?**
A: Sau mutation onSuccess hoặc queryClient.invalidateQueries() được gọi.

**Q: Local state vs Server state, nên dùng cái nào?**
A: Server state: data từ backend. Local state: UI state. Dùng cả hai hợp lý.

**Q: Token hết hạn thì sao?**
A: Backend trả 401 → client.ts clear token + unauthorizedHandler() → redirect /login.

---

## 🚀 BƯỚC TIẾP THEO

Sau khi hiểu hết file này:
1. Đọc lại từng file source code
2. Trace code path: login → list concerts → create concert
3. Thử thay đổi nhỏ (text, color, logic)
4. Hỏi nếu chưa hiểu!

**Good luck! 🎉**
