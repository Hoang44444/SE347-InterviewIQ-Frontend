# Frontend Architecture

## Overview

InterviewIQ is a single-page application built with React 19, TypeScript, and Vite. React Router handles navigation, Axios communicates with the backend, and Tailwind CSS with design tokens provides a consistent interface.

The primary dependency flow is:

```text
Page → Component / Hook → Service → apiClient → Backend
                    ↘ Context / Types / Utils
```

Do not call Axios directly from pages or components. Route every request through a domain service so the UI remains independent of API implementation details.

## Directory Structure

| Directory                      | Responsibility                                                    |
| ------------------------------ | ----------------------------------------------------------------- |
| `src/pages/`                   | Route-level components that compose UI and coordinate use cases.  |
| `src/components/ui/`           | Shared design-system primitives exported through `index.ts`.      |
| `src/components/interview/`    | Components specific to the interview domain.                      |
| `src/layouts/`                 | Page shells that render nested routes through `<Outlet />`.       |
| `src/routes/`                  | Route paths, route hierarchy, and access protection.              |
| `src/services/`                | Domain API functions and the shared Axios client.                 |
| `src/contexts/`                | Application-wide state such as authentication and toast messages. |
| `src/hooks/`                   | Reusable React behavior.                                          |
| `src/types/`                   | Shared data types and API contracts.                              |
| `src/styles/`                  | Global CSS and design tokens.                                     |
| `src/utils/`, `src/constants/` | Shared pure functions and constants.                              |

## Application Startup and Routing

`src/main.tsx` mounts the application and loads global CSS. `App.tsx` composes providers in this order: `ToastProvider → AuthProvider → RouterProvider`. The router is a data router (so the interview room can use `useBlocker`) with a single catch-all route that renders `AppRoutes`. Tests that render the room use `TestRouter` from `src/test/`. `AppRoutes.tsx` separates routes into three groups:

- Public routes use `MainLayout`.
- Login and registration routes use `AuthLayout`.
- Authenticated routes pass through `ProtectedRoute` before using `MainLayout`.

Add each new path to `src/routes/paths.ts` before declaring its `<Route>`. Do not duplicate hardcoded URLs across the application.

## Data and Authentication

`apiClient.ts` configures the base URL, request timeout, bearer token, and error normalization into `ApiError`. When a protected request returns `401`, it calls `POST /auth/refresh` once, stores the new token pair, and retries the request. Concurrent `401`s share one in-flight refresh (and a Web Lock across tabs), because the backend rotates the refresh token and rejects reuse of the old one. Only when the backend rejects the refresh token does the client clear the session and notify `AuthProvider`, which drops the user so `ProtectedRoute` redirects to the login page; network or `5xx` failures during refresh keep the session. Requests to `/auth/*` never trigger a refresh: a `401` from `/auth/login` means wrong credentials. `AuthProvider` stores the current user and exposes `login`, `verifyRegistration`, and `logout` through `useAuth()`.

Backend envelope contracts live in `src/types/api.ts`; `src/shared/apiResponse.ts` re-exports these types. `ApiSuccessResponse<T>` contains `statusCode`, `success: true`, `data`, `message`, and `timestamp`. `ApiErrorResponse` contains `statusCode`, `success: false`, `code`, `message`, optional validation `errors`, `path`, and `timestamp`. `ApiResponse<T>` is the union of both envelopes. Domain services type successful requests as `ApiSuccessResponse<T>` and return the nested `data` payload.

The error interceptor uses the HTTP status for `ApiError.status` and retains the backend `code`, `path`, and `timestamp` when available. It converts validation entries shaped as `{ field, messages }[]` into `ApiError.errors`, a `Record<string, string[]>`, combining messages for repeated fields. Network failures use status `0` and the Axios error message.

Components should only own local presentation state. Put state shared across multiple interface branches in a context, and define API responses and payloads in `src/types/`.

## Sequential Interview and Timing

The room loads data before showing a start screen. Clicking **Bắt đầu phỏng vấn**
starts both the session clock and the first question clock. There are no previous,
next, or clickable question-list controls: only a successful answer submission
opens the next question. Future question content is hidden in the progress list.
After the last submission, the answer and recording controls are locked until the
user confirms session submission. The summary shows saved transcripts/videos, frontend
answer durations separately from backend video durations, and scoring job status.

