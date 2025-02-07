const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
    const { 
        name, 
        email, 
        phone, 
        password, 
        role, 
        status, 
        batch, 
        course, 
        organization, 
        designation,
        school, 
        skills 
    } = req.body;
  
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
  
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Validate required fields based on role
        if (role === 'FACULTY') {
            if (!designation || !school) {
                return res.status(400).json({ 
                    error: 'Designation and school are required for faculty registration' 
                });
            }
        } else if (role === 'ALUMNI') {
            if (!batch || !course || !organization || !designation || !skills) {
                return res.status(400).json({ 
                    error: 'Batch, course, organization, designation, and skills are required for alumni registration' 
                });
            }
        } else if (role === 'ADMIN') {
            // Add any specific validation for admin if needed
        } else {
            return res.status(400).json({ 
                error: 'Invalid role specified' 
            });
        }

        // Use Prisma transaction to ensure all operations succeed or fail together
        const result = await prisma.$transaction(async (prisma) => {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
      
            // Create the user
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    role,
                    status,
                },
            });
      
            // Create role-specific record
            if (role === 'FACULTY') {
                await prisma.faculty.create({
                    data: {
                        designation,
                        userId: user.id,
                        school
                    }
                });
            } else if (role === 'ALUMNI') {
                await prisma.alumni.create({
                    data: {
                        batch,
                        course,
                        organization,
                        designation,
                        skills,
                        userId: user.id
                    },
                });
            }
            // Return the created user
            return user;
        });

        res.status(201).json({ 
            message: 'User registered successfully', 
            user: result 
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle specific error cases
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                error: 'Phone number or email already exists' 
            });
        }
        
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login API remains unchanged
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;