export interface MockAnnouncement {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  authorId: string;
  pinned: boolean;
  createdAt: string;
  type: "info" | "alert" | "event" | "ctf";
}

export interface MockEvent {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  type: "ctf" | "workshop" | "meetup" | "hackathon";
  location: "virtual" | string;
  attendeeCount: number;
  rsvpCount: number;
}

export interface MockMemberProfile {
  id: string;
  username: string;
  email: string;
  bio: string;
  avatarColor: string;
  rank: number;
  points: number;
  skills: string[];
  status: "online" | "offline" | "away";
  country: string;
  joinedAt: string;
  serviceRoles: { service_name: string; role: string }[];
}

export interface MockSetting {
  tenantId: string;
  allowSelfSignup: boolean;
  allowInvites: boolean;
  requireUniversityEmail: boolean;
  primaryColor: string;
  emailNotifications: boolean;
  discordWebhook?: string;
}

const COLORS = [
  "#9fef00", "#00d4ff", "#a855f7", "#ff2e63",
  "#ffaa00", "#ff4d4f", "#3b82f6", "#10b981",
];
const pickColor = (i: number) => COLORS[i % COLORS.length];

const memberProfiles: MockMemberProfile[] = [
  {
    id: "u1",
    username: "root_operator",
    email: "root@cyberclubportal.com",
    bio: "Building the next generation of cyber talent. CTF organizer, ex-red teamer, currently breaking things on purpose.",
    avatarColor: pickColor(0),
    rank: 1,
    points: 12450,
    skills: ["reverse-engineering", "binary-exploitation", "cryptography", "pwn"],
    status: "online",
    country: "US",
    joinedAt: "2024-01-15T10:30:00Z",
    serviceRoles: [
      { service_name: "portal", role: "OWNER" },
      { service_name: "community", role: "ADMIN" },
    ],
  },
  {
    id: "u2",
    username: "n3ur0mancer",
    email: "neuromancer@cyberclubportal.com",
    bio: "The sky above the port was the color of television, tuned to a dead channel.",
    avatarColor: pickColor(1),
    rank: 2,
    points: 10820,
    skills: ["web-exploitation", "osint", "forensics"],
    status: "online",
    country: "DE",
    joinedAt: "2024-02-03T08:00:00Z",
    serviceRoles: [
      { service_name: "portal", role: "ADMIN" },
      { service_name: "learn", role: "MEMBER" },
    ],
  },
  {
    id: "u3",
    username: "kernel_panic",
    email: "panic@cyberclubportal.com",
    bio: "If it runs, I can root it. Kernel exploits and privilege escalation.",
    avatarColor: pickColor(2),
    rank: 3,
    points: 9450,
    skills: ["kernel-exploitation", "pwn", "linux"],
    status: "away",
    country: "JP",
    joinedAt: "2024-02-14T14:22:00Z",
    serviceRoles: [{ service_name: "portal", role: "MEMBER" }],
  },
  {
    id: "u4",
    username: "ph4nt0m",
    email: "phantom@cyberclubportal.com",
    bio: "Network exploitation, packet crafting, and the occasional BGP hijack.",
    avatarColor: pickColor(3),
    rank: 4,
    points: 8120,
    skills: ["network-exploitation", "scapy", "wireless"],
    status: "offline",
    country: "FR",
    joinedAt: "2024-03-01T09:00:00Z",
    serviceRoles: [{ service_name: "community", role: "MEMBER" }],
  },
  {
    id: "u5",
    username: "gh0st_in_the_shell",
    email: "ghost@cyberclubportal.com",
    bio: "Reverse engineering, malware analysis, and living in IDA Pro.",
    avatarColor: pickColor(4),
    rank: 5,
    points: 7340,
    skills: ["reverse-engineering", "malware-analysis", "ghidra"],
    status: "online",
    country: "UK",
    joinedAt: "2024-03-12T16:45:00Z",
    serviceRoles: [{ service_name: "challenge", role: "MEMBER" }],
  },
  {
    id: "u6",
    username: "r00tk1t",
    email: "rootkit@cyberclubportal.com",
    bio: "Privilege escalation and persistence. Living off the land.",
    avatarColor: pickColor(5),
    rank: 6,
    points: 6580,
    skills: ["privilege-escalation", "ad-attacks", "windows"],
    status: "online",
    country: "CA",
    joinedAt: "2024-04-02T11:15:00Z",
    serviceRoles: [{ service_name: "challenge", role: "ADMIN" }],
  },
  {
    id: "u7",
    username: "sh4d0w_dancer",
    email: "shadow@cyberclubportal.com",
    bio: "Web exploitation and bug bounty. OWASP top 10 is my bread and butter.",
    avatarColor: pickColor(6),
    rank: 7,
    points: 5210,
    skills: ["web-exploitation", "xss", "ssrf", "sqli"],
    status: "away",
    country: "BR",
    joinedAt: "2024-04-20T20:00:00Z",
    serviceRoles: [{ service_name: "learn", role: "MEMBER" }],
  },
  {
    id: "u8",
    username: "cr4sh_ov3rride",
    email: "crash@cyberclubportal.com",
    bio: "Binary exploitation and shellcode. ROP chains all day.",
    avatarColor: pickColor(7),
    rank: 8,
    points: 4830,
    skills: ["pwn", "rop", "shellcode"],
    status: "offline",
    country: "IN",
    joinedAt: "2024-05-08T13:30:00Z",
    serviceRoles: [{ service_name: "challenge", role: "MEMBER" }],
  },
];