`createInterviewClock` derives elapsed seconds from timestamps rather than counting
interval ticks. `useInterviewClock` refreshes the display after the session starts;
frozen clock timestamps keep the final duration unchanged.
Session duration runs continuously from the explicit start to confirmed finish,
including answer submission waits. Each question starts on opening and freezes
immediately on submission, before recorder finalization or a network request.
Failed submissions resume answering from the accumulated duration, excluding the
failed request wait. Suggested question duration is informational and never caps
actual elapsed time. The first session submission attempt freezes both clocks and
its payload permanently; retries never resume clocks or unlock answers because the
backend may have persisted SUBMITTED before an enqueue/network failure.

`InterviewSessionTiming` retains start/end ISO timestamps and total duration in
room memory. Finishing sends `{ cvPublicId, totalQuestions, durationSeconds }` to
`POST /interview-session/:id/submit`, matching the backend DTO. This endpoint stores
the total duration; its current contract does not accept client start/end
timestamps. Room details must include the CV public ID associated with the session.
Missing CV metadata produces an error instead of falsely showing a saved summary.
The demo implements the same service method locally without a server request.

The room loads its title and CV from `GET /interviews/:id` and its questions from
`GET /interview-session/:id/questions`.

### Resuming and leaving

The same detail response lists saved answers, so entering an in-progress session
again restores them: the room opens at the first unanswered question, and answers
without a video count as unanswered. The server cannot supply per-question answer
durations, so restored answers show none. Drafts and unsubmitted recordings are not
restored.

The session clock start is remembered in `localStorage`
(`interviewiq:room_clock:<sessionId>`) and removed after submission, so a reload
keeps counting, including the time away. Without it (another browser) a session with
saved answers counts from the server `startedAt`; one without starts from zero. The
demo room has no `startedAt` and remembers nothing.

While there is unsubmitted work, `beforeunload` covers reload and tab close, and
`LeaveRoomGuard` asks before an in-app route change, including the Back button.

`useAnswerSubmission` requests signed parameters from
`POST /interview-session/:id/questions/:questionId/answer/signed-params`, uploads
MP4/WebM directly via `fetch` and `FormData`, then PUTs only
`{ cloudinaryPublicId, transcript }` to the corresponding `/answer` endpoint.
Signed fields are sent unchanged with Cloudinary field names; resource type and
file size limits stay out of the form. The upload service rejects empty,
unsupported, oversized or mismatched assets and never sends application bearer
tokens to Cloudinary. Transcript is editable, untrimmed, optional in content
(empty string allowed), and limited to 50,000 characters. Speech-to-text fills this field
in the browser; see Speech Transcript and Speaking Pace.

An uploaded asset is cached against its Blob identity. A failed PUT may reuse
that asset, including after transcript edits; a completed retake needs new
signing/upload. Errors retain the current question, transcript and recording.
Uploads retry only on user action; 404/409 block further answer writes. Only the
full successful answer response marks progress and unlocks the next question.

Session submission is enabled only when every question has a successful answer,
no device/save action is pending, and the session has a CV ID. The confirmation
sends the frozen `{ cvPublicId, totalQuestions, durationSeconds }` payload.
Network/5xx failures expose only session retry. A 409 shows a conflict without
claiming success or inventing an existing job ID. A 202 stores the returned
`{ sessionPublicId, jobId, status }` and starts `useScoringJob` polling the
authenticated `/scoring/jobs/:jobId/status` endpoint. Requests run sequentially,
three seconds after each previous response; COMPLETED/FAILED or unmount stops
them. Polling failures retain the job and allow a manual check. Status metadata
does not contain scores; once the job reaches `COMPLETED`, the summary links directly
to `/history/:id` (`ROUTES.historyDetail(id)`) to view the full score breakdown.

Run `npm test` for Vitest/jsdom/Testing Library checks of clock semantics, signed
form/API contracts, upload validation, retries/retakes, sequential room behavior,
submission eligibility/frozen payloads and polling cleanup. `npm run test:watch`
is available locally. CI also runs lint, formatting, typecheck and build.

## Interview History

`GET /api/interviews` and `GET /api/interviews/:id` belong to the backend's
interview-history module, not to the interview module. `interviewHistoryService`
owns both; the list page lives at `/history` and the detail page at `/history/:id`.
`interviewService.getById` and `getQuestions` still point at the same `/interviews`
URLs with the older `Interview` shape and do not match the live backend — they
remain only because the room depends on them, and `/interviews/:id/questions` has
no backend endpoint at all.

