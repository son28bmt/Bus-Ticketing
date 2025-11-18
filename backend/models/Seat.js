const { DataTypes } = require('sequelize');

const Seat = (sequelize) => {
  const SeatModel = sequelize.define('Seat', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    seatNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    seatType: {
      type: DataTypes.ENUM('STANDARD', 'VIP', 'SLEEPER'),
      defaultValue: 'STANDARD'
    },
    priceMultiplier: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 1.0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    busId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'buses',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'seats',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['busId', 'seatNumber']
      }
    ]
  });

  SeatModel.associate = (models) => {
    SeatModel.belongsTo(models.Bus, {
      foreignKey: 'busId',
      as: 'bus'
    });

    if (models.BookingItem) {
      SeatModel.hasMany(models.BookingItem, {
        foreignKey: 'seatId',
        as: 'bookingItems'
      });
    }

    if (models.SeatLock) {
      SeatModel.hasMany(models.SeatLock, {
        foreignKey: 'seatId',
        as: 'locks'
      });
    }
  };

  return SeatModel;
};

module.exports = Seat;