const announcements: MockAnnouncement[] = [
  {
    id: "a1",
    tenantId: "portal",
    title: "Registration open: DEF CON Quals Prep Track",
    body: "We're running a 6-week prep program for DEF CON CTF Quals. Spots are limited — first come, first served.",
    authorId: "u1",
    pinned: true,
    createdAt: "2026-08-20T09:00:00Z",
    type: "event",
  },
  {
    id: "a2",
    tenantId: "portal",
    title: "Weekly CTF: Web Exploitation Sprint",
    body: "Friday 18:00 UTC. Five web challenges, junior-friendly, prizes for top 3.",
    authorId: "u2",
    pinned: false,
    createdAt: "2026-08-28T12:00:00Z",
    type: "ctf",
  },
  {
    id: "a3",
    tenantId: "portal",
    title: "New course: Practical Binary Exploitation",
    body: "12-week deep dive into modern mitigations and bypasses. Pre-reqs: C, some assembly, and a strong stomach for segfaults.",
    authorId: "u1",
    pinned: false,
    createdAt: "2026-09-01T15:30:00Z",
    type: "info",
  },
  {
    id: "a4",
    tenantId: "portal",
    title: "Scheduled maintenance: Sep 12, 02:00 UTC",
    body: "Expect ~30 minutes of downtime while we deploy infrastructure updates.",
    authorId: "u1",
    pinned: false,
    createdAt: "2026-09-03T08:00:00Z",
    type: "alert",
  },
];

const events: MockEvent[] = [
  {
    id: "e1",
    tenantId: "portal",
    title: "H@ck Week 2026",
    description:
      "Five days of talks, workshops, and a 48-hour hackathon. Industry speakers from CrowdStrike, Trail of Bits, and Google Project Zero.",
    startsAt: "2026-10-14T15:00:00Z",
    endsAt: "2026-10-19T22:00:00Z",
    type: "hackathon",
    location: "virtual",
    attendeeCount: 412,
    rsvpCount: 1847,
  },
  {
    id: "e2",
    tenantId: "portal",
    title: "Web Exploitation Workshop",
    description: "Hands-on workshop on modern web exploitation. Bring a laptop and a Vagrant box.",
    startsAt: "2026-09-12T17:00:00Z",
    endsAt: "2026-09-12T20:00:00Z",
    type: "workshop",
    location: "virtual",
    attendeeCount: 89,
    rsvpCount: 142,
  },
  {
    id: "e3",
    tenantId: "portal",
    title: "PicoCTF 2026 Mirror",
    description: "We're hosting an unofficial mirror of PicoCTF for the fall semester. Teams of up to 4.",
    startsAt: "2026-09-20T00:00:00Z",
    endsAt: "2026-10-04T23:59:00Z",
    type: "ctf",
    location: "virtual",
    attendeeCount: 56,
    rsvpCount: 234,
  },
];

const settings: MockSetting = {
  tenantId: "portal",
  allowSelfSignup: true,
  allowInvites: true,
  requireUniversityEmail: true,
  primaryColor: "#9fef00",
  emailNotifications: true,
  discordWebhook: "https://discord.com/api/webhooks/****/****",
};

export const mockDb = {
  memberProfiles,
  announcements,
  events,
  settings,
};

export function findMemberByEmail(email: string) {
  return memberProfiles.find(
    (m) => m.email.toLowerCase() === email.toLowerCase(),
  );
}

export function findMemberByUsername(username: string) {
  return memberProfiles.find(
    (m) => m.username.toLowerCase() === username.toLowerCase(),
  );
}

export function findMemberById(id: string) {
  return memberProfiles.find((m) => m.id === id);
}
