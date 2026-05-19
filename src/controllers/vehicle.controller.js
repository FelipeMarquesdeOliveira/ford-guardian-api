const { mockVehicles, getHealthStatusDistribution } = require('../../mockData/vehicles.mock');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler.middleware');
const { shouldDeleteData } = require('../utils/encryption');

const getVehicles = async (req, res, next) => {
  try {
    let vehicles = [...mockVehicles];

    if (req.user.role === 'user') {
      vehicles = vehicles.filter(v => v.userId === req.user.id);
    }

    vehicles = vehicles.filter(v => !shouldDeleteData(v.createdAt));

    const { limit = 50, offset = 0, sort = 'desc', healthStatus, brand } = req.query;

    let filtered = vehicles;

    if (healthStatus) {
      filtered = filtered.filter(v => v.healthStatus === healthStatus);
    }

    if (brand) {
      filtered = filtered.filter(v => v.brand.toLowerCase().includes(brand.toLowerCase()));
    }

    const sortField = 'createdAt';
    filtered.sort((a, b) => {
      if (sort === 'desc') {
        return new Date(b[sortField]) - new Date(a[sortField]);
      }
      return new Date(a[sortField]) - new Date(b[sortField]);
    });

    const limited = filtered.slice(Number(offset), Number(offset) + Number(limit));
    const distribution = getHealthStatusDistribution();

    res.status(200).json({
      success: true,
      data: {
        vehicles: limited,
        total: filtered.length,
        distribution,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + limited.length < filtered.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicle = mockVehicles.find(v => v.id === id);

    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
    }

    if (req.user.role === 'user' && vehicle.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

const createVehicle = async (req, res, next) => {
  try {
    const { vin, brand, model, year, licensePlate, mileage } = req.body;

    const existingVin = mockVehicles.find(v => v.vin === vin);
    if (existingVin) {
      throw new AppError('VIN already registered', 409, 'VIN_EXISTS');
    }

    const newVehicle = {
      id: `veh_${Date.now()}`,
      userId: req.user.id,
      vin,
      brand,
      model,
      year: Number(year),
      licensePlate: licensePlate || null,
      mileage: Number(mileage),
      healthStatus: 'normal',
      lastService: null,
      nextServiceDue: null,
      createdAt: new Date().toISOString()
    };

    logger.info('New vehicle created', { vehicleId: newVehicle.id, userId: req.user.id });

    res.status(201).json({
      success: true,
      data: newVehicle
    });
  } catch (error) {
    next(error);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicle = mockVehicles.find(v => v.id === id);

    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
    }

    if (req.user.role === 'user' && vehicle.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const { mileage, healthStatus, licensePlate } = req.body;

    if (mileage !== undefined) vehicle.mileage = Number(mileage);
    if (healthStatus !== undefined) vehicle.healthStatus = healthStatus;
    if (licensePlate !== undefined) vehicle.licensePlate = licensePlate;

    logger.info('Vehicle updated', { vehicleId: id, userId: req.user.id, changes: Object.keys(req.body) });

    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicle = mockVehicles.find(v => v.id === id);

    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
    }

    if (req.user.role === 'user' && vehicle.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    logger.info('Vehicle deleted', { vehicleId: id, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getHealthStats = async (req, res, next) => {
  try {
    const distribution = getHealthStatusDistribution();

    res.status(200).json({
      success: true,
      data: {
        distribution,
        total: mockVehicles.length,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getHealthStats
};