const express = require("express");
const router = express.Router();

const crypto = require("crypto");

const User = require("../models/user");
const StudyProfile = require("../models/StudyProfile");
const MatchRequest = require("../models/MatchReq");
const Chat = require("../models/chat");
const sendEmail = require("../utils/sendEmail");
const { requireAuth, requirePageAuth } = require("../middleware/authMiddleware");

const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${process.env.PORT || 8080}`);

const matchingRequestLocks = new Set();

const subjectAliases = {
  algo: "Algorithms",
  algorithm: "Algorithms",
  algorithms: "Algorithms",

  ds: "Data Structures",
  datastructure: "Data Structures",
  datastructures: "Data Structures",
  "data structure": "Data Structures",
  "data structures": "Data Structures",

  os: "Operating Systems",
  "operating system": "Operating Systems",
  "operating systems": "Operating Systems",

  db: "Database",
  database: "Database",
  databases: "Database",

  oop: "Object Oriented Programming",
  "object oriented programming": "Object Oriented Programming",
  "object-oriented programming": "Object Oriented Programming",

  math: "Math",
  maths: "Math",
  mathematics: "Math",

  ai: "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",

  ml: "Machine Learning",
  "machine learning": "Machine Learning",

  web: "Web Development",
  "web development": "Web Development",

  se: "Software Engineering",
  "software engineering": "Software Engineering"
};

const normalizeSubject = (subject) => {
  const cleaned = String(subject || "")
    .trim()
    .replace(/\s+/g, " ");

  const key = cleaned.toLowerCase();

  if (subjectAliases[key]) {
    return subjectAliases[key];
  }

  return cleaned
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const cleanSubjects = (subjects) => {
  if (!Array.isArray(subjects)) {
    return [];
  }

  return [...new Set(
    subjects
      .map(normalizeSubject)
      .filter(subject => subject && subject !== "None")
  )];
};


router.get("/api/matching/profile", requireAuth, async (req, res) => {
  try {
    const profile = await StudyProfile.findOne({
      user: req.session.user.id
    });

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error("Get matching profile error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load your study profile."
    });
  }
});

router.post("/api/matching/profile/clear", requireAuth, async (req, res) => {
  try {
    const profile = await StudyProfile.findOneAndUpdate(
      {
        user: req.session.user.id
      },
      {
        weakSubjects: [],
        strongSubjects: []
      },
      {
        new: true
      }
    );

    return res.json({
      success: true,
      message: "Study list cleared.",
      profile: profile || null
    });

  } catch (error) {
    console.error("Clear study profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not clear your study list."
    });
  }
});

const sendMatchRequestEmail = async ({
  to,
  receiverName,
  senderName,
  senderWeakSubject,
  senderStrongSubject,
  acceptLink,
  rejectLink
}) => {
  const helpNeededText = senderWeakSubject && String(senderWeakSubject).trim()
    ? senderWeakSubject
    : "No help requested";

  const canHelpText = senderStrongSubject && String(senderStrongSubject).trim()
    ? senderStrongSubject
    : "No help offered";

  await sendEmail({
    to,
    subject: "New Study Buddy Match Request",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>New Study Buddy Match Request</h2>

        <p>Hello ${receiverName},</p>
        <p><strong>${senderName}</strong> wants to study with you.</p>

        <p><strong>They need help with:</strong> ${helpNeededText}</p>
        <p><strong>They can help with:</strong> ${canHelpText}</p>

        <p>
          <a href="${acceptLink}" target="_blank" style="display:inline-block; padding:12px 18px; background:#16a34a; color:white; text-decoration:none; border-radius:8px;">
            Accept Request
          </a>
        </p>

        <p>
          <a href="${rejectLink}" target="_blank" style="display:inline-block; padding:12px 18px; background:#dc2626; color:white; text-decoration:none; border-radius:8px;">
            Reject Request
          </a>
        </p>

        <br>
        <p><strong>Study Buddy Team</strong></p>
      </div>
    `,
    text: `${senderName} sent you a Study Buddy match request. They need help with: ${helpNeededText}. They can help with: ${canHelpText}. Accept: ${acceptLink} Reject: ${rejectLink}`
  });
};
const createJitsiRoom = () => {
  const randomCode = Math.floor(100000 + Math.random() * 900000);
  const roomId = `studybuddy-${Date.now()}-${randomCode}`;

  const jitsiConfig =
    "#config.startWithVideoMuted=true" +
    "&config.startWithAudioMuted=true" +
    "&config.toolbarButtons=%5B%22microphone%22%2C%22chat%22%2C%22participants-pane%22%2C%22tileview%22%2C%22hangup%22%5D";

  return {
    roomId,
    meetingLink: `https://meet.jit.si/${roomId}${jitsiConfig}`
  };
};

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Africa/Cairo";

