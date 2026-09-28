const { mockDealers, searchDealersByCity } = require('../../mockData/dealers.mock');
const { logger } = require('../observability/logger');
const { AppError } = require('../middleware/errorHandler.middleware');

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getDealers = async (req, res, next) => {
  try {
    const { city, state, service, limit = 50, offset = 0 } = req.query;

    let dealers = [...mockDealers];

    if (city) {
      dealers = searchDealersByCity(city);
    }

    if (state) {
      dealers = dealers.filter(d => d.state.toLowerCase() === state.toLowerCase());
    }

    if (service) {
      dealers = dealers.filter(d => d.services.includes(service));
    }

    dealers.sort((a, b) => a.distance - b.distance);
    const limited = dealers.slice(Number(offset), Number(offset) + Number(limit));

    res.status(200).json({
      success: true,
      data: {
        dealers: limited,
        total: dealers.length,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + limited.length < dealers.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getDealerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dealer = mockDealers.find(d => d.id === id);

    if (!dealer) {
      throw new AppError('Dealer not found', 404, 'DEALER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: dealer
    });
  } catch (error) {
    next(error);
  }
};

const searchDealers = async (req, res, next) => {
  try {
    const { q, lat, lng, radius = 50 } = req.query;

    let dealers = [...mockDealers];

    if (q) {
      const query = q.toLowerCase();
      dealers = dealers.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.city.toLowerCase().includes(query) ||
        d.address.toLowerCase().includes(query)
      );
    }

    if (lat && lng) {
      dealers = dealers.filter(d => {
        const distance = calculateDistance(Number(lat), Number(lng), d.coordinates.lat, d.coordinates.lng);
        return distance <= Number(radius);
      });
    }

    dealers.sort((a, b) => {
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }
      return a.distance - b.distance;
    });

    logger.info('dealer.search', { event: 'dealer.search', results: dealers.length, userId: req.user?.id });

    res.status(200).json({
      success: true,
      data: {
        dealers,
        total: dealers.length
      }
    });
  } catch (error) {
    next(error);
  }
};

const getNearbyDealers = async (req, res, next) => {
  try {
    const { lat, lng, radius = 50 } = req.query;

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDINATES');
    }

    let dealers = mockDealers.map(d => {
      const distance = calculateDistance(Number(lat), Number(lng), d.coordinates.lat, d.coordinates.lng);
      return { ...d, distance };
    });

    dealers = dealers.filter(d => d.distance <= Number(radius));
    dealers.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      data: {
        dealers,
        total: dealers.length,
        searchRadius: Number(radius)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDealers,
  getDealerById,
  searchDealers,
  getNearbyDealers
};