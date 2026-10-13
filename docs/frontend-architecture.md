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

`src/main.tsx` mounts the application and loads global CSS. `App.tsx` composes providers in this order: `ToastProvider → AuthProvider → BrowserRouter`. `AppRoutes.tsx` separates routes into three groups:

- Public routes use `MainLayout`.
- Login and registration routes use `AuthLayout`.
- Authenticated routes pass through `ProtectedRoute` before using `MainLayout`.

Add each new path to `src/routes/paths.ts` before declaring its `<Route>`. Do not duplicate hardcoded URLs across the application.

## Data and Authentication

`apiClient.ts` configures the base URL, request timeout, bearer token, and error normalization into `ApiError`. A `401` response clears the local session and redirects to the login page. `AuthProvider` stores the current user and exposes `login`, `register`, and `logout` through `useAuth()`.

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

Room loading still uses `/interviews/:id` and `/interviews/:id/questions`; backend
read API alignment remains a separate dependency. Live server persistence has not
been validated by the demo or mocked browser checks.

`useAnswerSubmission` requests signed parameters from
`POST /interview-session/:id/questions/:questionId/answer/signed-params`, uploads
MP4/WebM directly via `fetch` and `FormData`, then PUTs only
`{ cloudinaryPublicId, transcript }` to the corresponding `/answer` endpoint.
Signed fields are sent unchanged with Cloudinary field names; resource type and
file size limits stay out of the form. The upload service rejects empty,
unsupported, oversized or mismatched assets and never sends application bearer
tokens to Cloudinary. Transcript is editable, untrimmed, optional in content
(empty string allowed), and limited to 50,000 characters. Speech-to-text is not
part of this flow.

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
does not contain scores.

Run `npm test` for Vitest/jsdom/Testing Library checks of clock semantics, signed
form/API contracts, upload validation, retries/retakes, sequential room behavior,
submission eligibility/frozen payloads and polling cleanup. `npm run test:watch`
is available locally. CI also runs lint, formatting, typecheck and build.

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
  sessions and unsaved text/video; it is removed after successful submission.
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