function getTimeZoneOffsetMs(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);

  const values = {};

  parts.forEach(part => {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  });

  const asUTC = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUTC - date.getTime();
}

function parseScheduleDateTime(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return new Date("invalid");
  }

  // If the frontend ever sends a real ISO date with Z or +02:00, use it directly.
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(rawValue)) {
    return new Date(rawValue);
  }

  // datetime-local comes like: 2026-06-08T13:32
  const match = rawValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return new Date(rawValue);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, APP_TIME_ZONE);

  return new Date(utcGuess.getTime() - offsetMs);
}


const formatMatchSchedule = (scheduledAt) => {
  if (!scheduledAt) return "Not scheduled.";

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date.";
  }

  return date.toLocaleString("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const sendScheduleConfirmationEmail = async (matchRequest) => {
  const freshRequest = await MatchRequest.findById(matchRequest._id);

  if (!freshRequest) {
    throw new Error("Match request was not found.");
  }

  const senderUser = await User.findById(freshRequest.sender).lean();
  const receiverUser = await User.findById(freshRequest.receiver).lean();

  const senderEmail = freshRequest.senderEmail || senderUser?.email || "";
  const receiverEmail = freshRequest.receiverEmail || receiverUser?.email || "";

  const senderName =
    freshRequest.senderName ||
    senderUser?.fullName ||
    senderUser?.username ||
    "Student";

  const receiverName =
    freshRequest.receiverName ||
    receiverUser?.fullName ||
    receiverUser?.username ||
    "Student";

  const emailList = [...new Set(
    [senderEmail, receiverEmail]
      .map(email => String(email || "").trim().toLowerCase())
      .filter(Boolean)
  )];

  if (emailList.length < 2) {
    throw new Error("Both student emails were not found.");
  }

  const subjectText =
    freshRequest.senderWeakSubject ||
    freshRequest.senderStrongSubject ||
    freshRequest.receiverWeakSubject ||
    freshRequest.receiverStrongSubject ||
    "Study session";

  const scheduledText = formatMatchSchedule(freshRequest.scheduledAt);

  await sendEmail({
    to: emailList,
    subject: "Study Buddy Meeting Scheduled",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>Study Buddy Meeting Scheduled</h2>

        <p>
          A study meeting between
          <strong>${senderName}</strong> and <strong>${receiverName}</strong>
          has been scheduled.
        </p>

        <p><strong>Subject:</strong> ${subjectText}</p>
        <p><strong>Scheduled Time:</strong> ${scheduledText}</p>

        <p>The video room link will be sent when it is time for the meeting.</p>

        <br>
        <p><strong>Study Buddy Team</strong></p>
      </div>
    `,
    text: `Study Buddy meeting scheduled. Subject: ${subjectText}. Time: ${scheduledText}. The video room link will be sent when it is time.`
  });
};


const sendChatMatchEmail = async (matchRequest) => {
  const freshRequest = await MatchRequest.findById(matchRequest._id);

  if (!freshRequest) {
    throw new Error("Match request was not found.");
  }

  if (freshRequest.emailSentAt && freshRequest.meetingLink) {
    return {
      alreadySent: true,
      meetingLink: freshRequest.meetingLink
    };
  }

  const senderUser = await User.findById(freshRequest.sender).lean();
  const receiverUser = await User.findById(freshRequest.receiver).lean();

  const senderEmail =
    freshRequest.senderEmail ||
    senderUser?.email ||
    "";

  const receiverEmail =
    freshRequest.receiverEmail ||
    receiverUser?.email ||
    "";

  const senderName =
    freshRequest.senderName ||
    senderUser?.fullName ||
    senderUser?.username ||
    "Student";

  const receiverName =
    freshRequest.receiverName ||
    receiverUser?.fullName ||
    receiverUser?.username ||
    "Student";

  const emailList = [...new Set(
    [senderEmail, receiverEmail]
      .map(email => String(email || "").trim().toLowerCase())
      .filter(Boolean)
  )];

  if (emailList.length < 2) {
    throw new Error("Both student emails were not found.");
  }

  const room = createJitsiRoom();

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 650px; margin: auto; padding: 20px;">
      <div style="background: #f7f9fc; padding: 24px; border-radius: 14px; border: 1px solid #e5e7eb;">
        <h2 style="margin-top: 0; color: #1f2937;">Your Study Buddy Room is Ready</h2>

        <p>
          A study match has been created between
          <strong>${senderName}</strong> and <strong>${receiverName}</strong>.
        </p>

        <div style="margin: 18px 0; padding: 16px; border-radius: 12px; background: #eef2ff; border: 1px solid #c7d2fe;">
          <p style="margin: 0; color: #1e1b4b;">
            <strong>Subject:</strong><br>
            ${freshRequest.senderWeakSubject || freshRequest.receiverWeakSubject || "Study session"}
          </p>
        </div>

        <p>
          <strong>Meeting Time:</strong><br>
          ${formatMatchSchedule(freshRequest.scheduledAt)}
        </p>

        <p>
          <strong>Room ID:</strong><br>
          ${room.roomId}
        </p>

        <p>
          <strong>Video Room Link:</strong><br>
          <a href="${room.meetingLink}" target="_blank" style="color: #2563eb; word-break: break-all;">
            ${room.meetingLink}
          </a>
        </p>

        <p>Click the link above to join the meeting.</p>
      </div>

      <div style="margin-top: 22px; background: #fff1f2; padding: 24px; border-radius: 14px; border: 1px solid #fecdd3;">
        <h2 style="margin-top: 0; color: #991b1b;">Study Room Rules</h2>

        <p>1. We only connect people for studying purposes.</p>
        <p>2. Respect your colleagues in the meet.</p>
        <p>3. If you joined the call and no one entered after 5 minutes, you have the right to leave the meet.</p>
        <p>4. You must be logged in to the website for the meet to start.</p>
        <p>5. You must enter using a laptop.</p>
      </div>

      <p style="margin-top: 22px;">
        Best regards,<br>
        <strong>Study Buddy Team</strong>
      </p>
    </div>
  `;

  await sendEmail({
    to: emailList,
    subject: "Your Study Buddy Room is Ready",
    html: emailHtml,
    text: `Your Study Buddy room is ready. Link: ${room.meetingLink}`
  });

  freshRequest.roomId = room.roomId;
  freshRequest.meetingLink = room.meetingLink;
  freshRequest.emailSentAt = new Date();
  freshRequest.status = "matched";

  await freshRequest.save();

  return {
    alreadySent: false,
    meetingLink: freshRequest.meetingLink
  };
};

  
const checkScheduledChatMatches = async () => {
  try {
    const now = new Date();

    const dueRequests = await MatchRequest.find({
      status: "rescheduled",
      scheduledAt: { $lte: now },
      emailSentAt: null
    }).limit(20);

    if (dueRequests.length > 0) {
      console.log(`Scheduled checker found ${dueRequests.length} due match request(s) at ${now.toISOString()}`);
    }

    for (const request of dueRequests) {
      try {
        await sendChatMatchEmail(request);
        console.log(`Scheduled chat match email sent for request ${request._id}`);
      } catch (emailError) {
        console.error(`Scheduled chat match email failed for request ${request._id}:`, emailError);
      }
    }
  } catch (error) {
    console.error("Scheduled chat match checker error:", error);
  }
};

setInterval(checkScheduledChatMatches, 60 * 1000);

setTimeout(() => {
  checkScheduledChatMatches();
}, 5000);

const CS_SUBJECTS = [
  "None",
  "Programming",
  "Object Oriented Programming",
  "Data Structures",
  "Algorithms",
  "Database",
  "Operating Systems",
  "Computer Networks",
  "Software Engineering",
  "Web Development",
  "Artificial Intelligence",
  "Machine Learning",
  "Cybersecurity",
  "Computer Architecture",
  "Discrete Mathematics",
  "Calculus",
  "Linear Algebra",
  "Physics",
  "Math"
];

function isValidCSSubject(subject) {
  return CS_SUBJECTS.includes(String(subject || "").trim());
}

router.post("/api/matching/request/:requestId/accept", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const matchRequest = await MatchRequest.findOne({
      _id: requestId,
      receiver: req.session.user.id
    });

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    if (matchRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This request is already ${matchRequest.status}.`
      });
    }

    const chat = await Chat.create({
      participants: [matchRequest.sender, matchRequest.receiver],
      matchRequest: matchRequest._id,
      messages: []
    });

    matchRequest.status = "accepted";
    matchRequest.chat = chat._id;
    await matchRequest.save();

    res.json({
      success: true,
      message: "Match request accepted. Chat opened.",
      chatId: chat._id
    });

  } catch (error) {
    console.error("Accept match request API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not accept match request."
    });
  }
});

router.post("/api/matching/request/:requestId/reject", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const matchRequest = await MatchRequest.findOne({
      _id: requestId,
      receiver: req.session.user.id
    });

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    if (matchRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This request is already ${matchRequest.status}.`
      });
    }

    matchRequest.status = "rejected";
    await matchRequest.save();

    res.json({
      success: true,
      message: "Match request rejected."
    });

  } catch (error) {
    console.error("Reject match request API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not reject match request."
    });
  }
});

