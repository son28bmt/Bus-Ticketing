const { DataTypes } = require('sequelize');

const News = (sequelize) => {
  const NewsModel = sequelize.define('News', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('TRAFFIC', 'COMPANY', 'PROMOTION', 'ANNOUNCEMENT', 'OTHER'),
      defaultValue: 'OTHER'
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
      defaultValue: 'DRAFT'
    },
    featuredImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bus_companies',
        key: 'id'
      }
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isHighlighted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    tableName: 'news',
    timestamps: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['publishedAt']
      },
      {
        fields: ['slug'],
        unique: true
      }
    ]
  });

  // ✅ Define associations within model function
  NewsModel.associate = (models) => {
    // News belongs to User (author)
    NewsModel.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author'
    });
    // Optional: News may belong to a BusCompany
    NewsModel.belongsTo(models.BusCompany, {
      foreignKey: 'companyId',
      as: 'company'
    });
  };

  return NewsModel;
};

module.exports = News;