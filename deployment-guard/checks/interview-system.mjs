import { fileExists, makeCheck, readText, readBackendSource } from "../lib/utils.mjs";

export async function runInterviewChecks() {
  const checks = [];

  checks.push(
    makeCheck({
      id: "interview.page",
      category: "functionality",
      name: "Interview room route",
      status: fileExists("frontend/app/interview/[roomId]/page.tsx") ? "PASS" : "FAIL",
      message: "Interview room page exists at /interview/[roomId]"
    })
  );

  const guard = readText("frontend/components/interview/interview-room-guard.tsx");
  checks.push(
    makeCheck({
      id: "interview.auth-guard",
      category: "security",
      name: "Interview auth guard",
      status: guard.includes("InterviewRoomGuard") && guard.includes("ALLOWED_ROLES") ? "PASS" : "FAIL",
      message: "Interview room restricted to intern/company roles"
    })
  );

  const shell = readText("frontend/components/interview/interview-room-shell.tsx");
  checks.push(
    makeCheck({
      id: "interview.webrtc-chat",
      category: "functionality",
      name: "Interview WebRTC + chat",
      status:
        shell.includes("useInterviewMesh") && shell.includes("useInterviewSocket") && shell.includes("result.message")
          ? "PASS"
          : "FAIL",
      message: "Interview shell wires WebRTC, socket chat, and ACK message append"
    })
  );

  const routes = readBackendSource(
    "backend/src/modules/interviews/routes/interview.routes.js",
    "backend/src/routes/interview.routes.js"
  );
  checks.push(
    makeCheck({
      id: "interview.api-auth",
      category: "security",
      name: "Interview API auth",
      status: routes.includes("authMiddleware") && routes.includes("allowRoles") ? "PASS" : "FAIL",
      message: "Interview REST routes require authentication"
    })
  );

  const service = readBackendSource(
    "backend/src/modules/interviews/services/interview-room.service.js",
    "backend/src/services/interview-room.service.js"
  );
  checks.push(
    makeCheck({
      id: "interview.access-control",
      category: "security",
      name: "Interview access control",
      status:
        service.includes("assertRoomParticipant") &&
        service.includes("isWithinAccessWindow") &&
        service.includes("assertRoundJoinable")
          ? "PASS"
          : "FAIL",
      message: "Interview rooms enforce participant, schedule windows, and round status"
    })
  );

  const socket = readBackendSource(
    "backend/src/shared/socket/interview.socket.js",
    "backend/src/socket/interview.socket.js"
  );
  checks.push(
    makeCheck({
      id: "interview.signaling",
      category: "functionality",
      name: "Interview signaling socket",
      status: socket.includes("interview:signal") && socket.includes("verifySocketRoomAccess") ? "PASS" : "FAIL",
      message: "WebRTC signaling relay with access verification"
    })
  );

  const authRoutes = readText("frontend/lib/auth-routes.ts");
  checks.push(
    makeCheck({
      id: "interview.auth-routes",
      category: "functionality",
      name: "Post-login interview redirect",
      status: authRoutes.includes("isInterviewPath") ? "PASS" : "FAIL",
      message: "Auth routes allow /interview/* redirect after login"
    })
  );

  return checks;
}