The list sends `pageNumber`, `pageSize`, and the optional `status`, `fromDate` and
`toDate`. Empty filter values are dropped rather than sent: `?status=` fails the
backend enum check with a 400, so clearing a filter would become an error. The two
date inputs produce `yyyy-MM-dd` in the viewer's calendar, and the service converts
them to the ISO instants of local start-of-day and end-of-day; passing the raw
string would be read as UTC midnight and silently shift the range by the timezone
offset. A reversed range is rejected in the service before any request, so the
message appears beside the date field instead of as a page-level banner. Changing a
filter resets to page 1, and each request carries a sequence number so a response
from an earlier filter never overwrites a newer one.

Ordering is fixed by the backend (`createdAt DESC`), filtering uses `createdAt`
rather than completion time, and there is no keyword search or score-range filter,
so the UI offers none. `pageSize` is a constant capped well under the backend's
limit of 100.

A session that is `CREATED` or `IN_PROGRESS` links to the room; every other status
links to the detail page. `durationSeconds` and `overallScore` are nullable and
render as a dash, never as `00:00` or `0,0`. A null `cv` means no CV or a deleted
one (`onDelete: SetNull`) and says so. A 404 covers both "does not exist" and
"belongs to someone else" by design, so the detail page shows one not-found screen
without guessing which, and an id that is not a UUID reaches that screen without a
request.

The detail response includes `score`, `summary`, and `questions` for completed sessions, while omitting `emotionTimeline`, `scoringModel`, and `promptVersion`. For any `COMPLETED` session, the detail page reads `GET /api/scoring/sessions/:id/result` through `useSessionResult` so `ScoringResultView` has the full breakdown, model metadata, and emotion timeline. That endpoint answers 400/403/404 when there is simply no result yet, so those statuses produce a status-specific notice rather than an error banner. For a session that is not yet completed, the retry control reloads the detail instead: what the viewer is waiting for is the status changing, not a result that cannot exist.

## Interview Question Generation

A session in the `CREATED` status shows `CreatedSessionContent` in `InterviewSessionRoom`: three summary tiles, the job description saved at creation (read-only; it is sent only by `POST /interview-session` and never to the generate endpoint), the question panel and **Bắt đầu**. Other statuses keep the previous summary.

`useSessionQuestions` loads `GET /interview-session/:id/questions` and calls `POST …/questions/generate` through `interviewService.generateQuestions`, which sends `{ count }` (3–10, default 5) only when a count is given and uses `GENERATE_QUESTIONS_TIMEOUT` (60 s) instead of the 15 s default, because the backend generates synchronously for up to about 45 seconds. A ref lock allows one generate request at a time, a load that started before a generate never overwrites its result, and a failed regeneration keeps the previous set because the backend replaces questions only on success. `describeGenerateError` separates 409 "CV has not been parsed yet" (links to the CV page) from 409 "can only be generated while the session is CREATED", plus 400, 404, 500 and network failures; 401 is left to `apiClient`.

`QuestionGenerationPanel` is presentational: loading, empty, generating, list, load error and generate error states, a count `Select` and a confirmation `Modal` before regenerating, since that replaces the whole set. **Bắt đầu** stays disabled until at least one question exists and while generating. The room still resolves its CV only by `cvPublicId`; the file name is not available from the session list.

## Interview Camera and Per-question Recordings

`useInterviewRecorder` owns the permission request, live `MediaStream`, current
`MediaRecorder`, and one successful `InterviewRecording` per question ID. Its
states are `idle`, `requesting`, `ready`, `recording`, `stopping`, and `error`.
`InterviewRecorder` renders the muted camera preview and explicit device/recording
controls; `RecordingPlayback` renders playback and a download link in both the
room and its summary.

The camera preview explicitly calls `video.play()` after attaching the stream
and receiving metadata. Playback rejection is separate from device permission:
blocked autoplay shows an alert and a user-initiated retry. If no video frame
arrives within eight seconds, the preview explains how to check the selected
camera and hardware. Preview audio is muted at the player only; the stream's
audio track remains enabled for recording. Cleanup cancels frame checks and
invalidates pending play attempts before detaching the stream.

Development builds also show a local camera diagnostic panel: selected camera
name, video track availability, stream attachment, received frame dimensions,
and preview playback time. It reads metadata only and helps distinguish a
camera-source problem from preview playback. Its polling interval is cleared on
unmount, and the panel is removed from production builds.

- Devices are requested only after an explicit button click, with both audio and
  video enabled. Feature detection rejects insecure contexts and unsupported
  browsers with an actionable error; a recorded video is required for submission.
  Permission errors distinguish denied access, missing devices, and unavailable
  hardware. Cancelling a pending permission request invalidates it.
  Any stream returned by an invalidated request is immediately stopped.