router.get("/api/matching/subjects", (req, res) => {
  res.json({
    success: true,
    subjects: CS_SUBJECTS
  });
});

router.post("/api/matching/search", requireAuth, async (req, res) => {
  try {
    const rawWeakSubjects = Array.isArray(req.body.weakSubjects)
      ? req.body.weakSubjects
      : [];

    const rawStrongSubjects = Array.isArray(req.body.strongSubjects)
      ? req.body.strongSubjects
      : [];

    const weakSubjects = cleanSubjects(rawWeakSubjects);
    const strongSubjects = cleanSubjects(rawStrongSubjects);

    if (weakSubjects.length === 0 && strongSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one weak subject or one strong subject."
      });
    }

    const invalidSubject = [...weakSubjects, ...strongSubjects].find(subject => {
      return !isValidCSSubject(subject);
    });

    if (invalidSubject) {
      return res.status(400).json({
        success: false,
        message: "Please choose valid subjects only."
      });
    }

    const duplicatedSubject = weakSubjects.find(subject => {
      return strongSubjects.includes(subject);
    });

    if (duplicatedSubject) {
      return res.status(400).json({
        success: false,
        message: "The same subject cannot be both weak and strong."
      });
    }

    const currentUser = await User.findById(req.session.user.id).lean();

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User was not found."
      });
    }

    await StudyProfile.findOneAndUpdate(
      { user: currentUser._id },
      {
        user: currentUser._id,
        fullName: currentUser.fullName,
        username: currentUser.username,
        email: currentUser.email,
        university: currentUser.university || "",
        major: currentUser.major || "",
        weakSubjects,
        strongSubjects
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    const matchConditions = [];

    if (weakSubjects.length > 0) {
      matchConditions.push({
        strongSubjects: { $in: weakSubjects }
      });
    }

    if (strongSubjects.length > 0) {
      matchConditions.push({
        weakSubjects: { $in: strongSubjects }
      });
    }

    const profiles = await StudyProfile.find({
      user: { $ne: currentUser._id },
      university: currentUser.university,
      major: currentUser.major,
      $or: matchConditions
    }).lean();

    const matches = profiles
      .map(profile => {
        const otherWeakSubjects = Array.isArray(profile.weakSubjects)
          ? profile.weakSubjects.filter(subject => subject && subject !== "None")
          : [];

        const otherStrongSubjects = Array.isArray(profile.strongSubjects)
          ? profile.strongSubjects.filter(subject => subject && subject !== "None")
          : [];

        const canHelpMe = weakSubjects.filter(subject =>
          otherStrongSubjects.includes(subject)
        );

        const iCanHelpThem = strongSubjects.filter(subject =>
          otherWeakSubjects.includes(subject)
        );

        const isPerfectMatch = canHelpMe.length > 0 && iCanHelpThem.length > 0;

        return {
          profileId: profile._id,
          userId: profile.user,
          fullName: profile.fullName,
          username: profile.username,
          email: profile.email,
          university: profile.university,
          major: profile.major,
          weakSubjects: otherWeakSubjects,
          strongSubjects: otherStrongSubjects,
          canHelpMe,
          iCanHelpThem,
          matchType: isPerfectMatch
            ? "Perfect Match"
            : canHelpMe.length > 0
              ? "Helper Match"
              : "You Can Help"
        };
      })
      .filter(match => {
        return match.canHelpMe.length > 0 || match.iCanHelpThem.length > 0;
      });

    res.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error("Matching search error:", error);

    res.status(500).json({
      success: false,
      message: "Could not search for matches."
    });
  }
});

