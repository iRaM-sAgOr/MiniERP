import { MemberRepository } from "../repositories/member.repository.js";
import bcryptjs from "bcryptjs";

export class MemberService {
  static async getAllMembers() {
    return MemberRepository.findAll();
  }

  static async registerMember(data: {
    email: string;
    password?: string;
    name: string;
    role: string;
    roleType: "Engineer" | "Manager";
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

    const generatedId = "user-" + Math.random().toString(36).substr(2, 9);

    return MemberRepository.create({
      id: generatedId,
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      roleType: data.roleType,
      avatar: data.avatar || defaultAvatar,
      department: data.department,
      punchStatus: "Offline",
      isTL: data.roleType === "Manager",
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
}
