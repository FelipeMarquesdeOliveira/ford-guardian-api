const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getHashedUsers } = require('../../mockData/users.mock');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler.middleware');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const users = await getHashedUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      logger.warn('Login failed - user not found', { email });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('Login failed - invalid password', { email });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const tokens = generateTokens(user);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferences: user.preferences
    };

    logger.info('User logged in', { userId: user.id, role: user.role });

    res.status(200).json({
      success: true,
      data: { user: safeUser, ...tokens }
    });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const users = await getHashedUsers();
    if (users.find(u => u.email === email)) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: 'user',
      createdAt: new Date().toISOString(),
      preferences: { notifications: true, language: 'pt-BR' }
    };

    const tokens = generateTokens(newUser);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      preferences: newUser.preferences
    };

    logger.info('New user registered', { userId: newUser.id });

    res.status(201).json({
      success: true,
      data: { user: safeUser, ...tokens }
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token required', 401, 'NO_REFRESH_TOKEN');
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const users = await getHashedUsers();
    const user = users.find(u => u.id === decoded.id);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const tokens = generateTokens(user);

    logger.info('Token refreshed', { userId: user.id });

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.warn('Invalid refresh token', { error: error.message });
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    logger.info('User logged out', { userId: req.user?.id });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const users = await getHashedUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      preferences: user.preferences
    };

    res.status(200).json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  getProfile
};