router.post("/api/matching/request", requireAuth, async (req, res) => {
  let requestLockKey = "";
  let lockWasAdded = false;

  try {
    const {
      receiverProfileId,
      weakSubject,
      strongSubject
    } = req.body;

    const senderWeakSubject = normalizeSubject(weakSubject) === "None"
      ? ""
      : normalizeSubject(weakSubject);

    const senderStrongSubject = normalizeSubject(strongSubject) === "None"
      ? ""
      : normalizeSubject(strongSubject);

    if (!receiverProfileId) {
      return res.status(400).json({
        success: false,
        message: "Matched student was not selected."
      });
    }

    if (!senderWeakSubject && !senderStrongSubject) {
      return res.status(400).json({
        success: false,
        message: "Choose at least one subject for this request."
      });
    }

    if (senderWeakSubject && !isValidCSSubject(senderWeakSubject)) {
      return res.status(400).json({
        success: false,
        message: "Please choose a valid weak subject."
      });
    }

    if (senderStrongSubject && !isValidCSSubject(senderStrongSubject)) {
      return res.status(400).json({
        success: false,
        message: "Please choose a valid strong subject."
      });
    }

    if (
      senderWeakSubject &&
      senderStrongSubject &&
      senderWeakSubject === senderStrongSubject
    ) {
      return res.status(400).json({
        success: false,
        message: "Weak subject and strong subject cannot be the same."
      });
    }

    const sender = await User.findById(req.session.user.id).lean();

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender was not found."
      });
    }

    const receiverProfile = await StudyProfile.findById(receiverProfileId).lean();

    if (!receiverProfile) {
      return res.status(404).json({
        success: false,
        message: "Matched student was not found."
      });
    }

    if (String(receiverProfile.user) === String(sender._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a match request to yourself."
      });
    }

    if (
      receiverProfile.university !== sender.university ||
      receiverProfile.major !== sender.major
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only match with students from your same university and major."
      });
    }

    const receiverStrongSubjects = cleanSubjects(receiverProfile.strongSubjects || []);
    const receiverWeakSubjects = cleanSubjects(receiverProfile.weakSubjects || []);

    const receiverCanHelpSender = Boolean(
      senderWeakSubject && receiverStrongSubjects.includes(senderWeakSubject)
    );

    const senderCanHelpReceiver = Boolean(
      senderStrongSubject && receiverWeakSubjects.includes(senderStrongSubject)
    );

    if (!receiverCanHelpSender && !senderCanHelpReceiver) {
      return res.status(400).json({
        success: false,
        message: "This student is not a valid match for the selected subject."
      });
    }

    const senderId = String(sender._id);
    const receiverId = String(receiverProfile.user);

    requestLockKey = [senderId, receiverId].sort().join(":");

    if (matchingRequestLocks.has(requestLockKey)) {
      return res.status(429).json({
        success: false,
        message: "A match request is already being sent. Please wait."
      });
    }

    matchingRequestLocks.add(requestLockKey);
    lockWasAdded = true;

    const existingActiveRequest = await MatchRequest.findOne({
      $or: [
        {
          sender: sender._id,
          receiver: receiverProfile.user
        },
        {
          sender: receiverProfile.user,
          receiver: sender._id
        }
      ],
      status: {
        $in: ["pending", "accepted", "rescheduled"]
      }
    }).lean();

    if (existingActiveRequest) {
      let message = "There is already an active match request with this student.";

      if (existingActiveRequest.status === "pending") {
        const youSentIt = String(existingActiveRequest.sender) === String(sender._id);

        message = youSentIt
          ? "You already sent this student a pending request. Wait for them to accept or reject."
          : "This student already sent you a pending request. Check your requests section.";
      }

      if (["accepted", "rescheduled"].includes(existingActiveRequest.status)) {
        message = "You already have an active chat with this student.";
      }

      return res.status(400).json({
        success: false,
        message
      });
    }

    const emailToken = crypto.randomBytes(32).toString("hex");

    const matchRequest = await MatchRequest.create({
      sender: sender._id,
      receiver: receiverProfile.user,

      senderName: sender.fullName || sender.username,
      senderEmail: sender.email,

      receiverName: receiverProfile.fullName,
      receiverEmail: receiverProfile.email,

      senderWeakSubject,
      senderStrongSubject,

      receiverWeakSubject: senderCanHelpReceiver ? senderStrongSubject : "",
      receiverStrongSubject: receiverCanHelpSender ? senderWeakSubject : "",

      emailToken
    });

    const acceptLink = `${BASE_URL}/matching/request/${matchRequest._id}/accept?token=${emailToken}`;
    const rejectLink = `${BASE_URL}/matching/request/${matchRequest._id}/reject?token=${emailToken}`;

    await sendMatchRequestEmail({
      to: receiverProfile.email,
      receiverName: receiverProfile.fullName,
      senderName: sender.fullName || sender.username,
      senderWeakSubject,
      senderStrongSubject,
      acceptLink,
      rejectLink
    });

    return res.json({
      success: true,
      message: `Match request sent to ${receiverProfile.fullName}.`
    });

  } catch (error) {
    console.error("Send match request error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not send match request."
    });
  } finally {
    if (lockWasAdded && requestLockKey) {
      matchingRequestLocks.delete(requestLockKey);
    }
  }
});

