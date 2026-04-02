import BotAPI from "./BotAPI";

const extractIsAdmin = (response) => {
  return (
    response?.is_admin === true ||
    response?.data?.is_admin === true ||
    response?.data?.data?.is_admin === true
  );
};

const extractUsers = (response) => {
  return (
    response?.users ||
    response?.data?.users ||
    response?.data?.data?.users ||
    response?.data ||
    []
  );
};

export class AdminService {
  static async checkAdmin() {
    try {
      const response = await BotAPI.getAdminCheck();
      return extractIsAdmin(response);
    } catch (error) {
      console.error("[Admin] Check failed:", error);
      return false;
    }
  }

  static async getUsers(params = {}) {
    const retries = 3;
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await BotAPI.adminGetUsers(params);
        return extractUsers(response);
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    console.error("[Admin] Get users failed after retries:", lastError);
    throw lastError;
  }

  static async updateUserTier(userId, tier) {
    if (!userId) {
      throw new Error("userId is required");
    }

    if (!tier) {
      throw new Error("tier is required");
    }

    try {
      return await BotAPI.adminUpdateUserTier(userId, tier);
    } catch (error) {
      console.error("[Admin] Update tier failed:", error);
      throw error;
    }
  }
}

export default AdminService;