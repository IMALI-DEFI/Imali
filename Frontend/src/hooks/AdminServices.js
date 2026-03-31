// src/services/AdminService.js
export class AdminService {
    static async checkAdmin() {
      try {
        const response = await BotAPI.adminCheck();
        return response.data?.is_admin === true;
      } catch (error) {
        console.error('[Admin] Check failed:', error);
        return false;
      }
    }
    
    static async getUsers() {
      const retries = 3;
      for (let i = 0; i < retries; i++) {
        try {
          const response = await BotAPI.adminGetUsers();
          return response;
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    static async updateUserTier(userId, tier) {
      try {
        return await BotAPI.adminUpdateUserTier(userId, tier);
      } catch (error) {
        console.error('[Admin] Update tier failed:', error);
        throw error;
      }
    }
  }