router.get("/matching/request/:requestId/accept", async (req, res) => {
  try {
    const { requestId } = req.params;
    const token = String(req.query.token || "");

    const matchRequest = await MatchRequest.findById(requestId);

    if (!matchRequest || matchRequest.emailToken !== token) {
      return res.status(404).render("ERROR");
    }

    if (matchRequest.status !== "pending") {
      return res.send(`
        <div style="font-family: Arial; max-width: 520px; margin: 80px auto; text-align: center;">
          <h1>This request is already ${matchRequest.status}.</h1>
          <a href="/matching">Back to Matching</a>
        </div>
      `);
    }

    const chat = await Chat.create({
      participants: [matchRequest.sender, matchRequest.receiver],
      matchRequest: matchRequest._id,
      messages: []
    });

    matchRequest.status = "accepted";
    matchRequest.chat = chat._id;
    await matchRequest.save();

    res.redirect("/matching");

  } catch (error) {
    console.error("Accept match request error:", error);
    res.status(500).render("ERROR");
  }
});

router.get("/matching/request/:requestId/reject", async (req, res) => {
  try {
    const { requestId } = req.params;
    const token = String(req.query.token || "");

    const matchRequest = await MatchRequest.findById(requestId);

    if (!matchRequest || matchRequest.emailToken !== token) {
      return res.status(404).render("ERROR");
    }

    if (matchRequest.status !== "pending") {
      return res.redirect("/matching");
    }

    matchRequest.status = "rejected";
    await matchRequest.save();

    res.send(`
      <div style="font-family: Arial; max-width: 520px; margin: 80px auto; text-align: center;">
        <h1>Request rejected</h1>
        <p>You rejected this Study Buddy match request.</p>
        <a href="/matching">Back to Matching</a>
      </div>
    `);

  } catch (error) {
    console.error("Reject match request error:", error);
    res.status(500).render("ERROR");
  }
});