- Recording is independent of elapsed answer time. Starting captures the question ID
  in the recording session. All stop callers share a promise that resolves only
  after the final `dataavailable` event and `stop`. The room serializes answer submission and finish actions around this promise,
  including keyboard submissions.
- WebM is preferred, followed by MP4; otherwise the browser chooses. Blob MIME
  and file extensions follow the actual recorder/chunk format. Unknown formats
  download as `.bin` rather than claiming to be WebM or MP4.
- Retakes require confirmation. A previous recording is replaced only after a
  nonempty, successful recording completes; recorder errors, device disconnects,
  and empty retakes retain the previous recording. Upload/answer-save failures also retain
  local recordings. A local recording never marks a question as saved: the answer
  PUT must succeed before progress advances.
- Finishing awaits recorder finalization, stops every device track, and retains
  playback/downloads in the summary. Submitted answers are read-only there.
  Unsubmitted recordings exist only in room memory; successfully submitted videos
  are stored by Cloudinary and linked by the backend answer response. Reloading
  or leaving destroys local recordings. The tab-close warning covers unfinished
  sessions and unsaved text/video; it is removed after successful submission, and
  in-app route changes ask first (see _Resuming and leaving_).
- Each Blob has an object URL, revoked when replaced or when the room unmounts.
  Cleanup removes recorder/track listeners, settles pending stop promises,
  invalidates permission requests, and stops tracks safely under StrictMode.
  Changing the room ID remounts its state to prevent recordings or pending API
  results from leaking into another interview.

Browser lifecycle references: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia),
[MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder), and
[MediaRecorder.stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop).

For local testing without authentication or backend data, run `npm run dev` and
open `http://localhost:5173/dev/interview-room`. This public route is gated by
`import.meta.env.DEV` and is unavailable in production. It composes the same
`InterviewRoom` with a per-room `createInterviewDemoService()` instance through the
`InterviewRoomService` contract: three sample questions, simulated signing/upload,
full local answer responses and QUEUED → PROCESSING → COMPLETED scoring. Camera/recording
controls use the real browser APIs. The demo banner clearly labels its temporary
data and never sends video to Cloudinary/backend; authenticated interview routes continue to use `interviewService`.

## Speech Transcript and Speaking Pace

`useSpeechTranscript` wraps the Web Speech API (`SpeechRecognition`, or the `webkit` prefix in Chrome/Edge/Safari). `InterviewRoom` uses it through `useAnswerTranscription` (see below). The hook itself does not call `getUserMedia` or read `useInterviewRecorder` state: the recognizer asks for the microphone itself, and the page normally already holds the permission from the camera step. Any failure is only a message and never blocks recording, typing or submitting.

- **Contract**: `useSpeechTranscript({ lang = 'vi-VN', slowWpm = 90, fastWpm = 180, maxLength = 50000 })` returns `status` (`unsupported | idle | listening | error`), `isSupported`, `transcript` (final + interim, for display), `finalTranscript`, `interimTranscript`, `wordCount`, `currentWpm`, `averageWpm`, `pace` (`slow | good | fast | null`), `truncated`, `error` (`{ code, message }`, Vietnamese message) and `start`, `stop`, `reset`. Constants live in `src/constants/speech.ts`.
- **Browsers**: Firefox has no `SpeechRecognition`, so `status` is `unsupported` from the first render and `start` does nothing.
- **Transcript**: final segments are appended with one space between them; interim text is shown but only joins `finalTranscript` once confirmed. At `maxLength` (the 50,000-character limit of the answer PUT) the text is cut at the nearest word boundary, listening stops and `truncated` is `true`; `start` stays disabled until `reset`. `stop` uses `recognition.stop()` so the last final result still arrives.
- **Continuous listening**: `continuous: true`. Chrome ends the session after silence or about a minute; while the user has not called `stop`, `onend` starts it again. Ends within one second of a start count as failures and, after three in a row, the hook reports `unstable`. `no-speech` and `aborted` are ignored. `not-allowed`, `audio-capture`, `network` and unknown errors stop the hook with `status: 'error'`.
- **Pace**: words are counted by whitespace (`src/utils/speechRate.ts`). `currentWpm` covers the last 15 seconds (the elapsed time while the window is not full) and stays `null` until 8 seconds have been heard. `averageWpm` covers the whole answer. The clock counts listening time only, silence included, and is paused by `stop`. `pace` is `slow` below 90 and `fast` above 180 words per minute, which suits Vietnamese (about 120–160 when speaking naturally). Pace becomes `slow` again after a long silence.

