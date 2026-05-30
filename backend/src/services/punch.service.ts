import { PunchRepository } from "../repositories/punch.repository.js";
import { MemberService } from "./member.service.js";

export class PunchService {
  static async getAllPunches() {
    return PunchRepository.findAll();
  }

  static async performPunch(userId: string, type: "Punch" | "ClockOut" | "BreakStart" | "BreakEnd", note: string) {
    const punchInTime = new Date().toISOString();
    const dateToday = punchInTime.split("T")[0];
    const generatedId = "p_" + Math.random().toString(36).substr(2, 9);

    let calculatedMinutes: number | null = null;
    let newStatus = "Offline";

    if (type === "Punch") {
      newStatus = "Active";
    } else if (type === "BreakStart") {
      newStatus = "Break";
    } else if (type === "BreakEnd") {
      newStatus = "Active";
    } else if (type === "ClockOut") {
      newStatus = "ClockedOut";
      
      // Look up latest open clock-in/punch to find duration
      const openPunch = await PunchRepository.findLatestOpenPunch(userId);
      if (openPunch) {
        const diffMs = new Date(punchInTime).getTime() - new Date(openPunch.clockIn).getTime();
        calculatedMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
        
        // Close previous open punch
        await PunchRepository.update(openPunch.id, {
          clockOut: punchInTime,
          totalMinutes: calculatedMinutes,
        });
      }
    }

    // Update corresponding Member profile status
    await MemberService.updatePunchStatus(userId, newStatus, punchInTime);

    // Create the punch log entry
    return PunchRepository.create({
      id: generatedId,
      userId,
      date: dateToday,
      clockIn: punchInTime,
      clockOut: type === "ClockOut" ? punchInTime : null,
      type,
      totalMinutes: calculatedMinutes,
      note,
    });
  }
}