router.get("/api/matching/requests", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const requests = await MatchRequest.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedRequests = requests.map(request => {
      const isSender = String(request.sender) === String(userId);

      return {
        _id: request._id,
        status: request.status,
        chat: request.chat,

        direction: isSender ? "sent" : "received",

        otherName: isSender
          ? request.receiverName
          : request.senderName,

        otherEmail: isSender
          ? request.receiverEmail
          : request.senderEmail,

        senderName: request.senderName,
        receiverName: request.receiverName,

        senderWeakSubject: request.senderWeakSubject,
        senderStrongSubject: request.senderStrongSubject,

        createdAt: request.createdAt
      };
    });

    res.json({
      success: true,
      requests: formattedRequests
    });

  } catch (error) {
    console.error("Load match requests error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load match requests."
    });
  }
});

router.post("/api/matching/request/:requestId/cancel", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const matchRequest = await MatchRequest.findOne({
      _id: requestId,
      sender: req.session.user.id
    });

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    if (matchRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled."
      });
    }

    matchRequest.status = "cancelled";
    await matchRequest.save();

    res.json({
      success: true,
      message: "Match request cancelled."
    });

  } catch (error) {
    console.error("Cancel match request error:", error);

    res.status(500).json({
      success: false,
      message: "Could not cancel match request."
    });
  }
});

