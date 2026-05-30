import { MemberRepository } from "../repositories/member.repository.js";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

export class MemberService {
  private static readonly RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

  private static hashResetToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private static generateResetToken() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
  }

  static async getAllMembers() {
    return MemberRepository.findAll();
  }

  static async registerMember(data: {
    email: string;
    password?: string;
    name: string;
    role: string;
    roleType?: "Engineer" | "Manager";
    department: string;
    agreementHours: number;
    breakDay: string;
    avatar?: string;
  }) {
    const existing = await MemberRepository.findByEmail(data.email);
    if (existing) {
      throw new Error("Email has already been registered inside the directory.");
    }

    const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
    const password = data.password || "password123";
    const passwordHash = bcryptjs.hashSync(password, 10);
    const roleType = data.roleType || "Engineer";

    const generatedId = "user-" + Math.random().toString(36).substr(2, 9);

    return MemberRepository.create({
      id: generatedId,
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      roleType,
      avatar: data.avatar || defaultAvatar,
      department: data.department,
      punchStatus: "Offline",
      isTL: roleType === "Manager",
      agreementHours: Number(data.agreementHours),
      breakDay: data.breakDay,
    });
  }

  static async authenticate(email: string, passwordString: string) {
    const member = await MemberRepository.findByEmail(email);
    if (!member) {
      throw new Error("User credentials mismatch.");
    }

    const matched = bcryptjs.compareSync(passwordString, member.passwordHash);
    if (!matched) {
      throw new Error("Invalid password code.");
    }

    return member;
  }

  static async updateRoleType(userId: string, roleType: "Engineer" | "Manager") {
    const member = await MemberRepository.findById(userId);
    if (!member) {
      throw new Error("Member profile not found.");
    }

    return MemberRepository.update(userId, {
      roleType,
      isTL: roleType === "Manager",
    });
  }

  static async updatePunchStatus(userId: string, status: string, lastPunchTime: string | null) {
    return MemberRepository.update(userId, {
      punchStatus: status,
      lastPunchTime,
    });
  }

  static async requestPasswordReset(email: string) {
    const genericMessage = "If the account exists, a recovery token has been generated.";
    const member = await MemberRepository.findByEmail(email);

    if (!member) {
      return { ok: true, message: genericMessage };
    }

    const token = this.generateResetToken();
    const now = Date.now();
    const expiresAt = new Date(now + this.RESET_TOKEN_TTL_MS).toISOString();

    await MemberRepository.clearActiveResetTokens(member.id);
    await MemberRepository.createResetToken({
      id: `prt_${Math.random().toString(36).slice(2, 12)}`,
      memberId: member.id,
      tokenHash: this.hashResetToken(token),
      expiresAt,
      createdAt: new Date(now).toISOString(),
      requestedById: null,
      mode: "SELF",
    });

    console.log(`[password-reset][self-service] email=${member.email} token=${token} expiresAt=${expiresAt}`);

    return { ok: true, message: genericMessage };
  }

  static async generatePasswordResetByManager(managerId: string, memberId: string) {
    const manager = await MemberRepository.findById(managerId);
    if (!manager || (manager.roleType || "").toLowerCase() !== "manager") {
      throw new Error("Only managers can generate password reset tokens.");
    }

    if (!memberId) {
      throw new Error("Target member is required.");
    }

    const member = await MemberRepository.findById(memberId);
    if (!member) {
      throw new Error("Member not found.");
    }

    if ((member.roleType || "").toLowerCase() !== "engineer") {
      throw new Error("Managers can only generate reset tokens for engineers.");
    }

    const token = this.generateResetToken();
    const now = Date.now();
    const expiresAt = new Date(now + this.RESET_TOKEN_TTL_MS).toISOString();

    await MemberRepository.clearActiveResetTokens(member.id);
    await MemberRepository.createResetToken({
      id: `prt_${Math.random().toString(36).slice(2, 12)}`,
      memberId: member.id,
      tokenHash: this.hashResetToken(token),
      expiresAt,
      createdAt: new Date(now).toISOString(),
      requestedById: managerId,
      mode: "MANAGER",
    });

    return {
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
      },
      resetToken: token,
      expiresAt,
    };
  }

  static async resetPassword(email: string, token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const member = await MemberRepository.findByEmail(email);
    if (!member) {
      throw new Error("Invalid reset token or email.");
    }

    const tokenHash = this.hashResetToken(token.trim().toUpperCase());
    const resetToken = await MemberRepository.findActiveResetToken(member.id, tokenHash);
    if (!resetToken) {
      throw new Error("Invalid reset token or email.");
    }

    if (new Date(resetToken.expiresAt).getTime() < Date.now()) {
      await MemberRepository.markResetTokenUsed(resetToken.id);
      throw new Error("Reset token has expired.");
    }

    const passwordHash = bcryptjs.hashSync(newPassword, 10);
    await MemberRepository.updatePasswordHash(member.id, passwordHash);
    await MemberRepository.markResetTokenUsed(resetToken.id);
    await MemberRepository.clearActiveResetTokens(member.id);

    return { ok: true };
  }
}
