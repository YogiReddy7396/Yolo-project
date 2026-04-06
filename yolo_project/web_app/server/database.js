const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize SQLite Database
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// User Model
const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

// Prediction Model
const Prediction = sequelize.define('Prediction', {
    originalImagePath: {
        type: DataTypes.STRING,
        allowNull: false
    },
    taggedImagePath: {
        type: DataTypes.STRING,
        allowNull: false
    },
    label: {
        type: DataTypes.STRING,
        allowNull: false
    },
    confidence: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    totalItems: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    severity: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Low' // Default to Low to prevent nulls
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: null
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: null
    },
    locationSource: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null // 'gps', 'manual', or null
    },
    landmark: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending' // 'pending', 'approved', 'rejected'
    }
});

// Relationships
User.hasMany(Prediction);
Prediction.belongsTo(User);

// Sync Database
const initDb = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log('✅ Database synced successfully.');
    } catch (error) {
        console.warn('⚠️ Alter sync failed, recreating tables...');
        try {
            await sequelize.sync({ force: true });
            console.log('✅ Database recreated successfully.');
        } catch (forceError) {
            console.error('❌ Database sync failed:', forceError);
        }
    }
};

module.exports = { sequelize, User, Prediction, initDb };