### In the interview room

`useAnswerTranscription` follows the recorder status: it listens while a take is recording and writes `typed text + transcript` into the answer box of that question, which is read-only while listening and editable afterwards. The speech belongs to its take, so a retake replaces the previous take's text (including edits made to it) and keeps what was typed before the first take; if the retake fails, the previous text comes back with the previous recording. Saving an answer releases the take, so late results cannot change what was submitted: the payload is exactly the text visible at the click. `SpeechFeedback` shows the pace, errors and the unsupported notice without disabling manual entry. The lobby discloses that some browsers send the audio to their vendor for recognition.

## Scoring Result & Live Updates

`GET /api/scoring/stream` delivers real-time `job-update` (`answer-scored` / `answer-failed`) and `ping` heartbeat events over Server-Sent Events. The client uses `fetch` + `ReadableStream` (`src/services/scoringStreamService.ts`) parsed by the pure `createSseParser` (`src/utils/sseParser.ts`) instead of the native `EventSource` API, because `EventSource` cannot attach the `Authorization: Bearer` header required by the backend guard.

- **Auth & 401 refresh**: On `401`, `openScoringStream` first checks whether another request or tab already rotated the access token in storage and reconnects immediately if so; otherwise it calls the shared `refreshAccessToken()` exported from `apiClient.ts` once (never calling `/auth/refresh` directly so single-flight refresh and Web Locks stay intact). A fresh token triggers an immediate reconnect; `null` calls `endSession()` so `AuthProvider` signs the user out cleanly and stops the stream. `403` and other `4xx` responses stop without reconnecting.
- **Reconnect & missed-event recovery**: On network failures, `5xx`, or unexpected stream closure while not aborted, `openScoringStream` reconnects with exponential backoff (`1s → 2s → 4s → 8s → 15s`, `SCORING_STREAM_BACKOFF_MS`) and resets the backoff once opened. Because SSE is in-memory and does not replay events emitted while disconnected, `HistoryDetailPage` passes `reload` to `onReconnected` so every reconnect re-syncs the session status without double-fetching on initial page load.
- **React lifecycle**: `useScoringStream` opens only when `enabled` (`SUBMITTED` or `SCORING`) and `sessionId` are set, filters events to `event.payload.sessionId === sessionId`, stores callbacks in refs so callback updates never reopen the stream, and aborts both the fetch and any pending backoff timer on unmount.
- **Result view (`src/components/scoring/`)**: `HistoryResultPanel` delegates completed results to `ScoringResultView`, which composes `ScoreValue` (overall score), `ScoreBreakdownChart` (3-pillar SVG radar + horizontal bars), `FeedbackList` (strengths/improvements with `FeedbackCategory` badges and model/version metadata), and `EmotionTimeline` (per-question stacked bars with exact proportional widths, legend, screen-reader breakdown, empty state, and non-evaluative disclaimer). In `InterviewRoomPage`, the "Xem kết quả chi tiết" link is shown only for valid session UUIDs (`isSessionId(id)`), omitting it on the `/dev/interview-room` demo route.
- **Emotion color mapping**: To keep `src/styles/tokens.css` unchanged, the 8 emotion labels (MediaPipe `positive`/`neutral`/`surprised` plus legacy face-api labels) map onto existing semantic tokens: `positive` → `bg-success-600`, `neutral` → `bg-border-strong`, `happy` → `bg-success-700`, `surprised` → `bg-info-600`, `sad` → `bg-brand-300`, `fearful` → `bg-warning-600`, `angry` → `bg-danger-600`, `disgusted` → `bg-brand-800`.

## Adding a Feature

1. Define the domain types and constants.
2. Add API functions to the appropriate service.
3. Build domain components using primitives from `@/components/ui`.
4. Compose the use case in a page and add a route when required.
5. Verify loading, empty, error, unauthenticated, and responsive states.
6. Run `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm run build`.

## Architecture Rules

- Use the `@/` alias instead of long relative paths.
- Use `import type` for type-only imports; do not use TypeScript `enum`.
- Do not hardcode colors or arbitrary spacing. Add tokens to `src/styles/tokens.css`.
- Import UI primitives from `@/components/ui`; do not deep-import individual files.
- Keep context definitions separate from providers to preserve React Fast Refresh behavior.
