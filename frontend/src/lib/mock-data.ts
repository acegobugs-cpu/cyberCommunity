import type { UUID } from "@/lib/types";

export interface MockUser {
  id: UUID;
  username: string;
  email: string;
  password: string;
  bio?: string;
  avatarColor: string;
  rank: number;
  points: number;
  createdAt: string;
  globalRoles: ("USER" | "ADMIN")[];
  memberships: { tenantId: string; tenantRole: "MEMBER" | "ADMIN" | "OWNER" }[];
  skills: string[];
  status: "online" | "offline" | "away";
  country: string;
  joinedAt: string;
}

export interface MockTenant {
  id: string;
  name: string;
  university: string;
  description: string;
  ownerId: UUID;
  memberCount: number;
  createdAt: string;
  banner: string;
  tags: string[];
  isPublic: boolean;
}

export interface MockAnnouncement {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  authorId: UUID;
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

export interface MockSetting {
  tenantId: string;
  allowSelfSignup: boolean;
  allowInvites: boolean;
  theme: "hacker" | "neon" | "dark";
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

const users: MockUser[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    username: "root_operator",
    email: "root@cyberclubportal.com",
    password: "root1234",
    bio: "Building the next generation of cyber talent. CTF organizer, ex-red teamer, currently breaking things on purpose.",
    avatarColor: pickColor(0),
    rank: 1,
    points: 12450,
    createdAt: "2024-01-15T10:30:00Z",
    globalRoles: ["USER", "ADMIN"],
    memberships: [
      { tenantId: "cyberclub", tenantRole: "OWNER" },
      { tenantId: "nullsec", tenantRole: "MEMBER" },
    ],
    skills: ["reverse-engineering", "binary-exploitation", "cryptography", "pwn"],
    status: "online",
    country: "US",
    joinedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    username: "n3ur0mancer",
    email: "neuromancer@cyberclubportal.com",
    password: "pass1234",
    bio: "The sky above the port was the color of television, tuned to a dead channel.",
    avatarColor: pickColor(1),
    rank: 2,
    points: 10820,
    createdAt: "2024-02-03T08:00:00Z",
    globalRoles: ["USER"],
    memberships: [
      { tenantId: "cyberclub", tenantRole: "ADMIN" },
      { tenantId: "ghostshell", tenantRole: "MEMBER" },
    ],
    skills: ["web-exploitation", "osint", "forensics"],
    status: "online",
    country: "DE",
    joinedAt: "2024-02-03T08:00:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    username: "kernel_panic",
    email: "panic@cyberclubportal.com",
    password: "pass1234",
    bio: "If it runs, I can root it. Kernel exploits and privilege escalation.",
    avatarColor: pickColor(2),
    rank: 3,
    points: 9450,
    createdAt: "2024-02-14T14:22:00Z",
    globalRoles: ["USER"],
    memberships: [
      { tenantId: "cyberclub", tenantRole: "MEMBER" },
    ],
    skills: ["kernel-exploitation", "pwn", "linux"],
    status: "away",
    country: "JP",
    joinedAt: "2024-02-14T14:22:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    username: "ph4nt0m",
    email: "phantom@cyberclubportal.com",
    password: "pass1234",
    bio: "Network exploitation, packet crafting, and the occasional BGP hijack.",
    avatarColor: pickColor(3),
    rank: 4,
    points: 8120,
    createdAt: "2024-03-01T09:00:00Z",
    globalRoles: ["USER"],
    memberships: [
      { tenantId: "cyberclub", tenantRole: "MEMBER" },
    ],
    skills: ["network-exploitation", "scapy", "wireless"],
    status: "offline",
    country: "FR",
    joinedAt: "2024-03-01T09:00:00Z",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    username: "gh0st_in_the_shell",
    email: "ghost@cyberclubportal.com",
    password: "pass1234",
    bio: "Reverse engineering, malware analysis, and living in IDA Pro.",
    avatarColor: pickColor(4),
    rank: 5,
    points: 7340,
    createdAt: "2024-03-12T16:45:00Z",
    globalRoles: ["USER"],
    memberships: [
      { tenantId: "cyberclub", tenantRole: "MEMBER" },
    ],
    skills: ["reverse-engineering", "malware-analysis", "ghidra"],
    status: "online",
    country: "UK",
    joinedAt: "2024-03-12T16:45:00Z",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    username: "r00tk1t",
    email: "rootkit@cyberclubportal.com",
    password: "pass1234",
    bio: "Privilege escalation and persistence. Living off the land.",
    avatarColor: pickColor(5),
    rank: 6,
    points: 6580,
    createdAt: "2024-04-02T11:15:00Z",
    globalRoles: ["USER"],
    memberships: [
      { tenantId: "nullsec", tenantRole: "OWNER" },
    ],
    skills: ["privilege-escalation", "ad-attacks", "windows"],
    status: "online",
    country: "CA",
    joinedAt: "2024-04-02T11:15:00Z",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    username: "sh4d0w_dancer",
    email: "shadow@cyberclubportal.com",
    password: "pass1234",
    bio: "Web exploitation and bug bounty. OWASP top 10 is my bread and butter.",
    avatarColor: pickColor(6),
    rank: 7,
    points: 5210,
    createdAt: "2024-04-20T20:00:00Z",
    globalRoles: ["USER"],
    memberships: [
      { tenantId: "cyberclub", tenantRole: "MEMBER" },
    ],
    skills: ["web-exploitation", "xss", "ssrf", "sqli"],
    status: "away",
    country: "BR",
    joinedAt: "2024-04-20T20:00:00Z",
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    username: "cr4sh_ov3rride",
    email: "crash@cyberclubportal.com",
    password: "pass1234",
    bio: "Binary exploitation and shellcode. ROP chains all day.",
    avatarColor: pickColor(7),
    rank: 8,
    points: 4830,
    createdAt: "2024-05-08T13:30:00Z",
    globalRoles: ["USER"],
    memberships: [
      { tenantId: "ghostshell", tenantRole: "ADMIN" },
    ],
    skills: ["pwn", "rop", "shellcode"],
    status: "offline",
    country: "IN",
    joinedAt: "2024-05-08T13:30:00Z",
  },
];

const tenants: MockTenant[] = [
  {
    id: "cyberclub",
    name: "Cyber Club",
    university: "Stanford University",
    description:
      "The flagship cybersecurity community at Stanford. Weekly CTFs, industry talks, and a tight-knit crew of operators.",
    ownerId: "11111111-1111-1111-1111-111111111111",
    memberCount: 1248,
    createdAt: "2023-09-01T00:00:00Z",
    banner: "cyberclub",
    tags: ["ctf", "red-team", "binary-exploitation"],
    isPublic: true,
  },
  {
    id: "nullsec",
    name: "NullSec Society",
    university: "MIT",
    description:
      "MIT's premier offensive security research group. Pwn, reverse engineering, and the eternal hunt for 0-days.",
    ownerId: "66666666-6666-6666-6666-666666666666",
    memberCount: 892,
    createdAt: "2023-10-12T00:00:00Z",
    banner: "nullsec",
    tags: ["pwn", "reverse-engineering", "kernel"],
    isPublic: true,
  },
  {
    id: "ghostshell",
    name: "GhostShell",
    university: "Carnegie Mellon",
    description:
      "CMU's hacking collective. From web exploitation to hardware hacking, if it has a shell, we want in.",
    ownerId: "22222222-2222-2222-2222-222222222222",
    memberCount: 634,
    createdAt: "2024-01-20T00:00:00Z",
    banner: "ghostshell",
    tags: ["web", "hardware", "forensics"],
    isPublic: true,
  },
];

const announcements: MockAnnouncement[] = [
  {
    id: "a1",
    tenantId: "cyberclub",
    title: "Registration open: DEF CON Quals Prep Track",
    body: "We're running a 6-week prep program for DEF CON CTF Quals. Spots are limited — first come, first served.",
    authorId: "11111111-1111-1111-1111-111111111111",
    pinned: true,
    createdAt: "2026-08-20T09:00:00Z",
    type: "event",
  },
  {
    id: "a2",
    tenantId: "cyberclub",
    title: "Weekly CTF: Web Exploitation Sprint",
    body: "Friday 18:00 UTC. Five web challenges, junior-friendly, prizes for top 3.",
    authorId: "22222222-2222-2222-2222-222222222222",
    pinned: false,
    createdAt: "2026-08-28T12:00:00Z",
    type: "ctf",
  },
  {
    id: "a3",
    tenantId: "cyberclub",
    title: "New course: Practical Binary Exploitation",
    body: "12-week deep dive into modern mitigations and bypasses. Pre-reqs: C, some assembly, and a strong stomach for segfaults.",
    authorId: "11111111-1111-1111-1111-111111111111",
    pinned: false,
    createdAt: "2026-09-01T15:30:00Z",
    type: "info",
  },
  {
    id: "a4",
    tenantId: "cyberclub",
    title: "Scheduled maintenance: Sep 12, 02:00 UTC",
    body: "Expect ~30 minutes of downtime while we deploy infrastructure updates.",
    authorId: "11111111-1111-1111-1111-111111111111",
    pinned: false,
    createdAt: "2026-09-03T08:00:00Z",
    type: "alert",
  },
];

const events: MockEvent[] = [
  {
    id: "e1",
    tenantId: "cyberclub",
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
    tenantId: "cyberclub",
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
    tenantId: "cyberclub",
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
  tenantId: "cyberclub",
  allowSelfSignup: true,
  allowInvites: true,
  theme: "hacker",
  requireUniversityEmail: true,
  primaryColor: "#9fef00",
  emailNotifications: true,
  discordWebhook: "https://discord.com/api/webhooks/****/****",
};

export const mockDb = {
  users,
  tenants,
  announcements,
  events,
  settings,
  currentUserId: null as UUID | null,
};

export function findUserByEmail(email: string) {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserByUsername(username: string) {
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function findUserById(id: UUID) {
  return users.find((u) => u.id === id);
}

export function findTenant(id: string) {
  return tenants.find((t) => t.id === id);
}
