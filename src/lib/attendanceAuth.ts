import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Employee } from '@/types/attendance';

export interface AttendanceSession {
  token: string;
  expiresAt: Date;
  isAuthenticated: boolean;
  userType: 'employee' | 'admin';
  employeeId?: string; // Only for employee sessions
  employeeName?: string; // Only for employee sessions
}

class AttendanceAuthService {
  private readonly SESSION_STORAGE_KEY = 'bazar_attendance_session_token';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ADMIN_PASSWORD = '4508'; // Fixed admin password

  // Generate a secure random token
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Set session token in localStorage
  private setSessionToken(token: string, expiresIn: number, userType: 'employee' | 'admin', employeeId?: string, employeeName?: string): void {
    const expires = new Date(Date.now() + expiresIn);
    const sessionData: AttendanceSession = {
      token,
      expiresAt: expires,
      isAuthenticated: true,
      userType,
      employeeId,
      employeeName,
    };
    
    try {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log('💾 Attendance session token saved to localStorage');
    } catch (error) {
      console.error('💾 Error saving attendance session token:', error);
    }
  }

  // Get session token from localStorage
  private getSessionToken(): string | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (!sessionData) {
        return null;
      }

      const parsed: AttendanceSession = JSON.parse(sessionData);
      const expiresAt = new Date(parsed.expiresAt);
      
      if (new Date() > expiresAt) {
        console.log('💾 Attendance session token expired');
        this.deleteSessionToken();
        return null;
      }

      return parsed.token;
    } catch (error) {
      console.error('💾 Error reading attendance session token:', error);
      this.deleteSessionToken();
      return null;
    }
  }

  // Get full session data
  private getSessionData(): AttendanceSession | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (!sessionData) {
        return null;
      }

      const parsed: AttendanceSession = JSON.parse(sessionData);
      const expiresAt = new Date(parsed.expiresAt);
      
      if (new Date() > expiresAt) {
        this.deleteSessionToken();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('💾 Error reading attendance session data:', error);
      this.deleteSessionToken();
      return null;
    }
  }

  // Delete session token from localStorage
  private deleteSessionToken(): void {
    try {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
      console.log('💾 Attendance session token deleted');
    } catch (error) {
      console.error('💾 Error deleting attendance session token:', error);
    }
  }

  // Login as employee
  async loginEmployee(username: string, password: string): Promise<{ success: boolean; error?: string; session?: AttendanceSession }> {
    try {
      if (!username.trim() || !password.trim()) {
        return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
      }

      // Search for employee by username
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }

      // Get the first matching employee
      const employeeDoc = querySnapshot.docs[0];
      const employeeData = employeeDoc.data() as Employee;

      // Check password
      if (employeeData.password !== password.trim()) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }

      // Create session
      const token = this.generateToken();
      const employee: Employee = {
        ...employeeData,
        id: employeeDoc.id,
        createdAt: employeeData.createdAt,
        updatedAt: employeeData.updatedAt,
      };

      this.setSessionToken(token, this.SESSION_DURATION, 'employee', employee.id, employee.name);

      const session: AttendanceSession = {
        token,
        expiresAt: new Date(Date.now() + this.SESSION_DURATION),
        isAuthenticated: true,
        userType: 'employee',
        employeeId: employee.id,
        employeeName: employee.name,
      };

      console.log('✅ Employee login successful:', employee.name);
      return { success: true, session };
    } catch (error: any) {
      console.error('❌ Error during employee login:', error);
      return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.' };
    }
  }

  // Login as admin
  async loginAdmin(password: string): Promise<{ success: boolean; error?: string; session?: AttendanceSession }> {
    try {
      if (password.trim() !== this.ADMIN_PASSWORD) {
        return { success: false, error: 'كلمة المرور غير صحيحة' };
      }

      // Create session
      const token = this.generateToken();
      this.setSessionToken(token, this.SESSION_DURATION, 'admin');

      const session: AttendanceSession = {
        token,
        expiresAt: new Date(Date.now() + this.SESSION_DURATION),
        isAuthenticated: true,
        userType: 'admin',
      };

      console.log('✅ Admin login successful');
      return { success: true, session };
    } catch (error: any) {
      console.error('❌ Error during admin login:', error);
      return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.' };
    }
  }

  // Verify session
  async verifySession(): Promise<{ success: boolean; session?: AttendanceSession; error?: string }> {
    try {
      const sessionData = this.getSessionData();
      
      if (!sessionData) {
        return { success: false, error: 'لا توجد جلسة نشطة' };
      }

      // Check if session is expired
      if (new Date() > new Date(sessionData.expiresAt)) {
        this.deleteSessionToken();
        return { success: false, error: 'انتهت صلاحية الجلسة' };
      }

      return { success: true, session: sessionData };
    } catch (error: any) {
      console.error('❌ Error verifying attendance session:', error);
      return { success: false, error: 'فشل في التحقق من الجلسة' };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      this.deleteSessionToken();
      console.log('✅ Attendance logout successful');
    } catch (error) {
      console.error('❌ Error during attendance logout:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const sessionData = this.getSessionData();
    return sessionData !== null && sessionData.isAuthenticated;
  }

  // Get current session
  getCurrentSession(): AttendanceSession | null {
    return this.getSessionData();
  }
}

// Create and export the service instance
export const attendanceAuthService = new AttendanceAuthService();

