const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const updateAdminPassword = async (req, res) => {
    try {
      const userId = req.user.userId; // From authentication middleware
      const { currentPassword, newPassword } = req.body;
  
      // Validate inputs
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Current password and new password are required"
        });
      }
  
      if (newPassword.length < 8) {
        return res.status(400).json({
          message: "New password must be at least 8 characters long"
        });
      }
  
      // Find the admin user
      const adminUser = await prisma.user.findFirst({
        where: {
          id: userId,
          role: "ADMIN", // Ensure the user is an admin
        }
      });
  
      if (!adminUser) {
        return res.status(404).json({
          message: "Admin not found or you don't have permission"
        });
      }
  
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, adminUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Current password is incorrect"
        });
      }
  
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the password
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        }
      });
  
      res.json({
        message: "Password updated successfully",
        data: updatedUser
      });
  
    } catch (error) {
      console.error("Update admin password error:", error);
  
      // Handle general errors
      res.status(500).json({
        message: "Failed to update password",
        error: error.message
      });
    }
  };
  
  module.exports = { updateAdminPassword };