router.post("/api/matching/profile", requireAuth, async (req, res) => {
  try {
    const rawWeakSubjects = Array.isArray(req.body.weakSubjects)
      ? req.body.weakSubjects
      : [];

    const rawStrongSubjects = Array.isArray(req.body.strongSubjects)
      ? req.body.strongSubjects
      : [];

    const subjectRegex = /^[A-Za-z][A-Za-z\s&+\-#]*$/;

    const invalidSubject = [...rawWeakSubjects, ...rawStrongSubjects]
      .map(subject => String(subject).trim())
      .filter(Boolean)
      .find(subject => !subjectRegex.test(subject));

    if (invalidSubject) {
      return res.status(400).json({
        success: false,
        message: "Subjects must not contain numbers. Use letters only, like Math or Operating Systems."
      });
    }

    const weakSubjects = cleanSubjects(rawWeakSubjects);
    const strongSubjects = cleanSubjects(rawStrongSubjects);

    if (weakSubjects.length === 0 && strongSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one weak subject or one strong subject."
      });
    }

    const profile = await StudyProfile.findOneAndUpdate(
      {
        user: req.session.user.id
      },
      {
        user: req.session.user.id,
        fullName: req.session.user.fullName,
        username: req.session.user.username,
        email: req.session.user.email,
        university: req.session.user.university || "",
        major: req.session.user.major || "",
        weakSubjects,
        strongSubjects
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error("Save matching profile error:", error);

    res.status(500).json({
      success: false,
      message: "Could not save your study list."
    });
  }
});


router.get("/matching/chat/:chatId", requirePageAuth, async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId).lean();

    if (!chat) {
      return res.status(404).render("ERROR");
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(404).render("ERROR");
    }

    const otherUserId = (chat.participants || []).find((participantId) => {
      return String(participantId) !== String(req.session.user.id);
    });

    let otherUser = null;

    if (otherUserId) {
      otherUser = await User.findById(otherUserId)
        .select("fullName username email")
        .lean();
    }

    return res.render("matching-chat", {
      chatId: chatId,
      otherUser: otherUser || null
    });

  } catch (error) {
    console.error("Chat page error:", error);
    return res.status(500).render("ERROR");
  }
});


router.get("/api/matching/chat/:chatId/messages", requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId).lean();

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some(participantId => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this chat."
      });
    }

   const matchRequest = await MatchRequest.findById(chat.matchRequest).lean();

res.json({
  success: true,
  messages: chat.messages || [],
  currentUserId: String(req.session.user.id),
  request: matchRequest
    ? {
        _id: matchRequest._id,
        status: matchRequest.status,
        scheduledAt: matchRequest.scheduledAt,
        emailSentAt: matchRequest.emailSentAt,
        meetingLink: matchRequest.meetingLink,
        roomId: matchRequest.roomId
      }
    : null
});

  } catch (error) {
    console.error("Load chat messages error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load chat messages."
    });
  }
});

router.patch("/api/matching/chat/:chatId/schedule", requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: "Choose a meeting date and time."
      });
    }

   const finalScheduledAt = parseScheduleDateTime(scheduledAt);

    if (Number.isNaN(finalScheduledAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date and time."
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot schedule this match."
      });
    }

    const matchRequest = await MatchRequest.findById(chat.matchRequest);

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    matchRequest.status = "rescheduled";
    matchRequest.scheduledAt = finalScheduledAt;
    matchRequest.emailSentAt = null;
    matchRequest.roomId = "";
    matchRequest.meetingLink = "";

    await matchRequest.save();

if (finalScheduledAt.getTime() > Date.now()) {
  try {
    await sendScheduleConfirmationEmail(matchRequest);
  } catch (emailError) {
    console.error("Schedule confirmation email error:", emailError);
  }
}

chat.messages.push({
  sender: req.session.user.id,
  senderName: req.session.user.fullName || req.session.user.username || "Student",
  text: `Scheduled the match for ${formatMatchSchedule(finalScheduledAt)}.`
});

    await chat.save();

    if (finalScheduledAt.getTime() <= Date.now()) {
      await sendChatMatchEmail(matchRequest);

      return res.json({
        success: true,
        message: "Selected time is now/past, so the meeting email was sent now to both students."
      });
    }

    return res.json({
      success: true,
      message: `Meeting scheduled. The email will be sent to both students at ${formatMatchSchedule(finalScheduledAt)}.`
    });

  } catch (error) {
    console.error("Schedule chat match error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Could not schedule the match."
    });
  }
});

router.post("/api/matching/chat/:chatId/match-now", requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot start this match."
      });
    }

    const matchRequest = await MatchRequest.findById(chat.matchRequest);

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    matchRequest.scheduledAt = new Date();

    const result = await sendChatMatchEmail(matchRequest);

    chat.messages.push({
      sender: req.session.user.id,
      senderName: req.session.user.fullName || req.session.user.username || "Student",
      text: result.alreadySent
        ? "The meeting link was already sent before."
        : "Started the match now. The meeting email was sent to both students."
    });

    await chat.save();

    return res.json({
      success: true,
      message: result.alreadySent
        ? "Meeting email was already sent before."
        : "Match started now. Meeting email sent to both students."
    });

  } catch (error) {
    console.error("Match now error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Could not start the match now."
    });
  }
});

router.post("/api/matching/chat/:chatId/message", requireAuth, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty."
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long."
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot send messages in this chat."
      });
    }

    chat.messages.push({
      sender: req.session.user.id,
      senderName: req.session.user.fullName || req.session.user.username || "Student",
      text: text
    });

    await chat.save();

    return res.json({
      success: true,
      message: "Message sent."
    });

  } catch (error) {
    console.error("Send chat message error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not send message."
    });
  }
});



module.exports = router;
